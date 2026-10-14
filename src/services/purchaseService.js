/**
 * Cotton Club POS - Purchases & Suppliers Service
 * Manages vendor accounts, dual-view master directory & KPIs,
 * strict 5-field profile standards, split payments with solvency checks,
 * and running chronological account ledgers.
 */

const { TreasuryService } = require('./treasuryService');

class PurchaseService {
    constructor(dbManager, treasuryService = null) {
        this.db = dbManager;
        this.treasuryService = treasuryService || new TreasuryService(dbManager);
    }

    /**
     * Get Executive Financial KPIs for Master Suppliers View
     */
    getSuppliersOverview() {
        const row = this.db.get(`
            SELECT 
                COUNT(*) as total_suppliers,
                COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) as total_payables,
                COUNT(CASE WHEN balance > 0 THEN 1 END) as due_suppliers_count,
                COUNT(CASE WHEN ROUND(balance, 2) = 0.00 THEN 1 END) as settled_accounts_count
            FROM suppliers
            WHERE is_active = 1
        `);

        return {
            totalSuppliers: row?.total_suppliers || 0,
            totalPayables: Math.round((row?.total_payables || 0) * 100) / 100,
            dueSuppliersCount: row?.due_suppliers_count || 0,
            settledAccountsCount: row?.settled_accounts_count || 0
        };
    }

    /**
     * List suppliers with flexible filtering
     */
    listSuppliers(filters = {}) {
        let sql = 'SELECT * FROM suppliers WHERE is_active = 1';
        const params = [];

        const search = (filters.query || filters.search || '').trim();
        if (search) {
            sql += ' AND (name LIKE ? OR supplier_code LIKE ? OR phone LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        const balanceFilter = filters.balanceFilter || 'all';
        if (balanceFilter === 'due') {
            sql += ' AND balance > 0.001';
        } else if (balanceFilter === 'settled') {
            sql += ' AND ROUND(balance, 2) = 0.00';
        } else if (balanceFilter === 'credit') {
            sql += ' AND balance < -0.001';
        }

        const statusFilter = filters.statusFilter || 'all';
        if (statusFilter && statusFilter !== 'all') {
            sql += ' AND status = ?';
            params.push(statusFilter);
        }

        sql += ' ORDER BY id DESC';

        return this.db.all(sql, params);
    }

    /**
     * Create supplier according to Strict 5-Field Standard:
     * 1. supplier_name (required)
     * 2. contact_person (optional)
     * 3. phone (optional)
     * 4. address (optional)
     * 5. opening_balance (optional, default 0.00)
     */
    createSupplier(data, userId = null) {
        const name = (data.supplier_name || data.name || '').trim();
        const contactPerson = (data.contact_person || '').trim() || null;
        const phone = (data.phone || '').trim() || null;
        const address = (data.address || '').trim() || null;
        const openingBalance = Math.round((Number(data.opening_balance || data.initialBalance) || 0) * 100) / 100;

        if (!name) {
            throw new Error('اسم المورد / الشركة مطلوب');
        }

        return this.db.transaction((db) => {
            // Generate sequential code: SUP-0001
            const maxRow = db.get('SELECT MAX(id) as max_id FROM suppliers');
            const nextId = (maxRow?.max_id || 0) + 1;
            const supplierCode = `SUP-${String(nextId).padStart(4, '0')}`;

            const res = db.run(
                `INSERT INTO suppliers (
                    supplier_code, name, contact_person, phone, address,
                    opening_balance, balance, status, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 1)`,
                [supplierCode, name, contactPerson, phone, address, openingBalance, openingBalance]
            );

            const supplierId = res.lastInsertRowid;

            // Audit Trail
            if (userId) {
                db.run(
                    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                     VALUES (?, 'CREATE_SUPPLIER', 'suppliers', ?, ?)`,
                    [userId, String(supplierId), JSON.stringify({ supplierCode, name, openingBalance })]
                );
            }

            return this.getSupplierById(supplierId);
        });
    }

    /**
     * Update supplier (Strict 5-Field Standard)
     */
    updateSupplier(id, data, userId = null) {
        const supplierId = Number(id);
        const existing = this.getSupplierById(supplierId);
        if (!existing) {
            throw new Error('المورد غير موجود');
        }

        const name = (data.supplier_name || data.name || existing.name).trim();
        const contactPerson = data.contact_person !== undefined ? (data.contact_person?.trim() || null) : existing.contact_person;
        const phone = data.phone !== undefined ? (data.phone?.trim() || null) : existing.phone;
        const address = data.address !== undefined ? (data.address?.trim() || null) : existing.address;
        const status = data.status || existing.status || 'active';

        if (!name) {
            throw new Error('اسم المورد / الشركة مطلوب');
        }

        return this.db.transaction((db) => {
            db.run(
                `UPDATE suppliers
                 SET name = ?, contact_person = ?, phone = ?, address = ?, status = ?
                 WHERE id = ?`,
                [name, contactPerson, phone, address, status, supplierId]
            );

            // Audit
            if (userId) {
                db.run(
                    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
                     VALUES (?, 'UPDATE_SUPPLIER', 'suppliers', ?, ?, ?)`,
                    [
                        userId,
                        String(supplierId),
                        JSON.stringify({ name: existing.name, phone: existing.phone, status: existing.status }),
                        JSON.stringify({ name, phone, status })
                    ]
                );
            }

            return this.getSupplierById(supplierId);
        });
    }

    /**
     * Get Chronological Running Account Ledger for a specific supplier
     */
    getSupplierLedger(supplierId, filters = {}) {
        const supplier = this.getSupplierById(supplierId);
        if (!supplier) {
            throw new Error('المورد غير موجود');
        }

        // 1. Fetch Purchase Invoices (Debit +)
        let invoiceSql = `
            SELECT 
                id, 
                invoice_number as reference_number, 
                created_at, 
                total_amount as amount, 
                'invoice' as movement_type, 
                notes
            FROM purchase_invoices 
            WHERE supplier_id = ?
        `;
        const invoiceParams = [supplierId];

        if (filters.startDate) {
            invoiceSql += ' AND date(created_at) >= date(?)';
            invoiceParams.push(filters.startDate);
        }
        if (filters.endDate) {
            invoiceSql += ' AND date(created_at) <= date(?)';
            invoiceParams.push(filters.endDate);
        }

        const invoices = this.db.all(invoiceSql, invoiceParams);

        // 2. Fetch Supplier Payments (Credit -)
        let paymentSql = `
            SELECT 
                id, 
                COALESCE(voucher_number, 'SPAY-' || id) as reference_number, 
                created_at, 
                amount, 
                'payment' as movement_type, 
                payment_method, 
                payment_breakdown, 
                notes
            FROM supplier_payments 
            WHERE supplier_id = ?
        `;
        const paymentParams = [supplierId];

        if (filters.startDate) {
            paymentSql += ' AND date(created_at) >= date(?)';
            paymentParams.push(filters.startDate);
        }
        if (filters.endDate) {
            paymentSql += ' AND date(created_at) <= date(?)';
            paymentParams.push(filters.endDate);
        }

        const payments = this.db.all(paymentSql, paymentParams);

        // Combine into unified movements list
        const rawMovements = [];

        for (const inv of invoices) {
            rawMovements.push({
                id: inv.id,
                date: inv.created_at,
                referenceNumber: inv.reference_number,
                type: 'invoice',
                description: inv.notes ? `فاتورة توريد بضاعة: ${inv.notes}` : 'فاتورة توريد بضاعة واستلام بالمخزن',
                debit: Number(inv.amount),
                credit: 0,
                breakdown: null
            });
        }

        for (const pay of payments) {
            let breakdownObj = null;
            let desc = 'سداد دفعة للمورد';
            try {
                if (pay.payment_breakdown) {
                    breakdownObj = typeof pay.payment_breakdown === 'string' ? JSON.parse(pay.payment_breakdown) : pay.payment_breakdown;
                    const parts = [];
                    if (breakdownObj.cash > 0) parts.push(`نقداً: ${breakdownObj.cash.toFixed(2)} ج.م`);
                    if (breakdownObj.bankTransfer > 0) parts.push(`تحويل/إنستاباي: ${breakdownObj.bankTransfer.toFixed(2)} ج.م`);
                    if (breakdownObj.eWallet > 0) parts.push(`محفظة إلكترونية: ${breakdownObj.eWallet.toFixed(2)} ج.م`);
                    if (parts.length > 0) {
                        desc += ` (${parts.join(' + ')})`;
                    }
                }
            } catch (e) {
                // Ignore parse errors
            }

            if (pay.notes) {
                desc += ` - ${pay.notes}`;
            }

            rawMovements.push({
                id: pay.id,
                date: pay.created_at,
                referenceNumber: pay.reference_number,
                type: 'payment',
                description: desc,
                debit: 0,
                credit: Number(pay.amount),
                breakdown: breakdownObj
            });
        }

        // Sort chronologically (oldest to newest)
        rawMovements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);

        // Calculate running balance starting from opening balance
        let runningBalance = Number(supplier.opening_balance) || 0;
        const movements = [];
        let totalDebit = 0;
        let totalCredit = 0;

        for (const m of rawMovements) {
            runningBalance = Math.round((runningBalance + m.debit - m.credit) * 100) / 100;
            m.balanceAfter = runningBalance;
            totalDebit += m.debit;
            totalCredit += m.credit;

            // Optional type filtering
            if (filters.type && filters.type !== 'all') {
                if (filters.type === 'invoices' && m.type !== 'invoice') continue;
                if (filters.type === 'payments' && m.type !== 'payment') continue;
            }

            // Optional text search in movement
            if (filters.query) {
                const q = filters.query.toLowerCase();
                const matchRef = (m.referenceNumber || '').toLowerCase().includes(q);
                const matchDesc = (m.description || '').toLowerCase().includes(q);
                if (!matchRef && !matchDesc) continue;
            }

            movements.push(m);
        }

        return {
            supplier,
            movements,
            summary: {
                openingBalance: Number(supplier.opening_balance) || 0,
                totalInvoices: Math.round(totalDebit * 100) / 100,
                totalPayments: Math.round(totalCredit * 100) / 100,
                currentBalance: Math.round((supplier.balance || 0) * 100) / 100
            }
        };
    }

    /**
     * Account statement alias for getSupplierLedger
     */
    getSupplierAccountStatement(supplierId, filters = {}) {
        return this.getSupplierLedger(supplierId, filters);
    }

    /**
     * Record Supplier Payment with Split Payment Engine & Strict Solvency Check
     */
    recordSupplierSplitPayment(paymentData, userId = null) {
        const {
            supplierId,
            totalAmount,
            paymentBreakdown = {},
            notes = '',
            sessionId = null
        } = paymentData;

        const supId = Number(supplierId);
        const supplier = this.getSupplierById(supId);
        if (!supplier) {
            throw new Error('المورد غير موجود');
        }

        const total = Math.round(Number(totalAmount) * 100) / 100;
        if (isNaN(total) || total <= 0) {
            throw new Error('إجمالي مبلغ السداد غير صالح (يجب أن يكون أكبر من الصفر)');
        }

        // Strictly prohibit payment methods other than cash, instapay/bank, eWallet
        const allowedMethods = ['cash', 'bankTransfer', 'eWallet'];
        const forbiddenMethods = Object.keys(paymentBreakdown).filter(k => !allowedMethods.includes(k) && Number(paymentBreakdown[k]) > 0);
        if (forbiddenMethods.length > 0) {
            throw new Error('طرق الدفع المسموحة هي: كاش، إنستاباي، محافظ إلكترونية فقط (يُحظر استخدام الفيزا والشيكات لسداد الموردين)');
        }

        const cashPart = Math.round((Number(paymentBreakdown.cash) || 0) * 100) / 100;
        const bankPart = Math.round((Number(paymentBreakdown.bankTransfer) || 0) * 100) / 100;
        const walletPart = Math.round((Number(paymentBreakdown.eWallet) || 0) * 100) / 100;

        const sumParts = Math.round((cashPart + bankPart + walletPart) * 100) / 100;
        if (Math.abs(sumParts - total) > 0.01) {
            throw new Error(`مجموع مبالغ الدفع المقسم (${sumParts} ج.م) لا يتطابق مع إجمالي السداد المطلوب (${total} ج.م)`);
        }

        // 4.1 Strict Solvency Check for Cash portion
        if (cashPart > 0) {
            const treasuryBalance = this.treasuryService.getBalance().balance;
            if (cashPart > treasuryBalance) {
                throw new Error(`رصيد الكاش بالخزينة المركزية غير كافٍ. المتاح حالياً: ${treasuryBalance.toFixed(2)} ج.م والمطلوب سداده: ${cashPart.toFixed(2)} ج.م`);
            }
        }

        return this.db.transaction((db) => {
            // 1. Deduct cash from Central Treasury if cash portion > 0
            if (cashPart > 0) {
                db.run(
                    `INSERT INTO central_treasury_transactions (
                        transaction_type, amount, source_destination, notes, performed_by
                    ) VALUES ('withdraw', ?, ?, ?, ?)`,
                    [
                        cashPart,
                        `سداد مورد: ${supplier.name}`,
                        notes ? `دفعة مورد - ${notes}` : 'سداد دفعة للمورد من الخزينة المركزية',
                        userId || 1
                    ]
                );
            }

            // 2. Generate sequential voucher number SPAY-YYYYMMDD-XXXX
            const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const countRow = db.get(
                "SELECT COUNT(*) as count FROM supplier_payments WHERE voucher_number LIKE ?",
                [`SPAY-${todayStr}-%`]
            );
            const seq = String((countRow?.count || 0) + 1).padStart(4, '0');
            const voucherNumber = `SPAY-${todayStr}-${seq}`;

            // 3. Record payment in supplier_payments
            const breakdownJson = JSON.stringify({
                cash: cashPart,
                bankTransfer: bankPart,
                eWallet: walletPart
            });

            db.run(
                `INSERT INTO supplier_payments (
                    voucher_number, supplier_id, session_id, amount,
                    payment_method, payment_breakdown, notes, created_by
                ) VALUES (?, ?, ?, ?, 'split', ?, ?, ?)`,
                [voucherNumber, supId, sessionId, total, breakdownJson, notes || null, userId || 1]
            );

            // 4. Update supplier balance (payments reduce payable balance)
            db.run(
                'UPDATE suppliers SET balance = balance - ? WHERE id = ?',
                [total, supId]
            );

            const updatedSupplier = db.get('SELECT * FROM suppliers WHERE id = ?', [supId]);

            // 5. Audit log
            if (userId) {
                db.run(
                    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                     VALUES (?, 'SUPPLIER_PAYMENT', 'supplier_payments', ?, ?)`,
                    [
                        userId,
                        voucherNumber,
                        JSON.stringify({ supplierId: supId, total, breakdown: { cash: cashPart, bank: bankPart, wallet: walletPart } })
                    ]
                );
            }

            return {
                success: true,
                voucherNumber,
                voucher_number: voucherNumber,
                amount: total,
                paidAmount: total,
                newBalance: updatedSupplier.balance,
                supplier: updatedSupplier
            };
        });
    }

    /**
     * Record incoming purchase invoice
     */
    createPurchaseInvoice(purchaseData, userId) {
        const {
            supplierId,
            sessionId = null,
            items,
            notes = ''
        } = purchaseData;

        if (!supplierId || !items || items.length === 0) {
            throw new Error('بيانات فاتورة الشراء غير مكتملة');
        }

        return this.db.transaction((db) => {
            const supplier = db.get('SELECT * FROM suppliers WHERE id = ?', [supplierId]);
            if (!supplier) {
                throw new Error('المورد غير موجود');
            }

            // Calculate invoice total & verified items
            let subtotal = 0;
            const verifiedItems = [];

            for (const item of items) {
                const qty = Number(item.quantity);
                const unitCost = Number(item.unitCost);
                const sellPrice = Number(item.sellPrice || 0);
                const discountPct = Math.max(0, Math.min(100, Number(item.discountPercent || 0)));

                if (qty <= 0 || unitCost < 0) {
                    throw new Error('كميات أو تكاليف الشراء غير صالحة');
                }

                const lineGross = Math.round(qty * unitCost * 100) / 100;
                const lineDiscount = Math.round(lineGross * (discountPct / 100) * 100) / 100;
                const lineTotal = Math.round((lineGross - lineDiscount) * 100) / 100;
                subtotal += lineTotal;

                verifiedItems.push({
                    productId: item.productId,
                    quantity: qty,
                    unitCost,
                    sellPrice,
                    discountPercent: discountPct,
                    lineTotal
                });
            }

            subtotal = Math.round(subtotal * 100) / 100;
            const discountAmount = Math.max(0, Math.round((Number(purchaseData.discountAmount) || 0) * 100) / 100);
            const shippingCost = Math.max(0, Math.round((Number(purchaseData.shippingCost) || 0) * 100) / 100);
            const taxAmount = Math.max(0, Math.round((Number(purchaseData.taxAmount) || 0) * 100) / 100);

            let totalAmount = Math.max(0, Math.round((subtotal - discountAmount + shippingCost + taxAmount) * 100) / 100);

            // Handle Multi-Tender Payment Breakdown
            let cashPart = 0;
            let bankPart = 0;
            let walletPart = 0;
            let creditPart = 0;
            let paid = 0;

            if (purchaseData.paymentBreakdown && typeof purchaseData.paymentBreakdown === 'object') {
                cashPart = Math.round((Number(purchaseData.paymentBreakdown.cash) || 0) * 100) / 100;
                bankPart = Math.round((Number(purchaseData.paymentBreakdown.bankTransfer) || 0) * 100) / 100;
                walletPart = Math.round((Number(purchaseData.paymentBreakdown.eWallet) || 0) * 100) / 100;
                creditPart = Math.round((Number(purchaseData.paymentBreakdown.credit) || 0) * 100) / 100;
                paid = Math.round((cashPart + bankPart + walletPart) * 100) / 100;
            } else {
                paid = Math.round((Number(purchaseData.paidAmount) || 0) * 100) / 100;
                cashPart = paid;
            }

            if (paid < 0) {
                throw new Error('المبلغ المدفوع لا يمكن أن يكون سالباً');
            }

            const remaining = Math.max(0, Math.round((totalAmount - paid) * 100) / 100);
            if (!creditPart && remaining > 0) {
                creditPart = remaining;
            }
            const paymentStatus = remaining === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

            // Generate invoice number
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const countRow = db.get(
                "SELECT COUNT(*) as count FROM purchase_invoices WHERE invoice_number LIKE ?",
                [`PUR-${today}-%`]
            );
            const seq = String((countRow?.count || 0) + 1).padStart(4, '0');
            const invoiceNumber = `PUR-${today}-${seq}`;

            const breakdownJson = JSON.stringify({
                cash: cashPart,
                bankTransfer: bankPart,
                eWallet: walletPart,
                credit: creditPart
            });

            const res = db.run(
                `INSERT INTO purchase_invoices (
                    invoice_number, supplier_id, session_id, subtotal, discount_amount,
                    shipping_cost, tax_amount, total_amount, paid_amount,
                    remaining_amount, payment_status, payment_breakdown, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    invoiceNumber, supplierId, sessionId, subtotal, discountAmount,
                    shippingCost, taxAmount, totalAmount, paid,
                    remaining, paymentStatus, breakdownJson, notes || null
                ]
            );

            const invoiceId = res.lastInsertRowid;

            // Insert line items & update products stock, cost price, and selling price
            for (const item of verifiedItems) {
                db.run(
                    `INSERT INTO purchase_line_items (
                        purchase_invoice_id, product_id, quantity, unit_cost, sell_price, discount_percent, line_total
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [invoiceId, item.productId, item.quantity, item.unitCost, item.sellPrice, item.discountPercent, item.lineTotal]
                );

                db.run(
                    `UPDATE products
                     SET current_stock = current_stock + ?,
                         cost_price = ?,
                         sell_price = CASE WHEN ? > 0 THEN ? ELSE sell_price END,
                         updated_at = datetime('now', 'localtime')
                     WHERE id = ?`,
                    [item.quantity, item.unitCost, item.sellPrice, item.sellPrice, item.productId]
                );
            }

            // Update supplier balance (unpaid portion increases supplier debt)
            if (remaining > 0) {
                db.run(
                    'UPDATE suppliers SET balance = balance + ? WHERE id = ?',
                    [remaining, supplierId]
                );
            }

            // Solvency check and central treasury deduction if cash part > 0
            if (paid > 0) {
                const voucherNumber = `SPAY-${today}-${seq}-P`;
                const payFromTreasury = purchaseData.payFromTreasury === true;

                if (cashPart > 0 && payFromTreasury) {
                    const treasuryBal = this.treasuryService.getBalance().balance;
                    if (cashPart > treasuryBal) {
                        throw new Error(`رصيد الخزنة المركزية غير كافٍ لسداد الدفعة النقدية (${cashPart.toFixed(2)} ج.م). المتاح حالياً: ${treasuryBal.toFixed(2)} ج.م`);
                    }
                    db.run(
                        `INSERT INTO central_treasury_transactions (
                            transaction_type, amount, source_destination, notes, performed_by
                        ) VALUES ('withdraw', ?, ?, ?, ?)`,
                        [
                            cashPart,
                            `سداد فاتورة شراء: ${supplier.name} (${invoiceNumber})`,
                            notes ? `دفعة نقدية لفاتورة شراء - ${notes}` : `سداد دفعة فورية لفاتورة شراء ${invoiceNumber}`,
                            userId || 1
                        ]
                    );
                }

                const paymentMethod = (bankPart > 0 || walletPart > 0) ? 'split' : 'cash';
                db.run(
                    `INSERT INTO supplier_payments (
                        voucher_number, supplier_id, purchase_invoice_id, session_id, amount, payment_method, payment_breakdown, notes, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [voucherNumber, supplierId, invoiceId, sessionId, paid, paymentMethod, breakdownJson, notes ? `سداد مع فاتورة الشراء: ${notes}` : 'سداد مع فاتورة الشراء', userId || 1]
                );
            }

            // Audit
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'CREATE_PURCHASE', 'purchase_invoices', ?, ?)`,
                [userId, String(invoiceId), JSON.stringify({ invoiceNumber, totalAmount, supplierId, paid })]
            );

            return this.getPurchaseInvoiceById(invoiceId);
        });
    }

    /**
     * Legacy simple payment wrapper for backward compatibility
     */
    recordSupplierPayment(paymentData, userId) {
        const { supplierId, amount, paymentMethod = 'cash', notes = '', sessionId = null } = paymentData;
        return this.recordSupplierSplitPayment({
            supplierId,
            totalAmount: amount,
            paymentBreakdown: {
                cash: paymentMethod === 'cash' ? amount : 0,
                bankTransfer: paymentMethod === 'bank_transfer' ? amount : 0,
                eWallet: paymentMethod === 'card' || paymentMethod === 'ewallet' ? amount : 0
            },
            notes,
            sessionId
        }, userId);
    }

    getSupplierById(id) {
        return this.db.get('SELECT * FROM suppliers WHERE id = ?', [id]);
    }

    getPurchaseInvoiceById(id) {
        const numId = Number(id);
        const invoice = this.db.get(
            `SELECT pi.*, s.name as supplier_name
             FROM purchase_invoices pi
             LEFT JOIN suppliers s ON pi.supplier_id = s.id
             WHERE pi.id = ?`,
            [numId]
        );

        if (!invoice) return null;

        const items = this.db.all(
            `SELECT pli.*, p.item_name, p.barcode, p.product_code, c.name as category_name
             FROM purchase_line_items pli
             LEFT JOIN products p ON pli.product_id = p.id
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE pli.purchase_invoice_id = ?`,
            [numId]
        );

        return { ...invoice, items };
    }

    listPurchaseInvoices(limit = 30) {
        return this.db.all(
            `SELECT pi.*, s.name as supplier_name
             FROM purchase_invoices pi
             JOIN suppliers s ON pi.supplier_id = s.id
             ORDER BY pi.id DESC LIMIT ?`,
            [limit]
        );
    }

    /**
     * Create a purchase return (إرجاع بضاعة للمورد)
     */
    createPurchaseReturn(returnData, userId = null) {
        const invId = Number(returnData.purchaseInvoiceId || returnData.purchase_invoice_id || returnData.invoiceId || returnData.id);
        const items = Array.isArray(returnData.items) ? returnData.items : [];
        const refundMethod = returnData.refundMethod || returnData.refund_method || 'debt_reduction';
        const reason = returnData.reason || 'other';
        const notes = returnData.notes || '';

        if (!invId || items.length === 0) {
            throw new Error('بيانات المرتجع غير مكتملة، يرجى تحديد الفاتورة والأصناف المرتجعة');
        }

        return this.db.transaction((db) => {
            const invoice = db.get('SELECT * FROM purchase_invoices WHERE id = ?', [invId]);
            if (!invoice) {
                throw new Error('فاتورة الشراء غير موجودة');
            }

            const supplier = db.get('SELECT * FROM suppliers WHERE id = ?', [invoice.supplier_id]);
            if (!supplier) {
                throw new Error('المورد المرتبط بالفاتورة غير موجود');
            }

            const lineItems = db.all('SELECT * FROM purchase_line_items WHERE purchase_invoice_id = ?', [invId]);
            const lineItemMap = new Map();
            lineItems.forEach(li => lineItemMap.set(li.product_id, li));

            // Already returned items for this invoice
            const prevReturns = db.all(
                `SELECT pri.product_id, SUM(pri.returned_quantity) as total_returned
                 FROM purchase_return_items pri
                 JOIN purchase_returns pr ON pri.purchase_return_id = pr.id
                 WHERE pr.purchase_invoice_id = ?
                 GROUP BY pri.product_id`,
                [invId]
            );
            const prevReturnMap = new Map();
            prevReturns.forEach(pr => prevReturnMap.set(pr.product_id, Number(pr.total_returned || 0)));

            let totalReturnedAmount = 0;
            const validReturnItems = [];

            for (const item of items) {
                const prodId = Number(item.productId !== undefined ? item.productId : item.product_id);
                const returnQty = Number(item.quantity !== undefined ? item.quantity : item.return_qty);

                if (!prodId || returnQty <= 0) continue;

                const lineItem = lineItemMap.get(prodId);
                if (!lineItem) {
                    throw new Error(`الصنف رقم (${prodId}) غير موجود في بنود هذه الفاتورة`);
                }

                const purchasedQty = Number(lineItem.quantity);
                const alreadyReturned = prevReturnMap.get(prodId) || 0;
                const maxReturnable = Math.max(0, purchasedQty - alreadyReturned);

                if (returnQty > maxReturnable) {
                    throw new Error(`الكمية المراد إرجاعها (${returnQty}) تتجاوز الكمية المتاحة للإرجاع (${maxReturnable}) للصنف`);
                }

                const product = db.get('SELECT * FROM products WHERE id = ?', [prodId]);
                if (!product) {
                    throw new Error(`المنتج رقم (${prodId}) غير موجود في النظام`);
                }

                if (Number(product.current_stock) < returnQty) {
                    throw new Error(`رصيد المخزن الحالي للصنف "${product.item_name}" هو (${product.current_stock}) قطعة فقط، ولا يكفي لإرجاع (${returnQty}) قطعة.`);
                }

                const unitCost = Number(item.unitCost !== undefined ? item.unitCost : (item.unit_cost !== undefined ? item.unit_cost : lineItem.unit_cost));
                const lineTotal = Math.round(returnQty * unitCost * 100) / 100;
                totalReturnedAmount += lineTotal;

                validReturnItems.push({
                    productId: prodId,
                    productName: product.item_name,
                    quantity: returnQty,
                    unitCost,
                    lineTotal
                });
            }

            if (validReturnItems.length === 0) {
                throw new Error('يرجى تحديد كمية إرجاع أكبر من الصفر لصنف واحد على الأقل');
            }

            totalReturnedAmount = Math.round(totalReturnedAmount * 100) / 100;

            // Multi-Tender Refund Breakdown Resolution
            let cashPart = 0;
            let bankPart = 0;
            let walletPart = 0;
            let debtPart = 0;

            const rawBreakdown = returnData.refundBreakdown || returnData.refund_breakdown;
            const rawRefundMethod = returnData.refundMethod || returnData.refund_method;

            if (rawBreakdown && typeof rawBreakdown === 'object') {
                cashPart = Math.round((Number(rawBreakdown.cash) || 0) * 100) / 100;
                bankPart = Math.round((Number(rawBreakdown.bankTransfer) || 0) * 100) / 100;
                walletPart = Math.round((Number(rawBreakdown.eWallet) || 0) * 100) / 100;
                debtPart = Math.round((Number(rawBreakdown.debtReduction !== undefined ? rawBreakdown.debtReduction : (rawBreakdown.credit || rawBreakdown.debt)) || 0) * 100) / 100;

                const sumTender = Math.round((cashPart + bankPart + walletPart + debtPart) * 100) / 100;
                if (Math.abs(sumTender - totalReturnedAmount) > 0.01) {
                    throw new Error(`مجموع مبالغ الاسترداد (${sumTender} ج.م) لا يتطابق مع إجمالي قيمة البضاعة المرتجعة (${totalReturnedAmount} ج.م)`);
                }
            } else {
                // Single method fallback
                if (rawRefundMethod === 'cash_treasury') {
                    cashPart = totalReturnedAmount;
                } else if (rawRefundMethod === 'debt_reduction') {
                    debtPart = totalReturnedAmount;
                } else if (rawRefundMethod === 'bank_transfer' || rawRefundMethod === 'bankTransfer') {
                    bankPart = totalReturnedAmount;
                } else if (rawRefundMethod === 'e_wallet' || rawRefundMethod === 'eWallet') {
                    walletPart = totalReturnedAmount;
                } else {
                    debtPart = totalReturnedAmount;
                }
            }

            const breakdownObj = {
                cash: cashPart,
                bankTransfer: bankPart,
                eWallet: walletPart,
                debtReduction: debtPart
            };
            const breakdownJson = JSON.stringify(breakdownObj);
            const activeMethodsCount = [cashPart, bankPart, walletPart, debtPart].filter(v => v > 0).length;
            const finalRefundMethod = activeMethodsCount > 1 ? 'multi' : 
                (cashPart === totalReturnedAmount ? 'cash_treasury' : (debtPart === totalReturnedAmount ? 'debt_reduction' : 'multi'));

            // Generate return number: RET-YYYYMMDD-XXXX
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const countRow = db.get(
                "SELECT COUNT(*) as count FROM purchase_returns WHERE return_number LIKE ?",
                [`RET-${today}-%`]
            );
            const seq = String((countRow?.count || 0) + 1).padStart(4, '0');
            const returnNumber = `RET-${today}-${seq}`;

            // Insert into purchase_returns
            const res = db.run(
                `INSERT INTO purchase_returns (
                    return_number, purchase_invoice_id, supplier_id,
                    total_returned_amount, refund_method, refund_breakdown, reason, notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    returnNumber, invId, invoice.supplier_id,
                    totalReturnedAmount, finalRefundMethod, breakdownJson, reason || 'other', notes || null, userId || 1
                ]
            );
            const returnId = res.lastInsertRowid;

            // Insert return items and adjust stock
            for (const item of validReturnItems) {
                db.run(
                    `INSERT INTO purchase_return_items (
                        purchase_return_id, product_id, returned_quantity, unit_cost, total_cost
                    ) VALUES (?, ?, ?, ?, ?)`,
                    [returnId, item.productId, item.quantity, item.unitCost, item.lineTotal]
                );

                db.run(
                    `UPDATE products
                     SET current_stock = current_stock - ?,
                         updated_at = datetime('now', 'localtime')
                     WHERE id = ?`,
                    [item.quantity, item.productId]
                );

                db.run(
                    `INSERT INTO stock_adjustments (
                        product_id, user_id, adjustment_type, quantity, reason, notes
                    ) VALUES (?, ?, 'decrease', ?, 'other', ?)`,
                    [item.productId, userId || 1, item.quantity, `مرتجع مشتريات للمورد: ${supplier.name} (${returnNumber})`]
                );
            }

            // Financial Settlement:
            // 1. If Cash refund received: deposit directly into Central Treasury (تزيد في الخزنة المركزية)
            if (cashPart > 0) {
                db.run(
                    `INSERT INTO central_treasury_transactions (
                        transaction_type, amount, source_destination, notes, performed_by
                    ) VALUES ('deposit', ?, ?, ?, ?)`,
                    [
                        cashPart,
                        `استرداد نقدي - مرتجع مشتريات: ${supplier.name} (${returnNumber})`,
                        `توريد نقدية مرتجع مشتريات فاتورة ${invoice.invoice_number}`,
                        userId || 1
                    ]
                );
            }

            // 2. If Debt Reduction selected: decrease invoice remaining debt and supplier balance
            if (debtPart > 0) {
                const currentRemaining = Number(invoice.remaining_amount || 0);
                const debtReduction = Math.min(currentRemaining, debtPart);
                const newRemaining = Math.max(0, Math.round((currentRemaining - debtReduction) * 100) / 100);

                db.run(
                    `UPDATE purchase_invoices
                     SET remaining_amount = ?
                     WHERE id = ?`,
                    [newRemaining, invId]
                );

                db.run(
                    'UPDATE suppliers SET balance = MAX(0, balance - ?) WHERE id = ?',
                    [debtPart, invoice.supplier_id]
                );
            }

            // 3. Update total returned amount on invoice
            db.run(
                `UPDATE purchase_invoices
                 SET returned_amount = COALESCE(returned_amount, 0) + ?
                 WHERE id = ?`,
                [totalReturnedAmount, invId]
            );

            // Check if full or partial return
            const allItemsCount = lineItems.reduce((sum, li) => sum + li.quantity, 0);
            const totalItemsReturnedNow = db.get(
                `SELECT SUM(pri.returned_quantity) as total
                 FROM purchase_return_items pri
                 JOIN purchase_returns pr ON pri.purchase_return_id = pr.id
                 WHERE pr.purchase_invoice_id = ?`,
                [invId]
            )?.total || 0;

            const returnStatus = totalItemsReturnedNow >= allItemsCount ? 'full' : 'partial';
            db.run(
                'UPDATE purchase_invoices SET return_status = ? WHERE id = ?',
                [returnStatus, invId]
            );

            return {
                id: returnId,
                returnId,
                return_number: returnNumber,
                returnNumber,
                invoiceId: invId,
                purchase_invoice_id: invId,
                invoiceNumber: invoice.invoice_number,
                totalReturnedAmount,
                total_returned_amount: totalReturnedAmount,
                returnStatus,
                return_status: returnStatus,
                itemsCount: validReturnItems.length,
                refund_method: finalRefundMethod,
                refundMethod: finalRefundMethod,
                refund_breakdown: breakdownObj,
                refundBreakdown: breakdownObj
            };
        });
    }

    getPurchaseReturnsByInvoice(invoiceId) {
        const returns = this.db.all(
            `SELECT pr.*, u.display_name as user_name
             FROM purchase_returns pr
             LEFT JOIN users u ON pr.created_by = u.id
             WHERE pr.purchase_invoice_id = ?
             ORDER BY pr.id DESC`,
            [Number(invoiceId)]
        );

        for (const ret of returns) {
            ret.items = this.db.all(
                `SELECT pri.*, p.item_name, p.barcode
                 FROM purchase_return_items pri
                 JOIN products p ON pri.product_id = p.id
                 WHERE pri.purchase_return_id = ?`,
                [ret.id]
            );

            if (ret.refund_breakdown && typeof ret.refund_breakdown === 'string') {
                try {
                    ret.refund_breakdown = JSON.parse(ret.refund_breakdown);
                } catch (e) {
                    // keep raw
                }
            }
        }

        return returns;
    }
}

module.exports = { PurchaseService };
