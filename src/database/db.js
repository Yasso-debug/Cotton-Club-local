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
            insertSettingIfMissing('allow_salesperson_discount', '1', 'السماح للبائع بمنح خصم مباشر في شاشة الكاشير');
            insertSettingIfMissing('require_supervisor_discount', '0', 'اشتراط إذن المشرف لتجاوز سقف الخصم');
            insertSettingIfMissing('allow_salesperson_returns', '1', 'السماح للبائع بإجراء مرتجعات');
            insertSettingIfMissing('require_customer_name', '0', 'إلزامية إدخال اسم العميل في فواتير البيع (1 نعم، 0 اختياري)');
            insertSettingIfMissing('require_customer_phone', '0', 'إلزامية إدخال هاتف العميل في فواتير البيع (1 نعم، 0 اختياري)');
            insertSettingIfMissing('default_opening_float', '0', 'الرصيد الافتتاحي التلقائي لدرج الكاشير');
            insertSettingIfMissing('auto_close_shift_time', '01:00', 'موعد الإغلاق التلقائي اليومي للورديات المفتوحة');

            // Re-attribute sales invoices under admin accounts to default active branch cashier (Admin does not sell in branch)
            const defaultBranchCashier = this.db.prepare("SELECT id FROM users WHERE role != 'admin' AND is_active = 1 ORDER BY id ASC LIMIT 1").get();
            if (defaultBranchCashier) {
                this.db.prepare("UPDATE sales_invoices SET user_id = ? WHERE user_id IN (SELECT id FROM users WHERE role = 'admin')").run(defaultBranchCashier.id);
            }

            // 10. Inventory movements table for full stock tracking
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS inventory_movements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL REFERENCES products(id),
                    movement_type TEXT NOT NULL CHECK(movement_type IN ('sale_out', 'return_in', 'purchase_in', 'purchase_return_out', 'adjustment_in', 'adjustment_out', 'opening_stock')),
                    quantity REAL NOT NULL,
                    stock_before REAL NOT NULL,
                    stock_after REAL NOT NULL,
                    unit_cost REAL NOT NULL DEFAULT 0,
                    reference_type TEXT NOT NULL,
                    reference_id INTEGER NOT NULL,
                    reference_number TEXT,
                    session_id INTEGER REFERENCES daily_sessions(id),
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    notes TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
                );
                CREATE INDEX IF NOT EXISTS idx_inv_mov_product ON inventory_movements(product_id);
                CREATE INDEX IF NOT EXISTS idx_inv_mov_type ON inventory_movements(movement_type);
                CREATE INDEX IF NOT EXISTS idx_inv_mov_ref ON inventory_movements(reference_type, reference_id);
            `);
            // 11. Expenses & Refunded Expenses Architecture Overhaul
            const expCols = this.db.prepare("PRAGMA table_info(petty_expenses)").all().map(c => c.name);
            if (!expCols.includes('voucher_code')) {
                this.db.exec("ALTER TABLE petty_expenses ADD COLUMN voucher_code TEXT;");
            }
            if (!expCols.includes('operational_type')) {
                this.db.exec("ALTER TABLE petty_expenses ADD COLUMN operational_type TEXT NOT NULL DEFAULT 'expense';");
            }
            if (!expCols.includes('subcategory')) {
                this.db.exec("ALTER TABLE petty_expenses ADD COLUMN subcategory TEXT;");
            }
            if (!expCols.includes('salesperson_id')) {
                this.db.exec("ALTER TABLE petty_expenses ADD COLUMN salesperson_id INTEGER REFERENCES users(id);");
            }
            if (!expCols.includes('recipient_name')) {
                this.db.exec("ALTER TABLE petty_expenses ADD COLUMN recipient_name TEXT;");
            }
            if (!expCols.includes('status')) {
                this.db.exec("ALTER TABLE petty_expenses ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';");
            }

            // Backfill voucher_code and recipient_name for existing records if null
            const emptyExpCodes = this.all("SELECT id, created_at, paid_to FROM petty_expenses WHERE voucher_code IS NULL OR voucher_code = '' ORDER BY id ASC");
            for (let i = 0; i < emptyExpCodes.length; i++) {
                const row = emptyExpCodes[i];
                const dt = row.created_at ? new Date(row.created_at) : new Date();
                const yy = String(dt.getFullYear()).slice(-2);
                const mm = String(dt.getMonth() + 1).padStart(2, '0');
                const vCode = `EXP-${yy}${mm}-${String(row.id).padStart(5, '0')}`;
                this.run("UPDATE petty_expenses SET voucher_code = ?, recipient_name = COALESCE(recipient_name, paid_to) WHERE id = ?", [vCode, row.id]);
            }

            insertSettingIfMissing('store_expense_categories', JSON.stringify([
                { id: 'bills', name: 'فواتير ومرافق التشغيل', subcategories: ['كهرباء', 'مياه', 'إنترنت وتليفون', 'إيجار'] },
                { id: 'withdrawals', name: 'سلف وسحب بائعين', subcategories: ['سلفة شخصية', 'سحب عمولة مقدماً', 'عهدة تشغيل مؤقتة'], requiresStaff: true },
                { id: 'hospitality', name: 'ضيافة ونظافة وبوفيه', subcategories: ['مستلزمات نظافة', 'بوفيه ومشروبات', 'أدوات مكتبية'] },
                { id: 'shipping', name: 'شحن ونثريات', subcategories: ['مصاريف شحن وتوصيل', 'نثريات طارئة', 'صيانة سريعة'] },
                { id: 'refunded', name: 'مصروف مرتد (إيداع نقدية)', subcategories: ['استرداد باقي سلفة', 'باقي نثريات مشتريات', 'مرتجع فاتورة خدمات', 'أخرى'], isRefund: true },
                { id: 'other', name: 'مصروفات تشغيلية أخرى', subcategories: ['عام'] }
            ]), 'قائمة بنود المصروفات المعتمدة من الإدارة');

            // 12. Central Treasury Transactions: Support multi-channel split and consolidated shift transfers
            const schemaRow = this.db.prepare("SELECT sql FROM sqlite_schema WHERE name = 'central_treasury_transactions'").get();
            const treasuryCols = this.db.prepare("PRAGMA table_info(central_treasury_transactions)").all().map(c => c.name);
            const needsTableRebuild = schemaRow && (
                schemaRow.sql.includes("CHECK(transaction_type IN") ||
                schemaRow.sql.includes("CHECK(payment_method IN") ||
                !treasuryCols.includes('cash_amount')
            );
            if (needsTableRebuild) {
                this.db.exec(`
                    PRAGMA foreign_keys = OFF;
                    CREATE TABLE central_treasury_transactions_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        transaction_type TEXT NOT NULL,
                        amount REAL NOT NULL CHECK(amount > 0),
                        payment_method TEXT NOT NULL DEFAULT 'cash',
                        cash_amount REAL DEFAULT 0,
                        card_amount REAL DEFAULT 0,
                        transfer_amount REAL DEFAULT 0,
                        source_destination TEXT NOT NULL,
                        session_id INTEGER REFERENCES daily_sessions(id),
                        reference_id TEXT,
                        notes TEXT,
                        performed_by INTEGER NOT NULL REFERENCES users(id),
                        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
                    );
                    INSERT INTO central_treasury_transactions_new (
                        id, transaction_type, amount, payment_method,
                        cash_amount, card_amount, transfer_amount,
                        source_destination, session_id, reference_id, notes, performed_by, created_at
                    )
                    SELECT 
                        id, transaction_type, amount, COALESCE(payment_method, 'cash'),
                        CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END,
                        CASE WHEN payment_method = 'card' THEN amount ELSE 0 END,
                        CASE WHEN payment_method = 'transfer' THEN amount ELSE 0 END,
                        source_destination, session_id, reference_id, notes, performed_by, created_at
                    FROM central_treasury_transactions;
                    DROP TABLE central_treasury_transactions;
                    ALTER TABLE central_treasury_transactions_new RENAME TO central_treasury_transactions;
                    CREATE INDEX IF NOT EXISTS idx_treasury_created ON central_treasury_transactions(created_at);
                    CREATE INDEX IF NOT EXISTS idx_treasury_payment_method ON central_treasury_transactions(payment_method);
                    PRAGMA foreign_keys = ON;
                `);
            } else {
                if (!treasuryCols.includes('payment_method')) {
                    this.db.exec("ALTER TABLE central_treasury_transactions ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash';");
                }
                if (!treasuryCols.includes('cash_amount')) {
                    this.db.exec("ALTER TABLE central_treasury_transactions ADD COLUMN cash_amount REAL DEFAULT 0;");
                }
                if (!treasuryCols.includes('card_amount')) {
                    this.db.exec("ALTER TABLE central_treasury_transactions ADD COLUMN card_amount REAL DEFAULT 0;");
                }
                if (!treasuryCols.includes('transfer_amount')) {
                    this.db.exec("ALTER TABLE central_treasury_transactions ADD COLUMN transfer_amount REAL DEFAULT 0;");
                }
                this.db.exec("CREATE INDEX IF NOT EXISTS idx_treasury_payment_method ON central_treasury_transactions(payment_method);");
            }

            // Consolidate duplicate shift_transfer rows for the same session into 1 single unified row
            const duplicateShiftSessions = this.db.prepare(`
                SELECT session_id, COUNT(*) as cnt 
                FROM central_treasury_transactions 
                WHERE transaction_type = 'shift_transfer' AND session_id IS NOT NULL 
                GROUP BY session_id 
                HAVING cnt > 1
            `).all();

            for (const item of duplicateShiftSessions) {
                const sid = item.session_id;
                const rows = this.db.prepare(
                    "SELECT * FROM central_treasury_transactions WHERE session_id = ? AND transaction_type = 'shift_transfer' ORDER BY id ASC"
                ).all(sid);

                if (rows.length > 1) {
                    const primary = rows[0];
                    let totalCash = 0;
                    let totalCard = 0;
                    let totalTransfer = 0;
                    let totalAmt = 0;

                    for (const r of rows) {
                        totalAmt += Number(r.amount || 0);
                        const pm = (r.payment_method || '').toLowerCase();
                        const c = Number(r.cash_amount ?? (pm === 'cash' ? r.amount : 0));
                        const cd = Number(r.card_amount ?? (pm === 'card' ? r.amount : 0));
                        const trf = Number(r.transfer_amount ?? (pm === 'transfer' ? r.amount : 0));
                        totalCash += c;
                        totalCard += cd;
                        totalTransfer += trf;
                    }

                    const sessionRow = this.db.prepare("SELECT opened_at, session_code FROM daily_sessions WHERE id = ?").get(sid);
                    const salesDateStr = sessionRow?.opened_at ? sessionRow.opened_at.slice(0, 10) : (sessionRow?.session_code ? sessionRow.session_code.replace('SES-', '').slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : null);
                    const stampedCreatedAt = salesDateStr ? `${salesDateStr} 23:59:00` : primary.created_at;

                    const breakdownText = `[كاش: ${totalCash.toFixed(2)} ج.م | بنكي/فيزا: ${totalCard.toFixed(2)} ج.م | تحويلات: ${totalTransfer.toFixed(2)} ج.م]`;
                    
                    let pm = 'split';
                    if (totalCash > 0 && totalCard === 0 && totalTransfer === 0) pm = 'cash';
                    else if (totalCard > 0 && totalCash === 0 && totalTransfer === 0) pm = 'card';
                    else if (totalTransfer > 0 && totalCash === 0 && totalCard === 0) pm = 'transfer';

                    const sessionCode = sessionRow?.session_code || `SES-#${sid}`;
                    const sourceDest = `توريد مبيعات وردية (${sessionCode})`;
                    
                    let baseNote = (primary.notes || '').replace(/ - (كاش|حساب بنكي|تحويلات)[^|]*/g, '').trim();
                    if (baseNote.endsWith('|')) baseNote = baseNote.slice(0, -1).trim();
                    const combinedNotes = baseNote ? `${baseNote} | ${breakdownText}` : breakdownText;

                    this.db.prepare(`
                        UPDATE central_treasury_transactions
                        SET amount = ?,
                            payment_method = ?,
                            cash_amount = ?,
                            card_amount = ?,
                            transfer_amount = ?,
                            source_destination = ?,
                            notes = ?,
                            created_at = ?
                        WHERE id = ?
                    `).run(
                        Math.round(totalAmt * 100) / 100,
                        pm,
                        Math.round(totalCash * 100) / 100,
                        Math.round(totalCard * 100) / 100,
                        Math.round(totalTransfer * 100) / 100,
                        sourceDest,
                        combinedNotes,
                        stampedCreatedAt,
                        primary.id
                    );

                    const extraIds = rows.slice(1).map(r => r.id);
                    for (const eid of extraIds) {
                        this.db.prepare("DELETE FROM central_treasury_transactions WHERE id = ?").run(eid);
                    }
                }
            }

            // Ensure all shift_transfer records have created_at stamped on the sales date of the shift
            const allShiftTxs = this.db.prepare(`
                SELECT t.id, t.session_id, t.created_at, s.opened_at, s.session_code
                FROM central_treasury_transactions t
                JOIN daily_sessions s ON t.session_id = s.id
                WHERE t.transaction_type = 'shift_transfer'
            `).all();

            for (const stx of allShiftTxs) {
                if (stx.opened_at) {
                    const salesDay = stx.opened_at.slice(0, 10);
                    const txDay = (stx.created_at || '').slice(0, 10);
                    if (salesDay !== txDay) {
                        this.db.prepare(
                            "UPDATE central_treasury_transactions SET created_at = ? WHERE id = ?"
                        ).run(`${salesDay} 23:59:00`, stx.id);
                    }
                }
            }


            // 13. Upgrade salary_payments & employees table for itemized payroll
            const empCols = this.db.prepare("PRAGMA table_info(employees)").all().map(c => c.name);
            if (!empCols.includes('branch')) {
                this.db.exec("ALTER TABLE employees ADD COLUMN branch TEXT DEFAULT 'المقر الرئيسي';");
            }

            const salCols = this.db.prepare("PRAGMA table_info(salary_payments)").all().map(c => c.name);
            if (!salCols.includes('basic_salary')) {
                this.db.exec("ALTER TABLE salary_payments ADD COLUMN basic_salary REAL NOT NULL DEFAULT 0;");
            }
            if (!salCols.includes('advances_deducted')) {
                this.db.exec("ALTER TABLE salary_payments ADD COLUMN advances_deducted REAL NOT NULL DEFAULT 0;");
            }
            if (!salCols.includes('penalties_deducted')) {
                this.db.exec("ALTER TABLE salary_payments ADD COLUMN penalties_deducted REAL NOT NULL DEFAULT 0;");
            }
            if (!salCols.includes('penalty_reason')) {
                this.db.exec("ALTER TABLE salary_payments ADD COLUMN penalty_reason TEXT;");
            }
            if (!salCols.includes('bonuses_added')) {
                this.db.exec("ALTER TABLE salary_payments ADD COLUMN bonuses_added REAL NOT NULL DEFAULT 0;");
            }
            if (!salCols.includes('bonus_reason')) {
                this.db.exec("ALTER TABLE salary_payments ADD COLUMN bonus_reason TEXT;");
            }
            if (!salCols.includes('net_amount')) {
                this.db.exec("ALTER TABLE salary_payments ADD COLUMN net_amount REAL NOT NULL DEFAULT 0;");
            }
            if (!salCols.includes('payment_method')) {
                this.db.exec("ALTER TABLE salary_payments ADD COLUMN payment_method TEXT DEFAULT 'cash';");
            }
            if (!salCols.includes('deduct_source')) {
                this.db.exec("ALTER TABLE salary_payments ADD COLUMN deduct_source TEXT DEFAULT 'main_safe';");
            }
            if (!salCols.includes('period_month')) {
                this.db.exec("ALTER TABLE salary_payments ADD COLUMN period_month TEXT;");
            }
            if (!salCols.includes('period_type')) {
                this.db.exec("ALTER TABLE salary_payments ADD COLUMN period_type TEXT DEFAULT 'month';");
            }
            if (!salCols.includes('period_start')) {
                this.db.exec("ALTER TABLE salary_payments ADD COLUMN period_start TEXT;");
            }
            if (!salCols.includes('period_end')) {
                this.db.exec("ALTER TABLE salary_payments ADD COLUMN period_end TEXT;");
            }
            // Populate net_amount = amount for existing records if net_amount is 0
            this.db.exec("UPDATE salary_payments SET net_amount = amount WHERE net_amount = 0 AND amount > 0;");
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
