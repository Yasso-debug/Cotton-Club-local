/**
 * Cotton Club POS - Database Initial Seeder
 * Seeds default administrator, cashier, categories, products, and store settings.
 */

const bcrypt = require('bcryptjs');

function seedDatabase(dbManager) {
    return dbManager.transaction((db) => {
        // 1. Ensure required admin (ma/ma) and cashier (co/co) exist
        const maHash = bcrypt.hashSync('ma', 10);
        const coHash = bcrypt.hashSync('co', 10);

        // Upsert or insert admin 'ma'
        const existingMa = db.get('SELECT id FROM users WHERE username = ?', ['ma']);
        if (!existingMa) {
            db.run(
                `INSERT INTO users (username, password_hash, display_name, role, is_active)
                 VALUES ('ma', ?, 'المدير العام (ma)', 'admin', 1)`,
                [maHash]
            );
        } else {
            db.run('UPDATE users SET password_hash = ?, is_active = 1 WHERE username = ?', [maHash, 'ma']);
        }

        // Upsert or insert cashier 'co'
        const existingCo = db.get('SELECT id FROM users WHERE username = ?', ['co']);
        if (!existingCo) {
            db.run(
                `INSERT INTO users (username, password_hash, display_name, role, is_active)
                 VALUES ('co', ?, 'كاشير المحل (co)', 'cashier', 1)`,
                [coHash]
            );
        } else {
            db.run('UPDATE users SET password_hash = ?, is_active = 1 WHERE username = ?', [coHash, 'co']);
        }

        // 2. Default Categories
        const catCount = db.get('SELECT COUNT(*) as count FROM categories');
        if (catCount.count === 0) {
            const categories = [
                ['ملابس داخلية قطنية', 'تشكيلة الملابس القطنية الداخلية الفاخرة'],
                ['قمصان وتيشرتات', 'قمصان وبولو وتيشرت قطن 100%'],
                ['بناطيل وشورتات', 'بناطيل جينز وجبردين وقطن'],
                ['منسوجات ومناشف', 'بشاكير وفوط ومفروشات قطنية'],
                ['إكسسوارات وجوارب', 'جوارب قطنية ومستلزمات عامة']
            ];

            for (const [name, desc] of categories) {
                db.run('INSERT INTO categories (name, description) VALUES (?, ?)', [name, desc]);
            }
        }

        // 3. Default Products
        const prodCount = db.get('SELECT COUNT(*) as count FROM products');
        if (prodCount.count === 0) {
            const sampleProducts = [
                ['6221001001', 'فانلة داخلية قطن أبيض - مقاس L', 1, 45.0, 75.0, 50, 10],
                ['6221001002', 'فانلة داخلية قطن أبيض - مقاس XL', 1, 48.0, 80.0, 45, 10],
                ['6221001003', 'بوكسر قطن مصري فاخر - مقاس M', 1, 35.0, 60.0, 60, 15],
                ['6221001004', 'تيشرت بولو قطن كلاسيك كحلي - مقاس L', 2, 120.0, 195.0, 30, 5],
                ['6221001005', 'تيشرت بولو قطن كلاسيك أسود - مقاس XL', 2, 120.0, 195.0, 25, 5],
                ['6221001006', 'قميص قطن سادة كم طويل - أبيض', 2, 160.0, 260.0, 20, 5],
                ['6221001007', 'بنطلون جبردين قطن ليكرا بيج - مقاس 34', 3, 210.0, 340.0, 15, 3],
                ['6221001008', 'بنطلون ترينج قطن مريح رمادي', 3, 140.0, 230.0, 22, 5],
                ['6221001009', 'بشكير حمام قطن مصري 100% كبير', 4, 110.0, 180.0, 35, 8],
                ['6221001010', 'طقم فوط قطن 3 قطع مطرز', 4, 85.0, 145.0, 40, 10],
                ['6221001011', 'طقم جوارب قطنية طبية (3 أزواج)', 5, 25.0, 45.0, 80, 20],
                ['6221001012', 'حزام جلد طبيعي رجالي أسود', 5, 65.0, 115.0, 18, 5]
            ];

            for (const prod of sampleProducts) {
                db.run(
                    `INSERT INTO products (barcode, item_name, category_id, cost_price, sell_price, current_stock, min_stock_alert)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    prod
                );
            }
        }

        // 4. Default Suppliers
        const supCount = db.get('SELECT COUNT(*) as count FROM suppliers');
        if (supCount.count === 0) {
            db.run(
                `INSERT INTO suppliers (name, phone, address, balance)
                 VALUES (?, ?, ?, ?)`,
                ['شركة النسيج الذهبي', '01012345678', 'المحلة الكبرى - المنطقة الصناعية', 0.0]
            );
            db.run(
                `INSERT INTO suppliers (name, phone, address, balance)
                 VALUES (?, ?, ?, ?)`,
                ['مؤسسة القطن الصافي للتجارة', '01198765432', 'القاهرة - العبور', 0.0]
            );
        }

        // 5. Default App Settings
        const defaultSettings = [
            ['store_name', 'Cotton Club Store', 'اسم المنشأة التجاري'],
            ['store_phone', '01000000000', 'رقم الهاتف المطبوع على الفاتورة'],
            ['store_address', 'الفرع الرئيسي - شارع الجمهورية', 'عنوان المحل'],
            ['receipt_footer', 'شكراً لزيارتكم - البضاعة المباعة ترد وتستبدل خلال 14 يوماً بالفاتورة', 'تذييل الفاتورة'],
            ['tax_number', '123-456-789', 'الرقم الضريبي أو السجل التجاري'],
            ['printer_paper_width', '80mm', 'عرض ورق الطباعة (80mm أو 58mm)'],
            ['auto_print_receipt', 'true', 'طباعة الفاتورة تلقائياً عند إتمام البيع'],
            ['cashier_max_discount_percent', '5', 'الحد الأقصى للخصم المسموح به للكاشير (%)'],
            ['currency_symbol', 'ج.م', 'رمز العملة المستخدمة']
        ];

        for (const [key, value, desc] of defaultSettings) {
            db.run(
                `INSERT INTO app_settings (key, value, description) VALUES (?, ?, ?)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
                [key, value, desc]
            );
        }

        return true;
    });
}

module.exports = { seedDatabase };
