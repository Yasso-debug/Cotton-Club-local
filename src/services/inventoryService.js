/**
 * Cotton Club POS - Inventory & Stock Service
 * Deep module for catalog management, stock adjustments with reason tracking,
 * and inventory valuation metrics.
 */

class InventoryService {
    constructor(dbManager) {
        this.db = dbManager;
    }

    /**
     * List all products with category info
     */
    listProducts(filters = {}) {
        let sql = `
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.categoryId) {
            sql += ' AND p.category_id = ?';
            params.push(filters.categoryId);
        }

        if (filters.onlyActive) {
            sql += ' AND p.is_active = 1';
        }

        if (filters.lowStockOnly) {
            sql += ' AND p.current_stock <= p.min_stock_alert AND p.is_active = 1';
        }

        if (filters.search) {
            sql += ' AND (p.barcode LIKE ? OR p.item_name LIKE ?)';
            const q = `%${filters.search.trim()}%`;
            params.push(q, q);
        }

        sql += ' ORDER BY p.item_name ASC';

        if (filters.limit) {
            sql += ' LIMIT ?';
            params.push(Number(filters.limit));
            if (filters.offset) {
                sql += ' OFFSET ?';
                params.push(Number(filters.offset));
            }
        }

        return this.db.all(sql, params);
    }

    /**
     * Add new product
     */
    createProduct(productData, userId) {
        const {
            barcode,
            itemName,
            categoryId,
            costPrice,
            sellPrice,
            initialStock = 0,
            minStockAlert = 5
        } = productData;

        if (!barcode || !itemName) {
            throw new Error('الباركود واسم الصنف مطلوبان');
        }

        const cost = Number(costPrice) || 0;
        const sell = Number(sellPrice) || 0;

        if (cost < 0 || sell < 0) {
            throw new Error('الأسعار لا يمكن أن تكون سالبة');
        }

        const existing = this.db.get('SELECT id FROM products WHERE barcode = ?', [barcode.trim()]);
        if (existing) {
            throw new Error(`الباركود (${barcode}) مسجل بالفعل لصنف آخر`);
        }

        const res = this.db.run(
            `INSERT INTO products (
                barcode, item_name, category_id, cost_price, sell_price,
                current_stock, min_stock_alert, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                barcode.trim(),
                itemName.trim(),
                categoryId || null,
                cost,
                sell,
                Number(initialStock) || 0,
                Number(minStockAlert) || 5
            ]
        );

        // Audit
        this.db.run(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
             VALUES (?, 'CREATE_PRODUCT', 'products', ?, ?)`,
            [userId, String(res.lastInsertRowid), JSON.stringify({ barcode, itemName, sellPrice })]
        );

        return this.getProductById(res.lastInsertRowid);
    }

    /**
     * Update product
     */
    updateProduct(productId, productData, userId) {
        const {
            barcode,
            itemName,
            categoryId,
            costPrice,
            sellPrice,
            minStockAlert,
            isActive
        } = productData;

        const current = this.getProductById(productId);
        if (!current) {
            throw new Error('الصنف غير موجود');
        }

        if (barcode && barcode.trim() !== current.barcode) {
            const existing = this.db.get(
                'SELECT id FROM products WHERE barcode = ? AND id != ?',
                [barcode.trim(), productId]
            );
            if (existing) {
                throw new Error('الباركود مسجل لصنف آخر');
            }
        }

        this.db.run(
            `UPDATE products
             SET barcode = COALESCE(?, barcode),
                 item_name = COALESCE(?, item_name),
                 category_id = ?,
                 cost_price = COALESCE(?, cost_price),
                 sell_price = COALESCE(?, sell_price),
                 min_stock_alert = COALESCE(?, min_stock_alert),
                 is_active = COALESCE(?, is_active),
                 updated_at = datetime('now', 'localtime')
             WHERE id = ?`,
            [
                barcode ? barcode.trim() : null,
                itemName ? itemName.trim() : null,
                categoryId !== undefined ? categoryId : current.category_id,
                costPrice !== undefined ? Number(costPrice) : null,
                sellPrice !== undefined ? Number(sellPrice) : null,
                minStockAlert !== undefined ? Number(minStockAlert) : null,
                isActive !== undefined ? Number(isActive) : null,
                productId
            ]
        );

        // Audit
        this.db.run(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
             VALUES (?, 'UPDATE_PRODUCT', 'products', ?, ?, ?)`,
            [userId, String(productId), JSON.stringify(current), JSON.stringify(productData)]
        );

        return this.getProductById(productId);
    }

    /**
     * Record stock adjustment (manual inventory recount, damage, theft)
     */
    adjustStock(adjustmentData, userId, sessionId) {
        const { productId, adjustmentType, quantity, reason, notes } = adjustmentData;
        const qty = Number(quantity);

        if (!productId || !adjustmentType || isNaN(qty)) {
            throw new Error('بيانات تعديل المخزون غير مكتملة');
        }

        return this.db.transaction((db) => {
            const product = this.getProductById(productId);
            if (!product) {
                throw new Error('الصنف غير موجود');
            }

            let newStock = product.current_stock;
            if (adjustmentType === 'increase') {
                newStock += Math.abs(qty);
            } else if (adjustmentType === 'decrease') {
                newStock -= Math.abs(qty);
            } else if (adjustmentType === 'recount') {
                newStock = qty;
            } else {
                throw new Error('نوع التعديل غير صحيح');
            }

            // Update product stock
            db.run(
                'UPDATE products SET current_stock = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?',
                [newStock, productId]
            );

            // Record adjustment log
            const res = db.run(
                `INSERT INTO stock_adjustments (
                    product_id, session_id, user_id, adjustment_type, quantity, reason, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [productId, sessionId || null, userId, adjustmentType, qty, reason || 'other', notes || null]
            );

            return {
                adjustmentId: res.lastInsertRowid,
                productId,
                oldStock: product.current_stock,
                newStock
            };
        });
    }

    /**
     * Get inventory financial valuation
     */
    getInventoryValuation() {
        const stats = this.db.get(
            `SELECT 
                COUNT(*) as total_items,
                COALESCE(SUM(current_stock), 0) as total_units,
                COALESCE(SUM(current_stock * cost_price), 0) as total_cost_valuation,
                COALESCE(SUM(current_stock * sell_price), 0) as total_retail_valuation,
                SUM(CASE WHEN current_stock <= min_stock_alert THEN 1 ELSE 0 END) as low_stock_count
             FROM products
             WHERE is_active = 1`
        );

        const profitMargin = stats.total_cost_valuation > 0
            ? Math.round(((stats.total_retail_valuation - stats.total_cost_valuation) / stats.total_cost_valuation) * 1000) / 10
            : 0;

        return {
            totalItems: stats.total_items || 0,
            totalUnits: stats.total_units || 0,
            totalCostValuation: Math.round((stats.total_cost_valuation || 0) * 100) / 100,
            totalRetailValuation: Math.round((stats.total_retail_valuation || 0) * 100) / 100,
            potentialGrossProfit: Math.round(((stats.total_retail_valuation || 0) - (stats.total_cost_valuation || 0)) * 100) / 100,
            profitMarginPercent: profitMargin,
            lowStockCount: stats.low_stock_count || 0
        };
    }

    /**
     * Get categories list
     */
    listCategories() {
        return this.db.all('SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC');
    }

    /**
     * Add category
     */
    createCategory(name, description) {
        if (!name || name.trim() === '') {
            throw new Error('اسم القسم مطلوب');
        }
        const res = this.db.run(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [name.trim(), description || null]
        );
        return { id: res.lastInsertRowid, name, description };
    }

    /**
     * List stock adjustment vouchers
     */
    listStockAdjustments(limit = 50) {
        return this.db.all(
            `SELECT a.*, p.barcode, p.item_name, u.display_name as user_name, s.session_code
             FROM stock_adjustments a
             JOIN products p ON a.product_id = p.id
             LEFT JOIN users u ON a.user_id = u.id
             LEFT JOIN daily_sessions s ON a.session_id = s.id
             ORDER BY a.id DESC LIMIT ?`,
            [limit]
        );
    }

    getProductById(id) {
        return this.db.get(
            `SELECT p.*, c.name as category_name
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.id = ?`,
            [id]
        );
    }
}

module.exports = { InventoryService };
