/**
 * Cotton Club POS - Daily Session Service
 * Manages the single daily cash drawer session life-cycle (Open -> Transact -> Close & Z-Report)
 * Deep module: enforces one-session invariant, drawer balance formula, and auto-backup.
 */

class SessionService {
    constructor(dbManager) {
        this.db = dbManager;
    }

    /**
     * Get the currently active open session, or null if closed
     */
    getActiveSession() {
        return this.db.get(
            `SELECT s.*, u.display_name as opened_by_name
             FROM daily_sessions s
             JOIN users u ON s.opened_by = u.id
             WHERE s.status = 'open'
             ORDER BY s.id DESC LIMIT 1`
        );
    }

    /**
     * Open a new daily session
     */
    openSession(userId, openingCash = 0, notes = '') {
        return this.db.transaction((db) => {
            const active = this.getActiveSession();
            if (active) {
                throw new Error(`توجد وردية مفتوحة بالفعل برقم (${active.session_code}). يجب إغلاقها أولاً.`);
            }

            if (openingCash < 0) {
                throw new Error('مبلغ رصيد بداية اليوم لا يمكن أن يكون سالباً');
            }

            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const todayCountRow = db.get(
                "SELECT COUNT(*) as count FROM daily_sessions WHERE session_code LIKE ?",
                [`SES-${today}-%`]
            );
            const nextSeq = String((todayCountRow?.count || 0) + 1).padStart(3, '0');
            const sessionCode = `SES-${today}-${nextSeq}`;

            const res = db.run(
                `INSERT INTO daily_sessions (session_code, opened_by, opening_cash, notes, status)
                 VALUES (?, ?, ?, ?, 'open')`,
                [sessionCode, userId, Number(openingCash), notes || null]
            );

            // Audit
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'OPEN_SESSION', 'daily_sessions', ?, ?)`,
                [userId, String(res.lastInsertRowid), JSON.stringify({ sessionCode, openingCash })]
            );

            return this.getSessionById(res.lastInsertRowid);
        });
    }

    /**
     * Calculate current expected cash and session financial summary
     */
    getSessionSummary(sessionId) {
        const session = this.getSessionById(sessionId);
        if (!session) {
            throw new Error('الوردية غير موجودة');
        }

        // 1. Sales totals
        const salesStats = this.db.get(
            `SELECT 
                COUNT(*) as total_invoices,
                COALESCE(SUM(final_total), 0) as total_sales,
                COALESCE(SUM(discount_amount), 0) as total_discounts,
                COALESCE(SUM(total_cost), 0) as total_cost,
                COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN final_total ELSE 0 END), 0) as direct_cash_sales,
                COALESCE(SUM(CASE WHEN payment_method = 'card' THEN final_total ELSE 0 END), 0) as direct_card_sales,
                COALESCE(SUM(CASE WHEN payment_method = 'split' THEN final_total ELSE 0 END), 0) as split_sales
             FROM sales_invoices
             WHERE session_id = ? AND status = 'completed'`,
            [sessionId]
        );

        // 2. Split payment sales
        const splitCash = this.db.get(
            `SELECT COALESCE(SUM(ps.amount), 0) as split_cash
             FROM payment_splits ps
             JOIN sales_invoices si ON ps.invoice_id = si.id
             WHERE si.session_id = ? AND si.status = 'completed' AND ps.method = 'cash'`,
            [sessionId]
        );

        const splitCard = this.db.get(
            `SELECT COALESCE(SUM(ps.amount), 0) as split_card
             FROM payment_splits ps
             JOIN sales_invoices si ON ps.invoice_id = si.id
             WHERE si.session_id = ? AND si.status = 'completed' AND ps.method = 'card'`,
            [sessionId]
        );

        const totalCashSales = (salesStats?.direct_cash_sales || 0) + (splitCash?.split_cash || 0);
        const totalCardSales = (salesStats?.direct_card_sales || 0) + (splitCard?.split_card || 0);

        // 3. Petty expenses paid from drawer
        const expenses = this.db.get(
            `SELECT COALESCE(SUM(amount), 0) as total_expenses, COUNT(*) as expense_count
             FROM petty_expenses
             WHERE session_id = ?`,
            [sessionId]
        );

        // 4. Supplier payments paid in cash during this session
        const supplierPayments = this.db.get(
            `SELECT COALESCE(SUM(amount), 0) as total_supplier_payments
             FROM supplier_payments
             WHERE session_id = ? AND payment_method = 'cash'`,
            [sessionId]
        );

        // Invariant: Expected Cash = Opening Cash + Cash Sales - Expenses - Supplier Cash Payments
        const expectedCash = (session.opening_cash || 0) + totalCashSales - (expenses?.total_expenses || 0) - (supplierPayments?.total_supplier_payments || 0);
        const netProfit = (salesStats?.total_sales || 0) - (salesStats?.total_cost || 0) - (expenses?.total_expenses || 0);

        return {
            session,
            openingCash: session.opening_cash,
            totalInvoices: salesStats?.total_invoices || 0,
            totalSales: salesStats?.total_sales || 0,
            totalDiscounts: salesStats?.total_discounts || 0,
            totalCost: salesStats?.total_cost || 0,
            netProfit,
            directCashSales: salesStats?.direct_cash_sales || 0,
            directCardSales: salesStats?.direct_card_sales || 0,
            splitSales: salesStats?.split_sales || 0,
            totalCashSales,
            totalCardSales,
            splitCash: splitCash?.split_cash || 0,
            splitCard: splitCard?.split_card || 0,
            totalExpenses: expenses?.total_expenses || 0,
            expenseCount: expenses?.expense_count || 0,
            totalSupplierPayments: supplierPayments?.total_supplier_payments || 0,
            expectedCash: Math.round(expectedCash * 100) / 100
        };
    }

    /**
     * Close session and produce final Z-Report figures
     */
    closeSession(sessionId, closedByUserId, actualClosingCash, closingNotes = '') {
        const closedSummary = this.db.transaction((db) => {
            const session = this.getSessionById(sessionId);
            if (!session) {
                throw new Error('الوردية غير موجودة');
            }
            if (session.status === 'closed') {
                throw new Error('هذه الوردية مغلقة بالفعل');
            }

            const summary = this.getSessionSummary(sessionId);
            const expectedCash = summary.expectedCash;
            const actual = Number(actualClosingCash);
            const difference = Math.round((actual - expectedCash) * 100) / 100;

            db.run(
                `UPDATE daily_sessions
                 SET closed_by = ?,
                     closing_cash_actual = ?,
                     closing_cash_expected = ?,
                     cash_difference = ?,
                     notes = COALESCE(notes || ' | ', '') || ?,
                     status = 'closed',
                     closed_at = datetime('now', 'localtime')
                 WHERE id = ?`,
                [closedByUserId, actual, expectedCash, difference, closingNotes, sessionId]
            );

            // Audit
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'CLOSE_SESSION', 'daily_sessions', ?, ?)`,
                [closedByUserId, String(sessionId), JSON.stringify({ actual, expectedCash, difference })]
            );

            return {
                ...summary,
                closingCashActual: actual,
                cashDifference: difference,
                differenceStatus: difference === 0 ? 'matching' : difference > 0 ? 'surplus' : 'deficit'
            };
        });

        // Trigger safe backup on close (after transaction is committed)
        let backupPath = null;
        try {
            backupPath = this.db.backup();
        } catch (err) {
            // Memory databases or environments without disk paths may skip file backup
        }

        return {
            ...closedSummary,
            backupPath
        };
    }

    getSessionById(id) {
        return this.db.get(
            `SELECT s.*, 
                    u1.display_name as opened_by_name,
                    u2.display_name as closed_by_name
             FROM daily_sessions s
             LEFT JOIN users u1 ON s.opened_by = u1.id
             LEFT JOIN users u2 ON s.closed_by = u2.id
             WHERE s.id = ?`,
            [id]
        );
    }

    /**
     * List sessions with optional filters (startDate, endDate, status, limit)
     */
    listSessions(filters = 50) {
        let limit = 50;
        let startDate = null;
        let endDate = null;
        let status = null;

        if (typeof filters === 'number') {
            limit = filters;
        } else if (typeof filters === 'object' && filters !== null) {
            limit = filters.limit || 50;
            startDate = filters.startDate || null;
            endDate = filters.endDate || null;
            status = filters.status || null;
        }

        let sql = `
            SELECT s.*, 
                   u1.display_name as opened_by_name,
                   u2.display_name as closed_by_name
            FROM daily_sessions s
            LEFT JOIN users u1 ON s.opened_by = u1.id
            LEFT JOIN users u2 ON s.closed_by = u2.id
            WHERE 1=1
        `;
        const params = [];

        if (startDate) {
            sql += ' AND s.opened_at >= ?';
            params.push(`${startDate} 00:00:00`);
        }

        if (endDate) {
            sql += ' AND s.opened_at <= ?';
            params.push(`${endDate} 23:59:59`);
        }

        if (status) {
            sql += ' AND s.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY s.id DESC LIMIT ?';
        params.push(limit);

        return this.db.all(sql, params);
    }
}

module.exports = { SessionService };
