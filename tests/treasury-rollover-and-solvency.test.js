/**
 * Cotton Club POS - Central Treasury Rollover & Solvency Guard Tests
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { DatabaseManager } = require('../src/database/db');
const { TreasuryService } = require('../src/services/treasuryService');
const { SessionService } = require('../src/services/sessionService');
const { PurchaseService } = require('../src/services/purchaseService');
const { PayrollService } = require('../src/services/payrollService');
const { PosService } = require('../src/services/posService');
const { AuthService } = require('../src/services/authService');
const { seedDatabase } = require('../src/database/seed');

async function runTreasuryTests() {
    console.log('====================================================');
    console.log('🧪 Starting Central Treasury Rollover & Solvency Tests');
    console.log('====================================================');

    const testDbPath = path.join(__dirname, 'treasury_test.db');
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }

    const db = new DatabaseManager(testDbPath);
    seedDatabase(db);
    const treasury = new TreasuryService(db);
    const session = new SessionService(db, treasury);
    const auth = new AuthService(db);
    const purchases = new PurchaseService(db, treasury);
    const payroll = new PayrollService(db, treasury);
    const pos = new PosService(db, session);

    try {
        // 1. Initial State: Starting treasury balance from seed
        const initialBal = treasury.getBalance();
        console.log('1. Initial Treasury Balance:', initialBal);
        assert.strictEqual(initialBal.balance, 15000, 'Initial seed balance should be 15,000 EGP');
        assert.strictEqual(initialBal.cashBalance, 15000, 'Initial cash balance should be 15,000 EGP');
        assert.strictEqual(initialBal.cardBalance, 0, 'Initial card balance should be 0 EGP');
        assert.strictEqual(initialBal.transferBalance, 0, 'Initial transfer balance should be 0 EGP');
        console.log('✅ [PASS] 1. Initial Treasury Balance correctly partitioned into cash, card, and transfer');

        // 2. Open daily sales session and perform sales across Cash, Card, and Transfer
        const activeSession = session.ensureActiveSession(1);
        assert.ok(activeSession, 'Active session opened');

        // Fetch products
        const products = db.all('SELECT * FROM products WHERE is_active = 1 LIMIT 3');
        assert.ok(products.length >= 2, 'Must have at least 2 products');

        // Checkout Invoice 1: Cash 300 EGP
        const inv1 = pos.checkout({
            sessionId: activeSession.id,
            userId: 1,
            userRole: 'admin',
            items: [{ productId: products[0].id, quantity: 4, itemName: products[0].item_name }],
            discountPercent: 0,
            paymentMethod: 'cash'
        });
        assert.ok(inv1.final_total > 0);

        // Checkout Invoice 2: Card (Visa)
        const inv2 = pos.checkout({
            sessionId: activeSession.id,
            userId: 1,
            userRole: 'admin',
            items: [{ productId: products[1].id, quantity: 2, itemName: products[1].item_name }],
            discountPercent: 0,
            paymentMethod: 'card'
        });
        assert.ok(inv2.final_total > 0);

        // Checkout Invoice 3: Transfer
        const inv3 = pos.checkout({
            sessionId: activeSession.id,
            userId: 1,
            userRole: 'admin',
            items: [{ productId: products[0].id, quantity: 2, itemName: products[0].item_name }],
            discountPercent: 0,
            paymentMethod: 'transfer'
        });
        assert.ok(inv3.final_total > 0);

        // Verify session summary has distinct breakdown
        const sessionSummary = session.getSessionSummary(activeSession.id);
        const cashAmount = sessionSummary.expectedCash;
        const cardAmount = sessionSummary.netCardSales;
        const transferAmount = sessionSummary.netTransferSales;

        assert.ok(cashAmount > 0, 'Cash sales must be > 0');
        assert.ok(cardAmount > 0, 'Card sales must be > 0');
        assert.ok(transferAmount > 0, 'Transfer sales must be > 0');
        console.log('✅ [PASS] 2. POS sales completed with multi-tender methods (Cash, Card, Transfer)');

        // 3. Close / Rollover session -> All funds transfer to Central Treasury
        const closeRes = session.closeSession(activeSession.id, 1, cashAmount, 'إغلاق اليوم التجريبي');
        assert.ok(closeRes, 'Session closed successfully');

        const balAfterRollover = treasury.getBalance();
        console.log('3. Treasury Balance After Rollover:', balAfterRollover);
        assert.strictEqual(balAfterRollover.cashBalance, 15000 + cashAmount, 'Cash balance must match');
        assert.strictEqual(balAfterRollover.cardBalance, cardAmount, 'Card balance must match');
        assert.strictEqual(balAfterRollover.transferBalance, transferAmount, 'Transfer balance must match');
        assert.strictEqual(balAfterRollover.balance, 15000 + cashAmount + cardAmount + transferAmount, 'Total balance must match');
        console.log('✅ [PASS] 3. Automatic sales rollover transferred Cash, Card, and Transfer to Admin Safe');

        // 4. Strict Solvency Check: Supplier Payment cannot exceed available cash
        const supplier = db.get('SELECT * FROM suppliers LIMIT 1');
        assert.ok(supplier, 'Supplier exists');

        const currentCash = balAfterRollover.cashBalance;
        // Attempting to pay more than currentCash must throw!
        assert.throws(() => {
            purchases.recordSupplierPayment({
                supplierId: supplier.id,
                amount: currentCash + 5000,
                paymentMethod: 'cash',
                notes: 'محاولة دفع تتجاوز الخزنة'
            }, 1);
        }, /رصيد الكاش بالخزينة المركزية غير كافٍ/);
        console.log('✅ [PASS] 4. Supplier payment properly blocked when exceeding safe balance');

        // Pay valid cash: 2,000 EGP
        const payment = purchases.recordSupplierPayment({
            supplierId: supplier.id,
            amount: 2000,
            paymentMethod: 'cash',
            notes: 'سداد دفعة للمورد من الخزنة'
        }, 1);
        assert.ok(payment.success, 'Valid supplier payment succeeded');

        const balAfterSupplier = treasury.getBalance();
        assert.strictEqual(balAfterSupplier.cashBalance, currentCash - 2000, 'Cash balance should decrease by 2000');
        assert.strictEqual(balAfterSupplier.balance, balAfterRollover.balance - 2000, 'Total balance should decrease by 2000');
        console.log('✅ [PASS] 5. Supplier payment deducted directly from Admin Safe cash');

        // 5. Strict Solvency Check: Employee Salary cannot exceed available cash
        const employee = payroll.createEmployee({
            fullName: 'أحمد محمود كاشير',
            jobTitle: 'كاشير',
            basicSalary: 4500,
            phone: '01011223344'
        }, 1);

        const currentCash2 = balAfterSupplier.cashBalance;
        // Attempting to disburse more than currentCash2 must throw!
        assert.throws(() => {
            payroll.disburseSalary({
                employeeId: employee.id,
                amount: currentCash2 + 5000,
                paymentType: 'salary',
                paymentSource: 'treasury'
            }, 1);
        }, /رصيد الكاش بالخزنة المركزية.*لا يكفي/);
        console.log('✅ [PASS] 6. Salary disbursement properly blocked when exceeding safe balance');

        // Disburse valid salary: 4,000 EGP
        const salaryVoucher = payroll.disburseSalary({
            employeeId: employee.id,
            amount: 4000,
            paymentType: 'salary',
            paymentSource: 'treasury',
            notes: 'صرف راتب شهر تجريبي'
        }, 1);
        assert.ok(salaryVoucher, 'Salary disbursement created');

        const balAfterSalary = treasury.getBalance();
        assert.strictEqual(balAfterSalary.cashBalance, currentCash2 - 4000, 'Cash balance should decrease by 4000');
        assert.strictEqual(balAfterSalary.balance, balAfterSupplier.balance - 4000, 'Total balance should decrease by 4000');
        console.log('✅ [PASS] 7. Salary disbursement deducted directly from Admin Safe cash');

        // 6. Running Balance and Transactions List Integrity
        const txList = treasury.listTransactions(50);
        assert.ok(txList.length >= 4, 'Should have multiple recorded transactions');
        assert.strictEqual(txList[0].running_balance, balAfterSalary.balance, 'Latest running balance must equal current total balance');
        
        // Check payment_method column exists in transactions
        const hasPaymentMethods = txList.some(t => t.payment_method === 'card') && txList.some(t => t.payment_method === 'transfer');
        assert.ok(hasPaymentMethods, 'Transactions ledger must track payment methods for card and transfer');
        console.log('✅ [PASS] 8. Treasury transaction ledger computes exact running balances and payment methods');

        console.log('====================================================');
        console.log('🎉 ALL Treasury Rollover & Solvency Tests PASSED!');
        console.log('====================================================');
    } finally {
        db.close();
        if (fs.existsSync(testDbPath)) {
            try { fs.unlinkSync(testDbPath); } catch (e) {}
        }
    }
}

runTreasuryTests().catch(err => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
});
