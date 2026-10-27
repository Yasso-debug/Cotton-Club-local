/**
 * Cotton Club POS - Payroll & Employee Service
 * Manages staff profiles, salary disbursements, advances (سلف), and safe/drawer linkages.
 */

class PayrollService {
    constructor(dbManager, treasuryService) {
        this.db = dbManager;
        this.treasury = treasuryService;
    }

    /**
     * List all employees
     */
    listEmployees(onlyActive = false) {
        let sql = `
            SELECT e.*, COALESCE(e.branch, 'المقر الرئيسي') as branch, u.username, u.role as user_role
            FROM employees e
            LEFT JOIN users u ON e.user_id = u.id
            WHERE 1=1
        `;
        if (onlyActive) {
            sql += ' AND e.is_active = 1';
        }
        sql += ' ORDER BY e.id ASC';
        return this.db.all(sql);
    }

    /**
     * Get Staff KPIs
     */
    getStaffKpis() {
        const stats = this.db.get(`
            SELECT 
                COUNT(*) as total_employees,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_employees,
                SUM(CASE WHEN is_active = 1 AND (job_title LIKE '%كاشير%' OR job_title LIKE '%مبيعات%' OR job_title LIKE '%صالة%') THEN 1 ELSE 0 END) as sales_cashier_count,
                SUM(CASE WHEN is_active = 1 THEN basic_salary ELSE 0 END) as total_basic_payroll,
                AVG(CASE WHEN is_active = 1 THEN basic_salary ELSE NULL END) as avg_basic_salary
            FROM employees
        `);

        return {
            totalEmployees: stats?.total_employees || 0,
            activeEmployees: stats?.active_employees || 0,
            salesCashierCount: stats?.sales_cashier_count || 0,
            totalBasicPayroll: stats?.total_basic_payroll || 0,
            avgBasicSalary: stats?.avg_basic_salary || 0
        };
    }

    /**
     * Toggle employee active status
     */
    toggleEmployeeStatus(id, userId) {
        const emp = this.getEmployeeById(id);
        if (!emp) throw new Error('الموظف غير موجود');

        const newStatus = emp.is_active === 1 ? 0 : 1;
        return this.updateEmployee(id, { isActive: newStatus }, userId);
    }

    /**
     * Create new employee profile
     */
    createEmployee(data, userId) {
        const fullName = data.fullName || data.full_name;
        const jobTitle = data.jobTitle || data.roleTitle || data.job_title;
        const phone = data.phone;
        const basicSalary = data.basicSalary !== undefined ? data.basicSalary : data.baseSalary;
        const linkedUserId = data.linkedUserId !== undefined ? data.linkedUserId : data.user_id;
        const hireDate = data.hireDate || data.hire_date;
        const isActive = data.isActive !== undefined ? data.isActive : 1;

        if (!fullName || !fullName.trim()) {
            throw new Error('اسم الموظف مطلوب');
        }
        if (!jobTitle || !jobTitle.trim()) {
            throw new Error('المسمى الوظيفي مطلوب');
        }

        const salary = Number(basicSalary) || 0;
        if (salary < 0) {
            throw new Error('الراتب الأساسي لا يمكن أن يكون سالباً');
        }

        const branch = data.branch || 'المقر الرئيسي';

        return this.db.transaction((db) => {
            const res = db.run(
                `INSERT INTO employees (user_id, full_name, job_title, phone, branch, basic_salary, is_active, hire_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, date('now', 'localtime')))`,
                [
                    linkedUserId ? Number(linkedUserId) : null,
                    fullName.trim(),
                    jobTitle.trim(),
                    phone ? phone.trim() : null,
                    branch ? branch.trim() : 'المقر الرئيسي',
                    salary,
                    isActive ? 1 : 0,
                    hireDate || null
                ]
            );

            // Audit
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'CREATE_EMPLOYEE', 'employees', ?, ?)`,
                [userId ? Number(userId) : null, String(res.lastInsertRowid), JSON.stringify({ fullName, jobTitle, salary, branch })]
            );

            return this.getEmployeeById(res.lastInsertRowid);
        });
    }

    /**
     * Update employee profile
     */
    updateEmployee(id, data, userId) {
        const fullName = data.fullName !== undefined ? data.fullName : data.full_name;
        const jobTitle = data.jobTitle !== undefined ? data.jobTitle : data.roleTitle;
        const phone = data.phone;
        const branch = data.branch;
        const basicSalary = data.basicSalary !== undefined ? data.basicSalary : data.baseSalary;
        const linkedUserId = data.linkedUserId !== undefined ? data.linkedUserId : data.user_id;
        const isActive = data.isActive !== undefined ? data.isActive : data.is_active;
        const hireDate = data.hireDate !== undefined ? data.hireDate : data.hire_date;

        const current = this.getEmployeeById(id);
        if (!current) {
            throw new Error('الموظف غير موجود');
        }

        return this.db.transaction((db) => {
            db.run(
                `UPDATE employees
                 SET full_name = COALESCE(?, full_name),
                     job_title = COALESCE(?, job_title),
                     phone = COALESCE(?, phone),
                     branch = COALESCE(?, branch),
                     basic_salary = COALESCE(?, basic_salary),
                     user_id = ?,
                     is_active = COALESCE(?, is_active),
                     hire_date = COALESCE(?, hire_date)
                 WHERE id = ?`,
                [
                    fullName ? fullName.trim() : null,
                    jobTitle ? jobTitle.trim() : null,
                    phone !== undefined ? (phone ? phone.trim() : null) : current.phone,
                    branch !== undefined ? (branch ? branch.trim() : null) : current.branch,
                    basicSalary !== undefined ? Number(basicSalary) : null,
                    linkedUserId !== undefined ? (linkedUserId ? Number(linkedUserId) : null) : current.user_id,
                    isActive !== undefined ? Number(isActive) : null,
                    hireDate || null,
                    id
                ]
            );

            // Audit
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
                 VALUES (?, 'UPDATE_EMPLOYEE', 'employees', ?, ?, ?)`,
                [userId ? Number(userId) : null, String(id), JSON.stringify(current), JSON.stringify(data)]
            );

            return this.getEmployeeById(id);
        });
    }

    /**
     * Delete employee profile safely
     */
    deleteEmployee(id, userId) {
        const current = this.getEmployeeById(id);
        if (!current) {
            throw new Error('الموظف غير موجود');
        }

        const payments = this.db.get('SELECT COUNT(*) as count FROM salary_payments WHERE employee_id = ?', [id]);
        if (payments && payments.count > 0) {
            throw new Error('لا يمكن حذف هذا الموظف لوجود مسيرات رواتب وسندات صرف مسجلة باسمه في السجلات المالية. يمكنك إيقاف حسابه (متوقف عن العمل) بدلاً من الحذف.');
        }

        return this.db.transaction((db) => {
            db.run('DELETE FROM employees WHERE id = ?', [id]);

            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values)
                 VALUES (?, 'DELETE_EMPLOYEE', 'employees', ?, ?)`,
                [userId ? Number(userId) : null, String(id), JSON.stringify(current)]
            );

            return true;
        });
    }

    getEmployeeById(id) {
        return this.db.get(
            `SELECT e.*, COALESCE(e.branch, 'المقر الرئيسي') as branch, u.username, u.role as user_role
             FROM employees e
             LEFT JOIN users u ON e.user_id = u.id
             WHERE e.id = ?`,
            [id]
        );
    }

    /**
     * Disburse salary to employee with full itemized settlement and safe solvency check
     */
    disburseSalary(paymentData, userId) {
        const employeeId = Number(paymentData.employeeId || paymentData.employee_id);
        const basicSalary = paymentData.basicSalary !== undefined ? paymentData.basicSalary : paymentData.basic_salary;
        const advancesDeducted = paymentData.advancesDeducted !== undefined ? paymentData.advancesDeducted : (paymentData.advances_deducted || 0);
        const penaltiesDeducted = paymentData.penaltiesDeducted !== undefined ? paymentData.penaltiesDeducted : (paymentData.penalties_deducted || 0);
        const penaltyReason = paymentData.penaltyReason !== undefined ? paymentData.penaltyReason : (paymentData.penalty_reason || null);
        const bonusesAdded = paymentData.bonusesAdded !== undefined ? paymentData.bonusesAdded : (paymentData.bonuses_added || 0);
        const bonusReason = paymentData.bonusReason !== undefined ? paymentData.bonusReason : (paymentData.bonus_reason || null);
        const netAmount = paymentData.netAmount !== undefined ? paymentData.netAmount : paymentData.net_amount;
        const amount = paymentData.amount;
        const paymentType = paymentData.paymentType || paymentData.payment_type || 'salary';
        const paymentSource = paymentData.paymentSource || paymentData.payment_source || 'main_safe';
        const deductSource = paymentData.deductSource || paymentData.deduct_source || 'main_safe';
        const paymentMethod = paymentData.paymentMethod || paymentData.payment_method || paymentData.channel || 'cash';
        const channel = paymentMethod;
        const periodMonth = paymentData.periodMonth || paymentData.period_month || paymentData.monthPeriod || null;
        const periodType = paymentData.periodType || paymentData.period_type || 'month';
        const periodStart = paymentData.periodStart || paymentData.period_start || null;
        const periodEnd = paymentData.periodEnd || paymentData.period_end || null;
        const sessionId = paymentData.sessionId || paymentData.session_id || null;
        const notes = paymentData.notes || '';

        if (!employeeId) {
            throw new Error('يرجى تحديد الموظف المطلوب صرف راتبه');
        }

        const employee = this.getEmployeeById(employeeId);
        if (!employee) {
            throw new Error('الموظف المحدد غير موجود');
        }

        const base = Number(basicSalary !== undefined ? basicSalary : employee.basic_salary) || 0;
        const adv = Number(advancesDeducted) || 0;
        const pen = Number(penaltiesDeducted) || 0;
        const bon = Number(bonusesAdded) || 0;
        const computedNet = base - adv - pen + bon;

        const amt = Number(netAmount !== undefined ? netAmount : (amount !== undefined ? amount : computedNet));
        if (isNaN(amt) || amt <= 0) {
            throw new Error('صافي مبلغ الصرف يجب أن يكون أكبر من الصفر');
        }

        const targetSource = (deductSource === 'branch_safe' || paymentSource === 'branch_safe') ? 'branch_safe' : 'main_safe';
        const paymentChannel = paymentMethod || channel || 'cash';

        return this.db.transaction((db) => {
            const now = new Date();
            const targetMonth = periodMonth || now.toISOString().slice(0, 7);

            // Check funds availability if paying from Central Safe with strict solvency
            if (targetSource === 'main_safe') {
                const treasuryStats = this.treasury.getBalance();
                const availableInChannel = paymentChannel === 'cash' ? treasuryStats.cashBalance : (paymentChannel === 'card' ? treasuryStats.cardBalance : treasuryStats.transferBalance);
                if (amt > (availableInChannel + 0.01)) {
                    const channelLabel = paymentChannel === 'cash' ? 'الكاش' : (paymentChannel === 'card' ? 'الحساب البنكي / الفيزا' : 'المحافظ والتحويلات');
                    throw new Error(`رصيد ${channelLabel} بالخزنة المركزية (${availableInChannel.toFixed(2)} ج.م) لا يكفي لصرف هذا المبلغ (${amt.toFixed(2)} ج.م)`);
                }
            }

            // Duplicate salary prevention for the same period (منع صرف الراتب مرتين لنفس الشهر)
            if (paymentType === 'salary' && paymentData.preventDuplicate) {
                const existingSalary = db.get(
                    `SELECT id, voucher_number, amount, net_amount, paid_at FROM salary_payments 
                     WHERE employee_id = ? AND payment_type = 'salary' 
                       AND (period_month = ? OR strftime('%Y-%m', paid_at) = ?)`,
                    [employeeId, targetMonth, targetMonth]
                );
                if (existingSalary && !paymentData.forceDuplicate) {
                    const vNum = existingSalary.voucher_number || `#PAY-${existingSalary.id}`;
                    const paidAmt = Number(existingSalary.net_amount || existingSalary.amount || 0).toFixed(2);
                    throw new Error(`تم صرف راتب هذا الشهر (${targetMonth}) مسبقاً لهذا الموظف بالسند (${vNum}) بمبلغ (${paidAmt} ج.م) بتاريخ (${existingSalary.paid_at}). لا يجوز صرف المرتب مرتين.`);
                }
            }

            // Generate unique voucher number (supports legacy SAL- for advances and official #PAY- for salary disbursals)
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
            const rand = Math.floor(1000 + Math.random() * 9000);
            const voucherNumber = (paymentType === 'advance' && !periodMonth)
                ? `SAL-${dateStr}-${rand}`
                : `#PAY-${dateStr.slice(0, 6)}-${rand}`;

            // Insert into salary_payments
            const res = db.run(
                `INSERT INTO salary_payments (
                    voucher_number, employee_id, amount, payment_type,
                    payment_source, session_id, basic_salary, advances_deducted,
                    penalties_deducted, penalty_reason, bonuses_added, bonus_reason,
                    net_amount, payment_method, deduct_source, period_month,
                    period_type, period_start, period_end, notes, paid_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    voucherNumber,
                    employeeId,
                    amt,
                    paymentType,
                    targetSource === 'main_safe' ? 'treasury' : 'drawer',
                    sessionId || null,
                    base,
                    adv,
                    pen,
                    penaltyReason ? penaltyReason.trim() : null,
                    bon,
                    bonusReason ? bonusReason.trim() : null,
                    amt,
                    paymentChannel,
                    targetSource,
                    periodMonth || now.toISOString().slice(0, 7),
                    periodType || 'month',
                    periodStart || null,
                    periodEnd || null,
                    notes ? notes.trim() : null,
                    userId
                ]
            );

            // If paid from Central Treasury, register a treasury outflow with the exact payment channel
            if (targetSource === 'main_safe') {
                const typeLabel = paymentType === 'advance' ? 'سلفة' : 'مرتب';
                db.run(
                    `INSERT INTO central_treasury_transactions (
                        transaction_type, amount, payment_method, source_destination, reference_id, notes, performed_by
                    ) VALUES ('salary_payout', ?, ?, ?, ?, ?, ?)`,
                    [
                        amt,
                        paymentChannel,
                        `صرف ${typeLabel} للموظف (${employee.full_name}) - فرع (${employee.branch || 'الرئيسي'})`,
                        voucherNumber,
                        notes ? notes.trim() : `صافي: ${amt} ج.م (أساسي: ${base}، سلف: ${adv}، جزاءات: ${pen}، مكافآت: ${bon})`,
                        userId
                    ]
                );

                // Automated Journal Entry into petty_expenses
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
                    const yy = String(now.getFullYear()).slice(-2);
                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                    const expCode = `EXP-PAY-${yy}${mm}-${rand}`;
                    db.run(
                        `INSERT INTO petty_expenses (
                            session_id, voucher_code, operational_type, category,
                            amount, description, paid_to, recipient_name, approved_by, status
                        ) VALUES (?, ?, 'expense', 'مرتبات وأجور', ?, ?, ?, ?, ?, 'approved')`,
                        [
                            activeSession.id,
                            expCode,
                            amt,
                            `[سند صرف ${voucherNumber} - ${paymentChannel}] ${employee.full_name} (${notes || 'صافي راتب معتمد'})`,
                            employee.full_name,
                            employee.full_name,
                            userId || 1
                        ]
                    );
                }
            }

            // Audit
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'DISBURSE_SALARY', 'salary_payments', ?, ?)`,
                [userId, String(res.lastInsertRowid), JSON.stringify({ voucherNumber, employeeId, amt, base, adv, pen, bon, paymentChannel, targetSource })]
            );

            return this.getSalaryPaymentById(res.lastInsertRowid);
        });
    }

    /**
     * Get advances deducted for an employee in a period (Month or Custom Range)
     */
    getEmployeePeriodAdvances(employeeId, period) {
        const emp = this.getEmployeeById(employeeId);
        if (!emp) return { advances: [], totalAdvances: 0 };

        let salSql = `SELECT id, voucher_number as code, amount, notes, paid_at as created_at, 'سلفة مرتب' as category, 'advance' as operational_type, 'salary_payments' as source FROM salary_payments WHERE employee_id = ? AND payment_type = 'advance'`;
        let expSql = `SELECT id, voucher_code as code, amount, description as notes, created_at, category, subcategory, operational_type, 'petty_expenses' as source FROM petty_expenses WHERE status != 'rejected' AND (category != 'مرتبات وأجور' AND (voucher_code IS NULL OR voucher_code NOT LIKE 'EXP-PAY-%'))`;

        const salParams = [employeeId];
        const expParams = [];

        if (typeof period === 'string') {
            salSql += ` AND strftime('%Y-%m', paid_at) = ?`;
            salParams.push(period);
            expSql += ` AND strftime('%Y-%m', created_at) = ?`;
            expParams.push(period);
        } else if (period && period.month) {
            salSql += ` AND strftime('%Y-%m', paid_at) = ?`;
            salParams.push(period.month);
            expSql += ` AND strftime('%Y-%m', created_at) = ?`;
            expParams.push(period.month);
        } else if (period && period.startDate && period.endDate) {
            salSql += ` AND date(paid_at) >= date(?) AND date(paid_at) <= date(?)`;
            salParams.push(period.startDate, period.endDate);
            expSql += ` AND date(created_at) >= date(?) AND date(created_at) <= date(?)`;
            expParams.push(period.startDate, period.endDate);
        } else {
            const currentMonth = new Date().toISOString().slice(0, 7);
            salSql += ` AND strftime('%Y-%m', paid_at) = ?`;
            salParams.push(currentMonth);
            expSql += ` AND strftime('%Y-%m', created_at) = ?`;
            expParams.push(currentMonth);
        }

        const fullName = emp.full_name ? emp.full_name.trim() : '';
        const firstName = fullName.split(' ')[0] || '';
        const empUserId = emp.user_id ? Number(emp.user_id) : -9999;

        expSql += ` AND (
            salesperson_id = ? 
            OR salesperson_id = ? 
            OR recipient_name LIKE ? 
            OR paid_to LIKE ? 
            OR description LIKE ?
            ${firstName.length >= 2 ? `
            OR recipient_name LIKE ?
            OR paid_to LIKE ?
            OR ((description LIKE ? OR recipient_name LIKE ? OR paid_to LIKE ?) AND (
                category LIKE '%سلف%' OR category LIKE '%سحب%' OR category LIKE '%مسحوبات%'
                OR subcategory LIKE '%سلف%' OR subcategory LIKE '%سحب%' OR subcategory LIKE '%مسحوبات%'
                OR description LIKE '%سلف%' OR description LIKE '%سحب%' OR description LIKE '%مسحوبات%'
            ))` : ''}
        )`;

        expParams.push(
            emp.id,
            empUserId,
            `%${fullName}%`,
            `%${fullName}%`,
            `%${fullName}%`
        );

        if (firstName.length >= 2) {
            expParams.push(
                `%${firstName}%`,
                `%${firstName}%`,
                `%${firstName}%`,
                `%${firstName}%`,
                `%${firstName}%`
            );
        }

        const salaryAdvances = this.db.all(salSql, salParams) || [];
        const expenseAdvances = this.db.all(expSql, expParams) || [];

        const combined = [...salaryAdvances, ...expenseAdvances];
        let total = 0;
        combined.forEach(item => {
            if (item.operational_type === 'returned_expense') {
                total -= (Number(item.amount) || 0);
            } else {
                total += (Number(item.amount) || 0);
            }
        });
        total = Math.max(0, total);

        return {
            advances: combined,
            advances_list: combined,
            advancesList: combined,
            count: combined.length,
            totalAdvances: Math.round(total * 100) / 100,
            total_advances: Math.round(total * 100) / 100
        };
    }

    /**
     * Get monthly advances deducted for an employee in a given month (YYYY-MM)
     */
    getEmployeeMonthlyAdvances(employeeId, month) {
        return this.getEmployeePeriodAdvances(employeeId, month);
    }

    /**
     * Check if employee was already paid salary in a given period (Month or Custom Range)
     */
    checkEmployeePayoutStatus(employeeId, period) {
        let sql = `
            SELECT p.*, u.display_name as paid_by_name
            FROM salary_payments p
            LEFT JOIN users u ON p.paid_by = u.id
            WHERE p.employee_id = ?
              AND p.payment_type = 'salary'
        `;
        const params = [employeeId];

        if (typeof period === 'string') {
            sql += ` AND (p.period_month = ? OR strftime('%Y-%m', p.paid_at) = ? OR p.notes LIKE ?)`;
            params.push(period, period, `%${period}%`);
        } else if (period && period.month) {
            sql += ` AND (p.period_month = ? OR strftime('%Y-%m', p.paid_at) = ? OR p.notes LIKE ?)`;
            params.push(period.month, period.month, `%${period.month}%`);
        } else if (period && period.startDate && period.endDate) {
            sql += ` AND date(p.paid_at) >= date(?) AND date(p.paid_at) <= date(?)`;
            params.push(period.startDate, period.endDate);
        } else {
            const currentMonth = new Date().toISOString().slice(0, 7);
            sql += ` AND (p.period_month = ? OR strftime('%Y-%m', p.paid_at) = ?)`;
            params.push(currentMonth, currentMonth);
        }

        sql += ` ORDER BY p.id DESC LIMIT 1`;
        const lastPayment = this.db.get(sql, params);

        return {
            isPaid: !!lastPayment,
            is_paid: !!lastPayment,
            lastPayment: lastPayment || null,
            voucher_number: lastPayment ? lastPayment.voucher_number : null,
            paid_amount: lastPayment ? (lastPayment.net_amount || lastPayment.amount) : 0,
            paid_at: lastPayment ? lastPayment.paid_at : null
        };
    }

    /**
     * Get Executive Payroll Summary KPIs for selected period
     */
    getPayrollSummary(period) {
        // 1. Basic Payroll of all active employees
        const empStats = this.db.get(`
            SELECT 
                COUNT(*) as total_active,
                COALESCE(SUM(basic_salary), 0) as total_basic_payroll
            FROM employees 
            WHERE is_active = 1
        `);

        const totalEmployees = empStats?.total_active || 0;
        const totalBasicPayroll = empStats?.total_basic_payroll || 0;

        // 2. Period Payments Filter
        let paySql = `
            SELECT 
                p.employee_id,
                COALESCE(p.net_amount, p.amount) as net_amt,
                COALESCE(p.advances_deducted, 0) as adv_amt,
                COALESCE(p.penalties_deducted, 0) as pen_amt,
                COALESCE(p.bonuses_added, 0) as bon_amt
            FROM salary_payments p
            WHERE p.payment_type = 'salary'
        `;
        const params = [];

        if (typeof period === 'string') {
            paySql += ` AND (p.period_month = ? OR strftime('%Y-%m', p.paid_at) = ?)`;
            params.push(period, period);
        } else if (period && period.month) {
            paySql += ` AND (p.period_month = ? OR strftime('%Y-%m', p.paid_at) = ?)`;
            params.push(period.month, period.month);
        } else if (period && period.startDate && period.endDate) {
            paySql += ` AND date(p.paid_at) >= date(?) AND date(p.paid_at) <= date(?)`;
            params.push(period.startDate, period.endDate);
        } else {
            const currentMonth = new Date().toISOString().slice(0, 7);
            paySql += ` AND (p.period_month = ? OR strftime('%Y-%m', p.paid_at) = ?)`;
            params.push(currentMonth, currentMonth);
        }

        const payments = this.db.all(paySql, params) || [];
        const paidEmployeeIds = [...new Set(payments.map(p => p.employee_id))];
        const totalDisbursed = payments.reduce((sum, p) => sum + (Number(p.net_amt) || 0), 0);
        const totalAdvances = payments.reduce((sum, p) => sum + (Number(p.adv_amt) || 0), 0);
        const totalPenalties = payments.reduce((sum, p) => sum + (Number(p.pen_amt) || 0), 0);
        const totalBonuses = payments.reduce((sum, p) => sum + (Number(p.bon_amt) || 0), 0);

        const paidCount = paidEmployeeIds.length;
        const pendingCount = Math.max(0, totalEmployees - paidCount);

        return {
            totalBasic: Math.round(totalBasicPayroll * 100) / 100,
            totalBasicPayroll: Math.round(totalBasicPayroll * 100) / 100,
            totalDisbursed: Math.round(totalDisbursed * 100) / 100,
            totalDisbursedNet: Math.round(totalDisbursed * 100) / 100,
            totalAdvancesDeducted: Math.round(totalAdvances * 100) / 100,
            totalPenaltiesDeducted: Math.round(totalPenalties * 100) / 100,
            totalBonusesAdded: Math.round(totalBonuses * 100) / 100,
            totalDeductions: Math.round((totalAdvances + totalPenalties) * 100) / 100,
            totalEmployees,
            disbursedEmployeesCount: paidCount,
            paidEmployeesCount: paidCount,
            pendingEmployeesCount: pendingCount,
            paidEmployeeIds,
            isAllPaid: totalEmployees > 0 && paidCount >= totalEmployees
        };
    }

    /**
     * Disburse bulk payroll for multiple employees atomically
     */
    disburseBulkPayroll(payoutsList, paymentChannel = 'cash', userId = null) {
        if (!Array.isArray(payoutsList) || payoutsList.length === 0) {
            throw new Error('قائمة الموظفين للصرف المجمع فارغة');
        }

        const validMethods = ['cash', 'card', 'transfer'];
        const channel = validMethods.includes(paymentChannel) ? paymentChannel : 'cash';

        const getNet = (p) => Number(p.netSalary !== undefined ? p.netSalary : (p.netAmount !== undefined ? p.netAmount : p.amount)) || 0;
        const totalNetRequired = payoutsList.reduce((sum, p) => sum + getNet(p), 0);
        if (totalNetRequired <= 0) {
            throw new Error('إجمالي مسير الرواتب يجب أن يكون أكبر من الصفر');
        }

        // Strict Solvency check on the whole bulk sum
        const treasuryStats = this.treasury.getBalance();
        const availableInChannel = channel === 'cash' ? treasuryStats.cashBalance : (channel === 'card' ? treasuryStats.cardBalance : treasuryStats.transferBalance);
        if (totalNetRequired > (availableInChannel + 0.01)) {
            const channelLabel = channel === 'cash' ? 'الكاش' : (channel === 'card' ? 'الحساب البنكي / الفيزا' : 'المحافظ والتحويلات');
            throw new Error(`رصيد ${channelLabel} بالخزنة المركزية (${availableInChannel.toFixed(2)} ج.م) لا يكفي لصرف إجمالي المسير المجمع (${totalNetRequired.toFixed(2)} ج.م)`);
        }

        return this.db.transaction((db) => {
            const results = [];
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 7).replace('-', '');

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

            for (const item of payoutsList) {
                const emp = this.getEmployeeById(item.employeeId);
                if (!emp) continue;

                const netAmt = getNet(item);
                if (netAmt <= 0) continue;

                const rand = Math.floor(1000 + Math.random() * 9000);
                const voucherNumber = `PAY-${dateStr}-${rand}`;
                const noteDetails = `[مسير مجمع شهر ${item.month || dateStr}] أساسي: ${item.baseSalary || 0}، سلف: ${item.advances || 0}، خصم: ${item.deductions || 0} (${item.deductionReason || 'بدون'})، حوافز: ${item.bonuses || 0} (${item.bonusReason || 'بدون'})`;

                // 1. Insert salary payment
                const pRes = db.run(
                    `INSERT INTO salary_payments (
                        voucher_number, employee_id, amount, payment_type,
                        payment_source, notes, paid_by
                    ) VALUES (?, ?, ?, 'salary', 'treasury', ?, ?)`,
                    [voucherNumber, item.employeeId, netAmt, noteDetails, userId]
                );

                // 2. Central treasury transaction
                db.run(
                    `INSERT INTO central_treasury_transactions (
                        transaction_type, amount, payment_method, source_destination, reference_id, notes, performed_by
                    ) VALUES ('salary_payout', ?, ?, ?, ?, ?, ?)`,
                    [
                        netAmt,
                        channel,
                        `صرف راتب للموظف (${emp.full_name})`,
                        voucherNumber,
                        noteDetails,
                        userId
                    ]
                );

                // 3. Automated Journal Entry into petty_expenses
                if (activeSession) {
                    const yy = String(now.getFullYear()).slice(-2);
                    const mm = String(now.getMonth() + 1).padStart(2, '0');
                    const expCode = `EXP-${yy}${mm}-${rand}`;
                    db.run(
                        `INSERT INTO petty_expenses (
                            session_id, voucher_code, operational_type, category,
                            amount, description, paid_to, recipient_name, approved_by, status
                        ) VALUES (?, ?, 'expense', 'مرتبات وأجور', ?, ?, ?, ?, ?, 'approved')`,
                        [
                            activeSession.id,
                            expCode,
                            netAmt,
                            `[مسير مجمع ${voucherNumber} - ${channel}] ${emp.full_name}`,
                            emp.full_name,
                            emp.full_name,
                            userId || 1
                        ]
                    );
                }

                results.push({
                    voucherNumber,
                    employeeId: item.employeeId,
                    employeeName: emp.full_name,
                    netAmount: netAmt
                });
            }

            // Audit Log
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'DISBURSE_BULK_PAYROLL', 'salary_payments', ?, ?)`,
                [userId, 'BULK-' + dateStr, JSON.stringify({ totalAmount: totalNetRequired, count: results.length, channel })]
            );

            return {
                success: true,
                totalDisbursed: totalNetRequired,
                count: results.length,
                disbursedCount: results.length,
                payouts: results
            };
        });
    }

    /**
     * List recent salary payments with period and employee filters
     */
    listSalaryPayments(options = {}) {
        const limit = typeof options === 'number' ? options : (options?.limit || 100);
        const { month, startDate, endDate, employeeId, paymentType } = (typeof options === 'object' ? options : {});

        let sql = `
            SELECT 
                p.*,
                COALESCE(p.voucher_number, '#PAY-' || p.id) as voucher_code,
                COALESCE(p.net_amount, p.amount) as net_amount,
                e.full_name as employee_name,
                e.job_title,
                COALESCE(e.branch, 'المقر الرئيسي') as branch,
                u.display_name as paid_by_name
            FROM salary_payments p
            JOIN employees e ON p.employee_id = e.id
            LEFT JOIN users u ON p.paid_by = u.id
            WHERE 1=1
        `;
        const params = [];

        if (employeeId) {
            sql += ` AND p.employee_id = ?`;
            params.push(employeeId);
        }

        if (month) {
            sql += ` AND (p.period_month = ? OR strftime('%Y-%m', p.paid_at) = ?)`;
            params.push(month, month);
        } else if (startDate && endDate) {
            sql += ` AND date(p.paid_at) >= date(?) AND date(p.paid_at) <= date(?)`;
            params.push(startDate, endDate);
        }

        if (paymentType) {
            sql += ` AND p.payment_type = ?`;
            params.push(paymentType);
        }

        sql += ` ORDER BY p.id DESC LIMIT ?`;
        params.push(limit);

        return this.db.all(sql, params);
    }

    getSalaryPaymentById(id) {
        return this.db.get(
            `SELECT 
                p.*,
                COALESCE(p.voucher_number, '#PAY-' || p.id) as voucher_code,
                COALESCE(p.net_amount, p.amount) as net_amount,
                e.full_name as employee_name,
                e.job_title,
                COALESCE(e.branch, 'المقر الرئيسي') as branch,
                u.display_name as paid_by_name
             FROM salary_payments p
             JOIN employees e ON p.employee_id = e.id
             LEFT JOIN users u ON p.paid_by = u.id
             WHERE p.id = ?`,
            [id]
        );
    }
}

module.exports = { PayrollService };
