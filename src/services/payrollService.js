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
            SELECT e.*, u.username, u.role as user_role
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

        return this.db.transaction((db) => {
            const res = db.run(
                `INSERT INTO employees (user_id, full_name, job_title, phone, basic_salary, is_active, hire_date)
                 VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, date('now', 'localtime')))`,
                [
                    linkedUserId ? Number(linkedUserId) : null,
                    fullName.trim(),
                    jobTitle.trim(),
                    phone ? phone.trim() : null,
                    salary,
                    isActive ? 1 : 0,
                    hireDate || null
                ]
            );

            // Audit
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'CREATE_EMPLOYEE', 'employees', ?, ?)`,
                [userId ? Number(userId) : null, String(res.lastInsertRowid), JSON.stringify({ fullName, jobTitle, salary })]
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
                     basic_salary = COALESCE(?, basic_salary),
                     user_id = ?,
                     is_active = COALESCE(?, is_active),
                     hire_date = COALESCE(?, hire_date)
                 WHERE id = ?`,
                [
                    fullName ? fullName.trim() : null,
                    jobTitle ? jobTitle.trim() : null,
                    phone !== undefined ? (phone ? phone.trim() : null) : current.phone,
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
            `SELECT e.*, u.username, u.role as user_role
             FROM employees e
             LEFT JOIN users u ON e.user_id = u.id
             WHERE e.id = ?`,
            [id]
        );
    }

    /**
     * Disburse salary / advance to employee
     */
    disburseSalary(paymentData, userId) {
        const {
            employeeId,
            amount,
            paymentType = 'salary', // 'salary', 'advance', 'bonus'
            paymentSource = 'treasury', // 'treasury' or 'drawer'
            sessionId = null,
            notes = ''
        } = paymentData;

        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) {
            throw new Error('مبلغ الصرف يجب أن يكون أكبر من الصفر');
        }

        const employee = this.getEmployeeById(employeeId);
        if (!employee) {
            throw new Error('الموظف المحدد غير موجود');
        }

        return this.db.transaction((db) => {
            // Check funds availability if paying from Central Safe
            if (paymentSource === 'treasury') {
                const treasuryStats = this.treasury.getBalance();
                if (amt > treasuryStats.balance) {
                    throw new Error(`رصيد الخزنة المركزية (${treasuryStats.balance} ج.م) لا يكفي لصرف هذا المبلغ (${amt} ج.م)`);
                }
            }

            // Generate unique voucher number
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
            const rand = Math.floor(1000 + Math.random() * 9000);
            const voucherNumber = `SAL-${dateStr}-${rand}`;

            // Insert into salary_payments
            const res = db.run(
                `INSERT INTO salary_payments (
                    voucher_number, employee_id, amount, payment_type,
                    payment_source, session_id, notes, paid_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    voucherNumber,
                    employeeId,
                    amt,
                    paymentType,
                    paymentSource,
                    sessionId || null,
                    notes ? notes.trim() : null,
                    userId
                ]
            );

            // If paid from Treasury, register a treasury outflow
            if (paymentSource === 'treasury') {
                const typeLabel = paymentType === 'advance' ? 'سلفة' : 'مرتب';
                db.run(
                    `INSERT INTO central_treasury_transactions (
                        transaction_type, amount, source_destination, reference_id, notes, performed_by
                    ) VALUES ('salary_payout', ?, ?, ?, ?, ?)`,
                    [
                        amt,
                        `صرف ${typeLabel} للموظف (${employee.full_name})`,
                        voucherNumber,
                        notes ? notes.trim() : null,
                        userId
                    ]
                );
            }

            // Audit
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'DISBURSE_SALARY', 'salary_payments', ?, ?)`,
                [userId, String(res.lastInsertRowid), JSON.stringify({ voucherNumber, employeeId, amt, paymentType })]
            );

            return this.getSalaryPaymentById(res.lastInsertRowid);
        });
    }

    /**
     * List recent salary payments
     */
    listSalaryPayments(limit = 50) {
        return this.db.all(
            `SELECT p.*, e.full_name as employee_name, e.job_title, u.display_name as paid_by_name
             FROM salary_payments p
             JOIN employees e ON p.employee_id = e.id
             LEFT JOIN users u ON p.paid_by = u.id
             ORDER BY p.id DESC LIMIT ?`,
            [limit]
        );
    }

    getSalaryPaymentById(id) {
        return this.db.get(
            `SELECT p.*, e.full_name as employee_name, e.job_title, u.display_name as paid_by_name
             FROM salary_payments p
             JOIN employees e ON p.employee_id = e.id
             LEFT JOIN users u ON p.paid_by = u.id
             WHERE p.id = ?`,
            [id]
        );
    }
}

module.exports = { PayrollService };
