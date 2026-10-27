const assert = require('node:assert');
const { DatabaseManager } = require('../src/database/db');
const { TreasuryService } = require('../src/services/treasuryService');
const { SessionService } = require('../src/services/sessionService');
const { PurchaseService } = require('../src/services/purchaseService');
const { PayrollService } = require('../src/services/payrollService');
const { PosService } = require('../src/services/posService');
const { seedDatabase } = require('../src/database/seed');

console.log('🧪 Testing Central Treasury All Operations (Shift Deposit / Salary / Supplier / Purchase) & Advanced Filters...');

const db = new DatabaseManager(':memory:');
seedDatabase(db);
const treasury = new TreasuryService(db);
const session = new SessionService(db, treasury);
const purchases = new PurchaseService(db, treasury);
const payroll = new PayrollService(db, treasury);
const pos = new PosService(db, session);

// 1. Initial State
const initBal = treasury.getBalance();
console.log('Initial Treasury Balance:', initBal);
assert.strictEqual(initBal.balance, 15000);

// 2. Perform Operation 1: ايداع اليوميه (Shift Rollover Deposit)
const s1 = session.openSession(1, 0, 'Shift Test');
const products = db.all('SELECT * FROM products WHERE is_active = 1 LIMIT 2');
pos.checkout({
    sessionId: s1.id,
    userId: 1,
    userRole: 'admin',
    items: [{ productId: products[0].id, quantity: 1, itemName: products[0].item_name }],
    paymentMethod: 'cash'
});
db.run("UPDATE app_settings SET value = '00:00' WHERE key = 'auto_close_shift_time'");
db.run("UPDATE daily_sessions SET opened_at = datetime('now', '-25 hours') WHERE id = ?", [s1.id]);
const rollRes = session.checkAndRolloverShift(1);
assert.ok(rollRes.rolledOver, 'Shift must roll over');
console.log('✅ 1. Operation: ايداع اليومية (shift_transfer) registered in Central Treasury');

// 3. Perform Operation 2: صرف مرتب (Salary Disbursement)
const emp = db.get('SELECT * FROM employees LIMIT 1');
const salPay = payroll.disburseSalary({
    employeeId: emp.id,
    amount: 1200,
    paymentType: 'salary',
    paymentSource: 'treasury',
    notes: 'صرف راتب الشهر الحالي'
}, 1);
assert.ok(salPay.voucher_number, 'Salary voucher created');
console.log('✅ 2. Operation: صرف مرتب (salary_payout) registered in Central Treasury');

// 4. Perform Operation 3: دفع لمورد (Supplier Payment)
const supplier = db.get('SELECT * FROM suppliers LIMIT 1');
const supPay = purchases.recordSupplierSplitPayment({
    supplierId: supplier.id,
    totalAmount: 800,
    paymentBreakdown: { cash: 800 },
    notes: 'سداد دفعة نقدية لحساب المورد'
}, 1);
assert.ok(supPay.voucher_number, 'Supplier voucher created');
console.log('✅ 3. Operation: دفع لمورد (supplier_payment) registered in Central Treasury');

// 5. Perform Operation 4: شراء بضاعه و دفعها (Purchase Invoice Immediate Payment)
const purInv = purchases.createPurchaseInvoice({
    supplierId: supplier.id,
    invoiceNumber: 'INV-TEST-PUR-99',
    invoiceDate: new Date().toISOString().slice(0, 10),
    items: [{ productId: products[0].id, quantity: 5, unitCost: 100 }],
    subtotal: 500,
    discountAmount: 0,
    taxAmount: 0,
    shippingCost: 0,
    paidAmount: 500,
    payFromTreasury: true,
    notes: 'شراء بضاعة وسداد فوري من الخزنة'
}, 1);
assert.ok(purInv.id, 'Purchase invoice created');
console.log('✅ 4. Operation: شراء بضاعة ودفعها (purchase_payment) registered in Central Treasury');

// 6. Test Filter: All Transactions
const allTx = treasury.listTransactions({ limit: 100 });
console.log(`Total transactions in treasury: ${allTx.length}`);
assert.ok(allTx.length >= 5);

// Check that all 4 required transaction types exist in the treasury
const typesFound = new Set(allTx.map(t => t.transaction_type));
console.log('Transaction Types found in Treasury:', Array.from(typesFound));
assert.ok(typesFound.has('shift_transfer'), 'Treasury must contain shift_transfer');
assert.ok(typesFound.has('salary_payout'), 'Treasury must contain salary_payout');
assert.ok(typesFound.has('supplier_payment'), 'Treasury must contain supplier_payment');
assert.ok(typesFound.has('purchase_payment'), 'Treasury must contain purchase_payment');

// 7. Test Filter: Inflows Only (إيداعات)
const inflows = treasury.listTransactions({ type: 'inflows' });
console.log(`Inflows count: ${inflows.length}`);
inflows.forEach(t => {
    assert.ok(['deposit', 'shift_transfer'].includes(t.transaction_type), 'Inflows must only include deposits or shift_transfers');
});

// 8. Test Filter: Outflows Only (مصروفات وسحوبات)
const outflows = treasury.listTransactions({ type: 'outflows' });
console.log(`Outflows count: ${outflows.length}`);
outflows.forEach(t => {
    assert.ok(!['deposit', 'shift_transfer'].includes(t.transaction_type), 'Outflows must not include deposits');
});
const outflowTypes = new Set(outflows.map(t => t.transaction_type));
assert.ok(outflowTypes.has('salary_payout'), 'Outflows must include salary_payout');
assert.ok(outflowTypes.has('supplier_payment'), 'Outflows must include supplier_payment');
assert.ok(outflowTypes.has('purchase_payment'), 'Outflows must include purchase_payment');

// 9. Test Filter: Specific Types
const onlySalaries = treasury.listTransactions({ type: 'salary_payout' });
assert.ok(onlySalaries.length >= 1);
onlySalaries.forEach(t => assert.strictEqual(t.transaction_type, 'salary_payout'));

const onlySuppliers = treasury.listTransactions({ type: 'supplier_payment' });
assert.ok(onlySuppliers.length >= 1);
onlySuppliers.forEach(t => assert.strictEqual(t.transaction_type, 'supplier_payment'));

const onlyPurchases = treasury.listTransactions({ type: 'purchase_payment' });
assert.ok(onlyPurchases.length >= 1);
onlyPurchases.forEach(t => assert.strictEqual(t.transaction_type, 'purchase_payment'));

// 10. Test Filter: Time / Date Range (فلتر الوقت)
const todayStr = new Date().toISOString().slice(0, 10);
const todayTx = treasury.listTransactions({ startDate: todayStr, endDate: todayStr });
assert.ok(todayTx.length >= 4);

const futureTx = treasury.listTransactions({ startDate: '2099-01-01', endDate: '2099-12-31' });
assert.strictEqual(futureTx.length, 0, 'Future date range must return 0 results');

// 11. Test Filter: Search (بحث بالاسم، رقم السند، الفاتورة)
const invCode = purInv.invoice_number || purInv.invoiceNumber;
const searchInvoice = treasury.listTransactions({ search: invCode });
assert.strictEqual(searchInvoice.length, 1);
assert.strictEqual(searchInvoice[0].transaction_type, 'purchase_payment');

const searchEmployee = treasury.listTransactions({ search: emp.full_name });
assert.ok(searchEmployee.length >= 1);
assert.strictEqual(searchEmployee[0].transaction_type, 'salary_payout');

console.log('🎉 ALL OPERATIONS & ADVANCED FILTERS TEST PASSED 100%!');
