/**
 * Cotton Club POS - Daily Session Service
 * Manages the single daily cash drawer session life-cycle (Open -> Transact -> Close & Z-Report)
 * Deep module: enforces one-session invariant, drawer balance formula, and auto-backup.
 */

class SessionService {
    constructor(dbManager, treasuryService = null) {
        this.db = dbManager;
        this.treasuryService = treasuryService;
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

            let finalOpeningCash = Number(openingCash);
            if (finalOpeningCash === 0) {
                const defaultFloat = db.get("SELECT value FROM app_settings WHERE key = 'default_opening_float'")?.value;
                if (defaultFloat && Number(defaultFloat) > 0) {
                    finalOpeningCash = Number(defaultFloat);
                }
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
                [sessionCode, userId, finalOpeningCash, notes || null]
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

        // 1. Sales & Returns totals
        const salesStats = this.db.get(
            `SELECT 
                COUNT(*) as total_invoices,
                COALESCE(SUM(CASE WHEN invoice_type != 'return' THEN final_total ELSE 0 END), 0) as total_sales,
                COALESCE(SUM(CASE WHEN invoice_type = 'return' THEN final_total ELSE 0 END), 0) as total_returns,
                COALESCE(SUM(discount_amount), 0) as total_discounts,
                COALESCE(SUM(CASE WHEN invoice_type != 'return' THEN total_cost ELSE -total_cost END), 0) as net_cost,
                COALESCE(SUM(CASE WHEN invoice_type != 'return' THEN cash_amount ELSE 0 END), 0) as cash_sales,
                COALESCE(SUM(CASE WHEN invoice_type = 'return' THEN cash_amount ELSE 0 END), 0) as cash_returns,
                COALESCE(SUM(CASE WHEN invoice_type != 'return' THEN card_amount ELSE 0 END), 0) as card_sales,
                COALESCE(SUM(CASE WHEN invoice_type = 'return' THEN card_amount ELSE 0 END), 0) as card_returns,
                COALESCE(SUM(CASE WHEN invoice_type != 'return' THEN transfer_amount ELSE 0 END), 0) as transfer_sales,
                COALESCE(SUM(CASE WHEN invoice_type = 'return' THEN transfer_amount ELSE 0 END), 0) as transfer_returns
             FROM sales_invoices
             WHERE session_id = ? AND status = 'completed'`,
            [sessionId]
        );

        // Fallback for older invoices that had payment_method = 'split' and split tables
        const splitCash = this.db.get(
            `SELECT COALESCE(SUM(ps.amount), 0) as split_cash
             FROM payment_splits ps
             JOIN sales_invoices si ON ps.invoice_id = si.id
             WHERE si.session_id = ? AND si.status = 'completed' AND ps.method = 'cash' AND si.cash_amount = 0`,
            [sessionId]
        );

        const splitCard = this.db.get(
            `SELECT COALESCE(SUM(ps.amount), 0) as split_card
             FROM payment_splits ps
             JOIN sales_invoices si ON ps.invoice_id = si.id
             WHERE si.session_id = ? AND si.status = 'completed' AND ps.method = 'card' AND si.card_amount = 0`,
            [sessionId]
        );

        const totalCashSales = (salesStats?.cash_sales || 0) + (splitCash?.split_cash || 0);
        const totalCashReturns = salesStats?.cash_returns || 0;
        const netCashSales = totalCashSales - totalCashReturns;

        const totalCardSales = (salesStats?.card_sales || 0) + (splitCard?.split_card || 0);
        const totalCardReturns = salesStats?.card_returns || 0;
        const netCardSales = totalCardSales - totalCardReturns;

        const totalTransferSales = salesStats?.transfer_sales || 0;
        const totalTransferReturns = salesStats?.transfer_returns || 0;
        const netTransferSales = totalTransferSales - totalTransferReturns;

        // 3. Petty expenses & returned expenses paid from/to drawer
        const expenses = this.db.get(
            `SELECT 
                COALESCE(SUM(CASE WHEN operational_type = 'returned_expense' THEN 0 ELSE amount END), 0) as total_expenses,
                COALESCE(SUM(CASE WHEN operational_type = 'returned_expense' THEN amount ELSE 0 END), 0) as total_refunded,
                COALESCE(SUM(CASE WHEN operational_type = 'returned_expense' THEN -amount ELSE amount END), 0) as net_expenses,
                COUNT(*) as expense_count
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

        // Invariant: Expected Drawer Cash = Opening Cash + Net Cash Sales - Net Expenses - Supplier Cash Payments
        const netExpenses = expenses?.net_expenses || 0;
        const expectedCash = (session.opening_cash || 0) + netCashSales - netExpenses - (supplierPayments?.total_supplier_payments || 0);
        const netSales = (salesStats?.total_sales || 0) - (salesStats?.total_returns || 0);
        const netProfit = netSales - (salesStats?.net_cost || 0) - netExpenses;

        return {
            session,
            openingCash: session.opening_cash,
            totalInvoices: salesStats?.total_invoices || 0,
            totalSales: salesStats?.total_sales || 0,
            totalReturns: salesStats?.total_returns || 0,
            netSales,
            totalDiscounts: salesStats?.total_discounts || 0,
            totalCost: salesStats?.net_cost || 0,
            netProfit,
            totalCashSales,
            totalCashReturns,
            netCashSales,
            netCash: Math.round((netCashSales - netExpenses) * 100) / 100,
            totalCardSales,
            totalCardReturns,
            netCardSales,
            netCard: Math.round(netCardSales * 100) / 100,
            totalTransferSales,
            totalTransferReturns,
            netTransferSales,
            netTransfer: Math.round(netTransferSales * 100) / 100,
            totalExpenses: netExpenses,
            totalExpensesOut: expenses?.total_expenses || 0,
            totalExpensesRefunded: expenses?.total_refunded || 0,
            expenseCount: expenses?.expense_count || 0,
            totalSupplierPayments: supplierPayments?.total_supplier_payments || 0,
            expectedCash: Math.round(expectedCash * 100) / 100,
            netRevenue: Math.round((netSales - netExpenses) * 100) / 100,
            netShiftTotal: Math.round((netSales - netExpenses) * 100) / 100
        };
    }

    /**
     * Get current real-time drawer cash balance for active session
     */
    getCurrentDrawerCash(sessionId) {
        const summary = this.getSessionSummary(sessionId);
        return summary.expectedCash;
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

            // Transfer all session revenues (cash, card, transfer) to Central Treasury as a single consolidated row stamped on sales day
            const netCard = Math.max(0, Math.round((summary.netCardSales || summary.netCard || 0) * 100) / 100);
            const netTransfer = Math.max(0, Math.round((summary.netTransferSales || summary.netTransfer || 0) * 100) / 100);
            const cashToTransfer = Math.max(0, actual);
            const salesDate = session.opened_at ? session.opened_at.slice(0, 10) : null;
            this._transferSessionFundsToTreasury(db, sessionId, session.session_code, cashToTransfer, netCard, netTransfer, closedByUserId, 'إغلاق وردية يدوي', salesDate);

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

    /**
     * Helper to atomically transfer all daily session revenues (cash, card, transfer) to Central Treasury as a single consolidated row
     * Stamped with the sales date so auditing remains true to the day the revenue occurred.
     */
    _transferSessionFundsToTreasury(db, sessionId, sessionCode, cashAmount, cardAmount, transferAmount, userId, notesPrefix = '', sessionDate = null) {
        // Prevent duplicate transfer if this session was already supplied to treasury
        const existingTx = db.get(
            "SELECT id FROM central_treasury_transactions WHERE session_id = ? AND transaction_type = 'shift_transfer'",
            [sessionId]
        );
        if (existingTx) {
            return existingTx.id;
        }

        const cash = Math.max(0, Math.round(Number(cashAmount || 0) * 100) / 100);
        const card = Math.max(0, Math.round(Number(cardAmount || 0) * 100) / 100);
        const transfer = Math.max(0, Math.round(Number(transferAmount || 0) * 100) / 100);
        const totalAmount = Math.round((cash + card + transfer) * 100) / 100;

        if (totalAmount <= 0) {
            return null;
        }

        const uid = userId || 1;
        const code = sessionCode || `SES-#${sessionId}`;

        let paymentMethod = 'split';
        if (cash > 0 && card === 0 && transfer === 0) {
            paymentMethod = 'cash';
        } else if (card > 0 && cash === 0 && transfer === 0) {
            paymentMethod = 'card';
        } else if (transfer > 0 && cash === 0 && card === 0) {
            paymentMethod = 'transfer';
        }

        // Determine date of sales day (تاريخ اليوم الذي كان فيه المبيعات)
        let targetTimestamp = null;
        if (sessionDate) {
            const cleanDate = String(sessionDate).slice(0, 10);
            targetTimestamp = `${cleanDate} 23:59:00`;
        }

        const breakdownText = `[كاش: ${cash.toFixed(2)} ج.م | بنكي/فيزا: ${card.toFixed(2)} ج.م | تحويلات: ${transfer.toFixed(2)} ج.م]`;
        const notes = notesPrefix ? `${notesPrefix} | ${breakdownText}` : breakdownText;
        const sourceDestination = `توريد مبيعات وردية (${code})`;

        if (targetTimestamp) {
            db.run(
                `INSERT INTO central_treasury_transactions (
                    transaction_type, amount, payment_method, cash_amount, card_amount, transfer_amount,
                    source_destination, session_id, notes, performed_by, created_at
                ) VALUES ('shift_transfer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    totalAmount,
                    paymentMethod,
                    cash,
                    card,
                    transfer,
                    sourceDestination,
                    sessionId,
                    notes,
                    uid,
                    targetTimestamp
                ]
            );
        } else {
            db.run(
                `INSERT INTO central_treasury_transactions (
                    transaction_type, amount, payment_method, cash_amount, card_amount, transfer_amount,
                    source_destination, session_id, notes, performed_by
                ) VALUES ('shift_transfer', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    totalAmount,
                    paymentMethod,
                    cash,
                    card,
                    transfer,
                    sourceDestination,
                    sessionId,
                    notes,
                    uid
                ]
            );
        }
    }

    /**
     * Check and perform automatic daily shift rollover:
     * - Closes the active session if past configured rollover time.
     * - Transfers drawer cash to Central Treasury ("تروح للخزنة").
     * - Automatically opens a new active session so sales never stop ("الوردية شغالة").
     */
    checkAndRolloverShift(userId = 1) {
        let active = this.getActiveSession();
        if (!active) {
            // Auto open if none exists
            const autoSession = this.ensureActiveSession(userId);
            return { autoClosed: false, rolledOver: false, autoOpened: true, session: autoSession };
        }

        const settingRow = this.db.get("SELECT value FROM app_settings WHERE key = 'auto_close_shift_time'");
        const autoCloseTime = settingRow?.value || '03:00';
        let [targetHour, targetMinute] = autoCloseTime.split(':').map(Number);
        if (isNaN(targetHour)) targetHour = 3;
        if (isNaN(targetMinute)) targetMinute = 0;

        const now = new Date();
        const openedAt = new Date(active.opened_at);

        // Determine start of current business cycle based on target cutoff time
        const currentCycleStart = new Date(now);
        currentCycleStart.setHours(targetHour, targetMinute, 0, 0);
        if (now < currentCycleStart) {
            currentCycleStart.setDate(currentCycleStart.getDate() - 1);
        }

        // Rollover is due if active session was opened before current cycle began or has exceeded 24 hours
        const isPastCutoff = openedAt < currentCycleStart;
        const exceeds24Hours = (now.getTime() - openedAt.getTime()) > (24 * 3600 * 1000);
        const shouldRollover = isPastCutoff || exceeds24Hours;

        if (!shouldRollover) {
            return { autoClosed: false, rolledOver: false, session: active };
        }

        // Perform atomic shift close, treasury transfer, and new shift open
        return this.db.transaction((db) => {
            const summary = this.getSessionSummary(active.id);
            const expectedCash = Math.max(0, Math.round((summary.expectedCash || 0) * 100) / 100);
            const closerUserId = userId || active.opened_by || 1;

            // 1. Close current session
            db.run(
                `UPDATE daily_sessions
                 SET closed_by = ?,
                     closing_cash_actual = ?,
                     closing_cash_expected = ?,
                     cash_difference = 0,
                     notes = COALESCE(notes || ' | ', '') || ?,
                     status = 'closed',
                     closed_at = datetime('now', 'localtime')
                 WHERE id = ?`,
                [
                    closerUserId,
                    expectedCash,
                    expectedCash,
                    `إغلاق الوردية تلقائياً وترحيل النقدية للخزنة في الموعد المحدد (${autoCloseTime})`,
                    active.id
                ]
            );

            // 2. Transfer all session revenues (cash, card, transfer) to Central Treasury ("تروح للخزنة") as a single row stamped on sales day
            const netCard = Math.max(0, Math.round((summary.netCardSales || summary.netCard || 0) * 100) / 100);
            const netTransfer = Math.max(0, Math.round((summary.netTransferSales || summary.netTransfer || 0) * 100) / 100);
            const salesDate = active.opened_at ? active.opened_at.slice(0, 10) : null;
            this._transferSessionFundsToTreasury(db, active.id, active.session_code, expectedCash, netCard, netTransfer, closerUserId, `إغلاق تلقائي بحسب موعد الإغلاق (${autoCloseTime})`, salesDate);

            // 3. Immediately open new active session ("الوردية شغالة")
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const todayCountRow = db.get(
                "SELECT COUNT(*) as count FROM daily_sessions WHERE session_code LIKE ?",
                [`SES-${today}-%`]
            );
            const nextSeq = String((todayCountRow?.count || 0) + 1).padStart(3, '0');
            const newSessionCode = `SES-${today}-${nextSeq}`;

            const res = db.run(
                `INSERT INTO daily_sessions (session_code, opened_by, opening_cash, notes, status)
                 VALUES (?, ?, 0, 'بدء يومية جديدة تلقائياً بعد ترحيل نقدية اليومية السابقة للخزنة', 'open')`,
                [newSessionCode, closerUserId]
            );

            const newSession = db.get(
                `SELECT s.*, u.display_name as opened_by_name
                 FROM daily_sessions s
                 JOIN users u ON s.opened_by = u.id
                 WHERE s.id = ?`,
                [res.lastInsertRowid]
            );

            // Audit Log
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'SHIFT_AUTO_ROLLOVER', 'daily_sessions', ?, ?)`,
                [
                    closerUserId,
                    String(active.id),
                    JSON.stringify({
                        closedSessionId: active.id,
                        newSessionId: newSession.id,
                        transferredCash: expectedCash,
                        autoCloseTime
                    })
                ]
            );

            return {
                autoClosed: true,
                rolledOver: true,
                closedSessionId: active.id,
                closedSessionCode: active.session_code,
                newSession,
                session: newSession,
                transferredAmount: expectedCash
            };
        });
    }

    /**
     * Backward-compatible alias for automated shift check
     */
    checkAutoCloseShift(userId = 1) {
        return this.checkAndRolloverShift(userId);
    }

    /**
     * Ensure there is ALWAYS an active session available.
     * Auto-creates one if none exists, or triggers rollover if due.
     */
    ensureActiveSession(userId = 1) {
        // First check if an existing session is due for rollover
        const active = this.getActiveSession();
        if (active) {
            const rolloverRes = this.checkAndRolloverShift(userId);
            if (rolloverRes.rolledOver && rolloverRes.newSession) {
                return rolloverRes.newSession;
            }
            return active;
        }

        // Auto create new session if none exists
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const todayCountRow = this.db.get(
            "SELECT COUNT(*) as count FROM daily_sessions WHERE session_code LIKE ?",
            [`SES-${today}-%`]
        );
        const nextSeq = String((todayCountRow?.count || 0) + 1).padStart(3, '0');
        const sessionCode = `SES-${today}-${nextSeq}`;

        const res = this.db.run(
            `INSERT INTO daily_sessions (session_code, opened_by, opening_cash, notes, status)
             VALUES (?, ?, 0, 'بدء وردية تلقائياً للعمل المستمر (نظام اليومية المستمرة)', 'open')`,
            [sessionCode, userId || 1]
        );

        return this.getSessionById(res.lastInsertRowid);
    }

    /**
     * Daily Shift Summary Engine (Accounting & Performance Analytics)
     * Calculates Net Revenue, Expected Drawer Cash, Payment Method Split,
     * and Unified Transactions Timeline (Sales + Returns + Petty Expenses).
     */
    getDailyShiftSummary({ date, branchId, userId, sessionId } = {}) {
        const now = new Date();
        const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const targetDate = date ? String(date).slice(0, 10) : localToday;

        // 1. Identify Target Shift / Session (Continuous shift support spanning midnight)
        let sessionRow = null;
        if (sessionId) {
            sessionRow = this.getSessionById(sessionId);
        }

        if (!sessionRow) {
            const active = this.getActiveSession();
            if (active) {
                const activeOpenedDate = active.opened_at ? active.opened_at.slice(0, 10) : localToday;
                // If no explicit date was requested, or if targetDate matches today or the active session's opening date:
                if (!date || targetDate === localToday || targetDate === activeOpenedDate) {
                    sessionRow = active;
                }
            }
        }

        if (!sessionRow) {
            sessionRow = this.db.get(
                `SELECT * FROM daily_sessions 
                 WHERE DATE(opened_at) = ? 
                 ORDER BY id DESC LIMIT 1`,
                [targetDate]
            );
        }

        // 2. Build date & session conditions for sales invoices
        // When sessionRow is resolved, strictly isolate to that shift (session_id) so that
        // when daily rollover triggers, the new shift is 100% zeroed out immediately.
        let invoiceWhere = '';
        let invoiceParams = [];

        if (sessionRow) {
            invoiceWhere = `WHERE si.session_id = ? AND si.status = 'completed'`;
            invoiceParams = [sessionRow.id];
        } else {
            invoiceWhere = `WHERE DATE(si.created_at) = ? AND si.status = 'completed'`;
            invoiceParams = [targetDate];
        }

        if (userId && userId !== 'all') {
            invoiceWhere += ` AND si.user_id = ?`;
            invoiceParams.push(Number(userId));
        }

        // 3. Fetch invoice KPIs
        const invoiceKpi = this.db.get(
            `SELECT 
                COUNT(*) as total_invoices,
                COALESCE(SUM(CASE WHEN invoice_type = 'sale' THEN 1 ELSE 0 END), 0) as sales_count,
                COALESCE(SUM(CASE WHEN invoice_type = 'return' THEN 1 ELSE 0 END), 0) as returns_count,
                COALESCE(SUM(CASE WHEN invoice_type = 'sale' THEN final_total ELSE 0 END), 0) as total_sales,
                COALESCE(SUM(CASE WHEN invoice_type = 'return' THEN final_total ELSE 0 END), 0) as total_returns,
                COALESCE(SUM(discount_amount), 0) as total_discounts,
                COALESCE(SUM(CASE WHEN invoice_type = 'sale' THEN cash_amount ELSE 0 END), 0) as cash_sales,
                COALESCE(SUM(CASE WHEN invoice_type = 'return' THEN cash_amount ELSE 0 END), 0) as cash_returns,
                COALESCE(SUM(CASE WHEN invoice_type = 'sale' THEN card_amount ELSE 0 END), 0) as card_sales,
                COALESCE(SUM(CASE WHEN invoice_type = 'return' THEN card_amount ELSE 0 END), 0) as card_returns,
                COALESCE(SUM(CASE WHEN invoice_type = 'sale' THEN transfer_amount ELSE 0 END), 0) as transfer_sales,
                COALESCE(SUM(CASE WHEN invoice_type = 'return' THEN transfer_amount ELSE 0 END), 0) as transfer_returns
             FROM sales_invoices si
             ${invoiceWhere}`,
            invoiceParams
        );

        // 4. Petty expenses on this session or date
        let expenseWhere = '';
        let expenseParams = [];

        if (sessionRow) {
            expenseWhere = `WHERE pe.session_id = ?`;
            expenseParams = [sessionRow.id];
        } else {
            expenseWhere = `WHERE DATE(pe.created_at) = ?`;
            expenseParams = [targetDate];
        }

        if (userId && userId !== 'all') {
            expenseWhere += ` AND pe.approved_by = ?`;
            expenseParams.push(Number(userId));
        }

        const expenseKpi = this.db.get(
            `SELECT 
                COUNT(*) as expense_count,
                COALESCE(SUM(CASE WHEN pe.operational_type = 'returned_expense' THEN 0 ELSE pe.amount END), 0) as total_expenses,
                COALESCE(SUM(CASE WHEN pe.operational_type = 'returned_expense' THEN pe.amount ELSE 0 END), 0) as total_refunded,
                COALESCE(SUM(CASE WHEN pe.operational_type = 'returned_expense' THEN -pe.amount ELSE pe.amount END), 0) as net_expenses
             FROM petty_expenses pe
             ${expenseWhere}`,
            expenseParams
        );

        const openingCash = sessionRow?.opening_cash || 0;
        const totalSales = invoiceKpi?.total_sales || 0;
        const totalReturns = invoiceKpi?.total_returns || 0;
        const netSales = Math.round((totalSales - totalReturns) * 100) / 100;
        const totalExpenses = expenseKpi?.net_expenses || 0;
        const totalExpensesOut = expenseKpi?.total_expenses || 0;
        const totalExpensesRefunded = expenseKpi?.total_refunded || 0;

        // Accounting formulas:
        // Net Revenue = Total Sales - Total Returns - Net Expenses
        const netRevenue = Math.round((totalSales - totalReturns - totalExpenses) * 100) / 100;

        // Tender Calculations
        const cashSales = invoiceKpi?.cash_sales || 0;
        const cashReturns = invoiceKpi?.cash_returns || 0;
        const netCashSales = Math.round((cashSales - cashReturns) * 100) / 100;
        // Net Cash is net cash sales minus net expenses paid from drawer
        const netCash = Math.round((cashSales - cashReturns - totalExpenses) * 100) / 100;

        const cardSales = invoiceKpi?.card_sales || 0;
        const cardReturns = invoiceKpi?.card_returns || 0;
        const netCard = Math.round((cardSales - cardReturns) * 100) / 100;

        const transferSales = invoiceKpi?.transfer_sales || 0;
        const transferReturns = invoiceKpi?.transfer_returns || 0;
        const netTransfer = Math.round((transferSales - transferReturns) * 100) / 100;

        // Expected Drawer Cash = Opening Balance + Net Cash (where netCash = cashSales - cashReturns - cashExpenses)
        const expectedDrawerCash = Math.round((openingCash + netCash) * 100) / 100;

        const kpi = {
            totalSales,
            salesCount: invoiceKpi?.sales_count || 0,
            totalReturns,
            returnsCount: invoiceKpi?.returns_count || 0,
            netSales,
            totalExpenses,
            totalExpensesOut,
            totalExpensesRefunded,
            expensesCount: expenseKpi?.expense_count || 0,
            netRevenue,
            openingCash,
            expectedDrawerCash,
            cashSales,
            cashReturns,
            netCashSales,
            netCash,
            cardSales,
            cardReturns,
            netCard,
            transferSales,
            transferReturns,
            netTransfer,
            tender: {
                cash: {
                    sales: cashSales,
                    returns: cashReturns,
                    expenses: totalExpenses,
                    netSales: netCashSales,
                    net: netCash,
                    salesCount: invoiceKpi?.sales_count || 0,
                    returnsCount: invoiceKpi?.returns_count || 0
                },
                card: {
                    sales: cardSales,
                    returns: cardReturns,
                    net: netCard,
                    salesCount: cardSales > 0 ? 1 : 0,
                    returnsCount: cardReturns > 0 ? 1 : 0
                },
                transfer: {
                    sales: transferSales,
                    returns: transferReturns,
                    net: netTransfer,
                    salesCount: transferSales > 0 ? 1 : 0,
                    returnsCount: transferReturns > 0 ? 1 : 0
                }
            },
            sessionCode: sessionRow?.session_code || 'SES-' + targetDate.replace(/-/g, ''),
            sessionStatus: sessionRow?.status || 'active',
            date: targetDate
        };

        // 5. Unified Transaction Timeline (all_transactions)
        const invoiceRows = this.db.all(
            `SELECT 
                si.id,
                si.invoice_number as code,
                si.invoice_type as type,
                si.created_at as time,
                CASE WHEN si.invoice_type = 'return' THEN -si.final_total ELSE si.final_total END as amount,
                si.final_total as raw_total,
                si.cash_amount,
                si.card_amount,
                si.transfer_amount,
                si.payment_method,
                u.display_name as cashier_name,
                u.username as cashier_username,
                si.customer_name,
                si.customer_phone,
                si.notes,
                (SELECT COUNT(*) FROM sale_line_items WHERE invoice_id = si.id) as items_count,
                (SELECT COALESCE(SUM(quantity), 0) FROM sale_line_items WHERE invoice_id = si.id) as pieces_count
             FROM sales_invoices si
             JOIN users u ON si.user_id = u.id
             ${invoiceWhere}`,
            invoiceParams
        );

        const expenseRows = this.db.all(
            `SELECT 
                pe.id,
                COALESCE(pe.voucher_code, 'EXP-' || pe.id) as code,
                COALESCE(pe.operational_type, 'expense') as type,
                pe.category,
                pe.subcategory,
                pe.description,
                pe.created_at as time,
                CASE WHEN pe.operational_type = 'returned_expense' THEN pe.amount ELSE -pe.amount END as amount,
                pe.amount as raw_total,
                pe.amount as cash_amount,
                0 as card_amount,
                0 as transfer_amount,
                'cash' as payment_method,
                u.display_name as cashier_name,
                u.username as cashier_username,
                pe.salesperson_id,
                COALESCE(emp.full_name, sp.display_name, pe.recipient_name, pe.paid_to) as beneficiary_name,
                COALESCE(emp.full_name, sp.display_name, pe.recipient_name, pe.paid_to) as customer_name,
                COALESCE(emp.full_name, sp.display_name) as salesperson_name,
                '' as customer_phone,
                pe.description as notes,
                1 as items_count,
                1 as pieces_count
             FROM petty_expenses pe
             JOIN users u ON pe.approved_by = u.id
             LEFT JOIN users sp ON pe.salesperson_id = sp.id
             LEFT JOIN employees emp ON (pe.salesperson_id = emp.id OR pe.salesperson_id = emp.user_id)
             ${expenseWhere}`,
            expenseParams
        );

        invoiceRows.forEach(row => {
            const raw = Math.abs(Number(row.raw_total || 0));
            let cash = Number(row.cash_amount || 0);
            let card = Number(row.card_amount || 0);
            let transfer = Number(row.transfer_amount || 0);

            if (cash === 0 && card === 0 && transfer === 0) {
                const pm = (row.payment_method || '').toLowerCase();
                if (pm === 'card' || pm === 'visa') {
                    row.card_amount = raw;
                } else if (pm === 'transfer' || pm === 'instapay' || pm === 'bank_transfer') {
                    row.transfer_amount = raw;
                } else {
                    row.cash_amount = raw;
                }
            }
        });

        const all_transactions = [...invoiceRows, ...expenseRows].sort((a, b) => {
            return new Date(b.time).getTime() - new Date(a.time).getTime();
        });

        return {
            kpi,
            all_transactions
        };
    }
}

module.exports = { SessionService };
