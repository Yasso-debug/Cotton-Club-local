const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { DatabaseManager } = require('../src/database/db');
const { TreasuryService } = require('../src/services/treasuryService');
const { PayrollService } = require('../src/services/payrollService');
const { seedDatabase } = require('../src/database/seed');

async function runTests() {
    console.log('🧪 Starting HQ Central Treasury Architecture & Multi-Channel Test Suite...');
    const testDbPath = path.join(__dirname, 'hq_treasury_test.db');
    if (fs.existsSync(testDbPath)) {
        try { fs.unlinkSync(testDbPath); } catch (e) {}
    }

    const db = new DatabaseManager(testDbPath);
    seedDatabase(db);
    const treasury = new TreasuryService(db);
    const payroll = new PayrollService(db, treasury);

    const adminUser = db.get("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const adminId = adminUser ? adminUser.id : 1;

    // Create a dedicated test employee
    const testEmpName = `موظف تجريبي خزنة_${Date.now()}`;
    const empInsert = db.run(`
        INSERT INTO employees (full_name, phone, job_title, basic_salary, is_active)
        VALUES (?, '01000000001', 'كاشير فرع', 5000.00, 1)
    `, [testEmpName]);
    const empId = empInsert.lastInsertRowid;
    console.log(`✅ Test employee created with ID: ${empId}`);

    // --- TEST 1: Initial Balances & Capital Deposit into 3 Channels ---
    console.log('\n--- TEST 1: Multi-Channel Capital Deposits ---');
    await treasury.depositToMainTreasury(10000, 'صاحب المنشأة', 'cash', 'إيداع كاش أولي', adminId);
    await treasury.depositToMainTreasury(15000, 'صاحب المنشأة', 'card', 'إيداع بنك أولي', adminId);
    await treasury.depositToMainTreasury(8000, 'صاحب المنشأة', 'transfer', 'إيداع محفظة أولي', adminId);

    const bal1 = await treasury.getBalance();
    console.log('Treasury balances:', bal1);
    assert(bal1.cashBalance >= 10000, 'Cash balance should be >= 10000');
    assert(bal1.cardBalance >= 15000, 'Card balance should be >= 15000');
    assert(bal1.transferBalance >= 8000, 'Transfer balance should be >= 8000');
    assert(bal1.balance >= 33000, 'Total balance should be >= 33000');
    assert(bal1.ownerDepositsTotal >= 33000, 'Owner deposits total should reflect deposits');
    console.log('✅ TEST 1 PASSED: Multi-channel capital deposits verified.');

    // --- TEST 2: Strict Solvency on Quick Disbursal ---
    console.log('\n--- TEST 2: Strict Solvency & Quick Disbursal ---');
    // Try to disburse more than available in card channel
    const excessiveAmt = bal1.cardBalance + 5000;
    try {
        await treasury.quickDisburse({
            amount: excessiveAmt,
            category: 'فواتير ومرافق',
            recipient: 'شركة الكهرباء',
            channel: 'card',
            notes: 'محاولة صرف تتجاوز الرصيد'
        }, adminId);
        assert.fail('Should have thrown Strict Solvency error');
    } catch (err) {
        assert(err.message.includes('الملاءة') || err.message.includes('غير كافٍ') || err.message.includes('رصيد'), 'Error must be solvency related');
        console.log(`✅ Solvency correctly blocked overdraw: ${err.message}`);
    }

    // Now disburse valid amount from cash
    const disburseAmt = 750;
    const initialCash = (await treasury.getBalance()).cashBalance;
    const disburseRes = await treasury.quickDisburse({
        amount: disburseAmt,
        category: 'ضيافة ومطبخ',
        recipient: 'بوفيه المعادي',
        channel: 'cash',
        notes: 'مشروبات وضيافة المقر'
    }, adminId);

    assert(disburseRes && disburseRes.id, 'Quick disburse should succeed');
    const cashAfter = (await treasury.getBalance()).cashBalance;
    assert.strictEqual(cashAfter, initialCash - disburseAmt, 'Cash channel must be decremented exactly');

    // Verify journal entry in petty_expenses
    const pe = db.get(`
        SELECT * FROM petty_expenses 
        WHERE category = 'ضيافة ومطبخ' AND amount = ? 
        ORDER BY id DESC LIMIT 1
    `, [disburseAmt]);
    assert(pe, 'Automatic journal entry must be present in petty_expenses');
    assert.strictEqual(pe.status, 'approved', 'Journal entry status must be approved');
    assert.strictEqual(pe.operational_type, 'expense', 'Operational type must be expense');
    console.log('✅ TEST 2 PASSED: Quick disbursal with auto-journaling and strict solvency verified.');

    // --- TEST 3: Running Balance (Balance Before & After) in Audit Log ---
    console.log('\n--- TEST 3: Balance Before & After in Audit Log ---');
    const txLog = await treasury.listTransactions({ limit: 5 });
    assert(txLog.length > 0, 'Must have transactions');
    const latestTx = txLog[0];
    assert(typeof latestTx.balance_before === 'number', 'balance_before must be a number');
    assert(typeof latestTx.balance_after === 'number', 'balance_after must be a number');
    console.log(`Latest Tx #TX-${latestTx.id}: Channel ${latestTx.payment_method}, Before: ${latestTx.balance_before}, Amt: ${latestTx.amount}, After: ${latestTx.balance_after}`);
    console.log('✅ TEST 3 PASSED: Audit Log balance tracking verified.');

    // --- TEST 4: Monthly Advances & Single Payroll Disbursal with Strict Solvency ---
    console.log('\n--- TEST 4: Advances & Single Payroll Disbursal ---');
    const currentMonth = '2026-10';

    // Record an advance for the employee in petty_expenses
    const advanceAmt = 600;
    const activeSession = db.get("SELECT id FROM daily_sessions WHERE status = 'open' LIMIT 1") || { id: 1 };
    db.run(`
        INSERT INTO petty_expenses (session_id, voucher_code, operational_type, category, amount, description, approved_by, status, paid_to, recipient_name)
        VALUES (?, 'ADV-TEST', 'advance', 'سلفة موظف', ?, 'سلفة منتصف الشهر', ?, 'approved', ?, ?)
    `, [activeSession.id, advanceAmt, adminId, testEmpName, testEmpName]);

    // Fetch monthly advances
    const advData = await payroll.getEmployeeMonthlyAdvances(empId, currentMonth);
    console.log('Employee advances data:', advData);
    assert.strictEqual(Number(advData.total_advances), advanceAmt, 'Monthly advances must match recorded advance');

    // Check status before payout
    const statusBefore = await payroll.checkEmployeePayoutStatus(empId, currentMonth);
    assert.strictEqual(statusBefore.is_paid, false, 'Employee should not be marked as paid yet');

    // Disburse salary with deductions and bonuses:
    // Base: 5000, Advances: 600, Deductions: 100, Bonuses: 200 -> Net: 4500
    const netSalary = 5000 - 600 - 100 + 200;
    const initialTransferBal = (await treasury.getBalance()).transferBalance;

    const payRes = await payroll.disburseSalary({
        employeeId: empId,
        amount: netSalary,
        type: 'salary',
        source: 'treasury',
        paymentMethod: 'transfer',
        notes: `راتب شهر ${currentMonth}`,
        monthPeriod: currentMonth,
        deductions: 100,
        deductionsReason: 'تأخير',
        bonuses: 200,
        bonusesReason: 'كفاءة'
    }, adminId);

    assert(payRes.id, 'Salary payment record must be created');
    assert(payRes.voucher_number && payRes.voucher_number.startsWith('PAY-'), 'Must have PAY voucher number');
    console.log(`Disbursed salary voucher: ${payRes.voucher_number}, net: ${payRes.amount}`);

    // Verify transfer balance was deducted
    const transferAfter = (await treasury.getBalance()).transferBalance;
    assert.strictEqual(transferAfter, initialTransferBal - netSalary, 'Transfer balance must be decremented by net');

    // Check status after payout
    const statusAfter = await payroll.checkEmployeePayoutStatus(empId, currentMonth);
    assert.strictEqual(statusAfter.is_paid, true, 'Employee must now be marked as paid');
    assert.strictEqual(statusAfter.voucher_number, payRes.voucher_number, 'Voucher must match');
    console.log('✅ TEST 4 PASSED: Payroll advances integration and payout status verified.');

    // --- TEST 5: Bulk Payroll Execution & Solvency ---
    console.log('\n--- TEST 5: Bulk Payroll Execution ---');
    // Create 2 more test employees
    const e2 = db.run("INSERT INTO employees (full_name, phone, job_title, basic_salary, is_active) VALUES ('موظف مسير 1', '0101', 'مساعد', 3000, 1)").lastInsertRowid;
    const e3 = db.run("INSERT INTO employees (full_name, phone, job_title, basic_salary, is_active) VALUES ('موظف مسير 2', '0102', 'مساعد', 3500, 1)").lastInsertRowid;

    const bulkPayouts = [
        { employeeId: e2, netSalary: 3000, deductions: 0, bonuses: 0, monthPeriod: currentMonth, notes: 'مسير جماعي' },
        { employeeId: e3, netSalary: 3500, deductions: 0, bonuses: 0, monthPeriod: currentMonth, notes: 'مسير جماعي' }
    ];

    const initialCashForBulk = (await treasury.getBalance()).cashBalance;
    const bulkRes = await payroll.disburseBulkPayroll(bulkPayouts, 'cash', adminId);

    assert(bulkRes.success, 'Bulk payroll must succeed');
    assert.strictEqual(bulkRes.disbursedCount, 2, '2 employees must be disbursed');
    assert.strictEqual(bulkRes.totalDisbursed, 6500, 'Total 6500 must be disbursed');

    const cashAfterBulk = (await treasury.getBalance()).cashBalance;
    assert.strictEqual(cashAfterBulk, initialCashForBulk - 6500, 'Cash balance must be decremented by bulk total');
    console.log('✅ TEST 5 PASSED: Bulk payroll atomic execution verified.');

    // --- TEST 6: Analytics, Branch Transfers & Branch Safes Summary ---
    console.log('\n--- TEST 6: Analytics, Branch Transfers, Branch Safes ---');
    const analytics = await treasury.getAnalyticsData();
    assert(Array.isArray(analytics.categoriesBreakdown), 'categoriesBreakdown must be array');
    assert(Array.isArray(analytics.dailyCashflow), 'dailyCashflow must be array');
    assert(analytics.channelRatios, 'channelRatios must be present');
    console.log('Analytics categories breakdown count:', analytics.categoriesBreakdown.length);

    const branchTransfers = await treasury.getBranchTransfers('all');
    assert(Array.isArray(branchTransfers), 'Branch transfers must be array');

    const branchSafes = await treasury.getBranchSafesSummary();
    assert(Array.isArray(branchSafes), 'Branch safes must be array');
    console.log('Branch safes count:', branchSafes.length);
    console.log('✅ TEST 6 PASSED: Analytics and Summary services verified.');

    // Cleanup
    try {
        db.close();
        if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    } catch (e) {}

    console.log('\n🎉 ALL HQ CENTRAL TREASURY TESTS PASSED SUCCESSFULLY! 100% VERIFIED.');
}

runTests().catch(err => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
});
