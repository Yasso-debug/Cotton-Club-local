/**
 * Cotton Club POS - Database Schema
 * Embedded SQLite 3.53+ with STRICT tables, WAL mode, foreign keys, and indexes.
 */

const SCHEMA_SQL = `
-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'cashier')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 2. Categories
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_code TEXT UNIQUE,
    name TEXT NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 3. Products & Inventory
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT UNIQUE,
    barcode TEXT,
    item_name TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    brand TEXT,
    unit_of_measure TEXT NOT NULL DEFAULT 'piece',
    cost_price REAL NOT NULL CHECK(cost_price >= 0),
    sell_price REAL NOT NULL CHECK(sell_price >= 0),
    wholesale_price REAL NOT NULL DEFAULT 0 CHECK(wholesale_price >= 0),
    min_selling_price REAL NOT NULL DEFAULT 0 CHECK(min_selling_price >= 0),
    current_stock REAL NOT NULL DEFAULT 0,
    min_stock_alert REAL NOT NULL DEFAULT 5 CHECK(min_stock_alert >= 0),
    reorder_level REAL NOT NULL DEFAULT 5 CHECK(reorder_level >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 4. Daily Sessions (Single session active at a time)
CREATE TABLE IF NOT EXISTS daily_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_code TEXT NOT NULL UNIQUE,
    opened_by INTEGER NOT NULL REFERENCES users(id),
    opening_cash REAL NOT NULL CHECK(opening_cash >= 0),
    closed_by INTEGER REFERENCES users(id),
    closing_cash_actual REAL CHECK(closing_cash_actual >= 0),
    closing_cash_expected REAL,
    cash_difference REAL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
    opened_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    closed_at TEXT
);

-- 4.5 Customers Directory
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

-- 5. Sales Invoices
CREATE TABLE IF NOT EXISTS sales_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_type TEXT NOT NULL DEFAULT 'sale' CHECK(invoice_type IN ('sale', 'return')),
    session_id INTEGER NOT NULL REFERENCES daily_sessions(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    customer_id INTEGER REFERENCES customers(id),
    customer_name TEXT,
    customer_phone TEXT,
    subtotal REAL NOT NULL,
    discount_amount REAL NOT NULL DEFAULT 0 CHECK(discount_amount >= 0),
    discount_percent REAL NOT NULL DEFAULT 0 CHECK(discount_percent >= 0 AND discount_percent <= 100),
    final_total REAL NOT NULL,
    cash_amount REAL NOT NULL DEFAULT 0,
    card_amount REAL NOT NULL DEFAULT 0,
    transfer_amount REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'card', 'transfer', 'split')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'voided', 'refunded')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 6. Sale Line Items
CREATE TABLE IF NOT EXISTS sale_line_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    barcode TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity REAL NOT NULL CHECK(quantity > 0),
    unit_price REAL NOT NULL CHECK(unit_price >= 0),
    cost_price_snapshot REAL NOT NULL CHECK(cost_price_snapshot >= 0),
    line_total REAL NOT NULL CHECK(line_total >= 0),
    line_profit REAL NOT NULL
);

-- 7. Payment Splits (For split transactions)
CREATE TABLE IF NOT EXISTS payment_splits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    method TEXT NOT NULL CHECK(method IN ('cash', 'card', 'transfer')),
    amount REAL NOT NULL CHECK(amount > 0)
);

-- 8. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_code TEXT UNIQUE,
    name TEXT NOT NULL UNIQUE,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    opening_balance REAL NOT NULL DEFAULT 0,
    balance REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'blacklisted')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 9. Purchase Invoices
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    session_id INTEGER REFERENCES daily_sessions(id),
    subtotal REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    shipping_cost REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL CHECK(total_amount >= 0),
    paid_amount REAL NOT NULL DEFAULT 0 CHECK(paid_amount >= 0),
    remaining_amount REAL NOT NULL CHECK(remaining_amount >= 0),
    payment_status TEXT NOT NULL CHECK(payment_status IN ('paid', 'partial', 'unpaid')),
    payment_breakdown TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 10. Purchase Line Items
CREATE TABLE IF NOT EXISTS purchase_line_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_invoice_id INTEGER NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL CHECK(quantity > 0),
    unit_cost REAL NOT NULL CHECK(unit_cost >= 0),
    sell_price REAL NOT NULL DEFAULT 0,
    discount_percent REAL NOT NULL DEFAULT 0,
    line_total REAL NOT NULL CHECK(line_total >= 0)
);

-- 11. Supplier Payments
CREATE TABLE IF NOT EXISTS supplier_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voucher_number TEXT UNIQUE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    purchase_invoice_id INTEGER REFERENCES purchase_invoices(id),
    session_id INTEGER REFERENCES daily_sessions(id),
    amount REAL NOT NULL CHECK(amount > 0),
    payment_method TEXT NOT NULL,
    payment_breakdown TEXT,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 12. Petty Expenses
CREATE TABLE IF NOT EXISTS petty_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES daily_sessions(id),
    category TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    description TEXT NOT NULL,
    paid_to TEXT,
    approved_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 13. Stock Adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    session_id INTEGER REFERENCES daily_sessions(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('increase', 'decrease', 'recount')),
    quantity REAL NOT NULL,
    reason TEXT NOT NULL CHECK(reason IN ('damage', 'theft', 'expired', 'inventory_count', 'other')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 14. App Settings (Key-Value Store)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 15. Central Treasury (Main Safe Transactions)
CREATE TABLE IF NOT EXISTS central_treasury_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_type TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    payment_method TEXT NOT NULL DEFAULT 'cash',
    source_destination TEXT NOT NULL,
    session_id INTEGER REFERENCES daily_sessions(id),
    reference_id TEXT,
    notes TEXT,
    performed_by INTEGER NOT NULL REFERENCES users(id),
    cash_amount REAL NOT NULL DEFAULT 0,
    card_amount REAL NOT NULL DEFAULT 0,
    transfer_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 16. Employees & Staff Directory
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    phone TEXT,
    branch TEXT DEFAULT 'المقر الرئيسي',
    basic_salary REAL NOT NULL DEFAULT 0 CHECK(basic_salary >= 0),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    hire_date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 17. Salary Payments & Advances
CREATE TABLE IF NOT EXISTS salary_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voucher_number TEXT NOT NULL UNIQUE,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    amount REAL NOT NULL CHECK(amount > 0),
    payment_type TEXT NOT NULL CHECK(payment_type IN ('salary', 'advance', 'bonus', 'deduction')),
    payment_source TEXT NOT NULL CHECK(payment_source IN ('treasury', 'drawer')),
    session_id INTEGER REFERENCES daily_sessions(id),
    basic_salary REAL NOT NULL DEFAULT 0,
    advances_deducted REAL NOT NULL DEFAULT 0,
    penalties_deducted REAL NOT NULL DEFAULT 0,
    penalty_reason TEXT,
    bonuses_added REAL NOT NULL DEFAULT 0,
    bonus_reason TEXT,
    net_amount REAL NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    deduct_source TEXT DEFAULT 'main_safe',
    period_month TEXT,
    period_type TEXT DEFAULT 'month',
    period_start TEXT,
    period_end TEXT,
    notes TEXT,
    paid_by INTEGER NOT NULL REFERENCES users(id),
    paid_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 18. Purchase Returns (مرتجعات المشتريات للموردين)
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

-- 19. Purchase Return Line Items
CREATE TABLE IF NOT EXISTS purchase_return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_return_id INTEGER NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    returned_quantity REAL NOT NULL CHECK(returned_quantity > 0),
    unit_cost REAL NOT NULL CHECK(unit_cost >= 0),
    total_cost REAL NOT NULL CHECK(total_cost >= 0)
);

-- 20. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_values TEXT,
    new_values TEXT,
    ip_address TEXT DEFAULT '127.0.0.1',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 20. Inventory Movements Audit Log (Full Stock Traceability)
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

-- Schema Migrations Tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- ⚡ PERFORMANCE INDEXES (sqlite-ops recommended)
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active_stock ON products(is_active, current_stock);
CREATE INDEX IF NOT EXISTS idx_sales_session ON sales_invoices(session_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales_invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_lines_invoice ON sale_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sale_lines_product ON sale_line_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON daily_sessions(status);
CREATE INDEX IF NOT EXISTS idx_expenses_session ON petty_expenses(session_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_session ON purchase_invoices(session_id);
CREATE INDEX IF NOT EXISTS idx_treasury_created ON central_treasury_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_salaries_employee ON salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_product ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_splits_invoice ON payment_splits(invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_lines_invoice ON purchase_line_items(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_session ON supplier_payments(session_id, payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_date_expr ON sales_invoices(date(created_at), status);
CREATE INDEX IF NOT EXISTS idx_inv_mov_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inv_mov_ref ON inventory_movements(reference_type, reference_id);
`;

module.exports = { SCHEMA_SQL };
