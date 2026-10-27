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
     * Get current verified balance of the Central Treasury with payment method breakdown
     */
    getBalance() {
        const stats = this.db.get(`
            SELECT 
                COALESCE(SUM(CASE WHEN transaction_type IN ('deposit', 'shift_transfer') THEN amount ELSE 0 END), 0) as total_inflows,
                COALESCE(SUM(CASE WHEN transaction_type NOT IN ('deposit', 'shift_transfer', 'channel_transfer_in', 'channel_transfer_out') THEN amount ELSE 0 END), 0) as total_outflows,
                
                -- رصيد الكاش
                COALESCE(SUM(
                    CASE 
                        WHEN transaction_type = 'shift_transfer' THEN COALESCE(cash_amount, CASE WHEN payment_method = 'cash' OR payment_method IS NULL THEN amount ELSE 0 END)
                        WHEN transaction_type IN ('deposit', 'channel_transfer_in') AND (payment_method = 'cash' OR payment_method IS NULL) THEN amount 
                        ELSE 0 
                    END
                ), 0) -
                COALESCE(SUM(
                    CASE 
                        WHEN transaction_type NOT IN ('deposit', 'shift_transfer', 'channel_transfer_in') AND (payment_method = 'cash' OR payment_method IS NULL) THEN amount 
                        ELSE 0 
                    END
                ), 0) as cash_balance,
                
                -- رصيد الفيزا
                COALESCE(SUM(
                    CASE 
                        WHEN transaction_type = 'shift_transfer' THEN COALESCE(card_amount, CASE WHEN payment_method = 'card' THEN amount ELSE 0 END)
                        WHEN transaction_type IN ('deposit', 'channel_transfer_in') AND payment_method = 'card' THEN amount 
                        ELSE 0 
                    END
                ), 0) -
                COALESCE(SUM(
                    CASE 
                        WHEN transaction_type NOT IN ('deposit', 'shift_transfer', 'channel_transfer_in') AND payment_method = 'card' THEN amount 
                        ELSE 0 
                    END
                ), 0) as card_balance,
                
                -- رصيد التحويلات
                COALESCE(SUM(
                    CASE 
                        WHEN transaction_type = 'shift_transfer' THEN COALESCE(transfer_amount, CASE WHEN payment_method = 'transfer' THEN amount ELSE 0 END)
                        WHEN transaction_type IN ('deposit', 'channel_transfer_in') AND payment_method = 'transfer' THEN amount 
                        ELSE 0 
                    END
                ), 0) -
                COALESCE(SUM(
                    CASE 
                        WHEN transaction_type NOT IN ('deposit', 'shift_transfer', 'channel_transfer_in') AND payment_method = 'transfer' THEN amount 
                        ELSE 0 
                    END
                ), 0) as transfer_balance,

                -- إحصائيات إضافية
                COALESCE(SUM(CASE WHEN transaction_type IN ('deposit', 'shift_transfer') AND date(created_at) = date('now', 'localtime') THEN amount ELSE 0 END), 0) as today_deposits,
                COALESCE(SUM(CASE WHEN transaction_type NOT IN ('deposit', 'shift_transfer', 'channel_transfer_in', 'channel_transfer_out') AND date(created_at) = date('now', 'localtime') THEN amount ELSE 0 END), 0) as today_withdrawals,
                COALESCE(SUM(CASE WHEN transaction_type = 'shift_transfer' THEN amount ELSE 0 END), 0) as shift_transfers_total,

                -- حساب صاحب المنشأة (جاري المالك / رأس المال والمسحوبات)
                COALESCE(SUM(CASE WHEN transaction_type = 'deposit' AND (source_destination LIKE '%صاحب%' OR source_destination LIKE '%المالك%' OR source_destination LIKE '%تمويل%' OR source_destination LIKE '%رأس مال%' OR notes LIKE '%تمويل%' OR notes LIKE '%رأس مال%') THEN amount ELSE 0 END), 0) as owner_deposits_total,
                COALESCE(COUNT(CASE WHEN transaction_type = 'deposit' AND (source_destination LIKE '%صاحب%' OR source_destination LIKE '%المالك%' OR source_destination LIKE '%تمويل%' OR source_destination LIKE '%رأس مال%' OR notes LIKE '%تمويل%' OR notes LIKE '%رأس مال%') THEN 1 END), 0) as owner_deposits_count,

                COALESCE(SUM(CASE WHEN transaction_type = 'withdraw' AND (source_destination LIKE '%صاحب%' OR source_destination LIKE '%المالك%' OR source_destination LIKE '%مسحوبات%' OR notes LIKE '%مسحوبات%') THEN amount ELSE 0 END), 0) as owner_withdrawals_total,
                COALESCE(COUNT(CASE WHEN transaction_type = 'withdraw' AND (source_destination LIKE '%صاحب%' OR source_destination LIKE '%المالك%' OR source_destination LIKE '%مسحوبات%' OR notes LIKE '%مسحوبات%') THEN 1 END), 0) as owner_withdrawals_count
            FROM central_treasury_transactions
        `);

        const balance = (stats?.total_inflows || 0) - (stats?.total_outflows || 0);
        const ownerDeposits = Math.round((stats?.owner_deposits_total || 0) * 100) / 100;
        const ownerWithdrawals = Math.round((stats?.owner_withdrawals_total || 0) * 100) / 100;
        const ownerBalance = Math.round((ownerDeposits - ownerWithdrawals) * 100) / 100;

        return {
            balance: Math.round(balance * 100) / 100,
            cashBalance: Math.round((stats?.cash_balance || 0) * 100) / 100,
            cardBalance: Math.round((stats?.card_balance || 0) * 100) / 100,
            transferBalance: Math.round((stats?.transfer_balance || 0) * 100) / 100,
            totalInflows: Math.round((stats?.total_inflows || 0) * 100) / 100,
            totalOutflows: Math.round((stats?.total_outflows || 0) * 100) / 100,
            todayDeposits: Math.round((stats?.today_deposits || 0) * 100) / 100,
            todayWithdrawals: Math.round((stats?.today_withdrawals || 0) * 100) / 100,
            shiftTransfersTotal: Math.round((stats?.shift_transfers_total || 0) * 100) / 100,
            ownerDepositsTotal: ownerDeposits,
            ownerDepositsCount: Number(stats?.owner_deposits_count || 0),
            ownerWithdrawalsTotal: ownerWithdrawals,
            ownerWithdrawalsCount: Number(stats?.owner_withdrawals_count || 0),
            ownerBalance: ownerBalance
        };
    }

    /**
     * Transfer funds internally between channels (cash, card, transfer)
     */
    transferBetweenChannels(fromMethod, toMethod, amount, notes, userId) {
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) {
            throw new Error('مبلغ التحويل يجب أن يكون أكبر من الصفر');
        }

        const validMethods = ['cash', 'card', 'transfer'];
        if (!validMethods.includes(fromMethod) || !validMethods.includes(toMethod)) {
            throw new Error('يرجى اختيار قنوات مالية صحيحة');
        }

        if (fromMethod === toMethod) {
            throw new Error('لا يمكن التحويل إلى نفس القناة المالية');
        }

        const balances = this.getBalance();
        const availableInFrom = fromMethod === 'cash' ? balances.cashBalance : (fromMethod === 'card' ? balances.cardBalance : balances.transferBalance);

        if (amt > availableInFrom) {
            const methodLabel = fromMethod === 'cash' ? 'الكاش' : (fromMethod === 'card' ? 'الحساب البنكي / الفيزا' : 'التحويلات / المحافظ');
            throw new Error(`رصيد ${methodLabel} الحالي (${availableInFrom.toFixed(2)} ج.م) لا يكفي لتحويل (${amt.toFixed(2)} ج.م)`);
        }

        const getMethodName = (m) => m === 'cash' ? 'كاش (نقدي)' : (m === 'card' ? 'حساب بنكي / فيزا' : 'تحويل / محفظة');
        const fromLabel = getMethodName(fromMethod);
        const toLabel = getMethodName(toMethod);

        return this.db.transaction((db) => {
            // 1. Record Outflow from source channel
            const outRes = db.run(
                `INSERT INTO central_treasury_transactions (
                    transaction_type, amount, payment_method, source_destination, notes, performed_by
                ) VALUES ('channel_transfer_out', ?, ?, ?, ?, ?)`,
                [amt, fromMethod, `تحويل داخلي إلى ${toLabel}`, notes ? notes.trim() : null, userId]
            );

            // 2. Record Inflow to target channel
            const inRes = db.run(
                `INSERT INTO central_treasury_transactions (
                    transaction_type, amount, payment_method, source_destination, notes, performed_by
                ) VALUES ('channel_transfer_in', ?, ?, ?, ?, ?)`,
                [amt, toMethod, `تحويل داخلي من ${fromLabel}`, notes ? notes.trim() : null, userId]
            );

            // Audit
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'TREASURY_CHANNEL_TRANSFER', 'central_treasury_transactions', ?, ?)`,
                [userId, String(outRes.lastInsertRowid), JSON.stringify({ amount: amt, from: fromMethod, to: toMethod })]
            );

            return {
                outTransaction: this.getTransactionById(outRes.lastInsertRowid),
                inTransaction: this.getTransactionById(inRes.lastInsertRowid)
            };
        });
    }

    /**
     * Record cash or transfer deposit into Central Treasury
     */
    deposit(amount, sourceDestination, notes, userId, paymentMethod = 'cash') {
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) {
            throw new Error('مبلغ الإيداع يجب أن يكون أكبر من الصفر');
        }

        if (!sourceDestination || !sourceDestination.trim()) {
            throw new Error('يرجى تحديد مصدر الإيداع (الجهة المودعة)');
        }

        const validMethods = ['cash', 'card', 'transfer'];
        const method = validMethods.includes(paymentMethod) ? paymentMethod : 'cash';

        return this.db.transaction((db) => {
            const res = db.run(
                `INSERT INTO central_treasury_transactions (
                    transaction_type, amount, payment_method, source_destination, notes, performed_by
                ) VALUES ('deposit', ?, ?, ?, ?, ?)`,
                [amt, method, sourceDestination.trim(), notes ? notes.trim() : null, userId]
            );

            // Audit
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'TREASURY_DEPOSIT', 'central_treasury_transactions', ?, ?)`,
                [userId, String(res.lastInsertRowid), JSON.stringify({ amount: amt, source: sourceDestination, paymentMethod: method })]
            );

            return this.getTransactionById(res.lastInsertRowid);
        });
    }

    /**
     * Record withdrawal from Central Treasury with strict solvency check
     */
    withdraw(amount, destination, notes, userId, paymentMethod = 'cash') {
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) {
            throw new Error('مبلغ السحب يجب أن يكون أكبر من الصفر');
        }

        if (!destination || !destination.trim()) {
            throw new Error('يرجى تحديد جهة أو سبب السحب');
        }

        const validMethods = ['cash', 'card', 'transfer'];
        const method = validMethods.includes(paymentMethod) ? paymentMethod : 'cash';

        const balances = this.getBalance();
        const availableInMethod = method === 'cash' ? balances.cashBalance : (method === 'card' ? balances.cardBalance : balances.transferBalance);

        if (amt > availableInMethod) {
            const methodLabel = method === 'cash' ? 'الكاش' : (method === 'card' ? 'الفيزا' : 'التحويلات');
            throw new Error(`رصيد ${methodLabel} بالخزنة المركزية الحالي (${availableInMethod.toFixed(2)} ج.م) لا يكفي لسحب (${amt.toFixed(2)} ج.م)`);
        }

        if (amt > balances.balance) {
            throw new Error(`إجمالي رصيد الخزنة المركزية (${balances.balance.toFixed(2)} ج.م) لا يكفي لسحب (${amt.toFixed(2)} ج.م)`);
        }

        return this.db.transaction((db) => {
            const res = db.run(
                `INSERT INTO central_treasury_transactions (
                    transaction_type, amount, payment_method, source_destination, notes, performed_by
                ) VALUES ('withdraw', ?, ?, ?, ?, ?)`,
                [amt, method, destination.trim(), notes ? notes.trim() : null, userId]
            );

            // Audit
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'TREASURY_WITHDRAW', 'central_treasury_transactions', ?, ?)`,
                [userId, String(res.lastInsertRowid), JSON.stringify({ amount: amt, destination, paymentMethod: method })]
            );

            return this.getTransactionById(res.lastInsertRowid);
        });
    }

    /**
     * Transfer funds from a closed/open daily session to Central Safe
     */
    transferFromSession(sessionId, amount, notes, userId, paymentMethod = 'cash') {
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) {
            throw new Error('المبلغ المحول يجب أن يكون أكبر من الصفر');
        }

        const validMethods = ['cash', 'card', 'transfer'];
        const method = validMethods.includes(paymentMethod) ? paymentMethod : 'cash';

        return this.db.transaction((db) => {
            const session = db.get('SELECT session_code FROM daily_sessions WHERE id = ?', [sessionId]);
            const code = session ? session.session_code : `SES-#${sessionId}`;

            const methodLabel = method === 'cash' ? 'نقدية (كاش)' : (method === 'card' ? 'بطاقات (فيزا)' : 'تحويلات إلكترونية');
            const defaultSource = `توريد مبيعات ${methodLabel} من الوردية (${code})`;

            const res = db.run(
                `INSERT INTO central_treasury_transactions (
                    transaction_type, amount, payment_method, source_destination, session_id, notes, performed_by
                ) VALUES ('shift_transfer', ?, ?, ?, ?, ?, ?)`,
                [amt, method, defaultSource, sessionId, notes ? notes.trim() : null, userId]
            );

            return this.getTransactionById(res.lastInsertRowid);
        });
    }

    /**
     * List transactions with dynamic filtering (Date/Time, Type/Category, Payment Method, Search, Limit)
     * and historical running balance
     */
    listTransactions(options = {}) {
        let limit = 100;
        let type = null;
        let paymentMethod = null;
        let startDate = null;
        let endDate = null;
        let search = null;

        if (typeof options === 'number') {
            limit = options;
        } else if (options && typeof options === 'object') {
            limit = options.limit !== undefined ? Number(options.limit) : 500;
            type = options.type || options.category || null;
            paymentMethod = options.paymentMethod || null;
            startDate = options.startDate || null;
            endDate = options.endDate || null;
            search = options.search ? options.search.trim() : null;
        }

        let whereClauses = [];
        let params = [];

        if (type && type !== 'all') {
            if (type === 'inflows') {
                whereClauses.push("(t.transaction_type IN ('deposit', 'shift_transfer', 'channel_transfer_in') OR (t.amount > 0 AND t.transaction_type NOT IN ('withdraw', 'salary_payout', 'supplier_payment', 'purchase_payment', 'channel_transfer_out')))");
            } else if (type === 'outflows') {
                whereClauses.push("(t.transaction_type IN ('withdraw', 'salary_payout', 'supplier_payment', 'purchase_payment', 'channel_transfer_out') OR t.transaction_type NOT IN ('deposit', 'shift_transfer', 'channel_transfer_in'))");
            } else if (type === 'receipts') {
                whereClauses.push("(t.transaction_type = 'deposit' AND (t.source_destination LIKE '%قبض%' OR t.source_destination LIKE '%تحصيل%' OR t.notes LIKE '%قبض%' OR t.notes LIKE '%تحصيل%' OR t.source_destination LIKE '%عميل%' OR t.notes LIKE '%عميل%'))");
            } else if (type === 'deposits') {
                whereClauses.push("(t.transaction_type = 'deposit' AND (t.source_destination LIKE '%تمويل%' OR t.source_destination LIKE '%رأس مال%' OR t.source_destination LIKE '%إيداع%' OR t.notes LIKE '%تمويل%' OR t.notes LIKE '%رأس مال%'))");
            } else if (type === 'withdrawals') {
                whereClauses.push("t.transaction_type = 'withdraw'");
            } else if (type === 'owner_withdraw') {
                whereClauses.push("(t.transaction_type = 'withdraw' AND (t.source_destination LIKE '%صاحب%' OR t.source_destination LIKE '%المالك%' OR t.source_destination LIKE '%مسحوبات%' OR t.notes LIKE '%مسحوبات%'))");
            } else if (type === 'owner_deposit') {
                whereClauses.push("(t.transaction_type = 'deposit' AND (t.source_destination LIKE '%صاحب%' OR t.source_destination LIKE '%المالك%' OR t.source_destination LIKE '%تمويل%' OR t.source_destination LIKE '%رأس مال%' OR t.notes LIKE '%تمويل%' OR t.notes LIKE '%رأس مال%'))");
            } else if (type === 'owner') {
                whereClauses.push("( (t.transaction_type = 'deposit' AND (t.source_destination LIKE '%صاحب%' OR t.source_destination LIKE '%المالك%' OR t.source_destination LIKE '%تمويل%' OR t.source_destination LIKE '%رأس مال%' OR t.notes LIKE '%تمويل%' OR t.notes LIKE '%رأس مال%')) OR (t.transaction_type = 'withdraw' AND (t.source_destination LIKE '%صاحب%' OR t.source_destination LIKE '%المالك%' OR t.source_destination LIKE '%مسحوبات%' OR t.notes LIKE '%مسحوبات%')) )");
            } else if (type === 'transfers' || type === 'channel_transfer') {
                whereClauses.push("t.transaction_type IN ('channel_transfer_in', 'channel_transfer_out')");
            } else if (type === 'shifts') {
                whereClauses.push("t.transaction_type = 'shift_transfer'");
            } else if (type === 'shifts_cash') {
                whereClauses.push("(t.transaction_type = 'shift_transfer' AND (t.payment_method = 'cash' OR t.payment_method IS NULL))");
            } else if (type === 'shifts_card') {
                whereClauses.push("(t.transaction_type = 'shift_transfer' AND t.payment_method = 'card')");
            } else if (type === 'shifts_transfer') {
                whereClauses.push("(t.transaction_type = 'shift_transfer' AND t.payment_method = 'transfer')");
            } else if (type === 'salaries' || type === 'salary_payout') {
                whereClauses.push("t.transaction_type = 'salary_payout'");
            } else if (type === 'supplier_payment') {
                whereClauses.push("(t.transaction_type = 'supplier_payment' OR (t.transaction_type = 'withdraw' AND (t.source_destination LIKE '%مورد%' OR t.notes LIKE '%مورد%')))");
            } else if (type === 'purchase_payment') {
                whereClauses.push("t.transaction_type = 'purchase_payment'");
            } else {
                whereClauses.push("t.transaction_type = ?");
                params.push(type);
            }
        }

        if (paymentMethod && paymentMethod !== 'all') {
            if (paymentMethod === 'cash') {
                whereClauses.push("(t.payment_method = 'cash' OR (t.transaction_type = 'shift_transfer' AND COALESCE(t.cash_amount, 0) > 0))");
            } else if (paymentMethod === 'card') {
                whereClauses.push("(t.payment_method = 'card' OR (t.transaction_type = 'shift_transfer' AND COALESCE(t.card_amount, 0) > 0))");
            } else if (paymentMethod === 'transfer') {
                whereClauses.push("(t.payment_method = 'transfer' OR (t.transaction_type = 'shift_transfer' AND COALESCE(t.transfer_amount, 0) > 0))");
            } else {
                whereClauses.push("t.payment_method = ?");
                params.push(paymentMethod);
            }
        }

        if (startDate) {
            whereClauses.push("DATE(t.created_at) >= DATE(?)");
            params.push(startDate);
        }

        if (endDate) {
            whereClauses.push("DATE(t.created_at) <= DATE(?)");
            params.push(endDate);
        }

        if (search) {
            whereClauses.push("(t.source_destination LIKE ? OR t.notes LIKE ? OR t.reference_id LIKE ? OR t.performed_by_name LIKE ? OR ('TX-' || t.id) LIKE ? OR CAST(t.id AS TEXT) LIKE ?)");
            const s = `%${search}%`;
            params.push(s, s, s, s, s, s);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const limitSql = limit > 0 ? `LIMIT ${limit}` : '';

        return this.db.all(
            `WITH ranked AS (
                SELECT 
                    t.*,
                    u.display_name as performed_by_name,
                    s.session_code,
                    SUM(CASE 
                        WHEN t.transaction_type IN ('deposit', 'shift_transfer') THEN t.amount 
                        WHEN t.transaction_type IN ('channel_transfer_in', 'channel_transfer_out') THEN 0
                        ELSE -t.amount 
                    END) 
                        OVER (ORDER BY t.id ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as running_balance,
                    SUM(CASE 
                        WHEN t.transaction_type IN ('deposit', 'shift_transfer', 'channel_transfer_in') THEN t.amount 
                        ELSE -t.amount 
                    END) 
                        OVER (PARTITION BY t.payment_method ORDER BY t.id ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as channel_running_balance
                FROM central_treasury_transactions t
                LEFT JOIN users u ON t.performed_by = u.id
                LEFT JOIN daily_sessions s ON t.session_id = s.id
            )
            SELECT 
                t.*,
                COALESCE(LAG(t.running_balance, 1, 0) OVER (ORDER BY t.id ASC), 0) as balance_before,
                t.running_balance as balance_after,
                COALESCE(LAG(t.channel_running_balance, 1, 0) OVER (PARTITION BY t.payment_method ORDER BY t.id ASC), 0) as channel_balance_before,
                t.channel_running_balance as channel_balance_after
            FROM ranked t
            ${whereSql}
            ORDER BY t.id DESC ${limitSql}`,
            params
        );
    }

    /**
     * Deduct from main treasury with strict solvency and automated journal entry
     */
    deductFromMainTreasury(amount, paymentMethod = 'cash', notes = '', userId = null, category = 'نثريات تشغيلية', recipient = 'مصروفات الخزينة') {
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) {
            throw new Error('مبلغ الصرف يجب أن يكون أكبر من الصفر');
        }

        const validMethods = ['cash', 'card', 'transfer'];
        const method = validMethods.includes(paymentMethod) ? paymentMethod : 'cash';

        const balances = this.getBalance();
        const availableInMethod = method === 'cash' ? balances.cashBalance : (method === 'card' ? balances.cardBalance : balances.transferBalance);

        // Strict Solvency check with 0.01 tolerance
        if (amt > (availableInMethod + 0.01)) {
            const methodLabel = method === 'cash' ? 'الكاش' : (method === 'card' ? 'الحساب البنكي / الفيزا' : 'المحافظ والتحويلات');
            throw new Error(`رصيد ${methodLabel} بالخزنة المركزية (${availableInMethod.toFixed(2)} ج.م) لا يكفي لصرف (${amt.toFixed(2)} ج.م)`);
        }

        return this.db.transaction((db) => {
            // 1. Insert into Central Treasury
            const res = db.run(
                `INSERT INTO central_treasury_transactions (
                    transaction_type, amount, payment_method, source_destination, notes, performed_by
                ) VALUES ('withdraw', ?, ?, ?, ?, ?)`,
                [amt, method, recipient || 'صرف نثريات', notes ? notes.trim() : null, userId]
            );

            // 2. Automated Journal Entry into petty_expenses table
            let activeSession = db.get("SELECT id FROM daily_sessions WHERE status = 'open' ORDER BY id DESC LIMIT 1");
            if (!activeSession) {
                activeSession = db.get("SELECT id FROM daily_sessions ORDER BY id DESC LIMIT 1");
            }
            if (!activeSession) {
                const resSess = db.run(
                    `INSERT INTO daily_sessions (session_code, opened_by, opening_cash, status)
                     VALUES ('HQ-SES-MAIN', ?, 0, 'open')`,
                    [userId || 1]
                );
                activeSession = { id: resSess.lastInsertRowid };
            }
            if (activeSession) {
                const now = new Date();
                const yy = String(now.getFullYear()).slice(-2);
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const rand = Math.floor(1000 + Math.random() * 9000);
                const voucherCode = `EXP-${yy}${mm}-${rand}`;

                db.run(
                    `INSERT INTO petty_expenses (
                        session_id, voucher_code, operational_type, category,
                        amount, description, paid_to, recipient_name, approved_by, status
                    ) VALUES (?, ?, 'expense', ?, ?, ?, ?, ?, ?, 'approved')`,
                    [
                        activeSession.id,
                        voucherCode,
                        category || 'نثريات تشغيلية',
                        amt,
                        notes ? `[صرف خزنة - ${method}] ${notes}` : `[صرف نثريات من الخزنة المركزية - ${method}]`,
                        recipient || 'مصروفات الخزينة',
                        recipient || 'مصروفات الخزينة',
                        userId || 1
                    ]
                );
            }

            // 3. Audit log
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'TREASURY_QUICK_DISBURSAL', 'central_treasury_transactions', ?, ?)`,
                [userId, String(res.lastInsertRowid), JSON.stringify({ amount: amt, method, recipient, category })]
            );

            return this.getTransactionById(res.lastInsertRowid);
        });
    }

    /**
     * Quick disbursal wrapper (supports object or positional arguments)
     */
    quickDisburse(amount, paymentMethod, recipient, category, notes, userId) {
        if (typeof amount === 'object' && amount !== null) {
            const d = amount;
            userId = paymentMethod || d.userId;
            amount = d.amount;
            paymentMethod = d.paymentMethod || d.channel;
            recipient = d.recipient;
            category = d.category;
            notes = d.notes;
        }
        return this.deductFromMainTreasury(amount, paymentMethod, notes, userId, category, recipient);
    }

    depositToMainTreasury(amount, sourceDestination, paymentMethod = 'cash', notes = '', userId = null) {
        return this.deposit(amount, sourceDestination, notes, userId, paymentMethod);
    }

    withdrawFromMainTreasury(amount, destination, paymentMethod = 'cash', notes = '', userId = null) {
        return this.withdraw(amount, destination, notes, userId, paymentMethod);
    }

    getMainTreasuryBalance() {
        return this.getBalance();
    }

    /**
     * Get Analytics Data (Distribution by Category, 14-day Trend, Channel Liquidity)
     */
    getAnalyticsData() {
        // 1. Expense distribution by category for the last 30 days
        const catDistribution = this.db.all(`
            SELECT 
                COALESCE(category, 'عام / نثريات') as category,
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(*) as count
            FROM petty_expenses
            WHERE status != 'rejected' AND date(created_at) >= date('now', '-30 days', 'localtime')
            GROUP BY category
            ORDER BY total_amount DESC
            LIMIT 6
        `);

        // 2. Daily cash flow trend (last 14 days)
        const dailyTrend = this.db.all(`
            WITH RECURSIVE dates(d) AS (
                SELECT date('now', '-13 days', 'localtime')
                UNION ALL
                SELECT date(d, '+1 day') FROM dates WHERE d < date('now', 'localtime')
            )
            SELECT 
                dates.d as day,
                COALESCE(SUM(CASE WHEN t.transaction_type IN ('deposit', 'shift_transfer') THEN t.amount ELSE 0 END), 0) as inflows,
                COALESCE(SUM(CASE WHEN t.transaction_type IN ('deposit', 'shift_transfer') THEN t.amount ELSE 0 END), 0) as inflow,
                COALESCE(SUM(CASE WHEN t.transaction_type NOT IN ('deposit', 'shift_transfer', 'channel_transfer_in', 'channel_transfer_out') THEN t.amount ELSE 0 END), 0) as outflows,
                COALESCE(SUM(CASE WHEN t.transaction_type NOT IN ('deposit', 'shift_transfer', 'channel_transfer_in', 'channel_transfer_out') THEN t.amount ELSE 0 END), 0) as outflow
            FROM dates
            LEFT JOIN central_treasury_transactions t ON date(t.created_at) = dates.d
            GROUP BY dates.d
            ORDER BY dates.d ASC
        `);

        // 3. Channel Liquidity
        const b = this.getBalance();
        const total = b.balance > 0 ? b.balance : (b.cashBalance + b.cardBalance + b.transferBalance);
        const cashPercent = total > 0 ? Math.round((b.cashBalance / total) * 100) : 0;
        const cardPercent = total > 0 ? Math.round((b.cardBalance / total) * 100) : 0;
        const transferPercent = total > 0 ? Math.round((b.transferBalance / total) * 100) : 0;

        const channelRatios = {
            totalBalance: b.balance,
            cashBalance: b.cashBalance,
            cardBalance: b.cardBalance,
            transferBalance: b.transferBalance,
            cashPercent,
            cardPercent,
            transferPercent
        };

        // 4. Inflow Sources Breakdown
        const inflowBreakdown = this.db.all(`
            SELECT 
                transaction_type,
                COUNT(*) as count,
                COALESCE(SUM(amount), 0) as total_amount
            FROM central_treasury_transactions
            WHERE transaction_type IN ('deposit', 'shift_transfer', 'channel_transfer_in')
            GROUP BY transaction_type
        `);

        // 5. Outflow Types Breakdown
        const outflowBreakdown = this.db.all(`
            SELECT 
                transaction_type,
                COUNT(*) as count,
                COALESCE(SUM(amount), 0) as total_amount
            FROM central_treasury_transactions
            WHERE transaction_type IN ('withdraw', 'channel_transfer_out', 'supplier_payment', 'salary_payment')
            GROUP BY transaction_type
        `);

        return {
            categoryDistribution: catDistribution || [],
            categoriesBreakdown: catDistribution || [],
            dailyTrend: dailyTrend || [],
            dailyCashflow: dailyTrend || [],
            channelBreakdown: channelRatios,
            channelRatios: channelRatios,
            inflowBreakdown: inflowBreakdown || [],
            outflowBreakdown: outflowBreakdown || [],
            ownerMetrics: {
                balance: b.ownerBalance,
                depositsTotal: b.ownerDepositsTotal,
                depositsCount: b.ownerDepositsCount,
                withdrawalsTotal: b.ownerWithdrawalsTotal,
                withdrawalsCount: b.ownerWithdrawalsCount
            }
        };
    }

    /**
     * Get Branch/Shift Transfers list
     */
    getBranchTransfers(status = 'all') {
        let sql = `
            SELECT 
                t.id as transaction_id,
                t.reference_id,
                COALESCE(t.reference_id, 'TRF-' || substr(10000 + t.id, 2)) as voucher_code,
                s.session_code,
                COALESCE(s.session_code, 'الفرع الرئيسي / وردية ' || t.session_id) as branch_name,
                t.amount,
                t.payment_method,
                t.cash_amount,
                t.card_amount,
                t.transfer_amount,
                t.source_destination,
                t.notes,
                t.created_at,
                u.display_name as sender_name,
                'confirmed' as status
            FROM central_treasury_transactions t
            LEFT JOIN daily_sessions s ON t.session_id = s.id
            LEFT JOIN users u ON t.performed_by = u.id
            WHERE t.transaction_type = 'shift_transfer'
            ORDER BY t.id DESC
        `;
        return this.db.all(sql);
    }

    /**
     * Summary of Branch Safes / POS Shift Drawers
     */
    getBranchSafesSummary() {
        return this.db.all(`
            SELECT 
                s.id as session_id,
                s.session_code,
                s.status as session_status,
                u.display_name as opened_by_name,
                s.opening_cash,
                COALESCE(SUM(CASE WHEN i.payment_method = 'cash' THEN i.cash_amount ELSE 0 END), 0) as session_cash_sales,
                COALESCE((SELECT SUM(amount) FROM central_treasury_transactions WHERE session_id = s.id), 0) as transferred_to_treasury,
                s.opened_at,
                s.closed_at
            FROM daily_sessions s
            LEFT JOIN users u ON s.opened_by = u.id
            LEFT JOIN sales_invoices i ON i.session_id = s.id AND i.status = 'completed'
            GROUP BY s.id
            ORDER BY s.id DESC
            LIMIT 8
        `);
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
