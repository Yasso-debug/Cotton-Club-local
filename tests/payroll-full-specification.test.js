/**
 * Dedicated Test Suite: Full Specification for «صرف المرتبات» (Payroll & Expense Categories)
 * Verifies Smart Settlement, Live Safe Deduction, Accounting Documentation, Payslips, and Categories Management.
 */

const assert = require('assert');
const { DatabaseManager } = require('../src/database/db');
const { TreasuryService } = require('../src/services/treasuryService');
const { PayrollService } = require('../src/services/payrollService');
const { ExpenseService } = require('../src/services/expenseService');

const { seedDatabase } = require('../src/database/seed');

console.log('====================================================');
console.log('🧪 Starting Full Specification Tests for صرف المرتبات');
console.log('====================================================');

const db = new DatabaseManager(':memory:');
db.connect();
seedDatabase(db);

const treasuryService = new TreasuryService(db);
const payrollService = new PayrollService(db, treasuryService);
const expenseService = new ExpenseService(db);

const admin = db.get("SELECT id FROM users WHERE role = 'admin'");
assert.ok(admin, 'Admin user must exist');

// Seed Central Treasury with starting cash
treasuryService.deposit(50000, 'إيداع افتتاحي', 'رصيد افتتاحي للخزينة للاختبار', admin.id, 'cash');

let passed = 0;
function test(name, fn) {
    try {
        fn();
        console.log(`✅ [PASS] ${name}`);
        passed++;
    } catch (e) {
        console.error(`❌ [FAIL] ${name}`);
        console.error(e);
        process.exit(1);
    }
}

// 1. Employee Creation with Branch
test('1. Employee Profile & Branch Association', () => {
    const emp = payrollService.createEmployee({
        fullName: 'كريم عبد العزيز',
        jobTitle: 'كاشير مبيعات أول',
        phone: '01012345678',
        basicSalary: 6000,
        branch: 'فرع المعادي'
    }, admin.id);

    assert.strictEqual(emp.full_name, 'كريم عبد العزيز');
    assert.strictEqual(Number(emp.basic_salary), 6000);
    assert.strictEqual(emp.branch, 'فرع المعادي');
});

// 2. Automated Period Advances Retrieval
test('2. Period Advances Auto-Deduction Tracking from POS/Petty Expenses', () => {
    const emp = db.get("SELECT * FROM employees WHERE full_name = 'كريم عبد العزيز'");
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Create an open session
    const sess = db.run(
        `INSERT INTO daily_sessions (session_code, opened_by, opening_cash, status)
         VALUES ('TEST-SES-01', ?, 1000, 'open')`,
        [admin.id]
    );

    // Record an advance for this cashier in petty_expenses
    expenseService.addExpense({
        operational_type: 'expense',
        category: 'سلف وسحب بائعين',
        subcategory: 'سلفة شخصية',
        amount: 800,
        description: 'سلفة منتصف الشهر لكريم',
        recipient_name: emp.full_name,
        sessionId: sess.lastInsertRowid
    }, admin.id);

    // Query period advances
    const advData = payrollService.getEmployeePeriodAdvances(emp.id, { type: 'month', month: currentMonth });
    assert.strictEqual(advData.totalAdvances, 800, 'Total period advances must equal 800 ج.م');
    assert.strictEqual(advData.count >= 1, true, 'At least 1 advance movement found');
});

// 3. Smart Settlement & Solvency Validation
test('3. Smart Settlement Math & Live Safe Cash Deduction', () => {
    const emp = db.get("SELECT * FROM employees WHERE full_name = 'كريم عبد العزيز'");
    const safeBefore = treasuryService.getBalance().cashBalance;

    // Settle salary: Basic (6000) - Advance (800) - Penalty (200) + Bonus (500) = Net (5500)
    const payment = payrollService.disburseSalary({
        employeeId: emp.id,
        basicSalary: 6000,
        advancesDeducted: 800,
        penaltiesDeducted: 200,
        penaltyReason: 'تأخير غير مبرر يومين',
        bonusesAdded: 500,
        bonusReason: 'تحقيق تارجت مبيعات الويك إند',
        paymentMethod: 'cash',
        deductSource: 'main_safe',
        periodMonth: new Date().toISOString().slice(0, 7),
        periodType: 'month',
        notes: 'تسوية شهرية شاملة'
    }, admin.id);

    assert.ok(payment, 'Payment record must be returned');
    assert.strictEqual(payment.amount, 5500, 'Net amount must equal 5500');
    assert.strictEqual(payment.net_amount, 5500);
    assert.strictEqual(payment.advances_deducted, 800);
    assert.strictEqual(payment.penalties_deducted, 200);
    assert.strictEqual(payment.penalty_reason, 'تأخير غير مبرر يومين');
    assert.strictEqual(payment.bonuses_added, 500);
    assert.strictEqual(payment.bonus_reason, 'تحقيق تارجت مبيعات الويك إند');
    assert.ok(payment.voucher_number.startsWith('#PAY-'), 'Voucher must have #PAY- prefix');

    // Central Treasury must decrease exactly by 5500
    const safeAfter = treasuryService.getBalance().cashBalance;
    assert.strictEqual(safeAfter, safeBefore - 5500, 'Safe cash must decrease by net payout');

    // Automated petty expenses entry check
    const expEntry = db.get("SELECT * FROM petty_expenses WHERE category = 'مرتبات وأجور' AND amount = 5500 ORDER BY id DESC LIMIT 1");
    assert.ok(expEntry, 'Automated EXP-PAY entry must exist in petty_expenses');
    assert.ok(expEntry.voucher_code.startsWith('EXP-PAY-'), 'Petty expense code must start with EXP-PAY-');
});

// 4. Solvency Rejection Check
test('4. Strict Solvency Rejection when Safe Balance Insufficient', () => {
    const emp = db.get("SELECT * FROM employees WHERE full_name = 'كريم عبد العزيز'");
    const currentSafeCash = treasuryService.getBalance().cashBalance;

    // Try to disburse more than safe cash
    assert.throws(() => {
        payrollService.disburseSalary({
            employeeId: emp.id,
            basicSalary: currentSafeCash + 10000,
            amount: currentSafeCash + 10000,
            paymentMethod: 'cash',
            deductSource: 'main_safe'
        }, admin.id);
    }, /لا يكفي لصرف هذا المبلغ/, 'Must throw solvency exception');
});

// 5. Branch Safe Disbursal (No Central Safe reduction)
test('5. Branch Safe Disbursal without Central Safe Reduction', () => {
    const emp = db.get("SELECT * FROM employees WHERE full_name = 'كريم عبد العزيز'");
    const safeBefore = treasuryService.getBalance().cashBalance;

    const payment = payrollService.disburseSalary({
        employeeId: emp.id,
        amount: 3000,
        paymentMethod: 'cash',
        deductSource: 'branch_safe',
        notes: 'صرف من درج الفرع'
    }, admin.id);

    assert.ok(payment);
    assert.strictEqual(payment.deduct_source, 'branch_safe');
    const safeAfter = treasuryService.getBalance().cashBalance;
    assert.strictEqual(safeAfter, safeBefore, 'Central safe balance must remain intact');
});

// 6. Expense Categories Management
test('6. Generalized Expense Categories CRUD & Broadcast', () => {
    // 1. Get initial categories
    const initialCats = expenseService.getCategories();
    assert.strictEqual(Array.isArray(initialCats), true);
    const countBefore = initialCats.length;

    // 2. Add custom category
    const newCat = expenseService.addCategory('أدوات ومهمات مكتبية', ['أوراق طباعة', 'أحبار']);
    assert.strictEqual(newCat.name, 'أدوات ومهمات مكتبية');

    const catsAfterAdd = expenseService.getCategories();
    assert.strictEqual(catsAfterAdd.length, countBefore + 1);

    // 3. Duplicate prevention
    assert.throws(() => {
        expenseService.addCategory('أدوات ومهمات مكتبية');
    }, /موجود بالفعل/, 'Must prevent duplicate category');

    // 4. Delete category
    expenseService.deleteCategory('أدوات ومهمات مكتبية');
    const catsAfterDel = expenseService.getCategories();
    assert.strictEqual(catsAfterDel.length, countBefore);
});

// 7. Payroll Summary KPIs
test('7. Payroll Summary Aggregation for Period', () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const summary = payrollService.getPayrollSummary({ type: 'month', month: currentMonth });

    assert.ok(summary, 'Summary must be returned');
    assert.strictEqual(summary.totalDisbursedNet >= 5500, true);
    assert.strictEqual(summary.totalAdvancesDeducted >= 800, true);
    assert.strictEqual(summary.totalPenaltiesDeducted >= 200, true);
    assert.strictEqual(summary.totalBonusesAdded >= 500, true);
    assert.strictEqual(summary.disbursedEmployeesCount >= 1, true);
});

// 8. Sameh POS Drawer Withdrawals in Admin Period & Disbursal
test('8. Sameh POS Drawer Withdrawals in Admin Period & Full Disbursal', () => {
    // 1. Create employee Sameh
    const sameh = payrollService.createEmployee({
        fullName: 'سامح إبراهيم',
        jobTitle: 'كاشير مبيعات',
        phone: '01099887766',
        basicSalary: 5000,
        branch: 'فرع المعادي'
    }, admin.id);

    assert.strictEqual(sameh.full_name, 'سامح إبراهيم');
    assert.strictEqual(Number(sameh.basic_salary), 5000);

    const testMonth = '2026-10';

    // 2. Open POS session
    const sess = db.run(
        `INSERT INTO daily_sessions (session_code, opened_by, opening_cash, status)
         VALUES ('POS-SES-SAMEH', ?, 2000, 'open')`,
        [admin.id]
    );

    // 3. Sameh takes advance in POS during the period (by recipient_name)
    expenseService.addExpense({
        operational_type: 'expense',
        category: 'مصروفات عامة',
        amount: 350,
        description: 'سحب كاش من الدرج شخصي',
        recipient_name: 'سامح',
        sessionId: sess.lastInsertRowid
    }, admin.id);

    // 4. Another draw in POS during the period (by description)
    expenseService.addExpense({
        operational_type: 'expense',
        category: 'سلف وسحب بائعين',
        amount: 250,
        description: 'سحب سامح مصاريف مواصلات وسلفة',
        sessionId: sess.lastInsertRowid
    }, admin.id);

    // 5. Query period advances for Sameh for period 2026-10
    const adv = payrollService.getEmployeePeriodAdvances(sameh.id, { type: 'month', month: testMonth });
    assert.strictEqual(adv.totalAdvances, 600, 'Sameh total period advances must be exactly 600 (350 + 250)');
    assert.strictEqual(adv.count, 2, 'Must have 2 advance movements');

    // 6. Admin settles and disburses: Basic (5000) - Advances (600) - Penalties (100) + Bonuses (300) = Net (4600)
    const payout = payrollService.disburseSalary({
        employeeId: sameh.id,
        basicSalary: 5000,
        advancesDeducted: 600,
        penaltiesDeducted: 100,
        penaltyReason: 'تأخير',
        bonusesAdded: 300,
        bonusReason: 'حافز انتظام',
        paymentMethod: 'cash',
        deductSource: 'main_safe',
        periodMonth: testMonth,
        periodType: 'month'
    }, admin.id);

    assert.ok(payout, 'Payout must succeed');
    assert.strictEqual(payout.amount, 4600, 'Net amount must equal 4600');
    assert.strictEqual(payout.advances_deducted, 600);
    assert.strictEqual(payout.penalties_deducted, 100);
    assert.strictEqual(payout.bonuses_added, 300);
    assert.ok(payout.voucher_number.startsWith('#PAY-'));

    // Check status is marked paid
    const status = payrollService.checkEmployeePayoutStatus(sameh.id, testMonth);
    assert.strictEqual(status.is_paid, true);
    assert.strictEqual(status.paid_amount, 4600);
});

console.log('====================================================');
console.log(`🎉 All ${passed}/8 Payroll Specification tests PASSED!`);
console.log('====================================================');
