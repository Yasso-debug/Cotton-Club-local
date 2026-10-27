/**
 * Cotton Club POS - Expenses & Refunded Expenses Architecture Verification
 * Tests Outbound Expenses (-), Inbound Refunded Expenses (+), Drawer Reconciliation,
 * Dynamic categories, Voucher code generation (EXP-YYMM-XXXXX), and Analytics.
 */

const assert = require('node:assert');
const http = require('node:http');

function postJson(path, payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const req = http.request({
            hostname: '127.0.0.1',
            port: 3000,
            path: `/api/${path}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error(`Invalid JSON: ${body}`));
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function getJson(path) {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:3000${path}`, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error(`Invalid JSON: ${body}`));
                }
            });
        });
        req.on('error', reject);
    });
}

async function runExpensesTests() {
    console.log('🧪 Starting Expenses & Refunded Expenses System Test Suite...');

    // 1. Test Categories
    console.log('\n▶ 1. Testing GET /api/swm/expenses/categories:');
    const catRes = await getJson('/api/swm/expenses/categories');
    assert.strictEqual(catRes.success, true, 'Categories should return success');
    assert.ok(Array.isArray(catRes.data), 'Categories should be an array');
    console.log(`   ✔ Received ${catRes.data.length} approved store expense categories.`);

    // 2. Test Record Outbound Expense (سحب نقدية)
    console.log('\n▶ 2. Testing POST /api/swm/expenses (Outbound Expense):');
    const expPayload = {
        operational_type: 'expense',
        category: 'سلف وسحب بائعين',
        subcategory: 'سلفة شخصية',
        amount: 250,
        salesperson_id: 1,
        recipient_name: 'أحمد البائع',
        description: 'سلفة مؤقتة تسدد نهاية الأسبوع',
        userId: 1
    };

    const expRes = await postJson('swm/expenses', expPayload);
    assert.strictEqual(expRes.success, true, 'Should successfully add outbound expense: ' + expRes.error);
    assert.ok(expRes.data.voucher_code.startsWith('EXP-'), 'Voucher code must follow EXP-YYMM-XXXXX');
    assert.strictEqual(expRes.data.operational_type, 'expense');
    assert.strictEqual(expRes.data.amount, 250);
    assert.strictEqual(expRes.data.status, 'approved');
    console.log(`   ✔ Recorded Outbound Expense: Code=${expRes.data.voucher_code}, Amount=-${expRes.data.amount} EGP, Approved`);

    // 3. Test Record Inbound Refunded Expense (إيداع نقدية مرتدة للدرج)
    console.log('\n▶ 3. Testing POST /api/swm/expenses (Inbound Refunded Expense):');
    const refPayload = {
        operational_type: 'returned_expense',
        category: 'مصروف مرتد (إيداع نقدية)',
        subcategory: 'استرداد باقي سلفة',
        amount: 100,
        salesperson_id: 1,
        recipient_name: 'أحمد البائع',
        description: 'رد باقي السلفة نقداً لدرج الكاشير',
        userId: 1
    };

    const refRes = await postJson('swm/expenses', refPayload);
    assert.strictEqual(refRes.success, true, 'Should successfully add refunded expense: ' + refRes.error);
    assert.ok(refRes.data.voucher_code.startsWith('EXP-'), 'Voucher code must follow EXP-YYMM-XXXXX');
    assert.strictEqual(refRes.data.operational_type, 'returned_expense');
    assert.strictEqual(refRes.data.amount, 100);
    console.log(`   ✔ Recorded Refunded Expense: Code=${refRes.data.voucher_code}, Amount=+${refRes.data.amount} EGP, Added to Drawer`);

    // 4. Test Summary and Financial KPI Calculation (GET /api/swm/expenses)
    console.log('\n▶ 4. Testing GET /api/swm/expenses (Real-time KPIs):');
    const summaryRes = await getJson('/api/swm/expenses');
    assert.strictEqual(summaryRes.success, true);
    const kpi = summaryRes.data;
    console.log(`   ✔ KPIs: Total Out=${kpi.total_out} EGP, Total Refunded=${kpi.total_refunded} EGP, Net Expense=${kpi.net_expense} EGP`);
    assert.ok(kpi.total_out >= 250, 'Total out must include the 250 EGP expense');
    assert.ok(kpi.total_refunded >= 100, 'Total refunded must include the 100 EGP refund');
    assert.strictEqual(kpi.net_expense, Math.round((kpi.total_out - kpi.total_refunded) * 100) / 100, 'Net Expense must equal total_out - total_refunded');

    // 5. Test Analytics (GET /api/swm/expenses/analytics)
    console.log('\n▶ 5. Testing GET /api/swm/expenses/analytics:');
    const analyticsRes = await getJson('/api/swm/expenses/analytics?period=30');
    assert.strictEqual(analyticsRes.success, true);
    const an = analyticsRes.data;
    console.log(`   ✔ Analytics: Period=${an.period_days} days, Daily Average=${an.daily_average} EGP, High Spend Flag=${an.is_high_spend_today}`);
    assert.ok(Array.isArray(an.daily_trend), 'Daily trend must be an array');
    assert.ok(Array.isArray(an.category_breakdown), 'Category breakdown must be an array');

    // 6. Test Daily Shift Reconciliation (Drawer formula with net expenses)
    console.log('\n▶ 6. Testing Daily Shift Reconciliation:');
    const shiftRes = await getJson('/api/swm/pos/shift/summary');
    assert.strictEqual(shiftRes.success, true);
    const shiftKpi = shiftRes.data.kpi;
    console.log(`   ✔ Shift Drawer Expected=${shiftKpi.expectedDrawerCash} EGP, Net Expenses=${shiftKpi.totalExpenses} EGP`);

    // Verify presence of EXP- transactions in shift timeline
    const allTrans = shiftRes.data.all_transactions;
    const expTrans = allTrans.filter(t => t.code && t.code.startsWith('EXP-'));
    assert.ok(expTrans.length >= 2, 'Shift timeline must contain both outbound and refunded expenses');

    const refundRow = expTrans.find(t => t.type === 'returned_expense');
    assert.ok(refundRow, 'Returned expense row must exist in shift timeline');
    assert.ok(refundRow.amount > 0, 'Returned expense in timeline must be positive (+) to add to drawer');

    const outRow = expTrans.find(t => t.type === 'expense');
    assert.ok(outRow, 'Outbound expense row must exist in shift timeline');
    assert.ok(outRow.amount < 0, 'Outbound expense in timeline must be negative (-) to deduct from drawer');

    console.log('\n🎉 ALL EXPENSES & REFUNDED EXPENSES ARCHITECTURAL TESTS PASSED!\n');
}

runExpensesTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
