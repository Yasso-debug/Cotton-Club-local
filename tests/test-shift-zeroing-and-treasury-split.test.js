const assert = require('node:assert');
const { DatabaseManager } = require('../src/database/db');
const { SessionService } = require('../src/services/sessionService');
const { PosService } = require('../src/services/posService');
const { TreasuryService } = require('../src/services/treasuryService');
const { seedDatabase } = require('../src/database/seed');

console.log('🧪 Testing Shift Zeroing Upon Rollover and Net Treasury Split...');

const db = new DatabaseManager(':memory:');
seedDatabase(db);
const treasuryService = new TreasuryService(db);
const sessionService = new SessionService(db, treasuryService);
const posService = new PosService(db, sessionService);

// 1. Initial State
const initialTreasury = treasuryService.getBalance();
console.log('Initial Treasury Balance:', initialTreasury);

// 2. Open Session 1
const s1 = sessionService.openSession(1, 100, 'Shift 1 Initial');
assert.ok(s1 && s1.id, 'Session 1 should be opened');

// Get products for sale
const products = db.all('SELECT * FROM products WHERE is_active = 1 LIMIT 3');
assert.ok(products.length >= 3, 'Products must exist in seeded DB');

// Sale 1: Cash
const inv1 = posService.checkout({
    sessionId: s1.id,
    userId: 1,
    userRole: 'admin',
    items: [{ productId: products[0].id, quantity: 2, itemName: products[0].item_name }],
    discountPercent: 0,
    paymentMethod: 'cash'
});

// Sale 2: Card / Visa
const inv2 = posService.checkout({
    sessionId: s1.id,
    userId: 1,
    userRole: 'admin',
    items: [{ productId: products[1].id, quantity: 1, itemName: products[1].item_name }],
    discountPercent: 0,
    paymentMethod: 'card'
});

// Sale 3: Transfer
const inv3 = posService.checkout({
    sessionId: s1.id,
    userId: 1,
    userRole: 'admin',
    items: [{ productId: products[2].id, quantity: 1, itemName: products[2].item_name }],
    discountPercent: 0,
    paymentMethod: 'transfer'
});

const totalExpectedSales = inv1.final_total + inv2.final_total + inv3.final_total;

// Check Session 1 summary before rollover
const s1Summary = sessionService.getDailyShiftSummary({ sessionId: s1.id });
assert.strictEqual(s1Summary.kpi.totalSales, totalExpectedSales);
assert.strictEqual(s1Summary.kpi.tender.cash.sales, inv1.final_total);
assert.strictEqual(s1Summary.kpi.tender.card.sales, inv2.final_total);
assert.strictEqual(s1Summary.kpi.tender.transfer.sales, inv3.final_total);
assert.strictEqual(s1Summary.kpi.expectedDrawerCash, 100 + inv1.final_total); // 100 opening + cash sale

console.log(`✅ 1. Shift 1 sales registered properly with exact tender split (Cash: ${inv1.final_total}, Card: ${inv2.final_total}, Transfer: ${inv3.final_total})`);

// 3. Trigger Automatic Rollover
// Simulate shift cutoff
db.run("UPDATE app_settings SET value = '00:00' WHERE key = 'auto_close_shift_time'");
db.run("UPDATE daily_sessions SET opened_at = datetime('now', '-25 hours') WHERE id = ?", [s1.id]);

const rolloverRes = sessionService.checkAndRolloverShift(1);
assert.ok(rolloverRes.rolledOver, 'Shift must roll over');
assert.strictEqual(rolloverRes.closedSessionId, s1.id);
assert.ok(rolloverRes.newSession, 'New session must be created');

console.log('✅ 2. Shift rollover executed cleanly');

// 4. Verify Central Treasury received all money partitioned into cash, card, and transfer
const treasuryAfter = treasuryService.getBalance();
console.log('Treasury After Rollover:', treasuryAfter);
const expectedCashTransferred = 100 + inv1.final_total; // Opening float + cash sales
assert.strictEqual(treasuryAfter.cashBalance, initialTreasury.cashBalance + expectedCashTransferred, `Cash transferred must increase safe cash by ${expectedCashTransferred}`);
assert.strictEqual(treasuryAfter.cardBalance, inv2.final_total, `Card transferred must equal net card sales (${inv2.final_total})`);
assert.strictEqual(treasuryAfter.transferBalance, inv3.final_total, `Transfer transferred must equal net transfer sales (${inv3.final_total})`);
assert.strictEqual(treasuryAfter.balance, initialTreasury.balance + expectedCashTransferred + inv2.final_total + inv3.final_total);

console.log(`✅ 3. Central Treasury received funds with clear net breakdown: كاش (+${expectedCashTransferred}), حساب بنكي فيزا (+${inv2.final_total}), تحويلات (+${inv3.final_total})`);

// 5. Verify the NEW Active Daily Shift is completely ZEROED OUT (اليومية اتصفرت تماماً)
const newShiftSummary = sessionService.getDailyShiftSummary();
console.log('New Shift Summary After Rollover:', {
    sessionCode: newShiftSummary.kpi.sessionCode,
    totalSales: newShiftSummary.kpi.totalSales,
    salesCount: newShiftSummary.kpi.salesCount,
    netRevenue: newShiftSummary.kpi.netRevenue,
    expectedDrawerCash: newShiftSummary.kpi.expectedDrawerCash,
    netCash: newShiftSummary.kpi.netCash,
    netCard: newShiftSummary.kpi.netCard,
    netTransfer: newShiftSummary.kpi.netTransfer,
    transactionsCount: newShiftSummary.all_transactions.length
});

assert.strictEqual(newShiftSummary.kpi.totalSales, 0, 'New shift sales must be 0');
assert.strictEqual(newShiftSummary.kpi.salesCount, 0, 'New shift sales count must be 0');
assert.strictEqual(newShiftSummary.kpi.totalReturns, 0, 'New shift returns must be 0');
assert.strictEqual(newShiftSummary.kpi.netRevenue, 0, 'New shift net revenue must be 0');
assert.strictEqual(newShiftSummary.kpi.expectedDrawerCash, 0, 'New shift expected drawer cash must be 0');
assert.strictEqual(newShiftSummary.kpi.netCash, 0, 'New shift net cash must be 0');
assert.strictEqual(newShiftSummary.kpi.netCard, 0, 'New shift net card must be 0');
assert.strictEqual(newShiftSummary.kpi.netTransfer, 0, 'New shift net transfer must be 0');
assert.strictEqual(newShiftSummary.all_transactions.length, 0, 'New shift transaction timeline must be empty');

console.log('✅ 4. New active shift is 100% ZEROED OUT (اليومية اتصفرت تماماً)');

console.log('🎉 ALL TESTS PASSED: Rollover correctly transfers to treasury and zeroes out daily shift!');
