/**
 * Cotton Club POS - POS & Sales Service
 * Core sales processing engine: barcode scanning, cart calculations,
 * discount limits (Cashier <= 5%), atomic stock deductions, and split payments.
 */

const { AuthService } = require('./authService');
const { SessionService } = require('./sessionService');

class PosService {
    constructor(dbManager, sessionService = null) {
        this.db = dbManager;
        this.authService = new AuthService(dbManager);
        this.sessionService = sessionService || new SessionService(dbManager);
    }

    /**
     * Find product by exact barcode or ID
     */
    findProductByBarcode(barcode) {
        if (!barcode) return null;
        const clean = String(barcode).trim();
        const idNum = isNaN(Number(clean)) ? -1 : Number(clean);
        return this.db.get(
            `SELECT p.*, c.name as category_name
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE (p.barcode = ? OR p.product_code = ? OR p.id = ?) AND (p.is_active = 1 OR p.is_active IS NULL)`,
            [clean, clean, idNum]
        );
    }

    /**
     * Search products by barcode, product_code, item name, brand or category with live stock (instant search)
     */
    searchProducts(keyword, limit = 100, categoryId = null) {
        let sql = `
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE (p.is_active = 1 OR p.is_active IS NULL)
        `;
        const params = [];

        if (categoryId && categoryId !== 'all') {
            sql += ' AND p.category_id = ?';
            params.push(Number(categoryId));
        }

        if (keyword && String(keyword).trim() !== '') {
            const raw = String(keyword).trim();
            const query = `%${raw}%`;
            const normKeyword = raw
                .replace(/[أإآ]/g, 'ا')
                .replace(/ة/g, 'ه')
                .replace(/ى/g, 'ي')
                .replace(/[\u064B-\u065F]/g, '');
            const normQuery = `%${normKeyword}%`;

            const normItemSql = `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(p.item_name, ''), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ة', 'ه'), 'ى', 'ي')`;
            const normBrandSql = `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(p.brand, ''), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ة', 'ه'), 'ى', 'ي')`;
            const normCatSql = `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(c.name, ''), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ة', 'ه'), 'ى', 'ي')`;

            sql += ` AND (
                p.barcode LIKE ? OR 
                p.product_code LIKE ? OR 
                p.item_name LIKE ? OR 
                p.brand LIKE ? OR 
                c.name LIKE ? OR 
                ${normItemSql} LIKE ? OR 
                ${normBrandSql} LIKE ? OR 
                ${normCatSql} LIKE ?
            )`;
            params.push(query, query, query, query, query, normQuery, normQuery, normQuery);
        }

        sql += ' ORDER BY p.current_stock DESC, p.item_name ASC LIMIT ?';
        params.push(Number(limit) || 100);

        return this.db.all(sql, params);
    }

    /**
     * Search customers by ID, name, or phone (strictly unique)
     */
    searchCustomers(keyword, limit = 20) {
        if (!keyword || keyword.trim() === '') {
            return this.db.all(
                `SELECT *, 'CUST-' || printf('%04d', id) as customer_code 
                 FROM customers 
                 ORDER BY total_spent DESC, id DESC LIMIT ?`,
                [limit]
            );
        }
        const trimmed = keyword.trim();
        // Check if keyword is numeric ID or CUST-XXXX
        let idSearch = null;
        const custMatch = trimmed.match(/^CUST-(\d+)$/i);
        if (custMatch) {
            idSearch = parseInt(custMatch[1], 10);
        } else if (/^\d+$/.test(trimmed) && trimmed.length <= 6) {
            idSearch = parseInt(trimmed, 10);
        }

        const query = `%${trimmed}%`;
        if (idSearch !== null) {
            return this.db.all(
                `SELECT *, 'CUST-' || printf('%04d', id) as customer_code 
                 FROM customers 
                 WHERE id = ? OR name LIKE ? OR phone LIKE ? 
                 ORDER BY (id = ?) DESC, total_spent DESC, id DESC LIMIT ?`,
                [idSearch, query, query, idSearch, limit]
            );
        }

        return this.db.all(
            `SELECT *, 'CUST-' || printf('%04d', id) as customer_code 
             FROM customers 
             WHERE name LIKE ? OR phone LIKE ? 
             ORDER BY total_spent DESC, id DESC LIMIT ?`,
            [query, query, limit]
        );
    }

    /**
     * Quick register customer during POS checkout
     */
    quickCreateCustomer(data) {
        return this.createCustomer(data);
    }

    /**
     * Complete customer listing with aggregate stats and filters
     */
    listCustomers({ query = '', sortBy = 'spent_desc', limit = 200, offset = 0 } = {}) {
        let sql = `
            SELECT 
                c.id,
                c.name,
                c.phone,
                c.email,
                c.points,
                c.total_spent,
                c.notes,
                c.created_at,
                COUNT(si.id) as invoices_count,
                MAX(si.created_at) as last_invoice_date
            FROM customers c
            LEFT JOIN sales_invoices si ON si.customer_id = c.id AND si.status = 'completed'
        `;
        const params = [];

        if (query && query.trim() !== '') {
            const q = `%${query.trim()}%`;
            sql += ` WHERE (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.notes LIKE ?) `;
            params.push(q, q, q, q);
        }

        sql += ` GROUP BY c.id `;

        if (sortBy === 'spent_desc') {
            sql += ` ORDER BY c.total_spent DESC, c.id DESC `;
        } else if (sortBy === 'spent_asc') {
            sql += ` ORDER BY c.total_spent ASC, c.id DESC `;
        } else if (sortBy === 'name_asc') {
            sql += ` ORDER BY c.name ASC `;
        } else if (sortBy === 'newest') {
            sql += ` ORDER BY c.id DESC `;
        } else if (sortBy === 'invoices_desc') {
            sql += ` ORDER BY invoices_count DESC, c.id DESC `;
        } else {
            sql += ` ORDER BY c.total_spent DESC, c.id DESC `;
        }

        sql += ` LIMIT ? OFFSET ? `;
        params.push(Number(limit) || 200, Number(offset) || 0);

        return this.db.all(sql, params);
    }

    /**
     * Summary KPIs for Customers Directory
     */
    getCustomerStats() {
        const stats = this.db.get(`
            SELECT 
                COUNT(*) as total_customers,
                COALESCE(SUM(total_spent), 0) as total_spent,
                COALESCE(AVG(total_spent), 0) as avg_spent
            FROM customers
        `) || { total_customers: 0, total_spent: 0, avg_spent: 0 };

        const activeWithInvoices = this.db.get(`
            SELECT COUNT(DISTINCT customer_id) as count 
            FROM sales_invoices 
            WHERE customer_id IS NOT NULL AND status = 'completed'
        `);

        return {
            totalCustomers: stats.total_customers || 0,
            totalSpent: stats.total_spent || 0,
            avgSpent: stats.avg_spent || 0,
            customersWithInvoices: activeWithInvoices?.count || 0
        };
    }

    /**
     * Create new customer with strict uniqueness checks (phone and name)
     * Returns existing customer record if already registered to guarantee uniqueness.
     */
    createCustomer(data) {
        const { name, phone, email, notes } = data || {};
        if (!name || !name.trim()) {
            throw new Error('اسم العميل مطلوب');
        }
        const cleanName = name.trim();
        const cleanPhone = phone && phone.trim() ? phone.trim() : null;

        // 1. Check uniqueness by phone
        if (cleanPhone) {
            const existingByPhone = this.db.get('SELECT * FROM customers WHERE phone = ?', [cleanPhone]);
            if (existingByPhone) {
                return existingByPhone;
            }
        }

        // 2. Check uniqueness by name (case-insensitive & trimmed)
        const existingByName = this.db.get('SELECT * FROM customers WHERE LOWER(TRIM(name)) = LOWER(?)', [cleanName]);
        if (existingByName) {
            if (cleanPhone && !existingByName.phone) {
                this.db.run('UPDATE customers SET phone = ? WHERE id = ?', [cleanPhone, existingByName.id]);
                existingByName.phone = cleanPhone;
            }
            return existingByName;
        }

        const res = this.db.run(
            `INSERT INTO customers (name, phone, email, notes) VALUES (?, ?, ?, ?)`,
            [cleanName, cleanPhone, email ? email.trim() : null, notes ? notes.trim() : null]
        );
        return this.db.get("SELECT *, 'CUST-' || printf('%04d', id) as customer_code FROM customers WHERE id = ?", [res.lastInsertRowid]);
    }

    /**
     * Update customer details
     */
    updateCustomer(id, data) {
        if (!id) throw new Error('معرف العميل غير صالح');
        const existing = this.db.get('SELECT * FROM customers WHERE id = ?', [id]);
        if (!existing) throw new Error('العميل غير موجود');

        const { name, phone, email, notes, points } = data || {};
        if (!name || !name.trim()) throw new Error('اسم العميل مطلوب');

        const cleanPhone = phone && phone.trim() ? phone.trim() : null;
        if (cleanPhone) {
            const duplicate = this.db.get('SELECT * FROM customers WHERE phone = ? AND id != ?', [cleanPhone, id]);
            if (duplicate) throw new Error('رقم الهاتف مستخدم بالفعل لعميل آخر');
        }

        this.db.run(
            `UPDATE customers 
             SET name = ?, phone = ?, email = ?, notes = ?, points = COALESCE(?, points) 
             WHERE id = ?`,
            [
                name.trim(),
                cleanPhone,
                email ? email.trim() : null,
                notes ? notes.trim() : null,
                points !== undefined ? Number(points) : existing.points,
                id
            ]
        );
        return this.db.get('SELECT * FROM customers WHERE id = ?', [id]);
    }

    /**
     * Delete customer safely
     */
    deleteCustomer(id) {
        if (!id) throw new Error('معرف العميل غير صالح');
        // Unlink from invoices instead of cascading delete
        this.db.run('UPDATE sales_invoices SET customer_id = NULL WHERE customer_id = ?', [id]);
        return this.db.run('DELETE FROM customers WHERE id = ?', [id]);
    }

    /**
     * Fetch invoices history for a single customer
     */
    getCustomerInvoices(customerId, limit = 50) {
        if (!customerId) return [];
        return this.db.all(
            `SELECT 
                si.id,
                si.invoice_number,
                si.invoice_type,
                si.final_total,
                si.payment_method,
                si.status,
                si.created_at,
                u.display_name as cashier_name
             FROM sales_invoices si
             LEFT JOIN users u ON u.id = si.user_id
             WHERE si.customer_id = ?
             ORDER BY si.id DESC
             LIMIT ?`,
            [customerId, limit]
        );
    }

    /**
     * Get real-time cash drawer balance for shift
     */
    getDrawerCash(sessionId) {
        return this.sessionService.getCurrentDrawerCash(sessionId);
    }

    /**
     * Generate unique sequential invoice number that continuously increments across days
     */
    generateInvoiceNumber(type = 'sale') {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = type === 'return' ? `RET-${today}-` : `INV-${today}-`;
        
        let nextNum = 1;
        
        // Find the most recent invoice of this type to continue the sequence seamlessly across days
        const lastRow = this.db.get(
            "SELECT invoice_number FROM sales_invoices WHERE invoice_type = ? ORDER BY id DESC LIMIT 1",
            [type]
        );
        
        if (lastRow?.invoice_number) {
            const parts = String(lastRow.invoice_number).split('-');
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSeq) && lastSeq > 0) {
                nextNum = lastSeq + 1;
            }
        }
        
        // Build candidate and guarantee uniqueness against any existing record
        let candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
        while (this.db.get("SELECT id FROM sales_invoices WHERE invoice_number = ?", [candidate])) {
            nextNum++;
            candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
        }
        
        return candidate;
    }

    /**
     * Get next upcoming sequential invoice number for preview
     */
    getNextInvoiceNumber(type = 'sale') {
        return this.generateInvoiceNumber(type);
    }

    /**
     * Process & finalize checkout (Sale or Return)
     */
    checkout(saleData) {
        const {
            sessionId,
            userId,
            userRole,
            invoiceType = 'sale', // 'sale' | 'return'
            customerId = null,
            customerName = null,
            customerPhone = null,
            items,
            discountPercent = 0,
            discountAmount = 0,
            paymentMethod = 'cash', // 'cash' | 'card' | 'transfer' | 'split'
            splitPayments = null,   // { cash: X, card: Y, transfer: Z }
            notes = '',
            managerOverride = null  // { username, password }
        } = saleData;

        // 1. Session check - seamless continuous session support
        let activeSession = null;
        if (sessionId) {
            activeSession = this.db.get(
                "SELECT id, status FROM daily_sessions WHERE id = ? AND status = 'open'",
                [sessionId]
            );
        }
        if (!activeSession) {
            activeSession = this.sessionService.ensureActiveSession(userId);
        }
        const effectiveSessionId = activeSession ? activeSession.id : sessionId;

        // 2. Items check
        if (!items || items.length === 0) {
            throw new Error('سلة المنتجات فارغة');
        }

        // 3. Customer requirements check if configured in system settings
        if (invoiceType === 'sale') {
            const reqName = this.db.get("SELECT value FROM app_settings WHERE key = 'require_customer_name'")?.value === '1';
            const reqPhone = this.db.get("SELECT value FROM app_settings WHERE key = 'require_customer_phone'")?.value === '1';
            if (reqName && (!customerName || !customerName.trim())) {
                throw new Error('إدخال اسم العميل إلزامي لإتمام الفاتورة (حسب سياسة النظام)');
            }
            if (reqPhone && (!customerPhone || !customerPhone.trim())) {
                throw new Error('إدخال رقم هاتف العميل إلزامي لإتمام الفاتورة (حسب سياسة النظام)');
            }
        }

        // 4. Return and Discount permissions check for cashiers
        if (invoiceType === 'return' && userRole === 'cashier') {
            const allowReturns = this.db.get("SELECT value FROM app_settings WHERE key = 'allow_salesperson_returns'")?.value;
            if (allowReturns === '0' && (!managerOverride || !managerOverride.username || !managerOverride.password)) {
                throw new Error('إجراء المرتجعات قاصر على المشرفين وفق سياسة النظام. يلزم تفويض المشرف.');
            }
        }

        const percent = Number(discountPercent) || 0;
        if (userRole === 'cashier' && percent > 0) {
            const allowDiscount = this.db.get("SELECT value FROM app_settings WHERE key = 'allow_salesperson_discount'")?.value;
            if (allowDiscount === '0' && (!managerOverride || !managerOverride.username || !managerOverride.password)) {
                throw new Error('منح الخصم المباشر مقفل لحسابات البائعين وفق سياسة النظام. يلزم تفويض المشرف.');
            }
        }

        // 5. Discount ceiling check (Cashier default <= 5%)
        const maxCashierDiscountSetting = this.db.get(
            "SELECT value FROM app_settings WHERE key = 'cashier_max_discount_percent'"
        );
        const maxCashierDiscount = Number(maxCashierDiscountSetting?.value || 5);

        if (userRole === 'cashier' && percent > maxCashierDiscount) {
            if (!managerOverride || !managerOverride.username || !managerOverride.password) {
                throw new Error(
                    `الحد الأقصى للخصم المسموح به للكاشير هو ${maxCashierDiscount}%. يلزم إدخال بيانات تفويض المدير لاعتماد نسبة أعلى.`
                );
            }
            const authCheck = this.authService.verifyManagerOverride(
                managerOverride.username,
                managerOverride.password
            );
            if (!authCheck.success) {
                throw new Error(`فشل تفويض المدير: ${authCheck.message}`);
            }
        }

        // Run entire checkout in single atomic transaction
        return this.db.transaction((db) => {
            let subtotal = 0;
            let totalCost = 0;
            const verifiedLineItems = [];

            // Verify each item and current stock
            for (const item of items) {
                const product = db.get(
                    'SELECT id, barcode, product_code, item_name, cost_price, sell_price, current_stock, is_active FROM products WHERE id = ?',
                    [item.productId]
                );

                if (!product || product.is_active !== 1) {
                    throw new Error(`المنتج (${item.itemName || item.productId}) غير متوفر أو معطل`);
                }

                const qty = Number(item.quantity) || 1;
                if (qty <= 0) {
                    throw new Error(`كمية غير صالحة للمنتج: ${product.item_name}`);
                }

                // In Sale mode: Strict positive stock check (prevent negative inventory)
                if (invoiceType === 'sale') {
                    if (product.current_stock <= 0) {
                        throw new Error(`الصنف (${product.item_name}) رصيده صفر ولا يمكن بيعه.`);
                    }
                    if (product.current_stock < qty) {
                        throw new Error(
                            `الكمية المطلوبة (${qty}) غير متوفرة في المخزن للصنف (${product.item_name}). الرصيد المتاح حالياً: ${product.current_stock}`
                        );
                    }
                }

                const unitPrice = Number(item.unitPrice !== undefined ? item.unitPrice : product.sell_price);
                const lineTotal = Math.round(qty * unitPrice * 100) / 100;
                const costPrice = Number(product.cost_price);
                const lineProfit = Math.round((lineTotal - (qty * costPrice)) * 100) / 100;

                subtotal += lineTotal;
                totalCost += Math.round(qty * costPrice * 100) / 100;

                verifiedLineItems.push({
                    productId: product.id,
                    barcode: product.barcode || product.product_code || String(product.id),
                    itemName: product.item_name,
                    quantity: qty,
                    unitPrice,
                    costPrice,
                    lineTotal,
                    lineProfit,
                    currentStock: product.current_stock
                });
            }

            subtotal = Math.round(subtotal * 100) / 100;

            // Calculate final discount and total
            let computedDiscountAmount = Number(discountAmount) || 0;
            if (percent > 0) {
                computedDiscountAmount = Math.round((subtotal * (percent / 100)) * 100) / 100;
            }
            const finalTotal = Math.max(0, Math.round((subtotal - computedDiscountAmount) * 100) / 100);

            // 5. Payment calculations & 3-way tender verification (exact match)
            let cashAmount = 0;
            let cardAmount = 0;
            let transferAmount = 0;

            if (paymentMethod === 'cash') {
                cashAmount = finalTotal;
            } else if (paymentMethod === 'card') {
                cardAmount = finalTotal;
            } else if (paymentMethod === 'transfer') {
                transferAmount = finalTotal;
            } else if (paymentMethod === 'split') {
                if (!splitPayments || typeof splitPayments !== 'object') {
                    throw new Error('يرجى تحديد تفاصيل الدفع المجزأ (نقدي، شبكة، تحويل)');
                }
                cashAmount = Math.round((Number(splitPayments.cash) || 0) * 100) / 100;
                cardAmount = Math.round((Number(splitPayments.card) || 0) * 100) / 100;
                transferAmount = Math.round((Number(splitPayments.transfer) || 0) * 100) / 100;

                const splitSum = Math.round((cashAmount + cardAmount + transferAmount) * 100) / 100;
                if (Math.abs(splitSum - finalTotal) > 0.009) {
                    throw new Error(
                        `مجموع المبالغ المدفوعة (${splitSum.toFixed(2)} ج.م) لا يطابق إجمالي الفاتورة المطلوبة (${finalTotal.toFixed(2)} ج.م) بدقة القرش.`
                    );
                }
            } else {
                throw new Error(`طريقة دفع غير صحيحة: ${paymentMethod}`);
            }

            // 6. Cash Drawer Safety check in Return mode
            if (invoiceType === 'return' && cashAmount > 0) {
                const currentDrawerCash = this.sessionService.getCurrentDrawerCash(effectiveSessionId);
                if (cashAmount > currentDrawerCash) {
                    throw new Error(
                        `لا يتوفر رصيد نقدي كافٍ في الخزينة لصرف المرتجع. الرصيد النقدي المتاح في الدرج: ${currentDrawerCash.toFixed(2)} ج.م، بينما المطلوب صرفه: ${cashAmount.toFixed(2)} ج.م.`
                    );
                }
            }

            // 6.5 Automatic Customer Directory Synchronization (Strict Uniqueness: Never Duplicate)
            let effectiveCustomerId = customerId ? Number(customerId) : null;
            const cleanName = customerName && String(customerName).trim() ? String(customerName).trim() : null;
            const cleanPhone = customerPhone && String(customerPhone).trim() ? String(customerPhone).trim() : null;

            if (cleanPhone || cleanName || effectiveCustomerId) {
                let existingCustomer = null;
                if (effectiveCustomerId) {
                    existingCustomer = db.get('SELECT * FROM customers WHERE id = ?', [effectiveCustomerId]);
                }
                if (!existingCustomer && cleanPhone) {
                    existingCustomer = db.get('SELECT * FROM customers WHERE phone = ?', [cleanPhone]);
                }
                if (!existingCustomer && cleanName) {
                    existingCustomer = db.get('SELECT * FROM customers WHERE LOWER(TRIM(name)) = LOWER(?)', [cleanName]);
                }

                const spentDelta = invoiceType === 'sale' ? finalTotal : -finalTotal;
                const pointsDelta = invoiceType === 'sale' ? Math.floor(finalTotal / 10) : 0;

                if (existingCustomer) {
                    effectiveCustomerId = existingCustomer.id;
                    db.run(
                        `UPDATE customers 
                         SET total_spent = MAX(0, total_spent + ?),
                             points = MAX(0, points + ?),
                             name = COALESCE(NULLIF(?, ''), name),
                             phone = COALESCE(phone, ?)
                         WHERE id = ?`,
                        [spentDelta, pointsDelta, cleanName || '', cleanPhone || null, existingCustomer.id]
                    );
                } else if (cleanName || cleanPhone) {
                    const insCust = db.run(
                        `INSERT INTO customers (name, phone, points, total_spent, notes) 
                         VALUES (?, ?, ?, ?, ?)`,
                        [
                            cleanName || (cleanPhone ? `عميل (${cleanPhone})` : 'عميل نقدي'),
                            cleanPhone,
                            Math.max(0, pointsDelta),
                            Math.max(0, spentDelta),
                            'تم التسجيل تلقائياً من نقطة البيع'
                        ]
                    );
                    effectiveCustomerId = insCust.lastInsertRowid;
                }
            }

            // 7. Create invoice
            const invoiceNumber = this.generateInvoiceNumber(invoiceType);
            const savedCustName = cleanName || (effectiveCustomerId ? db.get('SELECT name FROM customers WHERE id = ?', [effectiveCustomerId])?.name : null);
            const savedCustPhone = cleanPhone || (effectiveCustomerId ? db.get('SELECT phone FROM customers WHERE id = ?', [effectiveCustomerId])?.phone : null);

            const invoiceInsert = db.run(
                `INSERT INTO sales_invoices (
                    invoice_number, invoice_type, session_id, user_id, customer_id,
                    customer_name, customer_phone, subtotal, discount_amount,
                    discount_percent, final_total, cash_amount, card_amount, transfer_amount,
                    total_cost, payment_method, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
                [
                    invoiceNumber,
                    invoiceType,
                    effectiveSessionId,
                    userId,
                    effectiveCustomerId || null,
                    savedCustName || null,
                    savedCustPhone || null,
                    subtotal,
                    computedDiscountAmount,
                    percent,
                    finalTotal,
                    cashAmount,
                    cardAmount,
                    transferAmount,
                    totalCost,
                    paymentMethod,
                    notes || null
                ]
            );

            const invoiceId = invoiceInsert.lastInsertRowid;

            // 8. Insert line items & update stock
            for (const line of verifiedLineItems) {
                db.run(
                    `INSERT INTO sale_line_items (
                        invoice_id, product_id, barcode, item_name, quantity,
                        unit_price, cost_price_snapshot, line_total, line_profit
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        invoiceId,
                        line.productId,
                        line.barcode,
                        line.itemName,
                        line.quantity,
                        line.unitPrice,
                        line.costPrice,
                        line.lineTotal,
                        line.lineProfit
                    ]
                );

                // Update stock based on Sale (-) or Return (+)
                const stockBefore = line.currentStock;
                let stockAfter = stockBefore;
                let movementType = 'sale_out';

                if (invoiceType === 'return') {
                    stockAfter = stockBefore + line.quantity;
                    movementType = 'return_in';
                    db.run(
                        "UPDATE products SET current_stock = current_stock + ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
                        [line.quantity, line.productId]
                    );
                } else {
                    stockAfter = stockBefore - line.quantity;
                    movementType = 'sale_out';
                    db.run(
                        "UPDATE products SET current_stock = current_stock - ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
                        [line.quantity, line.productId]
                    );
                }

                // Log movement into inventory_movements
                db.run(
                    `INSERT INTO inventory_movements (
                        product_id, movement_type, quantity, stock_before, stock_after,
                        unit_cost, reference_type, reference_id, reference_number,
                        session_id, user_id, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, 'sales_invoices', ?, ?, ?, ?, ?)`,
                    [
                        line.productId,
                        movementType,
                        line.quantity,
                        stockBefore,
                        stockAfter,
                        line.costPrice,
                        invoiceId,
                        invoiceNumber,
                        effectiveSessionId,
                        userId,
                        invoiceType === 'return' ? `مرتجع مبيعات فاتورة ${invoiceNumber}` : `فاتورة مبيعات ${invoiceNumber}`
                    ]
                );
            }

            // 9. Payment splits record
            if (paymentMethod === 'split') {
                if (cashAmount > 0) {
                    db.run("INSERT INTO payment_splits (invoice_id, method, amount) VALUES (?, 'cash', ?)", [invoiceId, cashAmount]);
                }
                if (cardAmount > 0) {
                    db.run("INSERT INTO payment_splits (invoice_id, method, amount) VALUES (?, 'card', ?)", [invoiceId, cardAmount]);
                }
                if (transferAmount > 0) {
                    db.run("INSERT INTO payment_splits (invoice_id, method, amount) VALUES (?, 'transfer', ?)", [invoiceId, transferAmount]);
                }
            }

            // 10. Customer points & total spent update if attached
            if (customerId) {
                if (invoiceType === 'return') {
                    const pointsToDeduct = Math.floor(finalTotal / 10);
                    db.run(
                        `UPDATE customers 
                         SET total_spent = MAX(0, total_spent - ?), 
                             points = MAX(0, points - ?)
                         WHERE id = ?`,
                        [finalTotal, pointsToDeduct, customerId]
                    );
                } else {
                    const pointsToAdd = Math.floor(finalTotal / 10);
                    db.run(
                        `UPDATE customers 
                         SET total_spent = total_spent + ?, 
                             points = points + ?
                         WHERE id = ?`,
                        [finalTotal, pointsToAdd, customerId]
                    );
                }
            }

            // 11. Audit log
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, ?, 'sales_invoices', ?, ?)`,
                [
                    userId,
                    invoiceType === 'return' ? 'CREATE_RETURN' : 'CREATE_SALE',
                    String(invoiceId),
                    JSON.stringify({ invoiceNumber, invoiceType, finalTotal, paymentMethod, cashAmount, cardAmount, transferAmount })
                ]
            );

            return this.getInvoiceById(invoiceId);
        });
    }

    /**
     * Get complete invoice with line items
     */
    getInvoiceById(id) {
        const invoice = this.db.get(
            `SELECT si.*, u.display_name as cashier_name, ds.session_code
             FROM sales_invoices si
             JOIN users u ON si.user_id = u.id
             JOIN daily_sessions ds ON si.session_id = ds.id
             WHERE si.id = ?`,
            [id]
        );

        if (!invoice) return null;

        const lineItems = this.db.all(
            'SELECT * FROM sale_line_items WHERE invoice_id = ? ORDER BY id ASC',
            [id]
        );

        const splits = this.db.all(
            'SELECT * FROM payment_splits WHERE invoice_id = ?',
            [id]
        );

        return {
            ...invoice,
            lineItems,
            splits
        };
    }

    /**
     * Void / cancel an invoice (Manager only)
     * Reverses inventory deductions
     */
    voidInvoice(invoiceId, managerUserId, reason) {
        return this.db.transaction((db) => {
            const invoice = this.getInvoiceById(invoiceId);
            if (!invoice) {
                throw new Error('الفاتورة غير موجودة');
            }
            if (invoice.status === 'voided') {
                throw new Error('هذه الفاتورة ملغاة بالفعل');
            }

            // Reverse inventory
            for (const item of invoice.lineItems) {
                db.run(
                    'UPDATE products SET current_stock = current_stock + ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }

            // Mark invoice voided
            db.run(
                `UPDATE sales_invoices 
                 SET status = 'voided', notes = COALESCE(notes || ' | ', '') || ?
                 WHERE id = ?`,
                [`ملغاة بواسطة المدير: ${reason || 'لا يوجد سبب'}`, invoiceId]
            );

            // Audit
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'VOID_INVOICE', 'sales_invoices', ?, ?)`,
                [managerUserId, String(invoiceId), JSON.stringify({ reason })]
            );

            return true;
        });
    }

    /**
     * List recent invoices
     */
    listRecentInvoices(limit = 50) {
        return this.db.all(
            `SELECT si.*, u.display_name as cashier_name
             FROM sales_invoices si
             JOIN users u ON si.user_id = u.id
             ORDER BY si.id DESC LIMIT ?`,
            [limit]
        );
    }

    /**
     * Get Invoices Log Dashboard with Executive KPIs, Payment Breakdown, and Filtered Invoices List
     */
    getInvoicesLogDashboard(filters = {}) {
        const { startDate, endDate, paymentMethod, cashierId, searchQuery, limit = 100 } = filters;

        // Build base WHERE clauses for invoices (honors all filters: dates, paymentMethod, cashierId, searchQuery)
        let invWhere = 'WHERE 1=1';
        const invParams = [];

        // Base date WHERE clauses (for period-level summary & breakdown)
        let dateWhere = 'WHERE 1=1';
        const dateParams = [];

        let expWhere = 'WHERE 1=1';
        const expParams = [];

        if (startDate && endDate) {
            invWhere += ' AND date(si.created_at) >= date(?) AND date(si.created_at) <= date(?)';
            invParams.push(startDate, endDate);

            dateWhere += ' AND date(si.created_at) >= date(?) AND date(si.created_at) <= date(?)';
            dateParams.push(startDate, endDate);

            expWhere += ' AND date(created_at) >= date(?) AND date(created_at) <= date(?)';
            expParams.push(startDate, endDate);
        } else if (startDate) {
            invWhere += ' AND date(si.created_at) >= date(?)';
            invParams.push(startDate);

            dateWhere += ' AND date(si.created_at) >= date(?)';
            dateParams.push(startDate);

            expWhere += ' AND date(created_at) >= date(?)';
            expParams.push(startDate);
        } else if (endDate) {
            invWhere += ' AND date(si.created_at) <= date(?)';
            invParams.push(endDate);

            dateWhere += ' AND date(si.created_at) <= date(?)';
            dateParams.push(endDate);

            expWhere += ' AND date(created_at) <= date(?)';
            expParams.push(endDate);
        }

        if (paymentMethod && paymentMethod !== 'all') {
            invWhere += ' AND si.payment_method = ?';
            invParams.push(paymentMethod);
        }

        if (cashierId) {
            invWhere += ' AND si.user_id = ?';
            invParams.push(cashierId);
        }

        if (searchQuery && searchQuery.trim()) {
            invWhere += ' AND (si.invoice_number LIKE ? OR si.notes LIKE ?)';
            const q = `%${searchQuery.trim()}%`;
            invParams.push(q, q);
        }

        // 1. Sales stats matching active filters (Sales minus Returns)
        const salesStats = this.db.get(
            `SELECT 
                COUNT(*) as total_invoices,
                COALESCE(SUM(CASE WHEN si.invoice_type = 'return' THEN -si.final_total ELSE si.final_total END), 0) as total_sales
             FROM sales_invoices si
             ${invWhere} AND si.status = 'completed'`,
            invParams
        );

        // 2. Pieces stats matching active filters (Pieces sold minus returned)
        const piecesStats = this.db.get(
            `SELECT COALESCE(SUM(CASE WHEN si.invoice_type = 'return' THEN -sli.quantity ELSE sli.quantity END), 0) as total_pieces
             FROM sale_line_items sli
             JOIN sales_invoices si ON sli.invoice_id = si.id
             ${invWhere} AND si.status = 'completed'`,
            invParams
        );

        // 3. Expenses stats in date period (net of returned expenses)
        const expenseStats = this.db.get(
            `SELECT 
                COALESCE(SUM(CASE WHEN operational_type = 'returned_expense' THEN -amount ELSE amount END), 0) as total_expenses,
                COUNT(*) as expense_count
             FROM petty_expenses
             ${expWhere}`,
            expParams
        );

        // 4. Payment breakdown for date period (net of returns)
        const breakdownRows = this.db.all(
            `SELECT 
                si.payment_method,
                COUNT(*) as count,
                COALESCE(SUM(CASE WHEN si.invoice_type = 'return' THEN -si.final_total ELSE si.final_total END), 0) as total
             FROM sales_invoices si
             ${dateWhere} AND si.status = 'completed'
             GROUP BY si.payment_method`,
            dateParams
        );

        const breakdownMap = { cash: { total: 0, count: 0 }, card: { total: 0, count: 0 }, split: { total: 0, count: 0 } };
        (breakdownRows || []).forEach(r => {
            if (breakdownMap[r.payment_method]) {
                breakdownMap[r.payment_method] = { total: r.total || 0, count: r.count || 0 };
            }
        });

        const totalSales = salesStats?.total_sales || 0;
        const totalExpenses = expenseStats?.total_expenses || 0;
        const netRemaining = Math.max(0, totalSales - totalExpenses);
        const totalInvoices = salesStats?.total_invoices || 0;
        const totalPieces = piecesStats?.total_pieces || 0;

        const cashTotal = breakdownMap.cash.total;
        const cardTotal = breakdownMap.card.total;
        const splitTotal = breakdownMap.split.total;
        const allTendersSum = cashTotal + cardTotal + splitTotal;

        const cashPercent = allTendersSum > 0 ? Math.round((cashTotal / allTendersSum) * 100) : 0;
        const cardPercent = allTendersSum > 0 ? Math.round((cardTotal / allTendersSum) * 100) : 0;
        const splitPercent = allTendersSum > 0 ? Math.max(0, 100 - cashPercent - cardPercent) : 0;

        // 5. Invoices List with active filters
        const listParams = [...invParams, limit];
        const invoices = this.db.all(
            `SELECT 
                si.id,
                si.invoice_number,
                si.invoice_type,
                si.created_at,
                si.final_total,
                si.subtotal,
                si.discount_amount,
                si.payment_method,
                si.cash_amount,
                si.card_amount,
                si.transfer_amount,
                si.customer_name,
                si.customer_phone,
                si.status,
                si.notes,
                u.display_name as cashier_name,
                ds.session_code,
                COALESCE(items_stat.items_count, 0) as items_count,
                COALESCE(items_stat.total_pieces, 0) as total_pieces
             FROM sales_invoices si
             JOIN users u ON si.user_id = u.id
             LEFT JOIN daily_sessions ds ON si.session_id = ds.id
             LEFT JOIN (
                 SELECT invoice_id, COUNT(*) as items_count, SUM(quantity) as total_pieces
                 FROM sale_line_items
                 GROUP BY invoice_id
             ) items_stat ON items_stat.invoice_id = si.id
             ${invWhere}
             ORDER BY si.id DESC LIMIT ?`,
            listParams
        );

        return {
            summary: {
                totalSales,
                totalExpenses,
                netRemaining,
                totalInvoices,
                totalPieces,
                expenseCount: expenseStats?.expense_count || 0
            },
            breakdown: {
                cash: {
                    total: cashTotal,
                    count: breakdownMap.cash.count,
                    percent: cashPercent
                },
                card: {
                    total: cardTotal,
                    count: breakdownMap.card.count,
                    percent: cardPercent
                },
                split: {
                    total: splitTotal,
                    count: breakdownMap.split.count,
                    percent: splitPercent
                }
            },
            invoices: invoices || []
        };
    }

    /**
     * Search products by category and optional keyword
     */
    searchProductsByCategory(categoryId = null, keyword = '', limit = 100) {
        const conditions = ['p.is_active = 1'];
        const params = [];

        if (categoryId && categoryId !== 'all') {
            conditions.push('p.category_id = ?');
            params.push(categoryId);
        }

        if (keyword && keyword.trim() !== '') {
            const query = `%${keyword.trim()}%`;
            conditions.push('(p.barcode LIKE ? OR p.product_code LIKE ? OR p.item_name LIKE ? OR p.brand LIKE ?)');
            params.push(query, query, query, query);
        }

        params.push(limit);
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        return this.db.all(
            `SELECT p.*, c.name as category_name
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             ${whereClause}
             ORDER BY p.item_name ASC LIMIT ?`,
            params
        );
    }

    /**
     * List inventory movements for auditing & tracking
     */
    listInventoryMovements(productId = null, limit = 50) {
        if (productId) {
            return this.db.all(
                `SELECT im.*, p.item_name, p.barcode, u.display_name as user_name
                 FROM inventory_movements im
                 JOIN products p ON im.product_id = p.id
                 JOIN users u ON im.user_id = u.id
                 WHERE im.product_id = ?
                 ORDER BY im.id DESC LIMIT ?`,
                [productId, limit]
            );
        }
        return this.db.all(
            `SELECT im.*, p.item_name, p.barcode, u.display_name as user_name
             FROM inventory_movements im
             JOIN products p ON im.product_id = p.id
             JOIN users u ON im.user_id = u.id
             ORDER BY im.id DESC LIMIT ?`,
            [limit]
        );
    }
}

module.exports = { PosService };
