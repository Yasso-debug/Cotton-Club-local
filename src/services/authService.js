/**
 * Cotton Club POS - Authentication Service
 * Deep module encapsulating credential verification, password hashing,
 * and role-based access validation.
 */

const bcrypt = require('bcryptjs');

class AuthService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Authenticate user by username and password
     */
    login(username, password) {
        if (!username || !password) {
            throw new Error('يرجى إدخال اسم المستخدم وكلمة المرور');
        }

        const user = this.db.get(
            'SELECT id, username, password_hash, display_name, role, is_active FROM users WHERE username = ?',
            [username.trim()]
        );

        if (!user) {
            throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
        }

        if (user.is_active !== 1) {
            throw new Error('هذا الحساب معطل، يرجى مراجعة الإدارة');
        }

        const passwordMatch = bcrypt.compareSync(password, user.password_hash);
        if (!passwordMatch) {
            throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
        }

        // Write to audit log
        this.db.run(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
             VALUES (?, 'LOGIN', 'users', ?, ?)`,
            [user.id, String(user.id), JSON.stringify({ username: user.username, role: user.role })]
        );

        return {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            role: user.role
        };
    }

    /**
     * Verify Manager Override credentials for privileged operations
     * (e.g. Disounts > 5%, Voiding Invoices, Opening Cash Adjustment)
     */
    verifyManagerOverride(username, password) {
        if (!username || !password) {
            return { success: false, message: 'بيانات المدير مطلوبة' };
        }

        const manager = this.db.get(
            "SELECT id, username, password_hash, display_name, role, is_active FROM users WHERE username = ? AND role IN ('admin', 'manager')",
            [username.trim()]
        );

        if (!manager || manager.is_active !== 1) {
            return { success: false, message: 'مستخدم غير مصرح له كمدير' };
        }

        const match = bcrypt.compareSync(password, manager.password_hash);
        if (!match) {
            return { success: false, message: 'كلمة مرور المدير غير صحيحة' };
        }

        return {
            success: true,
            manager: {
                id: manager.id,
                username: manager.username,
                displayName: manager.display_name,
                role: manager.role
            }
        };
    }

    /**
     * List all users (admin only)
     */
    listUsers() {
        return this.db.all(
            'SELECT id, username, display_name, role, is_active, created_at FROM users ORDER BY id ASC'
        );
    }

    /**
     * Get user by ID (omitting password_hash)
     */
    getUserById(id) {
        return this.db.get(
            'SELECT id, username, display_name, role, is_active, created_at, updated_at FROM users WHERE id = ?',
            [id]
        );
    }

    /**
     * Create user
     */
    createUser(userData, operatorUserId) {
        const username = (userData.username || '').trim();
        const password = userData.password;
        const displayName = (userData.displayName || userData.display_name || '').trim();
        const role = userData.role || 'cashier';
        const isActive = userData.isActive !== undefined ? (userData.isActive ? 1 : 0) : 1;

        if (!username || !password || !displayName) {
            throw new Error('اسم المستخدم والاسم الظاهر وكلمة المرور مطلوبة');
        }

        if (username.length < 2) {
            throw new Error('اسم المستخدم يجب أن يتكون من حرفين على الأقل');
        }

        const existing = this.db.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username]);
        if (existing) {
            throw new Error(`اسم المستخدم "${username}" مسجل مسبقاً، يرجى اختيار اسم آخر`);
        }

        const hash = bcrypt.hashSync(password, 10);
        const result = this.db.run(
            `INSERT INTO users (username, password_hash, display_name, role, is_active)
             VALUES (?, ?, ?, ?, ?)`,
            [username, hash, displayName, role, isActive]
        );

        const newId = result.lastInsertRowid;

        // Audit
        this.db.run(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
             VALUES (?, 'CREATE_USER', 'users', ?, ?)`,
            [operatorUserId ? Number(operatorUserId) : null, String(newId), JSON.stringify({ username, displayName, role, isActive })]
        );

        return this.getUserById(newId);
    }

    /**
     * Update user details (username, display name, role, status, and optionally password)
     */
    updateUser(id, userData, operatorUserId) {
        const current = this.db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!current) {
            throw new Error('المستخدم غير موجود');
        }

        const username = userData.username !== undefined ? userData.username.trim() : current.username;
        const displayName = userData.displayName !== undefined ? userData.displayName.trim() : (userData.display_name !== undefined ? userData.display_name.trim() : current.display_name);
        const role = userData.role !== undefined ? userData.role : current.role;
        const isActive = userData.isActive !== undefined ? (userData.isActive ? 1 : 0) : current.is_active;
        const password = userData.password;

        if (!username || !displayName) {
            throw new Error('اسم المستخدم والاسم الظاهر مطلوبان');
        }

        // Check if username already taken by another user
        if (username.toLowerCase() !== current.username.toLowerCase()) {
            const conflict = this.db.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?', [username, id]);
            if (conflict) {
                throw new Error(`اسم المستخدم "${username}" مستخدم بالفعل لحساب آخر`);
            }
        }

        // Prevent admin from deactivating themselves
        if (Number(id) === Number(operatorUserId) && isActive === 0) {
            throw new Error('لا يمكنك تعطيل الحساب المسجل به حالياً');
        }

        let newHash = current.password_hash;
        if (password && password.trim()) {
            newHash = bcrypt.hashSync(password.trim(), 10);
        }

        this.db.run(
            `UPDATE users
             SET username = ?,
                 display_name = ?,
                 role = ?,
                 is_active = ?,
                 password_hash = ?,
                 updated_at = datetime('now', 'localtime')
             WHERE id = ?`,
            [username, displayName, role, isActive, newHash, id]
        );

        // Audit log
        this.db.run(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
             VALUES (?, 'UPDATE_USER', 'users', ?, ?, ?)`,
            [
                operatorUserId ? Number(operatorUserId) : null,
                String(id),
                JSON.stringify({ username: current.username, displayName: current.display_name, role: current.role, isActive: current.is_active }),
                JSON.stringify({ username, displayName, role, isActive, passwordChanged: !!password })
            ]
        );

        return this.getUserById(id);
    }

    /**
     * Change user password directly
     */
    changePassword(id, newPassword, operatorUserId) {
        if (!newPassword || newPassword.trim().length < 3) {
            throw new Error('كلمة المرور الجديدة يجب أن تكون 3 أحرف على الأقل');
        }

        const current = this.db.get('SELECT id, username FROM users WHERE id = ?', [id]);
        if (!current) {
            throw new Error('المستخدم غير موجود');
        }

        const hash = bcrypt.hashSync(newPassword.trim(), 10);
        this.db.run(
            `UPDATE users
             SET password_hash = ?,
                 updated_at = datetime('now', 'localtime')
             WHERE id = ?`,
            [hash, id]
        );

        // Audit log
        this.db.run(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
             VALUES (?, 'CHANGE_PASSWORD', 'users', ?, ?)`,
            [operatorUserId ? Number(operatorUserId) : null, String(id), JSON.stringify({ username: current.username, changedAt: new Date().toISOString() })]
        );

        return { success: true, message: 'تم تغيير كلمة المرور بنجاح' };
    }

    /**
     * Toggle user active/inactive status
     */
    toggleUserStatus(id, operatorUserId) {
        if (Number(id) === Number(operatorUserId)) {
            throw new Error('لا يمكنك تعطيل الحساب المسجل به حالياً');
        }

        const user = this.db.get('SELECT id, is_active, username FROM users WHERE id = ?', [id]);
        if (!user) {
            throw new Error('المستخدم غير موجود');
        }

        const newStatus = user.is_active === 1 ? 0 : 1;
        this.db.run(
            `UPDATE users SET is_active = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
            [newStatus, id]
        );

        this.db.run(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
             VALUES (?, 'TOGGLE_USER_STATUS', 'users', ?, ?)`,
            [operatorUserId ? Number(operatorUserId) : null, String(id), JSON.stringify({ username: user.username, newStatus })]
        );

        return { id, isActive: newStatus };
    }

    /**
     * Delete user or safely deactivate if historical records exist
     */
    deleteUser(id, operatorUserId) {
        if (Number(id) === Number(operatorUserId)) {
            throw new Error('لا يمكنك حذف الحساب المسجل به حالياً');
        }

        const user = this.db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!user) {
            throw new Error('المستخدم غير موجود');
        }

        // Check for historical dependencies (sessions, invoices, payments)
        const sessionCount = this.db.get('SELECT COUNT(*) as count FROM daily_sessions WHERE opened_by = ? OR closed_by = ?', [id, id])?.count || 0;
        const invoiceCount = this.db.get('SELECT COUNT(*) as count FROM sales_invoices WHERE user_id = ?', [id])?.count || 0;

        if (sessionCount > 0 || invoiceCount > 0) {
            // Cannot hard delete because of foreign keys; deactivate instead
            this.db.run('UPDATE users SET is_active = 0, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?', [id]);
            return {
                deactivated: true,
                message: `تم تعطيل حساب "${user.username}" بدلاً من حذفه لوجود ${invoiceCount} فاتورة و ${sessionCount} وردية مسجلة باسمه في السجلات.`
            };
        }

        this.db.run('DELETE FROM users WHERE id = ?', [id]);

        this.db.run(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values)
             VALUES (?, 'DELETE_USER', 'users', ?, ?)`,
            [operatorUserId ? Number(operatorUserId) : null, String(id), JSON.stringify({ username: user.username, role: user.role })]
        );

        return { deleted: true, message: `تم حذف حساب المستخدم "${user.username}" بنجاح.` };
    }

    /**
     * Get Users KPI summary
     */
    getUsersKpis() {
        const stats = this.db.get(`
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
                SUM(CASE WHEN role IN ('admin', 'manager') THEN 1 ELSE 0 END) as admin_count,
                SUM(CASE WHEN role = 'cashier' THEN 1 ELSE 0 END) as cashier_count
            FROM users
        `);

        return {
            totalUsers: stats?.total_users || 0,
            activeUsers: stats?.active_users || 0,
            adminCount: stats?.admin_count || 0,
            cashierCount: stats?.cashier_count || 0
        };
    }
}

module.exports = { AuthService };

