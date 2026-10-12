/**
 * Cotton Club POS - Petty Expenses Service
 * Handles operational petty cash payouts from the cash drawer during daily sessions.
 */

class ExpenseService {
    constructor(dbManager) {
        this.db = dbManager;
    }

    /**
     * Add expense voucher
     */
    addExpense(expenseData, userId) {
        const { sessionId, category, amount, description, paidTo } = expenseData;

        if (!sessionId) {
            throw new Error('لا يمكن تسجيل مصروف بدون وجود وردية نشطة');
        }

        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) {
            throw new Error('مبلغ المصروف يجب أن يكون أكبر من الصفر');
        }

        if (!description || description.trim() === '') {
            throw new Error('بيان المصروف مطلوب');
        }

        // Verify active session
        const session = this.db.get(
            "SELECT id, status FROM daily_sessions WHERE id = ? AND status = 'open'",
            [sessionId]
        );
        if (!session) {
            throw new Error('الوردية المحددة غير نشطة أو مغلقة');
        }

        const res = this.db.run(
            `INSERT INTO petty_expenses (
                session_id, category, amount, description, paid_to, approved_by
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [sessionId, category || 'مصروفات عامة', amt, description.trim(), paidTo || null, userId]
        );

        // Audit
        this.db.run(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
             VALUES (?, 'ADD_EXPENSE', 'petty_expenses', ?, ?)`,
            [userId, String(res.lastInsertRowid), JSON.stringify({ amount: amt, description, category })]
        );

        return this.getExpenseById(res.lastInsertRowid);
    }

    getExpenseById(id) {
        return this.db.get(
            `SELECT pe.*, u.display_name as approved_by_name
             FROM petty_expenses pe
             JOIN users u ON pe.approved_by = u.id
             WHERE pe.id = ?`,
            [id]
        );
    }

    listSessionExpenses(sessionId) {
        return this.db.all(
            `SELECT pe.*, u.display_name as approved_by_name
             FROM petty_expenses pe
             JOIN users u ON pe.approved_by = u.id
             WHERE pe.session_id = ?
             ORDER BY pe.id DESC`,
            [sessionId]
        );
    }

    listAllExpenses(limit = 50) {
        return this.db.all(
            `SELECT pe.*, u.display_name as approved_by_name, ds.session_code
             FROM petty_expenses pe
             JOIN users u ON pe.approved_by = u.id
             JOIN daily_sessions ds ON pe.session_id = ds.id
             ORDER BY pe.id DESC LIMIT ?`,
            [limit]
        );
    }
}

module.exports = { ExpenseService };
