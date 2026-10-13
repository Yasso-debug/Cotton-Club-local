/**
 * Cotton Club POS - Central Treasury Service
 * Manages the store's primary cash safe independent of daily POS cashier drawers.
 * Handles safe deposits, withdrawals, shift settlements, and balance calculations.
 */

class TreasuryService {
    constructor(dbManager) {
        this.db = dbManager;
    }

    /**
     * Get current verified balance of the Central Treasury
     */
    getBalance() {
        const stats = this.db.get(`
            SELECT 
                COALESCE(SUM(CASE WHEN transaction_type IN ('deposit', 'shift_transfer') THEN amount ELSE 0 END), 0) as total_inflows,
                COALESCE(SUM(CASE WHEN transaction_type IN ('withdraw', 'salary_payout') THEN amount ELSE 0 END), 0) as total_outflows
            FROM central_treasury_transactions
        `);

        const balance = (stats?.total_inflows || 0) - (stats?.total_outflows || 0);
        return {
            balance: Math.round(balance * 100) / 100,
            totalInflows: Math.round((stats?.total_inflows || 0) * 100) / 100,
            totalOutflows: Math.round((stats?.total_outflows || 0) * 100) / 100
        };
    }

    /**
     * Record cash deposit into Central Treasury
     */
    deposit(amount, sourceDestination, notes, userId) {
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) {
            throw new Error('مبلغ الإيداع يجب أن يكون أكبر من الصفر');
        }

        if (!sourceDestination || !sourceDestination.trim()) {
            throw new Error('يرجى تحديد مصدر الإيداع (الجهة المودعة)');
        }

        return this.db.transaction((db) => {
            const res = db.run(
                `INSERT INTO central_treasury_transactions (
                    transaction_type, amount, source_destination, notes, performed_by
                ) VALUES ('deposit', ?, ?, ?, ?)`,
                [amt, sourceDestination.trim(), notes ? notes.trim() : null, userId]
            );

            // Audit
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'TREASURY_DEPOSIT', 'central_treasury_transactions', ?, ?)`,
                [userId, String(res.lastInsertRowid), JSON.stringify({ amount: amt, source: sourceDestination })]
            );

            return this.getTransactionById(res.lastInsertRowid);
        });
    }

    /**
     * Record cash withdrawal from Central Treasury
     */
    withdraw(amount, destination, notes, userId) {
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) {
            throw new Error('مبلغ السحب يجب أن يكون أكبر من الصفر');
        }

        if (!destination || !destination.trim()) {
            throw new Error('يرجى تحديد جهة أو سبب السحب');
        }

        const currentBalance = this.getBalance().balance;
        if (amt > currentBalance) {
            throw new Error(`رصيد الخزنة المركزية الحالي (${currentBalance} ج.م) لا يكفي لسحب (${amt} ج.م)`);
        }

        return this.db.transaction((db) => {
            const res = db.run(
                `INSERT INTO central_treasury_transactions (
                    transaction_type, amount, source_destination, notes, performed_by
                ) VALUES ('withdraw', ?, ?, ?, ?)`,
                [amt, destination.trim(), notes ? notes.trim() : null, userId]
            );

            // Audit
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'TREASURY_WITHDRAW', 'central_treasury_transactions', ?, ?)`,
                [userId, String(res.lastInsertRowid), JSON.stringify({ amount: amt, destination })]
            );

            return this.getTransactionById(res.lastInsertRowid);
        });
    }

    /**
     * Transfer drawer cash from a closed/open daily session to Central Safe
     */
    transferFromSession(sessionId, amount, notes, userId) {
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) {
            throw new Error('المبلغ المحول يجب أن يكون أكبر من الصفر');
        }

        return this.db.transaction((db) => {
            const session = db.get('SELECT session_code FROM daily_sessions WHERE id = ?', [sessionId]);
            const code = session ? session.session_code : `SES-#${sessionId}`;

            const res = db.run(
                `INSERT INTO central_treasury_transactions (
                    transaction_type, amount, source_destination, session_id, notes, performed_by
                ) VALUES ('shift_transfer', ?, ?, ?, ?, ?)`,
                [amt, `توريد نقدية من الوردية (${code})`, sessionId, notes ? notes.trim() : null, userId]
            );

            return this.getTransactionById(res.lastInsertRowid);
        });
    }

    /**
     * List recent transactions with user and session info
     */
    listTransactions(limit = 50) {
        return this.db.all(
            `SELECT t.*, u.display_name as performed_by_name, s.session_code
             FROM central_treasury_transactions t
             LEFT JOIN users u ON t.performed_by = u.id
             LEFT JOIN daily_sessions s ON t.session_id = s.id
             ORDER BY t.id DESC LIMIT ?`,
            [limit]
        );
    }

    getTransactionById(id) {
        return this.db.get(
            `SELECT t.*, u.display_name as performed_by_name
             FROM central_treasury_transactions t
             LEFT JOIN users u ON t.performed_by = u.id
             WHERE t.id = ?`,
            [id]
        );
    }
}

module.exports = { TreasuryService };
