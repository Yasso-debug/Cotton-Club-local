/**
 * Cotton Club POS - Expenses & Refunded Expenses Service (منظومة المصروفات والمصروف المرتد)
 * Supports outbound operational expenses (Cash Out -) and refunded expenses (Cash In +).
 * Integrates directly with cash drawer balance, atomic transactions, and shift reconciliation.
 */

class ExpenseService {
    constructor(dbManager) {
        this.db = dbManager;
    }

    /**
     * Generate unique voucher code: EXP-YYMM-XXXXX
     */
    generateVoucherCode() {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `EXP-${yy}${mm}-`;

        const lastRow = this.db.get(
            "SELECT voucher_code FROM petty_expenses WHERE voucher_code LIKE ? ORDER BY id DESC LIMIT 1",
            [`${prefix}%`]
        );

        let nextSeq = 1;
        if (lastRow && lastRow.voucher_code) {
            const parts = lastRow.voucher_code.split('-');
            if (parts.length === 3) {
                const num = parseInt(parts[2], 10);
                if (!isNaN(num)) nextSeq = num + 1;
            }
        }
        return `${prefix}${String(nextSeq).padStart(5, '0')}`;
    }

    /**
     * Add expense voucher (Expense or Refunded Expense)
     * Payload: { operational_type, category, subcategory, amount, salesperson_id, recipient_name, description, sessionId }
     */
    addExpense(expenseData, userId) {
        const {
            operational_type = 'expense',
            category = 'مصروفات عامة',
            subcategory = null,
            amount,
            description,
            salesperson_id = null,
            recipient_name = null,
            paidTo = null
        } = expenseData;

        // Auto-detect active session if not provided
        let sessionId = expenseData.sessionId;
        if (!sessionId) {
            const activeSession = this.db.get("SELECT id FROM daily_sessions WHERE status = 'open' ORDER BY id DESC LIMIT 1");
            if (activeSession) {
                sessionId = activeSession.id;
            } else {
                throw new Error('لا يمكن تسجيل حركة نقدية بدون وجود وردية عمل مفتوحة');
            }
        }

        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) {
            throw new Error('المبلغ المالي يجب أن يكون رقماً موجباً أكبر من الصفر');
        }

        if (!description || description.trim() === '') {
            throw new Error('بيان وسبب الصرف أو الارتداد مطلوب');
        }

        // Verify session status
        const session = this.db.get(
            "SELECT id, status, opening_cash FROM daily_sessions WHERE id = ? AND status = 'open'",
            [sessionId]
        );
        if (!session) {
            throw new Error('الوردية المحددة غير نشطة أو مغلقة');
        }

        const opType = operational_type === 'returned_expense' ? 'returned_expense' : 'expense';
        const finalRecipient = (recipient_name || paidTo || '').trim() || null;
        const voucherCode = this.generateVoucherCode();

        // Atomic Transaction
        const insertRes = this.db.transaction(() => {
            const res = this.db.run(
                `INSERT INTO petty_expenses (
                    session_id, voucher_code, operational_type, category, subcategory,
                    amount, description, paid_to, recipient_name, salesperson_id,
                    approved_by, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
                [
                    sessionId,
                    voucherCode,
                    opType,
                    category.trim(),
                    subcategory ? subcategory.trim() : null,
                    amt,
                    description.trim(),
                    finalRecipient,
                    finalRecipient,
                    salesperson_id ? Number(salesperson_id) : null,
                    userId || 1
                ]
            );

            // Audit Trail
            const actionName = opType === 'returned_expense' ? 'ADD_REFUNDED_EXPENSE' : 'ADD_EXPENSE';
            this.db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, ?, 'petty_expenses', ?, ?)`,
                [
                    userId || 1,
                    actionName,
                    String(res.lastInsertRowid),
                    JSON.stringify({
                        voucher_code: voucherCode,
                        operational_type: opType,
                        amount: amt,
                        category,
                        subcategory,
                        salesperson_id,
                        recipient: finalRecipient,
                        description: description.trim()
                    })
                ]
            );

            return res.lastInsertRowid;
        });

        return this.getExpenseById(insertRes);
    }

    /**
     * Get single expense by ID
     */
    getExpenseById(id) {
        return this.db.get(
            `SELECT 
                pe.*, 
                u.display_name as approved_by_name,
                sp.display_name as salesperson_name,
                ds.session_code
             FROM petty_expenses pe
             JOIN users u ON pe.approved_by = u.id
             LEFT JOIN users sp ON pe.salesperson_id = sp.id
             LEFT JOIN daily_sessions ds ON pe.session_id = ds.id
             WHERE pe.id = ?`,
            [id]
        );
    }

    /**
     * Get Real-time Financial KPIs (GET /api/swm/expenses)
     */
    getExpensesSummary(params = {}) {
        const { date = null, sessionId = null } = params;

        let whereClause = `WHERE 1=1`;
        const sqlParams = [];

        if (sessionId) {
            whereClause += ` AND pe.session_id = ?`;
            sqlParams.push(sessionId);
        } else if (date) {
            whereClause += ` AND date(pe.created_at) = date(?)`;
            sqlParams.push(date);
        } else {
            // Default to today
            whereClause += ` AND date(pe.created_at) = date('now', 'localtime')`;
        }

        const stats = this.db.get(
            `SELECT 
                COALESCE(SUM(CASE WHEN pe.operational_type != 'returned_expense' THEN pe.amount ELSE 0 END), 0) as total_out,
                COALESCE(SUM(CASE WHEN pe.operational_type = 'returned_expense' THEN pe.amount ELSE 0 END), 0) as total_refunded,
                COALESCE(SUM(CASE WHEN pe.operational_type != 'returned_expense' THEN 1 ELSE 0 END), 0) as count_out,
                COALESCE(SUM(CASE WHEN pe.operational_type = 'returned_expense' THEN 1 ELSE 0 END), 0) as count_refunded,
                COALESCE(SUM(CASE WHEN pe.operational_type != 'returned_expense' AND (pe.category LIKE '%سلف%' OR pe.category LIKE '%سحب%' OR pe.salesperson_id IS NOT NULL) THEN pe.amount ELSE 0 END), 0) as total_withdrawals,
                COALESCE(SUM(CASE WHEN pe.operational_type != 'returned_expense' AND (pe.category LIKE '%فواتير%' OR pe.category LIKE '%كهرباء%' OR pe.category LIKE '%مرافق%') THEN pe.amount ELSE 0 END), 0) as total_bills
             FROM petty_expenses pe
             ${whereClause}`,
            sqlParams
        );

        const total_out = Math.round((stats?.total_out || 0) * 100) / 100;
        const total_refunded = Math.round((stats?.total_refunded || 0) * 100) / 100;
        const net_expense = Math.round((total_out - total_refunded) * 100) / 100;
        const total_withdrawals = Math.round((stats?.total_withdrawals || 0) * 100) / 100;
        const total_bills = Math.round((stats?.total_bills || 0) * 100) / 100;

        return {
            total_out,
            total_refunded,
            net_expense,
            total_withdrawals,
            total_bills,
            count_out: stats?.count_out || 0,
            count_refunded: stats?.count_refunded || 0
        };
    }

    /**
     * Advanced Administrative Analytics (GET /api/swm/expenses/analytics)
     */
    getExpensesAnalytics(periodDays = 30) {
        const days = Number(periodDays) || 30;

        // Daily trend over period
        const trendRows = this.db.all(
            `SELECT 
                date(pe.created_at) as log_date,
                COALESCE(SUM(CASE WHEN pe.operational_type != 'returned_expense' THEN pe.amount ELSE 0 END), 0) as day_out,
                COALESCE(SUM(CASE WHEN pe.operational_type = 'returned_expense' THEN pe.amount ELSE 0 END), 0) as day_refunded,
                COALESCE(SUM(CASE WHEN pe.operational_type != 'returned_expense' THEN pe.amount ELSE -pe.amount END), 0) as day_net
             FROM petty_expenses pe
             WHERE date(pe.created_at) >= date('now', 'localtime', '-' || ? || ' days')
             GROUP BY date(pe.created_at)
             ORDER BY log_date ASC`,
            [days]
        );

        // Today's total out
        const todayRow = this.db.get(
            `SELECT 
                COALESCE(SUM(CASE WHEN pe.operational_type != 'returned_expense' THEN pe.amount ELSE 0 END), 0) as today_out,
                COALESCE(SUM(CASE WHEN pe.operational_type = 'returned_expense' THEN pe.amount ELSE 0 END), 0) as today_refunded
             FROM petty_expenses pe
             WHERE date(pe.created_at) = date('now', 'localtime')`
        );

        const today_out = todayRow?.today_out || 0;

        // Calculate average daily expense
        let sumNet = 0;
        let dayCount = trendRows.length || 1;
        trendRows.forEach(r => sumNet += r.day_net);
        const daily_average = Math.round((sumNet / dayCount) * 100) / 100;

        // Risk Flag: is today spend > 1.5x daily average?
        const is_high_spend_today = daily_average > 0 && today_out > (1.5 * daily_average);

        // Category breakdown by spending percentage
        const catRows = this.db.all(
            `SELECT 
                pe.category,
                COALESCE(SUM(CASE WHEN pe.operational_type != 'returned_expense' THEN pe.amount ELSE 0 END), 0) as cat_amount
             FROM petty_expenses pe
             WHERE date(pe.created_at) >= date('now', 'localtime', '-' || ? || ' days')
             GROUP BY pe.category
             HAVING cat_amount > 0
             ORDER BY cat_amount DESC`,
            [days]
        );

        let totalPeriodSpend = 0;
        catRows.forEach(c => totalPeriodSpend += c.cat_amount);

        const category_breakdown = catRows.map(c => ({
            category: c.category,
            amount: Math.round(c.cat_amount * 100) / 100,
            percentage: totalPeriodSpend > 0 ? Math.round((c.cat_amount / totalPeriodSpend) * 1000) / 10 : 0
        }));

        return {
            period_days: days,
            daily_trend: trendRows,
            daily_average,
            today_out,
            is_high_spend_today,
            total_period_spend: Math.round(totalPeriodSpend * 100) / 100,
            category_breakdown
        };
    }

    /**
     * Get Approved Store Categories
     */
    getCategories() {
        const setting = this.db.get("SELECT value FROM app_settings WHERE key = 'store_expense_categories'");
        if (setting && setting.value) {
            try {
                return JSON.parse(setting.value);
            } catch (e) {
                // fallback
            }
        }
        return [
            { id: 'bills', name: 'فواتير ومرافق التشغيل', subcategories: ['كهرباء', 'مياه', 'إنترنت وتليفون', 'إيجار'] },
            { id: 'withdrawals', name: 'سلف وسحب بائعين', subcategories: ['سلفة شخصية', 'سحب عمولة مقدماً', 'عهدة تشغيل مؤقتة'], requiresStaff: true },
            { id: 'hospitality', name: 'ضيافة ونظافة وبوفيه', subcategories: ['مستلزمات نظافة', 'بوفيه ومشروبات', 'أدوات مكتبية'] },
            { id: 'shipping', name: 'شحن ونثريات', subcategories: ['مصاريف شحن وتوصيل', 'نثريات طارئة', 'صيانة سريعة'] },
            { id: 'refunded', name: 'مصروف مرتد (إيداع نقدية)', subcategories: ['استرداد باقي سلفة', 'باقي نثريات مشتريات', 'مرتجع فاتورة خدمات', 'أخرى'], isRefund: true },
            { id: 'other', name: 'مصروفات تشغيلية أخرى', subcategories: ['عام'] }
        ];
    }

    /**
     * Add new expense category and broadcast across POS terminals
     */
    addCategory(categoryName, subcategories = []) {
        const name = (categoryName || '').trim();
        if (!name) {
            throw new Error('اسم بند المصروف مطلوب');
        }

        const current = this.getCategories();
        const exists = current.some(c => c.name.trim().toLowerCase() === name.toLowerCase());
        if (exists) {
            throw new Error('بند المصروف موجود بالفعل مسبقاً');
        }

        const randId = 'cat_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        const newCat = {
            id: randId,
            name: name,
            subcategories: Array.isArray(subcategories) && subcategories.length > 0 ? subcategories : ['عام']
        };

        const updated = [...current, newCat];
        this.saveCategories(updated);
        return newCat;
    }

    /**
     * Delete expense category
     */
    deleteCategory(categoryIdOrName) {
        if (!categoryIdOrName) throw new Error('معرف البند مطلوب');
        const target = String(categoryIdOrName).trim().toLowerCase();

        const current = this.getCategories();
        const filtered = current.filter(c => c.id !== target && c.name.toLowerCase() !== target);

        if (filtered.length === current.length) {
            throw new Error('بند المصروف غير موجود');
        }

        this.saveCategories(filtered);
        return true;
    }

    /**
     * Save categories to app_settings
     */
    saveCategories(categoriesList) {
        const json = JSON.stringify(categoriesList);
        const exist = this.db.get("SELECT key FROM app_settings WHERE key = 'store_expense_categories'");
        if (exist) {
            this.db.run("UPDATE app_settings SET value = ?, updated_at = datetime('now', 'localtime') WHERE key = 'store_expense_categories'", [json]);
        } else {
            this.db.run("INSERT INTO app_settings (key, value, description) VALUES ('store_expense_categories', ?, 'قائمة بنود المصروفات المعتمدة من الإدارة')", [json]);
        }
        return categoriesList;
    }

    /**
     * List all expenses with filtering & sorting (Read-Only log)
     */
    listAllExpenses(options = {}) {
        const limit = typeof options === 'number' ? options : (options?.limit || 100);
        const { operational_type = null, category = null, search = null, date = null, sessionId = null } = (typeof options === 'object' ? options : {});

        let sql = `
            SELECT 
                pe.*,
                COALESCE(pe.voucher_code, 'EXP-' || pe.id) as voucher_code,
                COALESCE(pe.recipient_name, pe.paid_to) as recipient_name,
                u.display_name as approved_by_name,
                sp.display_name as salesperson_name,
                ds.session_code
            FROM petty_expenses pe
            JOIN users u ON pe.approved_by = u.id
            LEFT JOIN users sp ON pe.salesperson_id = sp.id
            LEFT JOIN daily_sessions ds ON pe.session_id = ds.id
            WHERE 1=1
        `;
        const params = [];

        if (operational_type && operational_type !== 'all') {
            sql += ` AND pe.operational_type = ?`;
            params.push(operational_type);
        }

        if (category && category !== 'all') {
            sql += ` AND pe.category = ?`;
            params.push(category);
        }

        if (sessionId) {
            sql += ` AND pe.session_id = ?`;
            params.push(sessionId);
        }

        if (date) {
            sql += ` AND date(pe.created_at) = date(?)`;
            params.push(date);
        }

        if (search && search.trim() !== '') {
            sql += ` AND (pe.voucher_code LIKE ? OR pe.description LIKE ? OR pe.paid_to LIKE ? OR pe.recipient_name LIKE ? OR sp.display_name LIKE ?)`;
            const s = `%${search.trim()}%`;
            params.push(s, s, s, s, s);
        }

        sql += ` ORDER BY pe.id DESC LIMIT ?`;
        params.push(limit);

        return this.db.all(sql, params);
    }

    /**
     * List expenses for active session
     */
    listSessionExpenses(sessionId) {
        return this.listAllExpenses({ sessionId, limit: 100 });
    }
}

module.exports = { ExpenseService };
