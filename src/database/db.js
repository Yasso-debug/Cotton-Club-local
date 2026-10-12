/**
 * Cotton Club POS - SQLite Database Connection & Management
 * Implements strict PRAGMAs, WAL mode, transaction isolation, and backup.
 * Follows sqlite-ops and codebase-design guidelines.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const { SCHEMA_SQL } = require('./schema');

class DatabaseManager {
    constructor(dbFilePath = null) {
        if (!dbFilePath) {
            const dataDir = path.join(process.cwd(), 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            this.dbFilePath = path.join(dataDir, 'cotton_club_pos.db');
        } else {
            this.dbFilePath = dbFilePath;
        }

        this.db = null;
    }

    /**
     * Initialize connection with required sqlite-ops PRAGMAs
     */
    connect() {
        if (this.db) return this.db;

        this.db = new DatabaseSync(this.dbFilePath);

        // Core Pragmas as prescribed by sqlite-ops
        this.db.exec('PRAGMA foreign_keys = ON;');
        this.db.exec('PRAGMA journal_mode = WAL;');
        this.db.exec('PRAGMA busy_timeout = 5000;');
        this.db.exec('PRAGMA synchronous = NORMAL;');

        // Initialize schema
        this.initSchema();

        return this.db;
    }

    /**
     * Executes initial schema creation
     */
    initSchema() {
        this.db.exec(SCHEMA_SQL);
    }

    /**
     * Execute SQL string
     */
    exec(sql) {
        this.ensureConnected();
        return this.db.exec(sql);
    }

    /**
     * Get single row
     */
    get(sql, params = []) {
        this.ensureConnected();
        const stmt = this.db.prepare(sql);
        const results = stmt.all(...params);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Get multiple rows
     */
    all(sql, params = []) {
        this.ensureConnected();
        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }

    /**
     * Run INSERT, UPDATE, DELETE
     */
    run(sql, params = []) {
        this.ensureConnected();
        const stmt = this.db.prepare(sql);
        return stmt.run(...params);
    }

    /**
     * Execute transaction with BEGIN IMMEDIATE as prescribed by sqlite-ops
     * to prevent deadlock on concurrent write operations.
     */
    transaction(fn) {
        this.ensureConnected();
        this.db.exec('BEGIN IMMEDIATE;');
        try {
            const result = fn(this);
            this.db.exec('COMMIT;');
            return result;
        } catch (error) {
            this.db.exec('ROLLBACK;');
            throw error;
        }
    }

    /**
     * Hot Backup via VACUUM INTO
     * Safely clones the database without locking or tearing active writes.
     */
    backup(targetPath = null) {
        this.ensureConnected();
        if (!targetPath) {
            const backupDir = path.join(process.cwd(), 'data', 'backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
            targetPath = path.join(backupDir, `backup_${dateStr}.db`);
        }

        // Remove target if already exists
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
        }

        const sanitizedPath = targetPath.replace(/'/g, "''");
        this.db.exec(`VACUUM INTO '${sanitizedPath}';`);
        return targetPath;
    }

    /**
     * Close connection safely
     */
    close() {
        if (this.db) {
            try {
                this.db.exec('PRAGMA optimize;');
            } catch (e) {
                // Ignore optimize error on teardown
            }
            this.db.close();
            this.db = null;
        }
    }

    ensureConnected() {
        if (!this.db) {
            this.connect();
        }
    }
}

// Singleton instance for the main application
let defaultInstance = null;

function getDatabase(customPath = null) {
    if (!defaultInstance || customPath) {
        const instance = new DatabaseManager(customPath);
        instance.connect();
        if (!customPath) {
            defaultInstance = instance;
        }
        return instance;
    }
    return defaultInstance;
}

module.exports = {
    DatabaseManager,
    getDatabase
};
