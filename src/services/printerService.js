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
            name: settings.store_name || 'Cotton Club Store',
            phone: settings.store_phone || '',
            address: settings.store_address || '',
            taxNumber: settings.tax_number || '',
            footer: settings.receipt_footer || 'شكراً لزيارتكم',
            paperWidth: settings.printer_paper_width || '80mm',
            currency: settings.currency_symbol || 'ج.م'
        };
    }

    /**
     * Safe Receipt Date Formatter - Prevents NaN/NaN/NaN on iPads, tablets, and Arabic locales.
     * Formats to: YYYY/MM/DD - hh:mm (ص / م)
     */
    static formatReceiptDate(dateVal) {
        if (!dateVal) dateVal = new Date();
        let d = new Date(dateVal);
        if (isNaN(d.getTime())) {
            if (typeof dateVal === 'string') {
                const parts = dateVal.split(/[- :T]/);
                if (parts.length >= 3) {
                    const year = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1;
                    const day = parseInt(parts[2], 10);
                    const hour = parts[3] ? parseInt(parts[3], 10) : 0;
                    const min = parts[4] ? parseInt(parts[4], 10) : 0;
                    const sec = parts[5] ? parseInt(parts[5], 10) : 0;
                    d = new Date(year, month, day, hour, min, sec);
                }
            }
        }
        if (isNaN(d.getTime())) d = new Date();

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        let hours24 = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours24 >= 12 ? 'م' : 'ص';
        let hours12 = hours24 % 12;
        if (hours12 === 0) hours12 = 12;
        const hoursStr = String(hours12).padStart(2, '0');

        return `${year}/${month}/${day} - ${hoursStr}:${minutes} ${ampm}`;
    }

    /**
     * Parse and filter used payment methods with distinctive visual styling
     */
    static parsePaymentBreakdown(invoice) {
        let breakdown = { cash: 0, card: 0, transfer: 0, e_wallet: 0 };
        if (invoice.payment_breakdown) {
            try {
                const parsed = typeof invoice.payment_breakdown === 'string'
                    ? JSON.parse(invoice.payment_breakdown)
                    : invoice.payment_breakdown;
                if (parsed) {
                    breakdown.cash = Number(parsed.cash) || 0;
                    breakdown.card = Number(parsed.card || parsed.visa) || 0;
                    breakdown.transfer = Number(parsed.transfer || parsed.bank_transfer) || 0;
                    breakdown.e_wallet = Number(parsed.e_wallet || parsed.wallet) || 0;
                }
            } catch (_) {}
        }
        if (invoice.cash_amount > 0 && breakdown.cash === 0) breakdown.cash = Number(invoice.cash_amount) || 0;
        if (invoice.card_amount > 0 && breakdown.card === 0) breakdown.card = Number(invoice.card_amount) || 0;
        if (invoice.transfer_amount > 0 && breakdown.transfer === 0) breakdown.transfer = Number(invoice.transfer_amount) || 0;

        if (breakdown.cash === 0 && breakdown.card === 0 && breakdown.transfer === 0 && breakdown.e_wallet === 0) {
            const total = Number(invoice.final_total) || 0;
            if (invoice.payment_method === 'cash') breakdown.cash = total;
            else if (invoice.payment_method === 'card' || invoice.payment_method === 'visa') breakdown.card = total;
            else if (invoice.payment_method === 'transfer' || invoice.payment_method === 'bank_transfer') breakdown.transfer = total;
            else if (invoice.payment_method === 'e_wallet') breakdown.e_wallet = total;
            else breakdown.cash = total;
        }

        const activeMethods = [];
        if (breakdown.cash > 0) {
            activeMethods.push({
                name: 'نقدي (كاش)',
                amount: breakdown.cash,
                bg: '#f0fdf4',
                color: '#15803d',
                border: '#86efac'
            });
        }
        if (breakdown.card > 0) {
            activeMethods.push({
                name: 'فيزا / بطاقة (Card)',
                amount: breakdown.card,
                bg: '#eff6ff',
                color: '#1d4ed8',
                border: '#93c5fd'
            });
        }
        if (breakdown.transfer > 0) {
            activeMethods.push({
                name: 'تحويل بنكي (Transfer)',
                amount: breakdown.transfer,
                bg: '#f5f3ff',
                color: '#6d28d9',
                border: '#c4b5fd'
            });
        }
        if (breakdown.e_wallet > 0) {
            activeMethods.push({
                name: 'محفظة إلكترونية (E-Wallet)',
                amount: breakdown.e_wallet,
                bg: '#fffbeb',
                color: '#b45309',
                border: '#fde68a'
            });
        }

        return activeMethods;
    }

    /**
     * Generate HTML printable receipt for thermal window or fallback printing
     * Exactly tailored for Cotton Club Modern Thermal Receipt Architecture (74mm continuous roll)
     */
    generateReceiptHtml(invoice) {
        const store = this.getStoreInfo();
        const isReturn = invoice.invoice_type === 'return';
        const formattedDate = PrinterService.formatReceiptDate(invoice.created_at);
        const activePayments = PrinterService.parsePaymentBreakdown(invoice);

        const linesHtml = invoice.lineItems.map(item => `
            <tr>
                <td style="text-align: right; padding: 4px 0; vertical-align: top;">
                    <div style="font-weight: 700; color: #0f172a; font-size: 11px; line-height: 1.3;">${item.item_name}</div>
                    <div style="font-size: 9px; color: #64748b;">${item.barcode}</div>
                </td>
                <td style="text-align: center; padding: 4px 0; font-size: 11px; font-weight: 700; vertical-align: top;">${item.quantity}</td>
                <td style="text-align: center; padding: 4px 0; font-size: 10.5px; vertical-align: top;">${item.unit_price.toFixed(2)}</td>
                <td style="text-align: left; padding: 4px 0; font-weight: 800; font-size: 11px; color: #0f172a; vertical-align: top;">${item.line_total.toFixed(2)}</td>
            </tr>
        `).join('');

        const paymentsHtml = activePayments.map(m => `
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 3px 0; font-size: 10.5px;">
                <span style="background: ${m.bg}; color: ${m.color}; border: 1px solid ${m.border}; padding: 1px 6px; border-radius: 4px; font-weight: 700;">${m.name}</span>
                <span style="font-weight: 800; color: #0f172a;">${m.amount.toFixed(2)} ${store.currency}</span>
            </div>
        `).join('');

        return `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>${isReturn ? 'إشعار مرتجع' : 'إيصال استلام'} - ${invoice.invoice_number}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Libre+Barcode+39+Text&display=swap" rel="stylesheet">
            <style>
                @media print {
                    @page { margin: 0; size: auto; }
                    body { margin: 0 !important; padding: 4px !important; width: 74mm !important; }
                    .no-print { display: none !important; }
                }
                * { box-sizing: border-box; }
                body {
                    font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif;
                    width: 74mm;
                    max-width: 300px;
                    margin: 0 auto;
                    padding: 8px 6px;
                    color: #0f172a;
                    background: #fff;
                    font-size: 11px;
                    line-height: 1.4;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .text-left { text-align: left; }
                .bold { font-weight: 700; }
                .dashed-divider { border-top: 1.5px dashed #334155; margin: 7px 0; }
                .solid-divider { border-top: 1.5px solid #0f172a; margin: 7px 0; }
                table { width: 100%; border-collapse: collapse; }
                .meta-row { display: flex; justify-content: space-between; align-items: center; padding: 1.5px 0; font-size: 10.5px; }
                .store-title { font-size: 15px; font-weight: 900; color: #0f172a; margin-bottom: 2px; }
                .store-subtitle { font-size: 10px; font-weight: 600; color: #475569; margin-bottom: 4px; }
                
                .receipt-status-pill {
                    display: inline-block;
                    padding: 3px 10px;
                    border-radius: 4px;
                    font-size: 11.5px;
                    font-weight: 800;
                    margin: 4px 0;
                    width: 100%;
                    text-align: center;
                }
                .status-sale {
                    background: #f0fdf4;
                    color: #15803d;
                    border: 1px solid #86efac;
                }
                .status-return {
                    background: #fee2e2;
                    color: #b91c1c;
                    border: 1px solid #f87171;
                }
                
                .net-total-box {
                    border: 1.5px solid #0f172a;
                    background: #f1f5f9;
                    border-radius: 6px;
                    padding: 6px 8px;
                    margin: 7px 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .policy-box {
                    font-size: 9.5px;
                    color: #475569;
                    text-align: justify;
                    line-height: 1.35;
                    margin: 6px 0;
                    padding: 5px;
                    background: #f8fafc;
                    border-radius: 4px;
                    border: 1px dashed #cbd5e1;
                }
                .barcode-wrap {
                    text-align: center;
                    margin: 8px 0 4px 0;
                }
                .barcode-glyph {
                    font-family: 'Libre Barcode 39 Text', 'Courier New', monospace;
                    font-size: 32px;
                    line-height: 1;
                    letter-spacing: 2px;
                }
            </style>
        </head>
        <body>
            <!-- Royal Black & Gold Actions Bar for Web/Browser Preview -->
            <div class="no-print" style="
                display: flex;
                justify-content: center;
                gap: 6px;
                padding: 10px 8px;
                background: #0B0F17;
                border-bottom: 2px solid #C8A45C;
                margin: -8px -6px 12px -6px;
                position: sticky;
                top: 0;
                z-index: 1000;
            ">
                <button onclick="window.print()" style="
                    background: #0B0F17;
                    color: #DFCA95;
                    border: 1px solid #C8A45C;
                    padding: 5px 12px;
                    border-radius: 5px;
                    font-family: 'Cairo', sans-serif;
                    font-size: 11.5px;
                    font-weight: 700;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                ">
                    <span>🖨️ طباعة الفاتورة</span>
                </button>
                <button onclick="window.print()" style="
                    background: #0B0F17;
                    color: #DFCA95;
                    border: 1px solid #C8A45C;
                    padding: 5px 12px;
                    border-radius: 5px;
                    font-family: 'Cairo', sans-serif;
                    font-size: 11.5px;
                    font-weight: 700;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                ">
                    <span>📥 تصدير PDF</span>
                </button>
                <button onclick="window.close()" style="
                    background: #0B0F17;
                    color: #DFCA95;
                    border: 1px solid #C8A45C;
                    padding: 5px 10px;
                    border-radius: 5px;
                    font-family: 'Cairo', sans-serif;
                    font-size: 11.5px;
                    font-weight: 700;
                    cursor: pointer;
                ">
                    <span>✕ إغلاق</span>
                </button>
            </div>

            <!-- Receipt Container -->
            <div id="thermal-receipt-container">
                <!-- 1. Header & Store Info -->
                <div class="text-center">
                    <div class="store-title">${store.name || 'Cotton Club Store'}</div>
                    <div class="store-subtitle">الملابس الجاهزة والقطنيات الفاخرة</div>
                    ${isReturn 
                        ? '<div class="receipt-status-pill status-return">إيصال مرتجع مبيعات (Return)</div>' 
                        : '<div class="receipt-status-pill status-sale">إيصال مبيعات نقدية (Sale)</div>'}
                    ${store.address ? `<div style="font-size: 10px; color: #475569;">${store.address}</div>` : ''}
                    ${store.phone ? `<div style="font-size: 10px; color: #475569;">هاتف: ${store.phone}</div>` : ''}
                    ${store.taxNumber ? `<div style="font-size: 9.5px; color: #64748b;">الرقم الضريبي: ${store.taxNumber}</div>` : ''}
                </div>

                <div class="dashed-divider"></div>

                <!-- 2. Invoice Metadata (Audit & Administrative Accountability) -->
                <div class="meta-row">
                    <span style="color: #64748b;">رقم الفاتورة:</span>
                    <span class="bold" style="font-family: monospace; font-size: 11.5px;">${invoice.invoice_number}</span>
                </div>
                <div class="meta-row">
                    <span style="color: #64748b;">التاريخ والوقت:</span>
                    <span class="bold">${formattedDate}</span>
                </div>
                <div class="meta-row">
                    <span style="color: #64748b;">الكاشير المسؤول:</span>
                    <span>${invoice.cashier_name || 'كاشير المحل'}</span>
                </div>
                <div class="meta-row">
                    <span style="color: #64748b;">الفرع / الوردية:</span>
                    <span>الفرع الرئيسي / ${invoice.session_code || '-'}</span>
                </div>
                ${invoice.customer_name ? `
                <div class="meta-row">
                    <span style="color: #64748b;">العميل:</span>
                    <span class="bold">${invoice.customer_name} ${invoice.customer_phone ? `(${invoice.customer_phone})` : ''}</span>
                </div>
                ` : ''}

                <div class="dashed-divider"></div>

                <!-- 3. Items Grid Table -->
                <table>
                    <thead>
                        <tr style="border-bottom: 1.5px solid #0f172a; font-size: 10.5px; font-weight: 800; color: #0f172a;">
                            <th style="text-align: right; padding-bottom: 4px;">الصنف</th>
                            <th style="text-align: center; padding-bottom: 4px; width: 30px;">الكمية</th>
                            <th style="text-align: center; padding-bottom: 4px; width: 50px;">السعر</th>
                            <th style="text-align: left; padding-bottom: 4px; width: 55px;">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linesHtml}
                    </tbody>
                </table>

                <div class="dashed-divider"></div>

                <!-- 4. Subtotal & Discounts -->
                <div class="meta-row">
                    <span style="color: #475569;">المجموع الفرعي:</span>
                    <span style="font-weight: 700;">${invoice.subtotal.toFixed(2)} ${store.currency}</span>
                </div>
                ${invoice.discount_amount > 0 ? `
                <div class="meta-row" style="color: #b91c1c;">
                    <span>الخصم الممنوح (${invoice.discount_percent}%):</span>
                    <span style="font-weight: 700;">-${invoice.discount_amount.toFixed(2)} ${store.currency}</span>
                </div>
                ` : ''}

                <!-- 5. Grand Net Total Box (Prominent High Contrast Box) -->
                <div class="net-total-box">
                    <span style="font-size: 13px; font-weight: 900; color: #0f172a;">
                        ${isReturn ? 'المبلغ المسترد للمشتري:' : 'الصافي المطلوب سداده:'}
                    </span>
                    <span style="font-size: 15px; font-weight: 900; color: ${isReturn ? '#b91c1c' : '#0f172a'};">
                        ${invoice.final_total.toFixed(2)} ${store.currency}
                    </span>
                </div>

                <!-- 6. Payment Breakdown Methods -->
                <div style="margin: 4px 0;">
                    <div style="font-size: 10px; font-weight: 700; color: #475569; margin-bottom: 3px;">طريقة السداد المعتمدة:</div>
                    ${paymentsHtml}
                </div>

                <div class="dashed-divider"></div>

                <!-- 7. Legal Protection & Return Policy (14 Days) -->
                <div class="policy-box">
                    <b>شروط الاستبدال والاسترجاع:</b> البضاعة المباعة ترد وتستبدل خلال 14 يوماً من تاريخ الشراء بشرط وجود أصل الفاتورة وأن تكون الملابس بحالتها الأصلية غير مستعملة ومعلقة بها بطاقات الأسعار والأكواد.
                </div>

                <!-- 8. Encrypted Barcode for Direct Scanner Return (Code39) -->
                <div class="barcode-wrap">
                    <div class="barcode-glyph">*${invoice.invoice_number}*</div>
                    <div style="font-size: 9.5px; color: #64748b; font-weight: 700; margin-top: 1px;">
                        ${invoice.invoice_number}
                    </div>
                </div>

                <!-- 9. Brand Warm Greeting Footer -->
                <div class="text-center" style="font-size: 10.5px; margin-top: 6px; color: #334155;">
                    <div class="bold">${store.footer || 'شكراً لزيارتكم ونسعد بخدمتكم دائماً'}</div>
                    <div style="margin-top: 2px; font-size: 9.5px; color: #64748b; font-weight: 600;">Cotton Club Retail System</div>
                </div>
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
            <div class="row"><span>إجمالي المرتجعات:</span><span>-${(sessionData.totalReturns || 0).toFixed(2)} ${store.currency}</span></div>
            <div class="row"><span>المصروفات النثرية:</span><span>-${sessionData.totalExpenses.toFixed(2)} ${store.currency}</span></div>
            <div class="row"><span>إجمالي الخصومات:</span><span>${sessionData.totalDiscounts.toFixed(2)} ${store.currency}</span></div>
            <div class="divider"></div>
            <div class="row bold" style="font-size: 13px;">
                <span>صافي اليومية العام:</span>
                <span>${(sessionData.netShiftTotal != null ? sessionData.netShiftTotal : (sessionData.totalSales - (sessionData.totalReturns || 0) - sessionData.totalExpenses)).toFixed(2)} ${store.currency}</span>
            </div>
            <div class="row" style="font-size: 11px;"><span>• صافي الكاش (بعد المصروفات):</span><span>${(sessionData.netCash != null ? sessionData.netCash : (sessionData.netCashSales - sessionData.totalExpenses)).toFixed(2)} ${store.currency}</span></div>
            <div class="row" style="font-size: 11px;"><span>• صافي البطاقات (فيزا):</span><span>${(sessionData.netCard != null ? sessionData.netCard : sessionData.netCardSales).toFixed(2)} ${store.currency}</span></div>
            <div class="row" style="font-size: 11px;"><span>• صافي التحويلات (إنستاباي):</span><span>${(sessionData.netTransfer != null ? sessionData.netTransfer : sessionData.netTransferSales).toFixed(2)} ${store.currency}</span></div>
            ${sessionData.totalSupplierPayments > 0 ? `<div class="row"><span>مدفوعات الموردين النقدية:</span><span>-${sessionData.totalSupplierPayments.toFixed(2)} ${store.currency}</span></div>` : ''}

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
