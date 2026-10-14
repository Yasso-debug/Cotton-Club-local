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
     * Get Executive KPIs for Categories and Items Catalog
     */
    getCatalogOverview() {
        const catCount = this.db.get('SELECT COUNT(*) as count FROM categories WHERE is_active = 1')?.count || 0;
        const prodCount = this.db.get('SELECT COUNT(*) as count FROM products WHERE is_active = 1')?.count || 0;
        const lowStock = this.db.get(`
            SELECT COUNT(*) as count FROM products 
            WHERE is_active = 1 AND current_stock <= reorder_level AND current_stock > 0
        `)?.count || 0;
        const outOfStock = this.db.get(`
            SELECT COUNT(*) as count FROM products 
            WHERE is_active = 1 AND current_stock <= 0
        `)?.count || 0;

        return {
            totalCategories: catCount,
            totalProducts: prodCount,
            lowStockCount: lowStock,
            outOfStockCount: outOfStock,
            total_categories: catCount,
            total_products: prodCount,
            low_stock_count: lowStock,
            out_of_stock_count: outOfStock
        };
    }

    /**
     * List all products with category info
     */
    listProducts(filters = {}) {
        let sql = `
            SELECT p.*, c.name as category_name, c.category_code as cat_code
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = 1
        `;
        const params = [];

        if (filters.categoryId) {
            sql += ' AND p.category_id = ?';
            params.push(Number(filters.categoryId));
        }

        if (filters.onlyActive) {
            sql += " AND p.status = 'active'";
        }

        const stockStatus = filters.stockStatus || (filters.lowStockOnly ? 'low_stock' : 'all');
        if (stockStatus === 'low_stock') {
            sql += ' AND p.current_stock <= p.reorder_level AND p.current_stock > 0';
        } else if (stockStatus === 'out_of_stock') {
            sql += ' AND p.current_stock <= 0';
        } else if (stockStatus === 'in_stock') {
            sql += ' AND p.current_stock > p.reorder_level';
        }

        if (filters.search) {
            sql += ' AND (p.barcode LIKE ? OR p.item_name LIKE ? OR p.product_code LIKE ? OR p.brand LIKE ?)';
            const q = `%${filters.search.trim()}%`;
            params.push(q, q, q, q);
        }

        sql += ' ORDER BY p.id DESC';

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
     * Add new product (Fast 10-Second Entry)
     */
    createProduct(productData, userId) {
        const itemName = (productData.item_name || productData.itemName || '').trim();
        if (!itemName) {
            throw new Error('اسم الصنف مطلوب');
        }

        const maxRow = this.db.get('SELECT MAX(id) as max_id FROM products');
        const nextId = (maxRow?.max_id || 0) + 1;
        const productCode = (productData.product_code || '').trim() || `ITM-${String(nextId).padStart(6, '0')}`;
        const barcode = (productData.barcode || '').trim() || productCode;

        const categoryId = productData.category_id ? Number(productData.category_id) : (productData.categoryId ? Number(productData.categoryId) : null);
        const brand = (productData.brand || '').trim() || null;
        const unitOfMeasure = (productData.unit_of_measure || productData.unitOfMeasure || 'piece').trim();

        const cost = Math.round((Number(productData.cost_price ?? productData.costPrice) || 0) * 100) / 100;
        const sell = Math.round((Number(productData.sell_price ?? productData.sellPrice) || 0) * 100) / 100;
        const wholesale = Math.round((Number(productData.wholesale_price ?? productData.wholesalePrice) || 0) * 100) / 100;
        const minSelling = Math.round((Number(productData.min_selling_price ?? productData.minSellingPrice) || 0) * 100) / 100;

        const reorderLevel = Number(productData.reorder_level ?? productData.reorderLevel ?? productData.min_stock_alert ?? productData.minStockAlert) || 5;
        const initialStock = Number(productData.current_stock ?? productData.initialStock) || 0;
        const status = productData.status || 'active';

        if (cost < 0 || sell < 0) {
            throw new Error('الأسعار لا يمكن أن تكون سالبة');
        }

        // Check duplicate product_code or barcode if non-empty
        if (barcode) {
            const existing = this.db.get('SELECT id FROM products WHERE barcode = ?', [barcode]);
            if (existing) {
                throw new Error(`الباركود (${barcode}) مسجل بالفعل لصنف آخر`);
            }
        }

        const res = this.db.run(
            `INSERT INTO products (
                product_code, barcode, item_name, category_id, brand, unit_of_measure,
                cost_price, sell_price, wholesale_price, min_selling_price,
                current_stock, min_stock_alert, reorder_level, status, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                productCode,
                barcode,
                itemName,
                categoryId,
                brand,
                unitOfMeasure,
                cost,
                sell,
                wholesale,
                minSelling,
                initialStock,
                reorderLevel,
                reorderLevel,
                status
            ]
        );

        const newId = res.lastInsertRowid;

        // Audit
        if (userId) {
            this.db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'CREATE_PRODUCT', 'products', ?, ?)`,
                [userId, String(newId), JSON.stringify({ productCode, itemName, sellPrice: sell })]
            );
        }

        return this.getProductById(newId);
    }

    /**
     * Update product
     */
    updateProduct(productId, productData, userId) {
        const id = Number(productId);
        const current = this.getProductById(id);
        if (!current) {
            throw new Error('الصنف غير موجود');
        }

        const productCode = (productData.product_code || productData.productCode || current.product_code || '').trim();
        const barcode = (productData.barcode || current.barcode || '').trim() || productCode;
        const itemName = (productData.item_name || productData.itemName || current.item_name).trim();

        const rawCategory = productData.category_id !== undefined ? productData.category_id : productData.categoryId;
        const categoryId = rawCategory !== undefined ? (rawCategory ? Number(rawCategory) : null) : current.category_id;
        const brand = productData.brand !== undefined ? (productData.brand ? String(productData.brand).trim() : null) : current.brand;
        const unitOfMeasure = productData.unit_of_measure || productData.unitOfMeasure || current.unit_of_measure || 'قطعة';

        const cost = productData.cost_price !== undefined ? Number(productData.cost_price) : (productData.costPrice !== undefined ? Number(productData.costPrice) : current.cost_price);
        const sell = productData.sell_price !== undefined ? Number(productData.sell_price) : (productData.sellPrice !== undefined ? Number(productData.sellPrice) : current.sell_price);
        const rawWholesale = productData.wholesale_price !== undefined ? productData.wholesale_price : productData.wholesalePrice;
        const wholesale = rawWholesale !== undefined ? Number(rawWholesale) : (current.wholesale_price || 0);
        const rawMinSelling = productData.min_selling_price !== undefined ? productData.min_selling_price : productData.minSellingPrice;
        const minSelling = rawMinSelling !== undefined ? Number(rawMinSelling) : (current.min_selling_price || 0);

        const rawReorder = productData.reorder_level !== undefined ? productData.reorder_level : (productData.reorderLevel !== undefined ? productData.reorderLevel : (productData.min_stock_alert !== undefined ? productData.min_stock_alert : productData.minStockAlert));
        const reorderLevel = rawReorder !== undefined ? Number(rawReorder) : (current.reorder_level || 5);
        const status = productData.status || current.status || 'active';
        const rawActive = productData.is_active !== undefined ? productData.is_active : productData.isActive;
        const isActive = rawActive !== undefined ? (rawActive ? 1 : 0) : current.is_active;

        if (barcode && barcode !== current.barcode) {
            const existing = this.db.get('SELECT id FROM products WHERE barcode = ? AND id != ?', [barcode, id]);
            if (existing) {
                throw new Error('الباركود مسجل لصنف آخر');
            }
        }

        this.db.run(
            `UPDATE products
             SET product_code = ?,
                 barcode = ?,
                 item_name = ?,
                 category_id = ?,
                 brand = ?,
                 unit_of_measure = ?,
                 cost_price = ?,
                 sell_price = ?,
                 wholesale_price = ?,
                 min_selling_price = ?,
                 min_stock_alert = ?,
                 reorder_level = ?,
                 status = ?,
                 is_active = ?,
                 updated_at = datetime('now', 'localtime')
             WHERE id = ?`,
            [
                productCode,
                barcode,
                itemName,
                categoryId,
                brand,
                unitOfMeasure,
                cost,
                sell,
                wholesale,
                minSelling,
                reorderLevel,
                reorderLevel,
                status,
                isActive,
                id
            ]
        );

        // Audit
        if (userId) {
            this.db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
                 VALUES (?, 'UPDATE_PRODUCT', 'products', ?, ?, ?)`,
                [userId, String(id), JSON.stringify(current), JSON.stringify(productData)]
            );
        }

        return this.getProductById(id);
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
     * Get categories list with items count and parent category
     */
    listCategories(filters = {}) {
        let sql = `
            SELECT 
                c.*, 
                p_parent.name as parent_name,
                COUNT(p.id) as items_count
            FROM categories c
            LEFT JOIN categories p_parent ON c.parent_id = p_parent.id
            LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
            WHERE c.is_active = 1
        `;
        const params = [];

        if (filters && filters.search) {
            sql += ' AND (c.name LIKE ? OR c.category_code LIKE ?)';
            const q = `%${filters.search.trim()}%`;
            params.push(q, q);
        }

        sql += ' GROUP BY c.id ORDER BY c.display_order ASC, c.name ASC';
        return this.db.all(sql, params);
    }

    getCategoryById(id) {
        return this.db.get(`
            SELECT c.*, p_parent.name as parent_name, COUNT(p.id) as items_count
            FROM categories c
            LEFT JOIN categories p_parent ON c.parent_id = p_parent.id
            LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
            WHERE c.id = ?
            GROUP BY c.id
        `, [id]);
    }

    /**
     * Add category with sequential CAT-XX code
     */
    createCategory(dataOrName, description = null) {
        let name = '';
        let desc = null;
        let parentId = null;
        let displayOrder = 0;
        let code = '';

        if (typeof dataOrName === 'object' && dataOrName !== null) {
            name = (dataOrName.name || '').trim();
            desc = dataOrName.description || null;
            const rawParent = dataOrName.parent_id !== undefined ? dataOrName.parent_id : dataOrName.parentId;
            parentId = rawParent ? Number(rawParent) : null;
            const rawOrder = dataOrName.display_order !== undefined ? dataOrName.display_order : dataOrName.displayOrder;
            displayOrder = rawOrder !== undefined && rawOrder !== null ? Number(rawOrder) : 0;
            code = (dataOrName.category_code || dataOrName.categoryCode || dataOrName.code || '').trim();
        } else {
            name = (dataOrName || '').trim();
            desc = description;
        }

        if (!name) {
            throw new Error('اسم المجموعة مطلوب');
        }

        const maxRow = this.db.get('SELECT MAX(id) as max_id FROM categories');
        const nextId = (maxRow?.max_id || 0) + 1;
        const categoryCode = code || `CAT-${String(nextId).padStart(2, '0')}`;

        const res = this.db.run(
            `INSERT INTO categories (category_code, name, parent_id, display_order, description, is_active)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [categoryCode, name, parentId, displayOrder, desc]
        );

        return this.getCategoryById(res.lastInsertRowid);
    }

    /**
     * Update category
     */
    updateCategory(id, data) {
        const catId = Number(id);
        const current = this.getCategoryById(catId);
        if (!current) throw new Error('المجموعة غير موجودة');

        const name = (data.name || current.name).trim();
        const categoryCode = (data.category_code || data.categoryCode || data.code || current.category_code || '').trim();
        const rawParent = data.parent_id !== undefined ? data.parent_id : data.parentId;
        const parentId = rawParent !== undefined ? (rawParent ? Number(rawParent) : null) : current.parent_id;
        const rawOrder = data.display_order !== undefined ? data.display_order : data.displayOrder;
        const displayOrder = rawOrder !== undefined && rawOrder !== null ? Number(rawOrder) : current.display_order;
        const description = data.description !== undefined ? data.description : current.description;

        this.db.run(
            `UPDATE categories
             SET name = ?, category_code = ?, parent_id = ?, display_order = ?, description = ?
             WHERE id = ?`,
            [name, categoryCode, parentId, displayOrder, description, catId]
        );

        return this.getCategoryById(catId);
    }

    /**
     * Delete category (Safe Guard: blocks deletion if linked products exist)
     */
    deleteCategory(id) {
        const catId = Number(id);
        const linkedCount = this.db.get(
            'SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = 1',
            [catId]
        )?.count || 0;

        if (linkedCount > 0) {
            throw new Error(`لا يمكن حذف المجموعة لاحتوائها على (${linkedCount}) صنف مرتبط. يرجى نقل الأصناف أو حذفها أولاً.`);
        }

        this.db.run('UPDATE categories SET is_active = 0 WHERE id = ?', [catId]);
        return { success: true, id: catId };
    }

    /**
     * Delete product (soft delete)
     */
    deleteProduct(id, userId = null) {
        const prodId = Number(id);
        const current = this.getProductById(prodId);
        if (!current) throw new Error('الصنف غير موجود');

        this.db.run('UPDATE products SET is_active = 0 WHERE id = ?', [prodId]);

        if (userId) {
            this.db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values)
                 VALUES (?, 'DELETE_PRODUCT', 'products', ?, ?)`,
                [userId, String(prodId), JSON.stringify(current)]
            );
        }

        return { success: true, id: prodId };
    }

    /**
     * List stock adjustment vouchers
     */
    listStockAdjustments(limit = 100) {
        return this.db.all(
            `SELECT a.*, p.barcode, p.item_name, p.cost_price, p.sell_price, u.display_name as user_name, s.session_code
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
            `SELECT p.*, c.name as category_name, c.category_code as cat_code
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.id = ?`,
            [id]
        );
    }
}

module.exports = { InventoryService };
