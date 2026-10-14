/**
 * Cotton Club POS - SQLite Database Connection & Management
 * Implements strict PRAGMAs, WAL mode, transaction isolation, and backup.
 * Follows sqlite-ops and codebase-design guidelines.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const { SCHEMA_SQL } = require('./schema');

class DatabaseManager {
    constructor(dbFilePath = null) {
        if (!dbFilePath) {
            const dataDir = path.join(process.cwd(), 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            this.dbFilePath = path.join(dataDir, 'cotton_club_pos.db');
        } else {
            this.dbFilePath = dbFilePath;
        }

        this.db = null;
    }

    /**
     * Initialize connection with required sqlite-ops PRAGMAs
     */
    connect() {
        if (this.db) return this.db;

        this.db = new DatabaseSync(this.dbFilePath);

        // Core Pragmas as prescribed by sqlite-ops
        this.db.exec('PRAGMA foreign_keys = ON;');
        this.db.exec('PRAGMA journal_mode = WAL;');
        this.db.exec('PRAGMA busy_timeout = 5000;');
        this.db.exec('PRAGMA synchronous = NORMAL;');

        // Initialize schema
        this.initSchema();

        return this.db;
    }

    /**
     * Executes initial schema creation and runs automated column migrations
     */
    initSchema() {
        this.db.exec(SCHEMA_SQL);
        this.runMigrations();
    }

    /**
     * Automatic non-destructive schema migrations
     */
    runMigrations() {
        try {
            // 1. Upgrade suppliers table
            const supplierCols = this.all('PRAGMA table_info(suppliers)').map(c => c.name);
            if (!supplierCols.includes('supplier_code')) {
                this.db.exec('ALTER TABLE suppliers ADD COLUMN supplier_code TEXT;');
            }
            if (!supplierCols.includes('contact_person')) {
                this.db.exec('ALTER TABLE suppliers ADD COLUMN contact_person TEXT;');
            }
            if (!supplierCols.includes('opening_balance')) {
                this.db.exec('ALTER TABLE suppliers ADD COLUMN opening_balance REAL NOT NULL DEFAULT 0;');
            }
            if (!supplierCols.includes('status')) {
                this.db.exec("ALTER TABLE suppliers ADD COLUMN status TEXT NOT NULL DEFAULT 'active';");
            }

            // Assign supplier_code if missing
            const emptyCodes = this.all("SELECT id FROM suppliers WHERE supplier_code IS NULL OR supplier_code = '' ORDER BY id ASC");
            for (let i = 0; i < emptyCodes.length; i++) {
                const code = `SUP-${String(emptyCodes[i].id).padStart(4, '0')}`;
                this.run('UPDATE suppliers SET supplier_code = ? WHERE id = ?', [code, emptyCodes[i].id]);
            }

            // 2. Upgrade supplier_payments table
            const paymentCols = this.all('PRAGMA table_info(supplier_payments)').map(c => c.name);
            if (!paymentCols.includes('voucher_number')) {
                this.db.exec('ALTER TABLE supplier_payments ADD COLUMN voucher_number TEXT;');
            }
            if (!paymentCols.includes('payment_breakdown')) {
                this.db.exec('ALTER TABLE supplier_payments ADD COLUMN payment_breakdown TEXT;');
            }
            if (!paymentCols.includes('created_by')) {
                this.db.exec('ALTER TABLE supplier_payments ADD COLUMN created_by INTEGER REFERENCES users(id);');
            }

            // Assign voucher_number if missing
            const emptyVouchers = this.all("SELECT id FROM supplier_payments WHERE voucher_number IS NULL OR voucher_number = '' ORDER BY id ASC");
            for (let i = 0; i < emptyVouchers.length; i++) {
                const vCode = `SPAY-${String(emptyVouchers[i].id).padStart(6, '0')}`;
                this.run('UPDATE supplier_payments SET voucher_number = ? WHERE id = ?', [vCode, emptyVouchers[i].id]);
            }

            // 3. Upgrade categories table
            const catCols = this.all('PRAGMA table_info(categories)').map(c => c.name);
            if (!catCols.includes('category_code')) {
                this.db.exec('ALTER TABLE categories ADD COLUMN category_code TEXT;');
            }
            if (!catCols.includes('parent_id')) {
                this.db.exec('ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;');
            }
            if (!catCols.includes('display_order')) {
                this.db.exec('ALTER TABLE categories ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;');
            }

            // Assign category_code if missing
            const emptyCatCodes = this.all("SELECT id FROM categories WHERE category_code IS NULL OR category_code = '' ORDER BY id ASC");
            for (let i = 0; i < emptyCatCodes.length; i++) {
                const cCode = `CAT-${String(emptyCatCodes[i].id).padStart(2, '0')}`;
                this.run('UPDATE categories SET category_code = ? WHERE id = ?', [cCode, emptyCatCodes[i].id]);
            }

            // 4. Upgrade products table
            const prodCols = this.all('PRAGMA table_info(products)').map(c => c.name);
            if (!prodCols.includes('product_code')) {
                this.db.exec('ALTER TABLE products ADD COLUMN product_code TEXT;');
            }
            if (!prodCols.includes('brand')) {
                this.db.exec('ALTER TABLE products ADD COLUMN brand TEXT;');
            }
            if (!prodCols.includes('unit_of_measure')) {
                this.db.exec("ALTER TABLE products ADD COLUMN unit_of_measure TEXT NOT NULL DEFAULT 'piece';");
            }
            if (!prodCols.includes('wholesale_price')) {
                this.db.exec('ALTER TABLE products ADD COLUMN wholesale_price REAL NOT NULL DEFAULT 0;');
            }
            if (!prodCols.includes('min_selling_price')) {
                this.db.exec('ALTER TABLE products ADD COLUMN min_selling_price REAL NOT NULL DEFAULT 0;');
            }
            if (!prodCols.includes('reorder_level')) {
                this.db.exec('ALTER TABLE products ADD COLUMN reorder_level REAL NOT NULL DEFAULT 5;');
                this.db.exec('UPDATE products SET reorder_level = COALESCE(min_stock_alert, 5);');
            }
            if (!prodCols.includes('status')) {
                this.db.exec("ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'active';");
            }

            // 5. Upgrade purchase_invoices table
            const purchaseCols = this.all('PRAGMA table_info(purchase_invoices)').map(c => c.name);
            if (!purchaseCols.includes('subtotal')) {
                this.db.exec('ALTER TABLE purchase_invoices ADD COLUMN subtotal REAL NOT NULL DEFAULT 0;');
            }
            if (!purchaseCols.includes('discount_amount')) {
                this.db.exec('ALTER TABLE purchase_invoices ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0;');
            }
            if (!purchaseCols.includes('shipping_cost')) {
                this.db.exec('ALTER TABLE purchase_invoices ADD COLUMN shipping_cost REAL NOT NULL DEFAULT 0;');
            }
            if (!purchaseCols.includes('tax_amount')) {
                this.db.exec('ALTER TABLE purchase_invoices ADD COLUMN tax_amount REAL NOT NULL DEFAULT 0;');
            }
            if (!purchaseCols.includes('payment_breakdown')) {
                this.db.exec('ALTER TABLE purchase_invoices ADD COLUMN payment_breakdown TEXT;');
            }

            // 6. Upgrade purchase_line_items table
            const lineCols = this.all('PRAGMA table_info(purchase_line_items)').map(c => c.name);
            if (!lineCols.includes('sell_price')) {
                this.db.exec('ALTER TABLE purchase_line_items ADD COLUMN sell_price REAL NOT NULL DEFAULT 0;');
            }
            if (!lineCols.includes('discount_percent')) {
                this.db.exec('ALTER TABLE purchase_line_items ADD COLUMN discount_percent REAL NOT NULL DEFAULT 0;');
            }

            // 7. Upgrade purchase_invoices for returns tracking
            if (!purchaseCols.includes('return_status')) {
                this.db.exec("ALTER TABLE purchase_invoices ADD COLUMN return_status TEXT NOT NULL DEFAULT 'none';");
            }
            if (!purchaseCols.includes('returned_amount')) {
                this.db.exec("ALTER TABLE purchase_invoices ADD COLUMN returned_amount REAL NOT NULL DEFAULT 0;");
            }

            // 8. Create purchase returns tables
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS purchase_returns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    return_number TEXT NOT NULL UNIQUE,
                    purchase_invoice_id INTEGER NOT NULL REFERENCES purchase_invoices(id),
                    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
                    total_returned_amount REAL NOT NULL CHECK(total_returned_amount >= 0),
                    refund_method TEXT NOT NULL,
                    refund_breakdown TEXT,
                    reason TEXT,
                    notes TEXT,
                    created_by INTEGER REFERENCES users(id),
                    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
                );

                CREATE TABLE IF NOT EXISTS purchase_return_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    purchase_return_id INTEGER NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
                    product_id INTEGER NOT NULL REFERENCES products(id),
                    returned_quantity REAL NOT NULL CHECK(returned_quantity > 0),
                    unit_cost REAL NOT NULL CHECK(unit_cost >= 0),
                    total_cost REAL NOT NULL CHECK(total_cost >= 0)
                );
            `);

            const returnCols = this.db.prepare("PRAGMA table_info(purchase_returns)").all().map(c => c.name);
            if (!returnCols.includes('refund_breakdown')) {
                this.db.exec("ALTER TABLE purchase_returns ADD COLUMN refund_breakdown TEXT;");
            }

            // 9. POS Master Overhaul: Upgrade sales_invoices and customers
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS customers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    phone TEXT UNIQUE,
                    email TEXT,
                    points INTEGER NOT NULL DEFAULT 0,
                    total_spent REAL NOT NULL DEFAULT 0,
                    notes TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
                );
                CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
            `);

            const salesCols = this.db.prepare("PRAGMA table_info(sales_invoices)").all().map(c => c.name);
            if (!salesCols.includes('invoice_type')) {
                this.db.exec("ALTER TABLE sales_invoices ADD COLUMN invoice_type TEXT NOT NULL DEFAULT 'sale';");
            }
            if (!salesCols.includes('customer_id')) {
                this.db.exec("ALTER TABLE sales_invoices ADD COLUMN customer_id INTEGER;");
            }
            if (!salesCols.includes('customer_name')) {
                this.db.exec("ALTER TABLE sales_invoices ADD COLUMN customer_name TEXT;");
            }
            if (!salesCols.includes('customer_phone')) {
                this.db.exec("ALTER TABLE sales_invoices ADD COLUMN customer_phone TEXT;");
            }
            if (!salesCols.includes('cash_amount')) {
                this.db.exec("ALTER TABLE sales_invoices ADD COLUMN cash_amount REAL NOT NULL DEFAULT 0;");
            }
            if (!salesCols.includes('card_amount')) {
                this.db.exec("ALTER TABLE sales_invoices ADD COLUMN card_amount REAL NOT NULL DEFAULT 0;");
            }
            if (!salesCols.includes('transfer_amount')) {
                this.db.exec("ALTER TABLE sales_invoices ADD COLUMN transfer_amount REAL NOT NULL DEFAULT 0;");
            }

            // Seed default POS & security settings if missing
            const insertSettingIfMissing = (key, val, desc) => {
                const exist = this.db.prepare("SELECT key FROM app_settings WHERE key = ?").get(key);
                if (!exist) {
                    this.db.prepare("INSERT INTO app_settings (key, value, description) VALUES (?, ?, ?)").run(key, val, desc);
                }
            };

            insertSettingIfMissing('cashier_max_discount_percent', '5', 'الحد الأقصى لنسبة الخصم المسموح بها للكاشير دون موافقة المدير');
            insertSettingIfMissing('require_customer_name', '0', 'إلزامية إدخال اسم العميل في فواتير البيع (1 نعم، 0 اختياري)');
            insertSettingIfMissing('require_customer_phone', '0', 'إلزامية إدخال هاتف العميل في فواتير البيع (1 نعم، 0 اختياري)');
            insertSettingIfMissing('auto_close_shift_time', '01:00', 'موعد الإغلاق التلقائي اليومي للورديات المفتوحة');
        } catch (err) {
            console.error('[Database Migration Warning]:', err.message);
        }
    }

    /**
     * Execute SQL string
     */
    exec(sql) {
        this.ensureConnected();
        return this.db.exec(sql);
    }

    /**
     * Sanitize parameters: node:sqlite throws if undefined is passed.
     * Convert any undefined values to null.
     */
    _sanitizeParams(params) {
        if (!Array.isArray(params)) return [];
        return params.map(p => (p === undefined ? null : p));
    }

    /**
     * Get single row
     */
    get(sql, params = []) {
        this.ensureConnected();
        const stmt = this.db.prepare(sql);
        const results = stmt.all(...this._sanitizeParams(params));
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Get multiple rows
     */
    all(sql, params = []) {
        this.ensureConnected();
        const stmt = this.db.prepare(sql);
        return stmt.all(...this._sanitizeParams(params));
    }

    /**
     * Run INSERT, UPDATE, DELETE
     */
    run(sql, params = []) {
        this.ensureConnected();
        const stmt = this.db.prepare(sql);
        return stmt.run(...this._sanitizeParams(params));
    }

    /**
     * Execute transaction with BEGIN IMMEDIATE as prescribed by sqlite-ops
     * to prevent deadlock on concurrent write operations.
     */
    transaction(fn) {
        this.ensureConnected();
        this.db.exec('BEGIN IMMEDIATE;');
        try {
            const result = fn(this);
            this.db.exec('COMMIT;');
            return result;
        } catch (error) {
            this.db.exec('ROLLBACK;');
            throw error;
        }
    }

    /**
     * Hot Backup via VACUUM INTO
     * Safely clones the database without locking or tearing active writes.
     */
    backup(targetPath = null) {
        this.ensureConnected();
        if (!targetPath) {
            const backupDir = path.join(process.cwd(), 'data', 'backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
            targetPath = path.join(backupDir, `backup_${dateStr}.db`);
        }

        // Remove target if already exists
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
        }

        const sanitizedPath = targetPath.replace(/'/g, "''");
        this.db.exec(`VACUUM INTO '${sanitizedPath}';`);
        return targetPath;
    }

    /**
     * Close connection safely
     */
    close() {
        if (this.db) {
            try {
                this.db.exec('PRAGMA optimize;');
            } catch (e) {
                // Ignore optimize error on teardown
            }
            this.db.close();
            this.db = null;
        }
    }

    ensureConnected() {
        if (!this.db) {
            this.connect();
        }
    }
}

// Singleton instance for the main application
let defaultInstance = null;

function getDatabase(customPath = null) {
    if (!defaultInstance || customPath) {
        const instance = new DatabaseManager(customPath);
        instance.connect();
        if (!customPath) {
            defaultInstance = instance;
        }
        return instance;
    }
    return defaultInstance;
}

module.exports = {
    DatabaseManager,
    getDatabase
};
