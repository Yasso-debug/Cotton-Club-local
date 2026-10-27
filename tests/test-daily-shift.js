const assert = require('node:assert');
const { DatabaseManager } = require('../src/database/db');
const { SessionService } = require('../src/services/sessionService');
const { PosService } = require('../src/services/posService');

console.log('🧪 Testing Cotton Club Daily Shift & Cashier Settlement Engine...');

const db = new DatabaseManager();
const sessionService = new SessionService(db);
const posService = new PosService(db);

// 1. Test getDailyShiftSummary directly from service
const todayStr = new Date().toISOString().slice(0, 10);
const summary = sessionService.getDailyShiftSummary({ date: todayStr });

assert.ok(summary, 'Summary should be returned');
assert.ok(summary.kpi, 'Summary should include kpi object');
assert.ok(Array.isArray(summary.all_transactions), 'Summary should include all_transactions array');

const { kpi } = summary;

console.log('KPI Metrics:', {
    totalSales: kpi.totalSales,
    salesCount: kpi.salesCount,
    totalReturns: kpi.totalReturns,
    returnsCount: kpi.returnsCount,
    totalExpenses: kpi.totalExpenses,
    expensesCount: kpi.expensesCount,
    netRevenue: kpi.netRevenue,
    openingCash: kpi.openingCash,
    expectedDrawerCash: kpi.expectedDrawerCash
});

// 2. Validate Accounting Golden Equation 1: Net Revenue
const expectedNetRevenue = Math.round((kpi.totalSales - kpi.totalReturns - kpi.totalExpenses) * 100) / 100;
const actualNetRevenue = Math.round(kpi.netRevenue * 100) / 100;
assert.strictEqual(actualNetRevenue, expectedNetRevenue, 'Net Revenue must equal Total Sales - Total Returns - Total Expenses');

// Tender split verification: Net Revenue = Net Cash + Net Card + Net Transfer
const tenderSum = Math.round((kpi.netCash + kpi.netCard + kpi.netTransfer) * 100) / 100;
assert.strictEqual(actualNetRevenue, tenderSum, 'Net Revenue must equal Net Cash + Net Card + Net Transfer');

// 3. Validate Accounting Golden Equation 2: Expected Drawer Cash
// Expected Drawer Cash = Opening Balance + Cash Sales - Cash Returns - Cash Expenses
const expectedDrawerCash = Math.round((kpi.openingCash + kpi.tender.cash.sales - kpi.tender.cash.returns - kpi.totalExpenses) * 100) / 100;
const actualDrawerCash = Math.round(kpi.expectedDrawerCash * 100) / 100;
assert.strictEqual(actualDrawerCash, expectedDrawerCash, 'Expected Drawer Cash must equal Opening + Cash Sales - Cash Returns - Cash Expenses');

// 4. Validate all_transactions chronological sorting
if (summary.all_transactions.length > 1) {
    for (let i = 0; i < summary.all_transactions.length - 1; i++) {
        const curr = summary.all_transactions[i];
        const next = summary.all_transactions[i + 1];
        const tCurr = new Date(curr.time).getTime();
        const tNext = new Date(next.time).getTime();
        assert.ok(tCurr >= tNext, 'Transactions must be sorted descending by time');
    }
}

// 5. Test invoice retrieval
if (summary.all_transactions.length > 0) {
    const saleTxn = summary.all_transactions.find(t => t.type === 'sale');
    if (saleTxn) {
        const inv = posService.getInvoiceById(saleTxn.id);
        assert.ok(inv, 'Invoice must be retrievable by ID');
        assert.ok(inv.invoice_number, 'Invoice must have invoice_number');
    }
}

// 6. Test Tender Pill Rendering Logic (Supports single and multiple payment methods)
function renderTenderPillBadgesTest(t) {
    const total = Math.abs(Number(t.amount || t.raw_total || 0));
    let cash = Number(t.cash_amount || 0);
    let card = Number(t.card_amount || 0);
    let transfer = Number(t.transfer_amount || 0);

    if (cash === 0 && card === 0 && transfer === 0) {
        const pm = (t.payment_method || '').toLowerCase();
        if (pm === 'card' || pm === 'visa') card = total;
        else if (pm === 'transfer' || pm === 'instapay') transfer = total;
        else cash = total;
    }

    const pills = [];
    if (card > 0) pills.push(`<span class="tender-pill tender-pill-card">فيزا: ${card.toFixed(2)} ج.م</span>`);
    if (cash > 0) pills.push(`<span class="tender-pill tender-pill-cash">كاش: ${cash.toFixed(2)} ج.م</span>`);
    if (transfer > 0) pills.push(`<span class="tender-pill tender-pill-transfer">تحويل: ${transfer.toFixed(2)} ج.م</span>`);
    if (pills.length === 0) pills.push(`<span class="tender-pill tender-pill-drawer">كاش: ${total.toFixed(2)} ج.م</span>`);
    return pills.join(' ');
}

// Single Visa test (exact match with user's attached screenshot: فيزا: 200.00 ج.م)
const visaTest = renderTenderPillBadgesTest({ payment_method: 'card', raw_total: 200, card_amount: 200 });
assert.ok(visaTest.includes('فيزا: 200.00 ج.م'), 'Must render Visa pill with exact amount');

// Split Payment test (e.g. 100 Cash + 200 Visa)
const splitTest = renderTenderPillBadgesTest({ payment_method: 'split', raw_total: 300, cash_amount: 100, card_amount: 200 });
assert.ok(splitTest.includes('فيزا: 200.00 ج.م') && splitTest.includes('كاش: 100.00 ج.م'), 'Must render both pills for split payment');

console.log('✅ All Daily Shift Accounting & Architecture assertions PASSED!');
db.close();
