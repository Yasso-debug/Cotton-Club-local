const assert = require('node:assert');
const { DatabaseManager } = require('../src/database/db');
const { SettingsService } = require('../src/services/settingsService');
const { PosService } = require('../src/services/posService');
const { AuthService } = require('../src/services/authService');

console.log('🧪 Testing POS Rules & Permissions (Card 4 Settings)...');

const db = new DatabaseManager();
const settingsService = new SettingsService(db);
const authService = new AuthService(db);
const posService = new PosService(db, authService);

// 1. Verify all new settings can be saved and retrieved
const newRules = {
    allow_salesperson_discount: '1',
    cashier_max_discount_percent: '5',
    require_supervisor_discount: '0',
    allow_salesperson_returns: '1',
    require_customer_name: '1',
    require_customer_phone: '1',
    default_opening_float: '0'
};

const updated = settingsService.updateSettings(newRules, 1);
assert.strictEqual(updated.allow_salesperson_discount, '1');
assert.strictEqual(updated.cashier_max_discount_percent, '5');
assert.strictEqual(updated.require_supervisor_discount, '0');
assert.strictEqual(updated.allow_salesperson_returns, '1');
assert.strictEqual(updated.require_customer_name, '1');
assert.strictEqual(updated.require_customer_phone, '1');
assert.strictEqual(updated.default_opening_float, '0');

console.log('✅ Settings saved and verified successfully');

// 2. Test Customer Name enforcement when require_customer_name = '1'
const product = db.get("SELECT * FROM products WHERE is_active = 1 LIMIT 1");
const cashier = db.get("SELECT * FROM users WHERE role = 'cashier' LIMIT 1");
const session = db.get("SELECT * FROM daily_sessions WHERE status = 'open' LIMIT 1");

if (product && cashier && session) {
    // Missing customer name should throw
    assert.throws(() => {
        posService.checkout({
            sessionId: session.id,
            userId: cashier.id,
            userRole: 'cashier',
            items: [{ productId: product.id, quantity: 1, itemName: product.item_name }],
            discountPercent: 0,
            paymentMethod: 'cash',
            customerName: '',
            customerPhone: '01012345678'
        });
    }, /إدخال اسم العميل إلزامي/);

    // Missing customer phone should throw
    assert.throws(() => {
        posService.checkout({
            sessionId: session.id,
            userId: cashier.id,
            userRole: 'cashier',
            items: [{ productId: product.id, quantity: 1, itemName: product.item_name }],
            discountPercent: 0,
            paymentMethod: 'cash',
            customerName: 'أحمد محمود',
            customerPhone: ''
        });
    }, /إدخال رقم هاتف العميل إلزامي/);

    // With both customer name and phone, should succeed
    const validSale = posService.checkout({
        sessionId: session.id,
        userId: cashier.id,
        userRole: 'cashier',
        items: [{ productId: product.id, quantity: 1, itemName: product.item_name }],
        discountPercent: 0,
        paymentMethod: 'cash',
        customerName: 'أحمد محمود',
        customerPhone: '01012345678'
    });
    assert.ok(validSale.id, 'Sale with valid customer details must succeed');

    // 3. Test Disallow Salesperson Return permission (allow_salesperson_returns = '0')
    settingsService.updateSettings({ allow_salesperson_returns: '0' }, 1);

    assert.throws(() => {
        posService.checkout({
            sessionId: session.id,
            userId: cashier.id,
            userRole: 'cashier',
            invoiceType: 'return',
            items: [{ productId: product.id, quantity: 1, itemName: product.item_name }],
            paymentMethod: 'cash'
        });
    }, /إجراء المرتجعات قاصر على المشرفين/);

    // 4. Test Disallow Salesperson Discount permission (allow_salesperson_discount = '0')
    settingsService.updateSettings({ allow_salesperson_discount: '0' }, 1);

    assert.throws(() => {
        posService.checkout({
            sessionId: session.id,
            userId: cashier.id,
            userRole: 'cashier',
            invoiceType: 'sale',
            items: [{ productId: product.id, quantity: 1, itemName: product.item_name }],
            discountPercent: 2,
            paymentMethod: 'cash',
            customerName: 'عميل تجريبي',
            customerPhone: '01122334455'
        });
    }, /منح الخصم المباشر مقفل لحسابات البائعين/);

    // Restore defaults
    settingsService.updateSettings({
        allow_salesperson_discount: '1',
        allow_salesperson_returns: '1',
        require_customer_name: '0',
        require_customer_phone: '0'
    }, 1);
}

console.log('🎉 All POS Rules & Permissions tests passed perfectly!');
