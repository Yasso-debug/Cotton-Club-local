/**
 * Cotton Club POS - Comprehensive Test Suite
 * Validates all core business invariants, database operations, and security rules.
 */

const { DatabaseManager } = require('../src/database/db');
const { seedDatabase } = require('../src/database/seed');
const { AuthService } = require('../src/services/authService');
const { SessionService } = require('../src/services/sessionService');
const { PosService } = require('../src/services/posService');
const { InventoryService } = require('../src/services/inventoryService');
const { PurchaseService } = require('../src/services/purchaseService');
const { ExpenseService } = require('../src/services/expenseService');
const { ReportService } = require('../src/services/reportService');
const { PrinterService } = require('../src/services/printerService');
const { SettingsService } = require('../src/services/settingsService');
const assert = require('node:assert');

console.log('====================================================');
console.log('🧪 Starting Cotton Club POS Comprehensive Tests');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
    totalTests++;
    try {
        fn();
        console.log(`✅ [PASS] ${testName}`);
        passedTests++;
    } catch (err) {
        console.error(`❌ [FAIL] ${testName}`);
        console.error('   ', err.message);
        throw err;
    }
}

// Setup in-memory test database
const db = new DatabaseManager(':memory:');
db.connect();

// 1. Schema & Seeder Tests
runTest('1. Schema creation and database seed', () => {
    seedDatabase(db);
    const users = db.all('SELECT * FROM users');
    assert.strictEqual(users.length >= 2, true, 'Default admin and cashier must exist');
    const products = db.all('SELECT * FROM products');
    assert.strictEqual(products.length >= 10, true, 'Sample products must be seeded');
    const settings = db.all('SELECT * FROM app_settings');
    assert.strictEqual(settings.length >= 5, true, 'Default app settings must exist');
});

// 2. Authentication Tests
const authService = new AuthService(db);
runTest('2. Authentication with valid & invalid credentials', () => {
    // Valid admin login
    const adminUser = authService.login('ma', 'ma');
    assert.strictEqual(adminUser.role, 'admin');
    assert.strictEqual(adminUser.username, 'ma');

    // Valid cashier login
    const cashierUser = authService.login('co', 'co');
    assert.strictEqual(cashierUser.role, 'cashier');

    // Invalid password should throw
    assert.throws(() => {
        authService.login('ma', 'wrongpassword');
    }, /غير صحيحة/);

    // Manager override check
    const overrideSuccess = authService.verifyManagerOverride('ma', 'ma');
    assert.strictEqual(overrideSuccess.success, true);

    const overrideFail = authService.verifyManagerOverride('co', 'co');
    assert.strictEqual(overrideFail.success, false, 'Cashier cannot provide manager override');
});

// 3. Daily Session Lifecycle Tests
const sessionService = new SessionService(db);
let activeSession = null;

runTest('3. Daily Session: Open session & enforce single-session invariant', () => {
    const admin = db.get("SELECT id FROM users WHERE role = 'admin'");
    activeSession = sessionService.openSession(admin.id, 500.0, 'بداية يوم العمل');

    assert.strictEqual(activeSession.status, 'open');
    assert.strictEqual(activeSession.opening_cash, 500.0);
    assert.strictEqual(activeSession.session_code.startsWith('SES-'), true);

    // Second open attempt must fail
    assert.throws(() => {
        sessionService.openSession(admin.id, 200.0);
    }, /توجد وردية مفتوحة بالفعل/);
});

// 4. POS & Sales Processing Tests
const posService = new PosService(db);
let firstInvoice = null;

runTest('4. POS: Barcode search & Cash checkout with inventory reduction', () => {
    const product = posService.findProductByBarcode('6221001001');
    assert.strictEqual(product.item_name.includes('فانلة'), true);
    const initialStock = product.current_stock;

    const cashier = db.get("SELECT id FROM users WHERE role = 'cashier'");

    // Checkout 2 units
    firstInvoice = posService.checkout({
        sessionId: activeSession.id,
        userId: cashier.id,
        userRole: 'cashier',
        items: [
            { productId: product.id, quantity: 2, itemName: product.item_name }
        ],
        discountPercent: 0,
        paymentMethod: 'cash'
    });

    assert.strictEqual(firstInvoice.subtotal, 150.0);
    assert.strictEqual(firstInvoice.final_total, 150.0);
    assert.strictEqual(firstInvoice.lineItems.length, 1);

    // Verify stock was reduced by 2
    const updatedProduct = posService.findProductByBarcode('6221001001');
    assert.strictEqual(updatedProduct.current_stock, initialStock - 2);
});

runTest('5. POS: Enforce Cashier <= 5% discount limit', () => {
    const product = posService.findProductByBarcode('6221001002');
    const cashier = db.get("SELECT id FROM users WHERE role = 'cashier'");

    // 10% discount without manager override MUST throw
    assert.throws(() => {
        posService.checkout({
            sessionId: activeSession.id,
            userId: cashier.id,
            userRole: 'cashier',
            items: [{ productId: product.id, quantity: 1 }],
            discountPercent: 10,
            paymentMethod: 'cash'
        });
    }, /الحد الأقصى للخصم المسموح به للكاشير/);

    // 10% discount WITH manager override MUST succeed
    const approvedSale = posService.checkout({
        sessionId: activeSession.id,
        userId: cashier.id,
        userRole: 'cashier',
        items: [{ productId: product.id, quantity: 1 }],
        discountPercent: 10,
        paymentMethod: 'card',
        managerOverride: { username: 'ma', password: 'ma' }
    });

    assert.strictEqual(approvedSale.discount_percent, 10);
    assert.strictEqual(approvedSale.final_total, 72.0); // 80 - 10% = 72
});

runTest('6. POS: Split Payment (Cash + Card) validation', () => {
    const product = posService.findProductByBarcode('6221001003'); // price: 60
    const cashier = db.get("SELECT id FROM users WHERE role = 'cashier'");

    // Mismatched split sum must throw
    assert.throws(() => {
        posService.checkout({
            sessionId: activeSession.id,
            userId: cashier.id,
            userRole: 'cashier',
            items: [{ productId: product.id, quantity: 1 }],
            paymentMethod: 'split',
            splitPayments: { cash: 20, card: 30 } // Total 50 != 60
        });
    }, /لا يساوي إجمالي الفاتورة/);

    // Valid split: 30 cash + 30 card = 60
    const splitSale = posService.checkout({
        sessionId: activeSession.id,
        userId: cashier.id,
        userRole: 'cashier',
        items: [{ productId: product.id, quantity: 1 }],
        paymentMethod: 'split',
        splitPayments: { cash: 30, card: 30 }
    });

    assert.strictEqual(splitSale.payment_method, 'split');
    assert.strictEqual(splitSale.splits.length, 2);
});

// 7. Petty Expenses Tests
const expenseService = new ExpenseService(db);
runTest('7. Petty Expenses: Add expense from drawer', () => {
    const admin = db.get("SELECT id FROM users WHERE role = 'admin'");
    const expense = expenseService.addExpense({
        sessionId: activeSession.id,
        category: 'ضيافة ونظافة',
        amount: 45.0,
        description: 'شراء أدوات تنظيف وبن للمحل',
        paidTo: 'سوبرماركت الأمل'
    }, admin.id);

    assert.strictEqual(expense.amount, 45.0);
    assert.strictEqual(expense.session_id, activeSession.id);
});

// 8. Purchases & Supplier Payments Tests
const purchaseService = new PurchaseService(db);
runTest('8. Purchases: Incoming shipment updates stock & supplier debt', () => {
    const supplier = db.get('SELECT id FROM suppliers LIMIT 1');
    const product = db.get('SELECT id, current_stock FROM products LIMIT 1');
    const oldStock = product.current_stock;
    const admin = db.get("SELECT id FROM users WHERE role = 'admin'");

    const purchase = purchaseService.createPurchaseInvoice({
        supplierId: supplier.id,
        sessionId: activeSession.id,
        items: [
            { productId: product.id, quantity: 10, unitCost: 40.0 }
        ],
        paidAmount: 100.0, // Total 400, paid 100 from drawer, remaining 300
        notes: 'شحنة بضاعة جديدة'
    }, admin.id);

    assert.strictEqual(purchase.total_amount, 400.0);
    assert.strictEqual(purchase.paid_amount, 100.0);
    assert.strictEqual(purchase.remaining_amount, 300.0);

    // Verify stock increased by 10
    const updatedProd = db.get('SELECT current_stock FROM products WHERE id = ?', [product.id]);
    assert.strictEqual(updatedProd.current_stock, oldStock + 10);

    // Verify supplier balance increased by remaining 300
    const updatedSupplier = db.get('SELECT balance FROM suppliers WHERE id = ?', [supplier.id]);
    assert.strictEqual(updatedSupplier.balance, 300.0);
});

// 9. Session Cash Balance & Closing (Z-Report) Tests
runTest('9. Daily Session: Drawer balance formula and closing reconciliation', () => {
    // Current summary
    const summary = sessionService.getSessionSummary(activeSession.id);

    // Opening: 500
    // Cash Sales: 150 (inv 1) + 30 (split cash inv 3) = 180
    // Expenses: 45
    // Cash Supplier Payment: 100
    // Expected = 500 + 180 - 45 - 100 = 535
    assert.strictEqual(summary.expectedCash, 535.0);

    // Close session with actual counted cash = 535 (matching)
    const admin = db.get("SELECT id FROM users WHERE role = 'admin'");
    const closed = sessionService.closeSession(activeSession.id, admin.id, 535.0, 'إغلاق بدون عجز');

    assert.strictEqual(closed.cashDifference, 0.0);
    assert.strictEqual(closed.differenceStatus, 'matching');

    // Verified session is marked closed
    const reloaded = sessionService.getSessionById(activeSession.id);
    assert.strictEqual(reloaded.status, 'closed');
});

// 10. Reporting & Valuation Tests
const reportService = new ReportService(db);
const inventoryService = new InventoryService(db);
runTest('10. Reports & Inventory Valuation', () => {
    const valuation = inventoryService.getInventoryValuation();
    assert.strictEqual(valuation.totalItems > 0, true);
    assert.strictEqual(valuation.totalCostValuation > 0, true);
    assert.strictEqual(valuation.totalRetailValuation > valuation.totalCostValuation, true);

    const salesSummary = reportService.getSalesSummary();
    assert.strictEqual(salesSummary.totals.total_invoices >= 3, true);

    const topSelling = reportService.getTopSellingProducts(5);
    assert.strictEqual(topSelling.length > 0, true);
});

// 11. Printing Service Tests
const printerService = new PrinterService(db);
runTest('11. Printer: 80mm & 58mm HTML receipt formatting', () => {
    const invoice = posService.getInvoiceById(firstInvoice.id);
    const html = printerService.generateReceiptHtml(invoice);

    assert.strictEqual(html.includes('Cotton Club Store'), true);
    assert.strictEqual(html.includes(invoice.invoice_number), true);
    assert.strictEqual(html.includes('150.00'), true);
});

console.log('\n====================================================');
console.log(`🎉 All ${passedTests}/${totalTests} tests PASSED successfully!`);
console.log('====================================================');
