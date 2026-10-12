/**
 * Cotton Club POS - Application Settings Service
 * Key-Value configuration manager with default values.
 */

class SettingsService {
    constructor(dbManager) {
        this.db = dbManager;
    }

    getAllSettings() {
        const rows = this.db.all('SELECT * FROM app_settings ORDER BY key ASC');
        const settings = {};
        for (const row of rows) {
            settings[row.key] = row.value;
        }
        return settings;
    }

    getSetting(key, defaultValue = null) {
        const row = this.db.get('SELECT value FROM app_settings WHERE key = ?', [key]);
        return row ? row.value : defaultValue;
    }

    updateSettings(settingsMap, userId) {
        return this.db.transaction((db) => {
            for (const [key, value] of Object.entries(settingsMap)) {
                db.run(
                    `INSERT INTO app_settings (key, value, updated_at)
                     VALUES (?, ?, datetime('now', 'localtime'))
                     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
                    [key, String(value)]
                );
            }

            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'UPDATE_SETTINGS', 'app_settings', 'all', ?)`,
                [userId, JSON.stringify(settingsMap)]
            );

            return this.getAllSettings();
        });
    }
}

module.exports = { SettingsService };
