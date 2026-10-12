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
     * Create user
     */
    createUser(userData) {
        const { username, password, displayName, role } = userData;
        if (!username || !password || !displayName || !role) {
            throw new Error('جميع حقول المستخدم مطلوبة');
        }

        const existing = this.db.get('SELECT id FROM users WHERE username = ?', [username.trim()]);
        if (existing) {
            throw new Error('اسم المستخدم مسجل مسبقاً');
        }

        const hash = bcrypt.hashSync(password, 10);
        const result = this.db.run(
            `INSERT INTO users (username, password_hash, display_name, role, is_active)
             VALUES (?, ?, ?, ?, 1)`,
            [username.trim(), hash, displayName.trim(), role]
        );

        return { id: result.lastInsertRowid, username, displayName, role };
    }
}

module.exports = { AuthService };
