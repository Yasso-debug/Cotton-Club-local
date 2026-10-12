/**
 * Cotton Club POS - Thermal Printing & Receipt Generator
 * Generates formatted ESC/POS byte sequences and clean printable layouts
 * for 80mm (48 chars) and 58mm (32 chars) thermal receipt printers.
 */

class PrinterService {
    constructor(dbManager) {
        this.db = dbManager;
    }

    /**
     * Get store branding settings
     */
    getStoreInfo() {
        const rows = this.db.all('SELECT key, value FROM app_settings');
        const settings = {};
        for (const row of rows) {
            settings[row.key] = row.value;
        }
        return {
            name: settings.store_name || 'نادي القطن - Cotton Club',
            phone: settings.store_phone || '',
            address: settings.store_address || '',
            taxNumber: settings.tax_number || '',
            footer: settings.receipt_footer || 'شكراً لزيارتكم',
            paperWidth: settings.printer_paper_width || '80mm',
            currency: settings.currency_symbol || 'ج.م'
        };
    }

    /**
     * Generate HTML printable receipt for thermal window or fallback printing
     */
    generateReceiptHtml(invoice) {
        const store = this.getStoreInfo();
        const widthPx = store.paperWidth === '58mm' ? '280px' : '380px';

        const linesHtml = invoice.lineItems.map(item => `
            <tr>
                <td style="text-align: right; padding: 4px 0;">
                    <div style="font-weight: bold;">${item.item_name}</div>
                    <div style="font-size: 11px; color: #555;">${item.barcode}</div>
                </td>
                <td style="text-align: center; padding: 4px 0;">${item.quantity}</td>
                <td style="text-align: center; padding: 4px 0;">${item.unit_price.toFixed(2)}</td>
                <td style="text-align: left; padding: 4px 0; font-weight: bold;">${item.line_total.toFixed(2)}</td>
            </tr>
        `).join('');

        const paymentMethodArabic = {
            cash: 'نقدي (كاش)',
            card: 'شبكة / بطاقة',
            split: 'دفع مجزأ (نقدي + شبكة)'
        }[invoice.payment_method] || invoice.payment_method;

        return `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    width: ${widthPx};
                    margin: 0 auto;
                    padding: 8px;
                    color: #000;
                    font-size: 12px;
                    line-height: 1.4;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .text-left { text-align: left; }
                .bold { font-weight: bold; }
                .divider { border-top: 1px dashed #000; margin: 8px 0; }
                .double-divider { border-top: 2px solid #000; margin: 8px 0; }
                table { width: 100%; border-collapse: collapse; }
                .totals-row { display: flex; justify-content: space-between; padding: 2px 0; }
                .header-title { font-size: 16px; margin-bottom: 4px; }
            </style>
        </head>
        <body>
            <div class="text-center">
                <div class="bold header-title">${store.name}</div>
                ${store.address ? `<div>${store.address}</div>` : ''}
                ${store.phone ? `<div>هاتف: ${store.phone}</div>` : ''}
                ${store.taxNumber ? `<div>الرقم الضريبي: ${store.taxNumber}</div>` : ''}
            </div>

            <div class="divider"></div>

            <div class="totals-row">
                <span>رقم الفاتورة:</span>
                <span class="bold">${invoice.invoice_number}</span>
            </div>
            <div class="totals-row">
                <span>التاريخ والوقت:</span>
                <span>${invoice.created_at}</span>
            </div>
            <div class="totals-row">
                <span>الكاشير:</span>
                <span>${invoice.cashier_name}</span>
            </div>
            <div class="totals-row">
                <span>رقم الوردية:</span>
                <span>${invoice.session_code || '-'}</span>
            </div>

            <div class="double-divider"></div>

            <table>
                <thead>
                    <tr style="border-bottom: 1px solid #000; font-weight: bold;">
                        <th style="text-align: right; padding-bottom: 4px;">الصنف</th>
                        <th style="text-align: center; padding-bottom: 4px;">الكمية</th>
                        <th style="text-align: center; padding-bottom: 4px;">السعر</th>
                        <th style="text-align: left; padding-bottom: 4px;">الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${linesHtml}
                </tbody>
            </table>

            <div class="divider"></div>

            <div class="totals-row">
                <span>المجموع الفرعي:</span>
                <span>${invoice.subtotal.toFixed(2)} ${store.currency}</span>
            </div>
            ${invoice.discount_amount > 0 ? `
            <div class="totals-row" style="color: #c00;">
                <span>الخصم (${invoice.discount_percent}%):</span>
                <span>-${invoice.discount_amount.toFixed(2)} ${store.currency}</span>
            </div>
            ` : ''}
            <div class="totals-row bold" style="font-size: 15px; margin-top: 4px;">
                <span>الصافي المطلوب:</span>
                <span>${invoice.final_total.toFixed(2)} ${store.currency}</span>
            </div>
            <div class="totals-row">
                <span>طريقة الدفع:</span>
                <span>${paymentMethodArabic}</span>
            </div>

            <div class="double-divider"></div>

            <div class="text-center" style="font-size: 11px; margin-top: 10px;">
                <div>${store.footer}</div>
                <div style="margin-top: 6px; font-size: 10px; color: #666;">نظام إدارة المبيعات والمخزون المحلي</div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Generate HTML for Z-Report Daily Session Close Receipt
     */
    generateZReportHtml(sessionData) {
        const store = this.getStoreInfo();
        const widthPx = store.paperWidth === '58mm' ? '280px' : '380px';
        const s = sessionData.session;

        return `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    width: ${widthPx};
                    margin: 0 auto;
                    padding: 8px;
                    color: #000;
                    font-size: 12px;
                    line-height: 1.4;
                }
                .text-center { text-align: center; }
                .bold { font-weight: bold; }
                .divider { border-top: 1px dashed #000; margin: 8px 0; }
                .double-divider { border-top: 2px solid #000; margin: 8px 0; }
                .row { display: flex; justify-content: space-between; padding: 2px 0; }
            </style>
        </head>
        <body>
            <div class="text-center">
                <div class="bold" style="font-size: 16px;">${store.name}</div>
                <div class="bold" style="font-size: 14px; margin-top: 4px;">تقرير إغلاق الوردية (Z-REPORT)</div>
            </div>

            <div class="divider"></div>

            <div class="row"><span>رمز الوردية:</span><span class="bold">${s.session_code}</span></div>
            <div class="row"><span>فتح الوردية:</span><span>${s.opened_at}</span></div>
            <div class="row"><span>إغلاق الوردية:</span><span>${s.closed_at || new Date().toLocaleString('ar-EG')}</span></div>
            <div class="row"><span>المسؤول عن الفتح:</span><span>${s.opened_by_name || '-'}</span></div>
            <div class="row"><span>المسؤول عن الإغلاق:</span><span>${s.closed_by_name || '-'}</span></div>

            <div class="double-divider"></div>

            <div class="row"><span>رصيد بداية اليوم (العهدة):</span><span>${sessionData.openingCash.toFixed(2)} ${store.currency}</span></div>
            <div class="row"><span>عدد الفواتير المنفذة:</span><span>${sessionData.totalInvoices}</span></div>
            <div class="row"><span>إجمالي المبيعات:</span><span class="bold">${sessionData.totalSales.toFixed(2)} ${store.currency}</span></div>
            <div class="row"><span>- مبيعات نقدية (كاش):</span><span>${sessionData.totalCashSales.toFixed(2)} ${store.currency}</span></div>
            <div class="row"><span>- مبيعات شبكة (بطاقة):</span><span>${sessionData.totalCardSales.toFixed(2)} ${store.currency}</span></div>
            <div class="row"><span>إجمالي الخصومات:</span><span>${sessionData.totalDiscounts.toFixed(2)} ${store.currency}</span></div>
            <div class="row"><span>المصروفات النثرية:</span><span>-${sessionData.totalExpenses.toFixed(2)} ${store.currency}</span></div>
            <div class="row"><span>مدفوعات الموردين النقدية:</span><span>-${sessionData.totalSupplierPayments.toFixed(2)} ${store.currency}</span></div>

            <div class="double-divider"></div>

            <div class="row bold" style="font-size: 13px;">
                <span>النقدية المتوقعة بالدرج:</span>
                <span>${sessionData.expectedCash.toFixed(2)} ${store.currency}</span>
            </div>
            <div class="row bold" style="font-size: 13px;">
                <span>النقدية الفعلية المحصية:</span>
                <span>${sessionData.closingCashActual.toFixed(2)} ${store.currency}</span>
            </div>
            
            <div class="row bold" style="font-size: 14px; margin-top: 4px; ${sessionData.cashDifference < 0 ? 'color: red;' : sessionData.cashDifference > 0 ? 'color: green;' : ''}">
                <span>الفارق (العجز / الزيادة):</span>
                <span>${sessionData.cashDifference.toFixed(2)} ${store.currency} (${sessionData.cashDifference === 0 ? 'مطابق تماماً' : sessionData.cashDifference < 0 ? 'عجز' : 'زيادة'})</span>
            </div>

            <div class="divider"></div>
            <div class="text-center" style="font-size: 11px; margin-top: 8px;">
                <div>تم إنشاء التقرير بنجاح وأخذ نسخة احتياطية من قاعدة البيانات</div>
            </div>
        </body>
        </html>
        `;
    }
}

module.exports = { PrinterService };
