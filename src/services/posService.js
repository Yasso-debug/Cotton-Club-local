/**
 * Cotton Club POS - POS & Sales Service
 * Core sales processing engine: barcode scanning, cart calculations,
 * discount limits (Cashier <= 5%), atomic stock deductions, and split payments.
 */

const { AuthService } = require('./authService');

class PosService {
    constructor(dbManager) {
        this.db = dbManager;
        this.authService = new AuthService(dbManager);
    }

    /**
     * Find product by exact barcode or ID
     */
    findProductByBarcode(barcode) {
        if (!barcode) return null;
        return this.db.get(
            `SELECT p.*, c.name as category_name
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.barcode = ? AND p.is_active = 1`,
            [barcode.trim()]
        );
    }

    /**
     * Search products by barcode or item name (instant search)
     */
    searchProducts(keyword, limit = 20) {
        if (!keyword || keyword.trim() === '') {
            return this.db.all(
                `SELECT p.*, c.name as category_name
                 FROM products p
                 LEFT JOIN categories c ON p.category_id = c.id
                 WHERE p.is_active = 1
                 ORDER BY p.item_name ASC LIMIT ?`,
                [limit]
            );
        }

        const query = `%${keyword.trim()}%`;
        return this.db.all(
            `SELECT p.*, c.name as category_name
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.is_active = 1 AND (p.barcode LIKE ? OR p.item_name LIKE ?)
             ORDER BY p.item_name ASC LIMIT ?`,
            [query, query, limit]
        );
    }

    /**
     * Generate unique sequential invoice number
     */
    generateInvoiceNumber() {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `INV-${today}-`;
        const countRow = this.db.get(
            "SELECT COUNT(*) as count FROM sales_invoices WHERE invoice_number LIKE ?",
            [`${prefix}%`]
        );
        const seq = String((countRow?.count || 0) + 1).padStart(4, '0');
        return `${prefix}${seq}`;
    }

    /**
     * Process & finalize checkout
     */
    checkout(saleData) {
        const {
            sessionId,
            userId,
            userRole,
            items,
            discountPercent = 0,
            discountAmount = 0,
            paymentMethod = 'cash',
            splitPayments = null, // e.g. { cash: 100, card: 50 }
            notes = '',
            managerOverride = null // { username, password } if discount > 5%
        } = saleData;

        // 1. Session check
        const session = this.db.get(
            "SELECT id, status FROM daily_sessions WHERE id = ? AND status = 'open'",
            [sessionId]
        );
        if (!session) {
            throw new Error('لا يمكن البيع: الوردية اليومية مغلقة أو غير موجودة');
        }

        // 2. Items check
        if (!items || items.length === 0) {
            throw new Error('سلة المشتريات فارغة');
        }

        // 3. Discount permission check
        const percent = Number(discountPercent) || 0;
        const maxCashierDiscountSetting = this.db.get(
            "SELECT value FROM app_settings WHERE key = 'cashier_max_discount_percent'"
        );
        const maxCashierDiscount = Number(maxCashierDiscountSetting?.value || 5);

        if (userRole === 'cashier' && percent > maxCashierDiscount) {
            if (!managerOverride || !managerOverride.username || !managerOverride.password) {
                throw new Error(
                    `الحد الأقصى للخصم المسموح به للكاشير هو ${maxCashierDiscount}%. يلزم تفويض المدير للخصم الأعلى.`
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
                    'SELECT id, barcode, item_name, cost_price, sell_price, current_stock, is_active FROM products WHERE id = ?',
                    [item.productId]
                );

                if (!product || product.is_active !== 1) {
                    throw new Error(`المنتج (${item.itemName || item.productId}) غير متوفر أو معطل`);
                }

                const qty = Number(item.quantity) || 1;
                if (qty <= 0) {
                    throw new Error(`كمية غير صالحة للمنتج: ${product.item_name}`);
                }

                const unitPrice = Number(product.sell_price);
                const lineTotal = Math.round(qty * unitPrice * 100) / 100;
                const costPrice = Number(product.cost_price);
                const lineProfit = Math.round((lineTotal - (qty * costPrice)) * 100) / 100;

                subtotal += lineTotal;
                totalCost += Math.round(qty * costPrice * 100) / 100;

                verifiedLineItems.push({
                    productId: product.id,
                    barcode: product.barcode,
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

            // Payment verification
            if (paymentMethod === 'split') {
                if (!splitPayments || typeof splitPayments !== 'object') {
                    throw new Error('يرجى تحديد مبالغ الدفع المجزأ (نقدي وشبكة)');
                }
                const splitCash = Number(splitPayments.cash) || 0;
                const splitCard = Number(splitPayments.card) || 0;
                const splitSum = Math.round((splitCash + splitCard) * 100) / 100;
                if (splitSum !== finalTotal) {
                    throw new Error(
                        `مجموع الدفع المجزأ (${splitSum}) لا يساوي إجمالي الفاتورة (${finalTotal})`
                    );
                }
            }

            // Create invoice
            const invoiceNumber = this.generateInvoiceNumber();
            const invoiceInsert = db.run(
                `INSERT INTO sales_invoices (
                    invoice_number, session_id, user_id, subtotal, discount_amount,
                    discount_percent, final_total, total_cost, payment_method, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
                [
                    invoiceNumber,
                    sessionId,
                    userId,
                    subtotal,
                    computedDiscountAmount,
                    percent,
                    finalTotal,
                    totalCost,
                    paymentMethod,
                    notes || null
                ]
            );

            const invoiceId = invoiceInsert.lastInsertRowid;

            // Insert line items & update stock
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

                // Deduct stock
                db.run(
                    'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
                    [line.quantity, line.productId]
                );
            }

            // Insert payment splits if split method
            if (paymentMethod === 'split') {
                if (Number(splitPayments.cash) > 0) {
                    db.run(
                        'INSERT INTO payment_splits (invoice_id, method, amount) VALUES (?, ?, ?)',
                        [invoiceId, 'cash', Number(splitPayments.cash)]
                    );
                }
                if (Number(splitPayments.card) > 0) {
                    db.run(
                        'INSERT INTO payment_splits (invoice_id, method, amount) VALUES (?, ?, ?)',
                        [invoiceId, 'card', Number(splitPayments.card)]
                    );
                }
            }

            // Audit
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'CREATE_SALE', 'sales_invoices', ?, ?)`,
                [userId, String(invoiceId), JSON.stringify({ invoiceNumber, finalTotal, paymentMethod })]
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

        // 1. Sales stats matching active filters
        const salesStats = this.db.get(
            `SELECT 
                COUNT(*) as total_invoices,
                COALESCE(SUM(si.final_total), 0) as total_sales
             FROM sales_invoices si
             ${invWhere} AND si.status = 'completed'`,
            invParams
        );

        // 2. Pieces stats matching active filters
        const piecesStats = this.db.get(
            `SELECT COALESCE(SUM(sli.quantity), 0) as total_pieces
             FROM sale_line_items sli
             JOIN sales_invoices si ON sli.invoice_id = si.id
             ${invWhere} AND si.status = 'completed'`,
            invParams
        );

        // 3. Expenses stats in date period
        const expenseStats = this.db.get(
            `SELECT 
                COALESCE(SUM(amount), 0) as total_expenses,
                COUNT(*) as expense_count
             FROM petty_expenses
             ${expWhere}`,
            expParams
        );

        // 4. Payment breakdown for date period
        const breakdownRows = this.db.all(
            `SELECT 
                si.payment_method,
                COUNT(*) as count,
                COALESCE(SUM(si.final_total), 0) as total
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
                si.created_at,
                si.final_total,
                si.subtotal,
                si.discount_amount,
                si.payment_method,
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
}

module.exports = { PosService };
