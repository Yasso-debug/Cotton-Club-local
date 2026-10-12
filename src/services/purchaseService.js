/**
 * Cotton Club POS - Purchases & Suppliers Service
 * Manages vendor accounts, incoming stock shipments, cost recalculation,
 * and accounts payable payments.
 */

class PurchaseService {
    constructor(dbManager) {
        this.db = dbManager;
    }

    /**
     * List all suppliers with current balance
     */
    listSuppliers() {
        return this.db.all('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name ASC');
    }

    /**
     * Create supplier
     */
    createSupplier(data) {
        const { name, phone, address, initialBalance = 0 } = data;
        if (!name || name.trim() === '') {
            throw new Error('اسم المورد مطلوب');
        }

        const res = this.db.run(
            `INSERT INTO suppliers (name, phone, address, balance)
             VALUES (?, ?, ?, ?)`,
            [name.trim(), phone || null, address || null, Number(initialBalance) || 0]
        );
        return this.getSupplierById(res.lastInsertRowid);
    }

    /**
     * Record incoming purchase invoice
     */
    createPurchaseInvoice(purchaseData, userId) {
        const {
            supplierId,
            sessionId = null,
            items,
            paidAmount = 0,
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

            // Calculate invoice total
            let totalAmount = 0;
            const verifiedItems = [];

            for (const item of items) {
                const qty = Number(item.quantity);
                const unitCost = Number(item.unitCost);

                if (qty <= 0 || unitCost < 0) {
                    throw new Error('كميات أو تكاليف الشراء غير صالحة');
                }

                const lineTotal = Math.round(qty * unitCost * 100) / 100;
                totalAmount += lineTotal;

                verifiedItems.push({
                    productId: item.productId,
                    quantity: qty,
                    unitCost,
                    lineTotal
                });
            }

            totalAmount = Math.round(totalAmount * 100) / 100;
            const paid = Number(paidAmount) || 0;
            const remaining = Math.max(0, Math.round((totalAmount - paid) * 100) / 100);
            const paymentStatus = remaining === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

            // Generate invoice number
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const countRow = db.get(
                "SELECT COUNT(*) as count FROM purchase_invoices WHERE invoice_number LIKE ?",
                [`PUR-${today}-%`]
            );
            const seq = String((countRow?.count || 0) + 1).padStart(4, '0');
            const invoiceNumber = `PUR-${today}-${seq}`;

            const res = db.run(
                `INSERT INTO purchase_invoices (
                    invoice_number, supplier_id, session_id, total_amount, paid_amount,
                    remaining_amount, payment_status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [invoiceNumber, supplierId, sessionId, totalAmount, paid, remaining, paymentStatus, notes || null]
            );

            const invoiceId = res.lastInsertRowid;

            // Insert line items & update products stock and cost price
            for (const item of verifiedItems) {
                db.run(
                    `INSERT INTO purchase_line_items (
                        purchase_invoice_id, product_id, quantity, unit_cost, line_total
                    ) VALUES (?, ?, ?, ?, ?)`,
                    [invoiceId, item.productId, item.quantity, item.unitCost, item.lineTotal]
                );

                // Update product stock and update cost_price to latest purchase cost
                db.run(
                    `UPDATE products
                     SET current_stock = current_stock + ?,
                         cost_price = ?,
                         updated_at = datetime('now', 'localtime')
                     WHERE id = ?`,
                    [item.quantity, item.unitCost, item.productId]
                );
            }

            // Update supplier balance (unpaid portion increases debt)
            if (remaining > 0) {
                db.run(
                    'UPDATE suppliers SET balance = balance + ? WHERE id = ?',
                    [remaining, supplierId]
                );
            }

            // If paid amount was given from drawer in cash, record payment
            if (paid > 0) {
                db.run(
                    `INSERT INTO supplier_payments (
                        supplier_id, purchase_invoice_id, session_id, amount, payment_method, notes
                    ) VALUES (?, ?, ?, ?, 'cash', 'دفعة نقدية مع فاتورة الشراء')`,
                    [supplierId, invoiceId, sessionId, paid]
                );
            }

            // Audit
            db.run(
                `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
                 VALUES (?, 'CREATE_PURCHASE', 'purchase_invoices', ?, ?)`,
                [userId, String(invoiceId), JSON.stringify({ invoiceNumber, totalAmount, supplierId })]
            );

            return this.getPurchaseInvoiceById(invoiceId);
        });
    }

    /**
     * Record payment to supplier
     */
    recordSupplierPayment(paymentData, userId) {
        const { supplierId, purchaseInvoiceId = null, sessionId = null, amount, paymentMethod = 'cash', notes = '' } = paymentData;
        const payAmount = Number(amount);

        if (!supplierId || payAmount <= 0) {
            throw new Error('مبلغ السداد غير صالح');
        }

        return this.db.transaction((db) => {
            const supplier = db.get('SELECT * FROM suppliers WHERE id = ?', [supplierId]);
            if (!supplier) {
                throw new Error('المورد غير موجود');
            }

            // Record payment
            const res = db.run(
                `INSERT INTO supplier_payments (
                    supplier_id, purchase_invoice_id, session_id, amount, payment_method, notes
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [supplierId, purchaseInvoiceId, sessionId, payAmount, paymentMethod, notes || null]
            );

            // Deduct balance from supplier
            db.run(
                'UPDATE suppliers SET balance = balance - ? WHERE id = ?',
                [payAmount, supplierId]
            );

            // If linked to specific purchase invoice, update invoice paid amount
            if (purchaseInvoiceId) {
                const inv = db.get('SELECT * FROM purchase_invoices WHERE id = ?', [purchaseInvoiceId]);
                if (inv) {
                    const newPaid = inv.paid_amount + payAmount;
                    const newRemaining = Math.max(0, inv.total_amount - newPaid);
                    const newStatus = newRemaining === 0 ? 'paid' : 'partial';
                    db.run(
                        'UPDATE purchase_invoices SET paid_amount = ?, remaining_amount = ?, payment_status = ? WHERE id = ?',
                        [newPaid, newRemaining, newStatus, purchaseInvoiceId]
                    );
                }
            }

            return res.lastInsertRowid;
        });
    }

    getSupplierById(id) {
        return this.db.get('SELECT * FROM suppliers WHERE id = ?', [id]);
    }

    getPurchaseInvoiceById(id) {
        const invoice = this.db.get(
            `SELECT pi.*, s.name as supplier_name
             FROM purchase_invoices pi
             JOIN suppliers s ON pi.supplier_id = s.id
             WHERE pi.id = ?`,
            [id]
        );

        if (!invoice) return null;

        const items = this.db.all(
            `SELECT pli.*, p.item_name, p.barcode
             FROM purchase_line_items pli
             JOIN products p ON pli.product_id = p.id
             WHERE pli.purchase_invoice_id = ?`,
            [id]
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
}

module.exports = { PurchaseService };
