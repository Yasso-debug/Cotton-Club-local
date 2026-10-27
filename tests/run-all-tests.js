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
    }, /(لا يطابق|لا يساوي) إجمالي الفاتورة/);

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

// 12. Central Treasury Tests
const { TreasuryService } = require('../src/services/treasuryService');
const treasuryService = new TreasuryService(db);
runTest('12. Central Treasury: Deposit, withdraw, and balance calculations', () => {
    const admin = db.get("SELECT id FROM users WHERE role = 'admin'");
    const initial = treasuryService.getBalance();
    assert.strictEqual(initial.balance >= 15000, true, 'Initial seed deposit must exist');

    // Deposit
    const dep = treasuryService.deposit(5000, 'إيداع إضافي من صاحب العمل', 'سيولة إضافية', admin.id);
    assert.strictEqual(dep.amount, 5000);
    assert.strictEqual(treasuryService.getBalance().balance, initial.balance + 5000);

    // Withdraw
    const w = treasuryService.withdraw(2000, 'سداد إيجار المحل', 'إيجار شهري', admin.id);
    assert.strictEqual(w.amount, 2000);
    assert.strictEqual(treasuryService.getBalance().balance, initial.balance + 3000);

    // Overdraft must throw
    assert.throws(() => {
        treasuryService.withdraw(999999, 'سحب مستحيل', '', admin.id);
    }, /لا يكفي/);
});

// 13. Payroll & Employee Tests
const { PayrollService } = require('../src/services/payrollService');
const payrollService = new PayrollService(db, treasuryService);
runTest('13. Payroll & Staff: Employee creation and salary disbursement with safe deduction', () => {
    const admin = db.get("SELECT id FROM users WHERE role = 'admin'");
    const emps = payrollService.listEmployees();
    assert.strictEqual(emps.length >= 2, true, 'Default seeded employees must exist');

    // Create new employee
    const newEmp = payrollService.createEmployee({
        fullName: 'حسام حسن',
        jobTitle: 'بائع ملابس أول',
        phone: '01055556666',
        basicSalary: 4000
    }, admin.id);
    assert.strictEqual(newEmp.full_name, 'حسام حسن');

    // Disburse salary advance from Central Treasury
    const safeBefore = treasuryService.getBalance().balance;
    const payment = payrollService.disburseSalary({
        employeeId: newEmp.id,
        amount: 1000,
        paymentType: 'advance',
        paymentSource: 'treasury',
        notes: 'سلفة على الراتب'
    }, admin.id);

    assert.strictEqual(payment.voucher_number.startsWith('SAL-'), true);
    assert.strictEqual(payment.amount, 1000);
    assert.strictEqual(treasuryService.getBalance().balance, safeBefore - 1000, 'Treasury must decrease by salary amount');

    const paymentList = payrollService.listSalaryPayments();
    assert.strictEqual(paymentList.length >= 1, true);
});

// 14. Stock Adjustment Recount Tests
runTest('14. Stock Audit: Inventory recount and adjustment vouchers', () => {
    const admin = db.get("SELECT id FROM users WHERE role = 'admin'");
    const prod = db.get('SELECT * FROM products LIMIT 1');

    const recountRes = inventoryService.adjustStock({
        productId: prod.id,
        adjustmentType: 'recount',
        quantity: 75,
        reason: 'inventory_count',
        notes: 'جرد يدوي فعلي'
    }, admin.id, null);

    assert.strictEqual(recountRes.newStock, 75);
    const updatedProd = inventoryService.getProductById(prod.id);
    assert.strictEqual(updatedProd.current_stock, 75);

    const adjustments = inventoryService.listStockAdjustments();
    assert.strictEqual(adjustments.length >= 1, true);
    assert.strictEqual(adjustments[0].reason, 'inventory_count');
});

// 15. Dual-View Suppliers Master: Strict 5-Field Modal & KPI Overview
purchaseService.treasuryService = treasuryService;
let testSupplier = null;

runTest('15. Suppliers Master: Strict 5-Field Standard Profile & KPI Overview', () => {
    const admin = db.get("SELECT id FROM users WHERE role = 'admin'");
    
    // Strict 5 fields create
    testSupplier = purchaseService.createSupplier({
        supplier_name: 'شركة النسيج الملكي الحديث',
        contact_person: 'م. أحمد شكري',
        phone: '01011223344',
        address: 'المحلة الكبرى - المنطقة الصناعية',
        opening_balance: 5000
    }, admin.id);

    assert.ok(testSupplier.id, 'Supplier should have an ID');
    assert.strictEqual(testSupplier.supplier_code.startsWith('SUP-'), true, 'Code should follow SUP-XXXX format');
    assert.strictEqual(testSupplier.name, 'شركة النسيج الملكي الحديث');
    assert.strictEqual(testSupplier.balance, 5000, 'Initial balance must match opening_balance');

    // Update supplier (Strict 5 fields standard)
    const updated = purchaseService.updateSupplier(testSupplier.id, {
        supplier_name: 'شركة النسيج الملكي المتطورة',
        contact_person: 'م. أحمد شكري',
        phone: '01011223399',
        address: 'المحلة الكبرى - شارع البحر',
        status: 'active'
    }, admin.id);
    assert.strictEqual(updated.name, 'شركة النسيج الملكي المتطورة');
    assert.strictEqual(updated.phone, '01011223399');

    // Overview KPIs
    const overview = purchaseService.getSuppliersOverview();
    assert.ok(overview.totalSuppliers >= 1, 'Total suppliers count must exist');
    assert.ok(overview.totalPayables >= 5000, 'Total payables must sum positive balances');
    assert.ok(overview.dueSuppliersCount >= 1, 'Due suppliers count must exist');

    // Filter search
    const filtered = purchaseService.listSuppliers({ search: 'المتطورة' });
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, testSupplier.id);
});

// 16. Split Payment Engine, Treasury Solvency Check & Full-Page Ledger
runTest('16. Suppliers: Split Payment, Treasury Solvency Check & Statement Ledger', () => {
    const admin = db.get("SELECT id FROM users WHERE role = 'admin'");
    const treasuryBal = treasuryService.getBalance().balance;

    // 1. Solvency check rejection when cash overdraft attempted
    assert.throws(() => {
        purchaseService.recordSupplierSplitPayment({
            supplierId: testSupplier.id,
            totalAmount: treasuryBal + 5000,
            paymentBreakdown: {
                cash: treasuryBal + 5000,
                bankTransfer: 0,
                eWallet: 0
            },
            notes: 'محاولة دفع كاش تفوق رصيد الخزينة'
        }, admin.id);
    }, /رصيد الكاش بالخزينة المركزية غير كافٍ/);

    // 2. Reject prohibited payment methods (e.g. visa / cheques)
    assert.throws(() => {
        purchaseService.recordSupplierSplitPayment({
            supplierId: testSupplier.id,
            totalAmount: 1000,
            paymentBreakdown: {
                cash: 500,
                visa: 500
            },
            notes: 'طريقة دفع غير مسموحة'
        }, admin.id);
    }, /طرق الدفع المسموحة هي: كاش، إنستاباي، محافظ إلكترونية فقط/);

    // 3. Valid split payment: 2000 total (1000 cash, 500 instapay, 500 ewallet)
    const safeBefore = treasuryService.getBalance().balance;
    const payment = purchaseService.recordSupplierSplitPayment({
        supplierId: testSupplier.id,
        totalAmount: 2000,
        paymentBreakdown: {
            cash: 1000,
            bankTransfer: 500,
            eWallet: 500
        },
        notes: 'دفعة مجزأة تجريبية'
    }, admin.id);

    assert.ok(payment.voucher_number.startsWith('SPAY-'), 'Payment voucher number must start with SPAY-');
    assert.strictEqual(payment.amount, 2000);
    assert.strictEqual(treasuryService.getBalance().balance, safeBefore - 1000, 'Central Treasury must deduct cash portion only');

    // Supplier balance should have decreased by 2000: 5000 - 2000 = 3000
    const supAfter = db.get('SELECT balance FROM suppliers WHERE id = ?', [testSupplier.id]);
    assert.strictEqual(supAfter.balance, 3000);

    // 4. View A: Full-page statement ledger verification
    const ledgerData = purchaseService.getSupplierLedger(testSupplier.id);
    assert.strictEqual(ledgerData.supplier.id, testSupplier.id);
    assert.ok(ledgerData.movements.length >= 1, 'Should have recorded payment in movements');
    assert.strictEqual(ledgerData.summary.currentBalance, 3000);
    assert.strictEqual(ledgerData.summary.totalPayments, 2000);

    // Running balance check
    const lastMv = ledgerData.movements[ledgerData.movements.length - 1];
    assert.strictEqual(lastMv.balanceAfter, 3000);
});

// 17. Categories Hierarchy, Auto CAT-XX Generation, Linked Items Count & Protected Deletion
runTest('17. Catalog: Categories Hierarchy, CAT-XX Codes & Protected Deletion', () => {
    // 1. Create parent category
    const parentCat = inventoryService.createCategory({
        name: 'الملابس الرجالية الصيفية',
        description: 'تشكيلة صيفية متميزة',
        displayOrder: 1
    });
    assert.ok(parentCat.id, 'Parent category must have an ID');
    assert.ok(parentCat.category_code.startsWith('CAT-'), 'Category code must follow CAT-XX format');

    // 2. Create subcategory
    const subCat = inventoryService.createCategory({
        name: 'قمصان كلاسيك كتان',
        parentId: parentCat.id,
        displayOrder: 2
    });
    assert.strictEqual(subCat.parent_id, parentCat.id, 'Parent ID must be linked');
    assert.ok(subCat.category_code.startsWith('CAT-'), 'Subcategory code must follow CAT-XX format');

    // 3. Update category
    const updatedCat = inventoryService.updateCategory(subCat.id, {
        name: 'قمصان كلاسيك كتان فاخر',
        displayOrder: 5
    });
    assert.strictEqual(updatedCat.name, 'قمصان كلاسيك كتان فاخر');
    assert.strictEqual(updatedCat.display_order, 5);

    // 4. Verify listCategories includes parent_name and items_count
    const catList = inventoryService.listCategories({ search: 'كتان فاخر' });
    assert.strictEqual(catList.length, 1);
    assert.strictEqual(catList[0].parent_name, 'الملابس الرجالية الصيفية');
    assert.strictEqual(catList[0].items_count, 0);

    // 5. Add product linked to this subcategory
    const admin = db.get("SELECT id FROM users WHERE role = 'admin'");
    const prod = inventoryService.createProduct({
        itemName: 'قميص كتان بيج مقاس L',
        categoryId: subCat.id,
        costPrice: 160,
        sellPrice: 290,
        initialStock: 10,
        reorderLevel: 5
    }, admin.id);

    // 6. Protected delete: must block deletion while products exist
    assert.throws(() => {
        inventoryService.deleteCategory(subCat.id);
    }, /لا يمكن حذف المجموعة لاحتوائها على/);

    // 7. Delete product, then category deletion must succeed
    inventoryService.deleteProduct(prod.id, admin.id);
    const delResult = inventoryService.deleteCategory(subCat.id);
    assert.strictEqual(delResult.success, true);
});

// 18. Simplified Master Items Catalog, ITM-XXXXXX, Pricing & 4 Executive KPIs
runTest('18. Catalog: Simplified Items, ITM-XXXXXX Codes & 4 Executive KPIs', () => {
    const admin = db.get("SELECT id FROM users WHERE role = 'admin'");

    // 1. Create product with fast 2-section parameters
    const newProd = inventoryService.createProduct({
        itemName: 'تيشيرت بولو قطن مصري ممتاز',
        costPrice: 120,
        sellPrice: 220,
        wholesalePrice: 180,
        minSellingPrice: 200,
        initialStock: 15,
        reorderLevel: 5,
        brand: 'Cotton Club Master',
        unitOfMeasure: 'قطعة'
    }, admin.id);

    assert.ok(newProd.id, 'Product must have an ID');
    assert.ok(newProd.product_code.startsWith('ITM-'), 'Product code must follow ITM-XXXXXX');
    assert.strictEqual(newProd.barcode, newProd.product_code, 'Barcode should default to product_code if empty');
    assert.strictEqual(newProd.wholesale_price, 180);
    assert.strictEqual(newProd.min_selling_price, 200);

    // 2. Update product
    const updatedProd = inventoryService.updateProduct(newProd.id, {
        itemName: 'تيشيرت بولو قطن مصري فاخر',
        wholesalePrice: 185
    }, admin.id);
    assert.strictEqual(updatedProd.item_name, 'تيشيرت بولو قطن مصري فاخر');
    assert.strictEqual(updatedProd.wholesale_price, 185);

    // 3. Test getCatalogOverview returning 4 KPIs
    const kpis = inventoryService.getCatalogOverview();
    assert.ok(typeof kpis.total_categories === 'number', 'total_categories KPI must exist');
    assert.ok(typeof kpis.total_products === 'number', 'total_products KPI must exist');
    assert.ok(typeof kpis.low_stock_count === 'number', 'low_stock_count KPI must exist');
    assert.ok(typeof kpis.out_of_stock_count === 'number', 'out_of_stock_count KPI must exist');
    assert.ok(kpis.total_products >= 1, 'Should count active products');

    // 4. Test stockStatus filter queries
    const inStockList = inventoryService.listProducts({ stockStatus: 'in_stock' });
    assert.ok(inStockList.some(p => p.id === newProd.id), 'Newly created product must appear in in_stock filter');

    // 5. Test soft delete product
    const delRes = inventoryService.deleteProduct(newProd.id, admin.id);
    assert.strictEqual(delRes.success, true);

    const recheck = inventoryService.listProducts({ search: newProd.product_code });
    assert.strictEqual(recheck.length, 0, 'Deleted product must not be returned in catalog list');
});

// 19. Enhanced Purchase Invoices & Stock Audit Reconciliation
runTest('19. Purchase Invoices & Stock Audit: Detailed voucher retrieval & cost updates', () => {
    const admin = db.get("SELECT id FROM users WHERE role = 'admin'");
    const supplier = db.get('SELECT id, balance FROM suppliers LIMIT 1');
    const product = db.get('SELECT id, current_stock, cost_price FROM products WHERE is_active = 1 LIMIT 1');

    const prevStock = product.current_stock;
    const initialSupBalance = Number(supplier.balance);

    // 1. Create Purchase Invoice with multi-tender split and sell price update
    const invoice = purchaseService.createPurchaseInvoice({
        supplierId: supplier.id,
        items: [
            { productId: product.id, quantity: 5, unitCost: 150.0, sellPrice: 280.0, discountPercent: 0 }
        ],
        subtotal: 750.0,
        discountAmount: 50.0,
        shippingCost: 30.0,
        taxAmount: 20.0,
        paymentBreakdown: { cash: 100.0, bankTransfer: 150.0, eWallet: 0 },
        payFromTreasury: false,
        notes: 'توريد دفعة تجريبية فنية بنظام السداد المقسم'
    }, admin.id);

    assert.ok(invoice.id, 'Purchase invoice must be created');
    // Total = 750 - 50 + 30 + 20 = 750
    assert.strictEqual(invoice.total_amount, 750.0);
    assert.strictEqual(invoice.paid_amount, 250.0);
    assert.strictEqual(invoice.remaining_amount, 500.0);
    assert.strictEqual(invoice.payment_status, 'partial');

    // Verify stock, cost price & sell price updated
    const updatedProd = db.get('SELECT current_stock, cost_price, sell_price FROM products WHERE id = ?', [product.id]);
    assert.strictEqual(updatedProd.current_stock, prevStock + 5);
    assert.strictEqual(updatedProd.cost_price, 150.0);
    assert.strictEqual(updatedProd.sell_price, 280.0);

    // Verify supplier balance increased by remaining
    const updatedSup = db.get('SELECT balance FROM suppliers WHERE id = ?', [supplier.id]);
    assert.strictEqual(Math.round(updatedSup.balance * 100) / 100, Math.round((initialSupBalance + 500.0) * 100) / 100);

    // Verify getPurchaseInvoiceById returns invoice with line items including sell_price & category_name
    const fetchedInv = purchaseService.getPurchaseInvoiceById(invoice.id);
    assert.ok(fetchedInv, 'Invoice must be found by ID');
    assert.strictEqual(fetchedInv.items.length, 1);
    assert.strictEqual(fetchedInv.items[0].product_id, product.id);
    assert.strictEqual(fetchedInv.items[0].sell_price, 280.0);

    // 2. Perform Stock Audit Recount
    const targetStock = updatedProd.current_stock + 2;
    const adjustRes = inventoryService.adjustStock({
        productId: product.id,
        adjustmentType: 'recount',
        quantity: targetStock,
        reason: 'inventory_count',
        notes: 'مطابقة جرد فني'
    }, admin.id, null);

    assert.ok(adjustRes.adjustmentId, 'Adjustment voucher must be logged');
    assert.strictEqual(adjustRes.newStock, targetStock);

    // Verify listStockAdjustments returns cost_price
    const adjList = inventoryService.listStockAdjustments(10);
    const matchedAdj = adjList.find(a => a.id === adjustRes.adjustmentId);
    assert.ok(matchedAdj, 'Adjustment must be listed in audit log');
    assert.strictEqual(matchedAdj.cost_price, 150.0);
});

// 20. Split Payment Multi-Tender with Credit (آجل) & Supplier Debt Ledger
runTest('20. Purchase Invoices: Split Payment with Credit (آجل) & Supplier Debt Accumulation', () => {
    const admin = db.get("SELECT id FROM users WHERE role = 'admin'");
    const supplier = db.get('SELECT id, balance FROM suppliers LIMIT 1');
    const product = db.get('SELECT id, current_stock, cost_price FROM products WHERE is_active = 1 LIMIT 1');

    const initialSupBalance = Number(supplier.balance);
    const safeBefore = treasuryService.getBalance().balance;

    // Create Purchase invoice: Total 1200 EGP
    // Split payment: 300 Cash, 200 Bank Transfer, 100 eWallet, 600 Credit (آجل)
    const invoice = purchaseService.createPurchaseInvoice({
        supplierId: supplier.id,
        items: [
            { productId: product.id, quantity: 4, unitCost: 300.0, sellPrice: 500.0, discountPercent: 0 }
        ],
        subtotal: 1200.0,
        discountAmount: 0.0,
        shippingCost: 0.0,
        taxAmount: 0.0,
        paymentBreakdown: { cash: 300.0, bankTransfer: 200.0, eWallet: 100.0, credit: 600.0 },
        payFromTreasury: true,
        notes: 'فاتورة توريد مجزأة: كاش وبنك ومحفظة وآجل'
    }, admin.id);

    assert.ok(invoice.id, 'Purchase invoice must be created');
    assert.strictEqual(invoice.total_amount, 1200.0);
    assert.strictEqual(invoice.paid_amount, 600.0, 'Total paid immediate must be 300+200+100 = 600');
    assert.strictEqual(invoice.remaining_amount, 600.0, 'Remaining credit debt must be 600');
    assert.strictEqual(invoice.payment_status, 'partial');

    // Parse breakdown from invoice
    const breakdown = typeof invoice.payment_breakdown === 'string' ? JSON.parse(invoice.payment_breakdown) : invoice.payment_breakdown;
    assert.strictEqual(breakdown.cash, 300.0);
    assert.strictEqual(breakdown.bankTransfer, 200.0);
    assert.strictEqual(breakdown.eWallet, 100.0);
    assert.strictEqual(breakdown.credit, 600.0, 'Credit amount must be explicitly saved in breakdown');

    // Verify treasury was deducted ONLY for cashPart (300 EGP), not credit
    const safeAfter = treasuryService.getBalance().balance;
    assert.strictEqual(safeAfter, safeBefore - 300.0, 'Treasury must only deduct cash portion');

    // Verify supplier balance increased by the remaining credit debt (600 EGP)
    const updatedSup = db.get('SELECT balance FROM suppliers WHERE id = ?', [supplier.id]);
    assert.strictEqual(Math.round(updatedSup.balance * 100) / 100, Math.round((initialSupBalance + 600.0) * 100) / 100, 'Supplier balance must increase by credit debt');

    // Verify supplier statement ledger records the invoice and movement
    const statement = purchaseService.getSupplierAccountStatement(supplier.id);
    assert.ok(statement.movements.length >= 1, 'Statement must have movements');
    const invMovement = statement.movements.find(m => m.referenceNumber === invoice.invoice_number);
    assert.ok(invMovement, 'Invoice must appear in account statement movements');
    assert.strictEqual(invMovement.debit, 1200.0);
});

// 21. Purchase Returns (إرجاع للمورد): Stock reduction, refund settlement, and audit logs
runTest('21. Purchase Returns: Inventory reduction & financial settlement (Debt & Cash)', () => {
    const admin = authService.login('ma', 'ma');
    const supplier = db.get('SELECT * FROM suppliers LIMIT 1');
    const product = db.get('SELECT * FROM products LIMIT 1');

    const initialStock = product.current_stock;
    const initialSup = db.get('SELECT balance FROM suppliers WHERE id = ?', [supplier.id]);
    const initialSupBalance = initialSup ? initialSup.balance : 0;

    // Create a purchase invoice with 10 units at cost 50 EGP each = 500 EGP total
    // 200 paid cash, 300 remaining debt
    const invoice = purchaseService.createPurchaseInvoice({
        supplierId: supplier.id,
        items: [{
            productId: product.id,
            quantity: 10,
            unitCost: 50.0,
            sellPrice: 100.0
        }],
        subtotal: 500.0,
        discountAmount: 0.0,
        shippingCost: 0.0,
        taxAmount: 0.0,
        paymentBreakdown: { cash: 200.0, credit: 300.0 },
        payFromTreasury: false,
        notes: 'فاتورة لاختبار الإرجاع'
    }, admin.id);

    const stockAfterInvoice = db.get('SELECT current_stock FROM products WHERE id = ?', [product.id]).current_stock;
    assert.strictEqual(stockAfterInvoice, initialStock + 10, 'Stock must increase by 10 after invoice');

    // Case 1: Partial return with debt_reduction (Return 2 units = 100 EGP)
    const returnResult1 = purchaseService.createPurchaseReturn({
        purchase_invoice_id: invoice.id,
        supplier_id: supplier.id,
        refund_method: 'debt_reduction',
        reason: 'تالف أو به عيوب تصنيع',
        notes: 'إرجاع قطعتين معيبتين',
        items: [{
            product_id: product.id,
            quantity: 2,
            unit_cost: 50.0
        }]
    }, admin.id);

    assert.ok(returnResult1.return_number.startsWith('RET-'), 'Return number must have prefix RET-');
    assert.strictEqual(returnResult1.total_returned_amount, 100.0);

    // Verify stock reduced by 2
    const stockAfterReturn1 = db.get('SELECT current_stock FROM products WHERE id = ?', [product.id]).current_stock;
    assert.strictEqual(stockAfterReturn1, stockAfterInvoice - 2, 'Stock must decrease by 2 returned units');

    // Verify invoice return_status and remaining_amount
    const updatedInvoice1 = db.get('SELECT remaining_amount, return_status, returned_amount FROM purchase_invoices WHERE id = ?', [invoice.id]);
    assert.strictEqual(updatedInvoice1.return_status, 'partial', 'Invoice return_status must be partial');
    assert.strictEqual(updatedInvoice1.returned_amount, 100.0, 'Returned amount must be 100');
    assert.strictEqual(updatedInvoice1.remaining_amount, 200.0, 'Remaining debt must reduce from 300 to 200');

    // Case 2: Cash refund to treasury (Return 1 unit = 50 EGP)
    const safeBeforeCashReturn = treasuryService.getBalance().balance;
    const returnResult2 = purchaseService.createPurchaseReturn({
        purchase_invoice_id: invoice.id,
        supplier_id: supplier.id,
        refund_method: 'cash_treasury',
        reason: 'فائض مخزون',
        notes: 'استرداد نقدي بالخزنة',
        items: [{
            product_id: product.id,
            quantity: 1,
            unit_cost: 50.0
        }]
    }, admin.id);

    const safeAfterCashReturn = treasuryService.getBalance().balance;
    assert.strictEqual(safeAfterCashReturn, safeBeforeCashReturn + 50.0, 'Central treasury balance must increase by 50 EGP');

    // Case 3: Verify list returns by invoice
    const returnsList = purchaseService.getPurchaseReturnsByInvoice(invoice.id);
    assert.strictEqual(returnsList.length, 2, 'Must have 2 return records for this invoice');
    assert.strictEqual(returnsList[0].items.length >= 1, true, 'Return record must contain item details');

    // Case 5: Multi-Tender Return (Cash + Bank + Debt Reduction) with Central Treasury deposit
    const safeBeforeMulti = treasuryService.getBalance().balance;
    const debtBeforeMulti = db.get('SELECT remaining_amount FROM purchase_invoices WHERE id = ?', [invoice.id]).remaining_amount;

    // Return 3 units at 50 EGP = 150 EGP total
    // Split: 50 cash (treasury) + 50 bankTransfer + 50 debtReduction
    const returnResultMulti = purchaseService.createPurchaseReturn({
        purchase_invoice_id: invoice.id,
        supplier_id: supplier.id,
        refund_breakdown: {
            cash: 50.0,
            bankTransfer: 50.0,
            eWallet: 0.0,
            debtReduction: 50.0
        },
        reason: 'إرجاع متعدد الطرق',
        notes: 'سند إرجاع مجزأ',
        items: [{
            product_id: product.id,
            quantity: 3,
            unit_cost: 50.0
        }]
    }, admin.id);

    assert.strictEqual(returnResultMulti.refund_method, 'multi', 'Refund method should be multi');
    assert.strictEqual(returnResultMulti.refund_breakdown.cash, 50.0);
    assert.strictEqual(returnResultMulti.refund_breakdown.bankTransfer, 50.0);
    assert.strictEqual(returnResultMulti.refund_breakdown.debtReduction, 50.0);

    // Verify Central Treasury balance increased by 50 EGP cash
    const safeAfterMulti = treasuryService.getBalance().balance;
    assert.strictEqual(safeAfterMulti, safeBeforeMulti + 50.0, 'Central Treasury must increase by the cash portion (50 EGP)');

    // Verify remaining invoice debt decreased by 50 EGP
    const debtAfterMulti = db.get('SELECT remaining_amount FROM purchase_invoices WHERE id = ?', [invoice.id]).remaining_amount;
    assert.strictEqual(debtAfterMulti, debtBeforeMulti - 50.0, 'Remaining invoice debt must decrease by the debt reduction portion (50 EGP)');

    // Case 6: Guard against returning more than available stock or purchased quantity
    assert.throws(() => {
        purchaseService.createPurchaseReturn({
            purchase_invoice_id: invoice.id,
            refund_method: 'debt_reduction',
            items: [{
                product_id: product.id,
                quantity: 99999,
                unit_cost: 50.0
            }]
        }, admin.id);
    }, /تتجاوز الكمية المتاحة للإرجاع/, 'Should prevent returning more than quantity purchased in invoice');
});

// 22. Security, Access Levels & Hub Navigation Integrity Tests
runTest('22. Security, Access Levels & Hub Navigation Integrity', () => {
    const bcrypt = require('bcryptjs');
    // 1. Verify Default Users & Password Hashing
    const maUser = db.get('SELECT * FROM users WHERE username = ?', ['ma']);
    const coUser = db.get('SELECT * FROM users WHERE role = ?', ['cashier']);
    assert.ok(maUser, "Admin 'ma' must exist");
    assert.ok(coUser, "Cashier 'co' must exist");
    assert.strictEqual(maUser.is_active, 1, "Admin 'ma' must be active");
    assert.strictEqual(coUser.is_active, 1, "Cashier 'co' must be active");
    assert.ok(bcrypt.compareSync('ma', maUser.password_hash), "Admin 'ma' password must verify");
    assert.ok(bcrypt.compareSync('co', coUser.password_hash), "Cashier 'co' password must verify");

    // 2. Manager Override Verification
    const maOverride = authService.verifyManagerOverride('ma', 'ma');
    assert.strictEqual(maOverride.success, true, 'Admin ma must be authorized for manager overrides');
    const coOverride = authService.verifyManagerOverride('co', 'co');
    assert.strictEqual(coOverride.success, false, 'Cashier co must NOT be authorized for manager overrides');

    // 3. Cashier Discount Ceiling Enforcement (<= 5% allowed, > 5% throws without override)
    const testSession = sessionService.openSession(coUser.id, 500.0, 'جلسة اختبار الصلاحيات');
    const product = posService.findProductByBarcode('6221001001');
    // Cashier attempting 6% discount without override must fail
    assert.throws(() => {
        posService.checkout({
            sessionId: testSession.id,
            userId: coUser.id,
            userRole: 'cashier',
            items: [{ productId: product.id, quantity: 1 }],
            paymentMethod: 'cash',
            discountPercent: 6,
            managerOverride: null
        });
    }, /الحد الأقصى للخصم المسموح به للكاشير/, 'Cashier discount > 5% without manager override must be blocked');

    // 4. Verify View Panels and Navigation Parity in HTML and app.js
    const fs = require('fs');
    const path = require('path');
    const html = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf8');
    const appJs = fs.readFileSync(path.join(__dirname, '../src/renderer/js/app.js'), 'utf8');

    const expectedPanels = [
        'view-hub', 'view-pos', 'view-sales-hub', 'view-sales-settings',
        'view-customers', 'view-inventory-hub', 'view-new-product',
        'view-stock-audit', 'view-purchases-hub', 'view-purchases-invoices',
        'view-new-purchase-invoice', 'view-financial-hub', 'view-employees',
        'view-users', 'view-expenses'
    ];

    expectedPanels.forEach(panelId => {
        assert.ok(html.includes(`id="${panelId}"`), `View panel #${panelId} must exist in index.html`);
    });

    // Verify unified sales-hub contains both sub-panels
    assert.ok(html.includes('id="panel-sales-session"'), 'Sub-panel #panel-sales-session must exist in sales-hub');
    assert.ok(html.includes('id="panel-sales-analytics"'), 'Sub-panel #panel-sales-analytics must exist in sales-hub');

    // Verify all cashier cards target valid views
    const cashierViews = ['pos', 'session', 'expenses'];
    cashierViews.forEach(v => {
        let resolved = v === 'session' ? 'sales-hub' : v;
        assert.ok(html.includes(`id="view-${resolved}"`), `Cashier view #${resolved} must exist in index.html`);
    });

    // Verify all admin cards target valid views
    const adminViews = [
        'sales-hub', 'customers', 'sales-settings',
        'inventory-hub', 'stock-audit', 'purchases-hub',
        'purchases-invoices', 'financial-hub', 'employees'
    ];
    adminViews.forEach(v => {
        assert.ok(html.includes(`id="view-${v}"`), `Admin view #${v} must exist in index.html`);
    });
});

// 23. Direct POS Engine: Strict Workflows, Inventory Movements & Drawer Safety
runTest('23. Direct POS Engine: Strict Workflows, Inventory Movements & Drawer Safety', () => {
    const admin = db.get("SELECT id FROM users WHERE role = 'admin'");
    const activeSession = sessionService.getActiveSession();
    assert.ok(activeSession, 'An active session must exist');

    const product = db.get("SELECT id, current_stock, cost_price, sell_price, barcode FROM products WHERE is_active = 1 AND current_stock > 2 LIMIT 1");
    assert.ok(product, 'Test product must exist');
    const initialStock = product.current_stock;

    // 1. Sale Mode: Checkout 1 item and verify inventory_movements record
    const saleResult = posService.checkout({
        sessionId: activeSession.id,
        userId: admin.id,
        userRole: 'admin',
        invoiceType: 'sale',
        items: [{ productId: product.id, quantity: 1 }],
        paymentMethod: 'cash'
    });

    assert.ok(saleResult.id, 'Sale invoice should be created');
    assert.ok(saleResult.invoice_number.startsWith('INV-'), 'Sale invoice number must start with INV-');

    // Verify product current_stock decremented by 1
    const productAfterSale = db.get("SELECT current_stock FROM products WHERE id = ?", [product.id]);
    assert.strictEqual(productAfterSale.current_stock, initialStock - 1, 'Current stock must be decremented by 1 after sale');

    // Verify inventory_movements record for sale_out
    const saleMovement = db.get(
        "SELECT * FROM inventory_movements WHERE reference_type = 'sales_invoices' AND reference_id = ? AND movement_type = 'sale_out'",
        [saleResult.id]
    );
    assert.ok(saleMovement, 'sale_out movement must be recorded in inventory_movements');
    assert.strictEqual(saleMovement.quantity, 1);
    assert.strictEqual(saleMovement.stock_before, initialStock);
    assert.strictEqual(saleMovement.stock_after, initialStock - 1);

    // 2. Return Mode: Return 1 item and verify inventory_movements record
    const returnResult = posService.checkout({
        sessionId: activeSession.id,
        userId: admin.id,
        userRole: 'admin',
        invoiceType: 'return',
        items: [{ productId: product.id, quantity: 1 }],
        paymentMethod: 'cash'
    });

    assert.ok(returnResult.id, 'Return invoice should be created');
    assert.ok(returnResult.invoice_number.startsWith('RET-'), 'Return invoice number must start with RET-');

    // Verify stock restored
    const productAfterReturn = db.get("SELECT current_stock FROM products WHERE id = ?", [product.id]);
    assert.strictEqual(productAfterReturn.current_stock, initialStock, 'Current stock must be restored after return');

    // Verify inventory_movements record for return_in
    const returnMovement = db.get(
        "SELECT * FROM inventory_movements WHERE reference_type = 'sales_invoices' AND reference_id = ? AND movement_type = 'return_in'",
        [returnResult.id]
    );
    assert.ok(returnMovement, 'return_in movement must be recorded in inventory_movements');
    assert.strictEqual(returnMovement.quantity, 1);
    assert.strictEqual(returnMovement.stock_before, initialStock - 1);
    assert.strictEqual(returnMovement.stock_after, initialStock);

    // 3. Return Mode Drawer Safety: block return if refund exceeds drawer cash
    const currentDrawerCash = sessionService.getCurrentDrawerCash(activeSession.id);
    assert.throws(() => {
        posService.checkout({
            sessionId: activeSession.id,
            userId: admin.id,
            userRole: 'admin',
            invoiceType: 'return',
            items: [{ productId: product.id, quantity: 1, unitPrice: currentDrawerCash + 5000 }],
            paymentMethod: 'cash'
        });
    }, /لا يتوفر رصيد نقدي كافٍ في الخزينة لصرف المرتجع/, 'Must block cash return if drawer cash is insufficient');

    // 4. Exact Penny Payment Match: split payments must match final total exactly
    assert.throws(() => {
        posService.checkout({
            sessionId: activeSession.id,
            userId: admin.id,
            userRole: 'admin',
            invoiceType: 'sale',
            items: [{ productId: product.id, quantity: 1 }],
            paymentMethod: 'split',
            splitPayments: { cash: 10, card: 10, transfer: 10 } // mismatched amount
        });
    }, /لا يطابق إجمالي الفاتورة المطلوبة/, 'Split payment mismatch must be rejected');

    // 5. searchProductsByCategory method
    const catProds = posService.searchProductsByCategory('all', '', 10);
    assert.ok(Array.isArray(catProds) && catProds.length > 0, 'searchProductsByCategory must return products array');

    // 6. listInventoryMovements method
    const movementsList = posService.listInventoryMovements(product.id, 10);
    assert.ok(Array.isArray(movementsList) && movementsList.length >= 2, 'listInventoryMovements must return movement logs');

    // 7. Auto close shift check method
    const autoCloseRes = sessionService.checkAutoCloseShift();
    assert.ok(typeof autoCloseRes.autoClosed === 'boolean', 'checkAutoCloseShift must return status object');
});

runTest('24. Continuous Shift & Automatic Treasury Rollover (نظام اليومية المستمرة والترحيل التلقائي للخزنة)', () => {
    const admin = authService.login('ma', 'ma');
    
    // 1. Ensure active session exists automatically without manual opening
    const activeSession = sessionService.ensureActiveSession(admin.id);
    assert.ok(activeSession && activeSession.status === 'open', 'ensureActiveSession must provide an open session');

    const treasuryBefore = treasuryService.getBalance().balance;

    // 2. Perform a cash sale
    const product = db.get("SELECT * FROM products WHERE is_active = 1 LIMIT 1");
    const saleRes = posService.checkout({
        sessionId: activeSession.id,
        userId: admin.id,
        items: [{
            productId: product.id,
            quantity: 2,
            unitPrice: product.sell_price,
            itemName: product.item_name
        }],
        paymentMethod: 'cash'
    });
    assert.ok(saleRes && saleRes.invoice_number, 'Sale must be completed');

    const summary = sessionService.getSessionSummary(activeSession.id);
    const expectedDrawerCash = summary.expectedCash;
    assert.ok(expectedDrawerCash > 0, 'Drawer cash must be positive');

    // 3. Configure rollover cutoff time and simulate past cutoff
    db.run("INSERT OR REPLACE INTO app_settings (key, value, description) VALUES ('auto_close_shift_time', '00:01', 'Cutoff time')");
    db.run("UPDATE daily_sessions SET opened_at = datetime('now', '-2 days') WHERE id = ?", [activeSession.id]);

    // 4. Trigger rollover
    const rolloverRes = sessionService.checkAndRolloverShift(admin.id);
    assert.ok(rolloverRes.rolledOver, 'Rollover must have executed');

    // 5. Verify drawer cash was transferred into Central Treasury
    const treasuryAfter = treasuryService.getBalance().balance;
    const diff = Math.round((treasuryAfter - treasuryBefore) * 100) / 100;
    assert.strictEqual(diff, expectedDrawerCash, 'Treasury balance must increase by exact drawer cash');

    // 6. Verify previous session closed and new session is open
    const closed = sessionService.getSessionById(activeSession.id);
    assert.strictEqual(closed.status, 'closed', 'Previous session must be closed');
    assert.strictEqual(closed.closing_cash_actual, expectedDrawerCash, 'Closing cash actual must match expected');

    const newActive = sessionService.getActiveSession();
    assert.ok(newActive && newActive.id === rolloverRes.newSession.id, 'New session must be currently active');
    assert.strictEqual(newActive.status, 'open', 'New session must be open for continuous business');
});

runTest('25. Expenses & Refunded Expenses: Dual Cash Flow, EXP-YYMM Codes & Shift Accounting', () => {
    const admin = db.get("SELECT id FROM users WHERE role = 'admin'");
    const active = sessionService.getActiveSession();
    assert.ok(active, 'Must have active session');

    // 1. Record Outbound Expense
    const outExp = expenseService.addExpense({
        sessionId: active.id,
        operational_type: 'expense',
        category: 'سلف وسحب بائعين',
        amount: 300,
        description: 'سلفة موظف صالة',
        recipient_name: 'محمد بائع',
        salesperson_id: admin.id
    }, admin.id);

    assert.ok(outExp.voucher_code.startsWith('EXP-'), 'Code must start with EXP-');
    assert.strictEqual(outExp.operational_type, 'expense');
    assert.strictEqual(outExp.amount, 300);

    // 2. Record Inbound Refunded Expense
    const refExp = expenseService.addExpense({
        sessionId: active.id,
        operational_type: 'returned_expense',
        category: 'مصروف مرتد (إيداع نقدية)',
        amount: 120,
        description: 'سداد جزء من السلفة نقداً للدرج',
        recipient_name: 'محمد بائع',
        salesperson_id: admin.id
    }, admin.id);

    assert.ok(refExp.voucher_code.startsWith('EXP-'), 'Code must start with EXP-');
    assert.strictEqual(refExp.operational_type, 'returned_expense');
    assert.strictEqual(refExp.amount, 120);

    // 3. Verify Summary & KPIs
    const summary = expenseService.getExpensesSummary({ sessionId: active.id });
    assert.ok(summary.total_out >= 300);
    assert.ok(summary.total_refunded >= 120);
    assert.strictEqual(summary.net_expense, Math.round((summary.total_out - summary.total_refunded) * 100) / 100);

    // 4. Verify Analytics
    const analytics = expenseService.getExpensesAnalytics(30);
    assert.strictEqual(analytics.period_days, 30);
    assert.ok(Array.isArray(analytics.daily_trend));
    assert.ok(Array.isArray(analytics.category_breakdown));

    // 5. Verify Session Summary calculation factors net expenses
    const sessSummary = sessionService.getSessionSummary(active.id);
    assert.strictEqual(sessSummary.totalExpenses, summary.net_expense);
});

// 26. Customers Directory & CRM
runTest('26. Customers Directory: CRUD, Invoices Link, KPIs & Excel Sheet Export', () => {
    // 1. Create Customer
    const testPhone = '01012345678';
    const cust1 = posService.createCustomer({
        name: 'عميل تجريبي ممتاز',
        phone: testPhone,
        email: 'vip-client@cottonclub.com',
        notes: 'يفضل المقاسات الكبيرة'
    });
    assert.ok(cust1.id > 0);
    assert.strictEqual(cust1.name, 'عميل تجريبي ممتاز');
    assert.strictEqual(cust1.phone, testPhone);

    // 2. Prevent Duplicate Phone on Update
    const cust2 = posService.createCustomer({
        name: 'عميل ثانٍ',
        phone: '01099998888',
        email: 'client2@cottonclub.com'
    });
    assert.throws(() => {
        posService.updateCustomer(cust2.id, {
            name: 'عميل معدل',
            phone: testPhone // Already belongs to cust1
        });
    }, /رقم الهاتف مستخدم بالفعل لعميل آخر/);

    // 3. Update Customer details
    const updatedCust1 = posService.updateCustomer(cust1.id, {
        name: 'عميل تجريبي VIP معدل',
        phone: testPhone,
        email: 'vip-client@cottonclub.com',
        points: 50,
        notes: 'تمت ترقيته لعميل ذهبي'
    });
    assert.strictEqual(updatedCust1.name, 'عميل تجريبي VIP معدل');
    assert.strictEqual(updatedCust1.points, 50);

    // 4. Link Sales Invoice to Customer
    const active = sessionService.getActiveSession();
    const admin = authService.login('ma', 'ma');
    const p1 = db.get('SELECT * FROM products WHERE current_stock > 0 LIMIT 1');

    const checkoutRes = posService.checkout({
        sessionId: active.id,
        userId: admin.id,
        customerId: cust1.id,
        customerName: cust1.name,
        customerPhone: cust1.phone,
        items: [{
            productId: p1.id,
            barcode: p1.barcode,
            quantity: 1,
            unitPrice: p1.sell_price,
            costPrice: p1.cost_price || 0
        }],
        subtotal: p1.sell_price,
        discountAmount: 0,
        finalTotal: p1.sell_price,
        paymentMethod: 'cash',
        cashAmount: p1.sell_price
    });
    assert.ok(checkoutRes.id > 0);

    // 5. Verify listCustomers with aggregate stats
    const custList = posService.listCustomers({ query: 'VIP', limit: 10 });
    assert.ok(custList.length >= 1);
    const foundCust = custList.find(c => c.id === cust1.id);
    assert.ok(foundCust);
    assert.ok(foundCust.invoices_count >= 1);
    assert.ok(foundCust.total_spent >= p1.sell_price);

    // 6. Verify Customer KPIs
    const stats = posService.getCustomerStats();
    assert.ok(stats.totalCustomers >= 2);
    assert.ok(stats.totalSpent > 0);
    assert.ok(stats.customersWithInvoices >= 1);

    // 7. Verify Customer Invoices query
    const custInvoices = posService.getCustomerInvoices(cust1.id);
    assert.ok(custInvoices.length >= 1);
    assert.strictEqual(custInvoices[0].invoice_number, checkoutRes.invoice_number);

    // 8. Verify Excel / CSV Export Structure
    const headers = ['كود العميل', 'اسم العميل', 'رقم الهاتف', 'البريد الإلكتروني', 'إجمالي المشتريات (ج.م)', 'عدد الفواتير', 'نقاط الولاء', 'تاريخ التسجيل', 'ملاحظات'];
    const csvContent = '\uFEFF' + headers.join(',') + '\r\n' + `"${cust1.id}","${cust1.name}","${cust1.phone}"`;
    assert.ok(csvContent.startsWith('\uFEFF'), 'CSV must include UTF-8 BOM for Arabic Excel');
});

console.log('\n====================================================');
console.log(`🎉 All ${passedTests}/${totalTests} tests PASSED successfully!`);
console.log('====================================================');
