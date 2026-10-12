/**
 * Cotton Club POS - Frontend Application Logic
 * Interactive POS cart, scanner buffer, real-time drawer calculations,
 * and keyboard shortcut bindings.
 */

// Browser API Fallback (Enables instant web browser preview alongside Electron)
if (!window.api) {
    const rpc = async (endpoint, data = {}) => {
        const res = await fetch(`/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    };

    window.api = {
        login: (username, password) => rpc('auth/login', { username, password }),
        verifyManager: (username, password) => rpc('auth/verify-manager', { username, password }),
        listUsers: () => rpc('auth/list-users'),
        getActiveSession: () => rpc('session/get-active'),
        openSession: (userId, openingCash, notes) => rpc('session/open', { userId, openingCash, notes }),
        getSessionSummary: (sessionId) => rpc('session/get-summary', { sessionId }),
        closeSession: (sessionId, userId, actualCash, notes) => rpc('session/close', { sessionId, userId, actualCash, notes }),
        listSessions: (limit) => rpc('session/list', { limit }),
        searchProducts: (query, limit) => rpc('pos/search-products', { query, limit }),
        findProductByBarcode: (barcode) => rpc('pos/find-barcode', { barcode }),
        checkout: (saleData) => rpc('pos/checkout', saleData),
        getInvoice: (id) => rpc('pos/get-invoice', { id }),
        voidInvoice: (invoiceId, managerUserId, reason) => rpc('pos/void-invoice', { invoiceId, managerUserId, reason }),
        listRecentInvoices: (limit) => rpc('pos/list-recent', { limit }),
        listProducts: (filters) => rpc('inventory/list-products', filters),
        createProduct: (data, userId) => rpc('inventory/create-product', { data, userId }),
        updateProduct: (id, data, userId) => rpc('inventory/update-product', { id, data, userId }),
        adjustStock: (data, userId, sessionId) => rpc('inventory/adjust-stock', { data, userId, sessionId }),
        getInventoryValuation: () => rpc('inventory/valuation'),
        listCategories: () => rpc('inventory/list-categories'),
        createCategory: (name, desc) => rpc('inventory/create-category', { name, desc }),
        listSuppliers: () => rpc('purchases/list-suppliers'),
        createSupplier: (data) => rpc('purchases/create-supplier', data),
        createPurchaseInvoice: (data, userId) => rpc('purchases/create-invoice', { data, userId }),
        recordSupplierPayment: (data, userId) => rpc('purchases/record-payment', { data, userId }),
        listPurchaseInvoices: (limit) => rpc('purchases/list-invoices', { limit }),
        addExpense: (data, userId) => rpc('expenses/add', { data, userId }),
        listSessionExpenses: (sessionId) => rpc('expenses/list-session', { sessionId }),
        listAllExpenses: (limit) => rpc('expenses/list-all', { limit }),
        getSalesSummary: (startDate, endDate) => rpc('reports/sales-summary', { startDate, endDate }),
        getTopSelling: (limit, startDate, endDate) => rpc('reports/top-selling', { limit, startDate, endDate }),
        getCategorySales: (startDate, endDate) => rpc('reports/category-sales', { startDate, endDate }),
        getDashboardOverview: () => rpc('reports/dashboard-overview'),
        previewReceiptHtml: (invoiceId) => rpc('printer/preview-invoice', { invoiceId }),
        printInvoiceReceipt: (invoiceId) => rpc('printer/print-invoice', { invoiceId }),
        printZReport: (sessionId) => rpc('printer/print-z-report', { sessionId }),
        getSettings: () => rpc('settings/get-all'),
        updateSettings: (settingsMap, userId) => rpc('settings/update', { settingsMap, userId })
    };
}

// Global Application State
const state = {
    currentUser: null,
    activeSession: null,
    cart: [],
    discountPercent: 0,
    managerOverride: null,
    selectedPaymentMethod: 'cash',
    currentInvoiceId: null,
    settings: {}
};

// Clock
setInterval(() => {
    const el = document.getElementById('clockDisplay');
    if (el) el.innerText = new Date().toLocaleTimeString('ar-EG');
}, 1000);

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    bindLoginPageEvents();
    bindNavigation();
    bindKeyboardShortcuts();
    bindModals();
    bindPosEvents();
    bindSessionEvents();
    bindInventoryEvents();
    bindExpenseEvents();
    bindSettingsEvents();
    bindReportEvents();
});

/* -------------------------------------------------------------
 * 1. AUTHENTICATION & DEDICATED LOGIN PAGE
 * ------------------------------------------------------------- */
function bindLoginPageEvents() {
    const tabAdmin = document.getElementById('tabPortalAdmin');
    const tabCashier = document.getElementById('tabPortalCashier');
    const infoText = document.getElementById('portalInfoText');
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const loginBtnText = document.getElementById('loginBtnText');
    const toggleEye = document.getElementById('btnTogglePassword');

    // Portal Switcher (Admin / Cashier)
    tabAdmin.addEventListener('click', () => {
        tabAdmin.classList.add('active');
        tabCashier.classList.remove('active');
        infoText.innerHTML = 'دخول الإدارة العامة والمستودع الرئيسي<br>لوحة القيادة، المخازن المركزية، والتقارير المالية والتشغيلية.';
        usernameInput.value = 'ma';
        passwordInput.value = 'ma';
        loginBtnText.innerText = 'دخول لوحة الإدارة العامة';
        usernameInput.focus();
    });

    tabCashier.addEventListener('click', () => {
        tabCashier.classList.add('active');
        tabAdmin.classList.remove('active');
        infoText.innerHTML = 'دخول نقطة البيع المباشرة (POS)<br>مسح الباركود، إصدار الفواتير الفورية، وتسليم عهدة الوردية.';
        usernameInput.value = 'co';
        passwordInput.value = 'co';
        loginBtnText.innerText = 'دخول نقطة البيع والوردية';
        usernameInput.focus();
    });

    // Password Toggle Eye
    toggleEye.addEventListener('click', () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        toggleEye.innerText = isPassword ? '🙈' : '👁️';
    });

    // Submit actions
    document.getElementById('btnLoginSubmit').addEventListener('click', handleLogin);
    usernameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') passwordInput.focus();
    });
    passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
}

async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginErrorMsg');

    try {
        const res = await window.api.login(username, password);
        if (!res.success) {
            errorEl.innerText = res.error || 'فشل تسجيل الدخول';
            errorEl.style.display = 'block';
            return;
        }

        state.currentUser = res.data;
        document.getElementById('headerUserName').innerText = state.currentUser.displayName;
        document.getElementById('headerUserRole').innerText = state.currentUser.role === 'admin' ? 'مدير عام' : 'كاشير';

        // Hide Dedicated Login Screen
        document.getElementById('loginScreen').style.display = 'none';

        await loadSettings();
        await refreshSessionState();
        await loadPosProducts();

        // Switch to POS
        switchView('pos');
    } catch (err) {
        errorEl.innerText = err.message;
        errorEl.style.display = 'block';
    }
}

document.getElementById('btnLogout').addEventListener('click', () => {
    state.currentUser = null;
    state.cart = [];
    renderCart();

    // Show Dedicated Login Screen
    const loginScreen = document.getElementById('loginScreen');
    loginScreen.style.display = 'flex';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginErrorMsg').style.display = 'none';
});

async function refreshSessionState() {
    try {
        const res = await window.api.getActiveSession();
        state.activeSession = res.data;

        const indicator = document.getElementById('sessionIndicator');
        const text = document.getElementById('sessionStatusText');

        if (state.activeSession) {
            indicator.className = 'session-indicator open';
            text.innerText = `وردية مفتوحة (${state.activeSession.session_code})`;
            document.getElementById('btnOpenSessionPrompt').style.display = 'none';
            document.getElementById('btnCloseSessionPrompt').style.display = 'inline-block';
            await loadSessionDashboard();
        } else {
            indicator.className = 'session-indicator closed';
            text.innerText = 'الوردية مغلقة (يجب فتح وردية للبيع)';
            document.getElementById('btnOpenSessionPrompt').style.display = 'inline-block';
            document.getElementById('btnCloseSessionPrompt').style.display = 'none';
        }
    } catch (err) {
        console.error('Session check failed:', err);
    }
}

/* -------------------------------------------------------------
 * 2. NAVIGATION & KEYBOARD SHORTCUTS
 * ------------------------------------------------------------- */
function bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            switchView(view);
        });
    });
}

function switchView(viewName) {
    // Restrict settings to admin
    if (viewName === 'settings' && state.currentUser?.role === 'cashier') {
        alert('هذه الصفحة متاحة لمدير النظام فقط.');
        return;
    }

    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.view === viewName);
    });

    document.querySelectorAll('.view-panel').forEach(el => {
        el.classList.toggle('active', el.id === `view-${viewName}`);
    });

    if (viewName === 'pos') {
        document.getElementById('posBarcodeInput').focus();
        loadPosProducts();
    } else if (viewName === 'session') {
        loadSessionDashboard();
    } else if (viewName === 'inventory') {
        loadInventoryView();
    } else if (viewName === 'purchases') {
        loadPurchasesView();
    } else if (viewName === 'expenses') {
        loadExpensesView();
    } else if (viewName === 'reports') {
        loadReportsView();
    } else if (viewName === 'settings') {
        populateSettingsForm();
    }
}

function bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
        // Modal active - allow ESC to close
        const activeModal = document.querySelector('.modal-overlay.active:not(#modalLogin)');
        if (e.key === 'Escape' && activeModal) {
            activeModal.classList.remove('active');
            return;
        }

        // F1: Focus Barcode Search
        if (e.key === 'F1') {
            e.preventDefault();
            switchView('pos');
            document.getElementById('posBarcodeInput').focus();
        }

        // F4: Discount Modal
        if (e.key === 'F4') {
            e.preventDefault();
            if (state.cart.length > 0) {
                openDiscountModal();
            }
        }

        // F5: Cycle Payment Method
        if (e.key === 'F5') {
            e.preventDefault();
            cyclePaymentMethod();
        }

        // F10: Finalize Sale
        if (e.key === 'F10') {
            e.preventDefault();
            if (state.cart.length > 0) {
                finalizeSale();
            }
        }

        // F12: Clear Cart
        if (e.key === 'F12') {
            e.preventDefault();
            clearCart();
        }
    });
}

function cyclePaymentMethod() {
    const methods = ['cash', 'card', 'split'];
    const currentIndex = methods.indexOf(state.selectedPaymentMethod);
    const nextIndex = (currentIndex + 1) % methods.length;
    setPaymentMethod(methods[nextIndex]);
}

function setPaymentMethod(method) {
    state.selectedPaymentMethod = method;
    document.querySelectorAll('.btn-payment-method').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === method);
    });
}

/* -------------------------------------------------------------
 * 3. POS & CART LOGIC
 * ------------------------------------------------------------- */
function bindPosEvents() {
    const barcodeInput = document.getElementById('posBarcodeInput');

    // Barcode enter / search
    barcodeInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const query = barcodeInput.value.trim();
            if (!query) return;

            // Direct barcode match
            const res = await window.api.findProductByBarcode(query);
            if (res.success && res.data) {
                addToCart(res.data);
                barcodeInput.value = '';
            } else {
                // If not exact barcode, filter table
                await loadPosProducts(query);
            }
        }
    });

    // Clear cart button
    document.getElementById('btnClearCart').addEventListener('click', clearCart);

    // Discount modal trigger
    document.getElementById('btnOpenDiscountModal').addEventListener('click', openDiscountModal);

    // Payment methods buttons
    document.querySelectorAll('.btn-payment-method').forEach(btn => {
        btn.addEventListener('click', () => setPaymentMethod(btn.dataset.method));
    });

    // Checkout button
    document.getElementById('btnFinalizeSale').addEventListener('click', finalizeSale);
}

async function loadPosProducts(searchQuery = '') {
    const res = await window.api.searchProducts(searchQuery, 30);
    const tbody = document.getElementById('posProductsTableBody');
    tbody.innerHTML = '';

    if (!res.success || !res.data || res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">لا توجد أصناف مطابقة</td></tr>';
        return;
    }

    res.data.forEach(prod => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: bold;">${prod.barcode}</td>
            <td style="font-weight: 600;">${prod.item_name}</td>
            <td style="color: var(--text-secondary);">${prod.category_name || '-'}</td>
            <td style="color: var(--accent-emerald); font-weight: bold;">${prod.sell_price.toFixed(2)} ج.م</td>
            <td>
                <span class="badge ${prod.current_stock <= prod.min_stock_alert ? 'badge-low-stock' : 'badge-ok'}">
                    ${prod.current_stock}
                </span>
            </td>
            <td style="text-align: center;">
                <button class="btn-primary" style="padding: 4px 10px; font-size: 12px;" onclick="addProdById(${prod.id})">
                    + إضافة
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Window function for table add
window.addProdById = async function(id) {
    const res = await window.api.listProducts({});
    const product = res.data?.find(p => p.id === id);
    if (product) addToCart(product);
};

function addToCart(product) {
    if (!state.activeSession) {
        alert('تنبيه: يجب فتح وردية يومية أولاً لإتمام عمليات البيع!');
        switchView('session');
        return;
    }

    const existing = state.cart.find(item => item.productId === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({
            productId: product.id,
            barcode: product.barcode,
            itemName: product.item_name,
            sellPrice: product.sell_price,
            quantity: 1
        });
    }

    renderCart();
}

function renderCart() {
    const container = document.getElementById('cartItemsContainer');
    container.innerHTML = '';

    if (state.cart.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); text-align: center; margin-top: 40px; font-size: 13px;">السلة فارغة، قم بمسح باركود لإضافة الأصناف</div>';
        updateCartTotals(0, 0, 0);
        return;
    }

    let subtotal = 0;

    state.cart.forEach((item, index) => {
        const lineTotal = item.quantity * item.sellPrice;
        subtotal += lineTotal;

        const card = document.createElement('div');
        card.className = 'cart-item-card';
        card.innerHTML = `
            <div style="flex: 1;">
                <div class="cart-item-title">${item.itemName}</div>
                <div class="cart-item-meta">${item.sellPrice.toFixed(2)} ج.م × ${item.quantity} = <strong style="color: var(--accent-emerald);">${lineTotal.toFixed(2)} ج.م</strong></div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <button class="btn-qty" onclick="changeQty(${index}, -1)">-</button>
                <span style="font-weight: bold; width: 22px; text-align: center;">${item.quantity}</span>
                <button class="btn-qty" onclick="changeQty(${index}, 1)">+</button>
                <button class="btn-del" onclick="removeCartItem(${index})">✕</button>
            </div>
        `;
        container.appendChild(card);
    });

    const discountAmount = Math.round((subtotal * (state.discountPercent / 100)) * 100) / 100;
    const finalTotal = Math.max(0, subtotal - discountAmount);

    updateCartTotals(subtotal, discountAmount, finalTotal);
}

window.changeQty = function(index, delta) {
    if (state.cart[index]) {
        state.cart[index].quantity += delta;
        if (state.cart[index].quantity <= 0) {
            state.cart.splice(index, 1);
        }
        renderCart();
    }
};

window.removeCartItem = function(index) {
    if (state.cart[index]) {
        state.cart.splice(index, 1);
        renderCart();
    }
};

function clearCart() {
    state.cart = [];
    state.discountPercent = 0;
    state.managerOverride = null;
    renderCart();
}

function updateCartTotals(subtotal, discountAmount, finalTotal) {
    document.getElementById('cartSubtotal').innerText = `${subtotal.toFixed(2)} ج.م`;
    document.getElementById('cartDiscountDisplay').innerText = `${discountAmount.toFixed(2)} ج.م (${state.discountPercent}%)`;
    document.getElementById('cartFinalTotal').innerText = `${finalTotal.toFixed(2)} ج.م`;
}

function openDiscountModal() {
    const modal = document.getElementById('modalDiscount');
    document.getElementById('discountPercentInput').value = state.discountPercent;
    
    const overrideSection = document.getElementById('managerOverrideSection');
    const maxCashierDiscount = Number(state.settings?.cashier_max_discount_percent || 5);

    document.getElementById('discountPercentInput').oninput = (e) => {
        const val = Number(e.target.value);
        if (state.currentUser?.role === 'cashier' && val > maxCashierDiscount) {
            overrideSection.style.display = 'block';
        } else {
            overrideSection.style.display = 'none';
        }
    };

    modal.classList.add('active');
}

document.getElementById('btnApplyDiscount').addEventListener('click', () => {
    const percent = Number(document.getElementById('discountPercentInput').value) || 0;
    const maxCashierDiscount = Number(state.settings?.cashier_max_discount_percent || 5);

    if (state.currentUser?.role === 'cashier' && percent > maxCashierDiscount) {
        const overrideUser = document.getElementById('overrideUsername').value.trim();
        const overridePass = document.getElementById('overridePassword').value;
        if (!overrideUser || !overridePass) {
            alert('يلزم إدخال اسم وكلمة مرور المدير لتفويض هذا الخصم');
            return;
        }
        state.managerOverride = { username: overrideUser, password: overridePass };
    } else {
        state.managerOverride = null;
    }

    state.discountPercent = percent;
    document.getElementById('modalDiscount').classList.remove('active');
    renderCart();
});

async function finalizeSale() {
    if (!state.activeSession) {
        alert('لا توجد وردية مفتوحة للبيع!');
        return;
    }

    if (state.cart.length === 0) {
        alert('سلة المشتريات فارغة');
        return;
    }

    const checkoutBtn = document.getElementById('btnFinalizeSale');
    checkoutBtn.disabled = true;

    try {
        const saleData = {
            sessionId: state.activeSession.id,
            userId: state.currentUser.id,
            userRole: state.currentUser.role,
            items: state.cart.map(i => ({
                productId: i.productId,
                quantity: i.quantity,
                itemName: i.itemName
            })),
            discountPercent: state.discountPercent,
            paymentMethod: state.selectedPaymentMethod,
            managerOverride: state.managerOverride
        };

        const res = await window.api.checkout(saleData);
        if (!res.success) {
            alert(`خطأ في إتمام العملية: ${res.error}`);
            checkoutBtn.disabled = false;
            return;
        }

        const invoice = res.data;
        state.currentInvoiceId = invoice.id;

        // Auto print or show preview
        const receiptHtml = await window.api.previewReceiptHtml(invoice.id);
        if (receiptHtml.success) {
            document.getElementById('receiptPreviewContent').innerHTML = receiptHtml.data;
            document.getElementById('modalReceiptPreview').classList.add('active');
        }

        clearCart();
        await loadPosProducts();
        await refreshSessionState();
    } catch (err) {
        alert(err.message);
    } finally {
        checkoutBtn.disabled = false;
    }
}

document.getElementById('btnPrintReceiptFromPreview').addEventListener('click', async () => {
    if (state.currentInvoiceId) {
        await window.api.printInvoiceReceipt(state.currentInvoiceId);
        document.getElementById('modalReceiptPreview').classList.remove('active');
    }
});

/* -------------------------------------------------------------
 * 4. DAILY SESSION & Z-REPORT LOGIC
 * ------------------------------------------------------------- */
function bindSessionEvents() {
    document.getElementById('btnOpenSessionPrompt').addEventListener('click', () => {
        document.getElementById('modalOpenSession').classList.add('active');
    });

    document.getElementById('btnSubmitOpenSession').addEventListener('click', async () => {
        const cash = Number(document.getElementById('openSessionCash').value) || 0;
        const notes = document.getElementById('openSessionNotes').value.trim();

        const res = await window.api.openSession(state.currentUser.id, cash, notes);
        if (!res.success) {
            alert(res.error);
            return;
        }

        document.getElementById('modalOpenSession').classList.remove('active');
        await refreshSessionState();
    });

    document.getElementById('btnCloseSessionPrompt').addEventListener('click', async () => {
        if (!state.activeSession) return;
        const summaryRes = await window.api.getSessionSummary(state.activeSession.id);
        if (!summaryRes.success) return;

        const s = summaryRes.data;
        document.getElementById('closeSessionSummaryDetails').innerHTML = `
            <div><strong>رصيد بداية اليوم:</strong> ${s.openingCash.toFixed(2)} ج.م</div>
            <div><strong>المبيعات النقدية:</strong> ${s.totalCashSales.toFixed(2)} ج.م</div>
            <div><strong>المصروفات النثرية:</strong> -${s.totalExpenses.toFixed(2)} ج.م</div>
            <div><strong>سداد الموردين:</strong> -${s.totalSupplierPayments.toFixed(2)} ج.م</div>
            <div style="font-weight: bold; color: var(--accent-emerald); font-size: 15px; margin-top: 4px;">
                <strong>النقدية المفترضة بالدرج:</strong> ${s.expectedCash.toFixed(2)} ج.م
            </div>
        `;

        document.getElementById('closeSessionActualCash').value = s.expectedCash;
        document.getElementById('modalCloseSession').classList.add('active');
    });

    document.getElementById('btnSubmitCloseSession').addEventListener('click', async () => {
        const actual = Number(document.getElementById('closeSessionActualCash').value);
        const notes = document.getElementById('closeSessionNotes').value.trim();

        const res = await window.api.closeSession(
            state.activeSession.id,
            state.currentUser.id,
            actual,
            notes
        );

        if (!res.success) {
            alert(res.error);
            return;
        }

        alert(`تم إغلاق الوردية بنجاح!\nالفارق: ${res.data.cashDifference} ج.م (${res.data.differenceStatus === 'matching' ? 'مطابق' : res.data.differenceStatus === 'deficit' ? 'عجز' : 'زيادة'})\nتم أخذ نسخة احتياطية من قاعدة البيانات.`);
        document.getElementById('modalCloseSession').classList.remove('active');

        // Print Z-Report
        await window.api.printZReport(state.activeSession.id);
        await refreshSessionState();
    });
}

async function loadSessionDashboard() {
    if (!state.activeSession) return;
    const summaryRes = await window.api.getSessionSummary(state.activeSession.id);
    if (summaryRes.success) {
        const s = summaryRes.data;
        document.getElementById('sessionCardOpening').innerText = `${s.openingCash.toFixed(2)} ج.م`;
        document.getElementById('sessionCardSales').innerText = `${s.totalSales.toFixed(2)} ج.م`;
        document.getElementById('sessionCardExpenses').innerText = `${s.totalExpenses.toFixed(2)} ج.م`;
        document.getElementById('sessionCardSuppliers').innerText = `${s.totalSupplierPayments.toFixed(2)} ج.م`;
        document.getElementById('sessionCardExpected').innerText = `${s.expectedCash.toFixed(2)} ج.م`;
    }

    const histRes = await window.api.listSessions(15);
    if (histRes.success) {
        const tbody = document.getElementById('sessionHistoryTableBody');
        tbody.innerHTML = '';
        histRes.data.forEach(h => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: bold;">${h.session_code}</td>
                <td>${h.opened_by_name || '-'}</td>
                <td>${h.opening_cash.toFixed(2)} ج.م</td>
                <td>${h.closing_cash_expected ? h.closing_cash_expected.toFixed(2) + ' ج.م' : '-'}</td>
                <td>${h.closing_cash_actual ? h.closing_cash_actual.toFixed(2) + ' ج.م' : '-'}</td>
                <td style="color: ${h.cash_difference < 0 ? 'var(--accent-rose)' : h.cash_difference > 0 ? 'var(--accent-emerald)' : 'inherit'}; font-weight: bold;">
                    ${h.cash_difference !== null ? h.cash_difference.toFixed(2) + ' ج.م' : '-'}
                </td>
                <td><span class="badge ${h.status === 'open' ? 'badge-ok' : 'badge-low-stock'}">${h.status === 'open' ? 'مفتوحة' : 'مغلقة'}</span></td>
                <td>${h.opened_at}</td>
                <td>${h.closed_at || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

/* -------------------------------------------------------------
 * 5. INVENTORY & STOCK
 * ------------------------------------------------------------- */
function bindInventoryEvents() {
    document.getElementById('inventorySearchInput').addEventListener('input', loadInventoryTable);
    document.getElementById('inventoryCategoryFilter').addEventListener('change', loadInventoryTable);
    document.getElementById('chkLowStockOnly').addEventListener('change', loadInventoryTable);

    document.getElementById('btnOpenNewProductModal').addEventListener('click', async () => {
        const cats = await window.api.listCategories();
        const sel = document.getElementById('prodCategory');
        sel.innerHTML = '<option value="">اختر القسم...</option>';
        cats.data?.forEach(c => {
            sel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
        document.getElementById('modalNewProduct').classList.add('active');
    });

    document.getElementById('btnSaveNewProduct').addEventListener('click', async () => {
        const barcode = document.getElementById('prodBarcode').value.trim();
        const itemName = document.getElementById('prodName').value.trim();
        const categoryId = document.getElementById('prodCategory').value;
        const costPrice = document.getElementById('prodCost').value;
        const sellPrice = document.getElementById('prodPrice').value;
        const initialStock = document.getElementById('prodStock').value;
        const minStockAlert = document.getElementById('prodMinAlert').value;

        const res = await window.api.createProduct({
            barcode,
            itemName,
            categoryId: categoryId ? Number(categoryId) : null,
            costPrice,
            sellPrice,
            initialStock,
            minStockAlert
        }, state.currentUser.id);

        if (!res.success) {
            alert(res.error);
            return;
        }

        document.getElementById('modalNewProduct').classList.remove('active');
        await loadInventoryView();
    });
}

async function loadInventoryView() {
    // Valuation cards
    const valRes = await window.api.getInventoryValuation();
    if (valRes.success) {
        const v = valRes.data;
        document.getElementById('inventoryValuationGrid').innerHTML = `
            <div class="stat-card cyan">
                <span class="stat-label">إجمالي الأصناف المسجلة</span>
                <span class="stat-value">${v.totalItems} صنف (${v.totalUnits} قطعة)</span>
            </div>
            <div class="stat-card amber">
                <span class="stat-label">قيمة المخزون بسعر التكلفة</span>
                <span class="stat-value">${v.totalCostValuation.toFixed(2)} ج.م</span>
            </div>
            <div class="stat-card emerald">
                <span class="stat-label">قيمة المخزون بسعر البيع (المتوقع)</span>
                <span class="stat-value">${v.totalRetailValuation.toFixed(2)} ج.م</span>
            </div>
            <div class="stat-card rose">
                <span class="stat-label">أصناف أوشكت على النفاد (نواقص)</span>
                <span class="stat-value">${v.lowStockCount} صنف</span>
            </div>
        `;
    }

    // Categories filter
    const catsRes = await window.api.listCategories();
    const sel = document.getElementById('inventoryCategoryFilter');
    sel.innerHTML = '<option value="">جميع الأقسام</option>';
    catsRes.data?.forEach(c => {
        sel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });

    await loadInventoryTable();
}

async function loadInventoryTable() {
    const search = document.getElementById('inventorySearchInput').value;
    const categoryId = document.getElementById('inventoryCategoryFilter').value;
    const lowStockOnly = document.getElementById('chkLowStockOnly').checked;

    const res = await window.api.listProducts({
        search,
        categoryId: categoryId ? Number(categoryId) : null,
        lowStockOnly
    });

    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';

    res.data?.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: bold;">${p.barcode}</td>
            <td style="font-weight: 600;">${p.item_name}</td>
            <td>${p.category_name || '-'}</td>
            <td>${p.cost_price.toFixed(2)} ج.م</td>
            <td style="color: var(--accent-emerald); font-weight: bold;">${p.sell_price.toFixed(2)} ج.م</td>
            <td>
                <span class="badge ${p.current_stock <= p.min_stock_alert ? 'badge-low-stock' : 'badge-ok'}">
                    ${p.current_stock}
                </span>
            </td>
            <td>${p.min_stock_alert}</td>
            <td><span class="badge badge-ok">${p.is_active ? 'نشط' : 'معطل'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

/* -------------------------------------------------------------
 * 6. EXPENSES & PURCHASES
 * ------------------------------------------------------------- */
function bindExpenseEvents() {
    document.getElementById('btnOpenAddExpenseModal').addEventListener('click', () => {
        if (!state.activeSession) {
            alert('يجب فتح وردية أولاً لتسجيل سند صرف من الدرج');
            return;
        }
        document.getElementById('modalAddExpense').classList.add('active');
    });

    document.getElementById('btnSaveExpense').addEventListener('click', async () => {
        const amount = document.getElementById('expenseAmount').value;
        const category = document.getElementById('expenseCategory').value;
        const description = document.getElementById('expenseDescription').value.trim();
        const paidTo = document.getElementById('expensePaidTo').value.trim();

        const res = await window.api.addExpense({
            sessionId: state.activeSession.id,
            amount,
            category,
            description,
            paidTo
        }, state.currentUser.id);

        if (!res.success) {
            alert(res.error);
            return;
        }

        document.getElementById('modalAddExpense').classList.remove('active');
        await loadExpensesView();
        await refreshSessionState();
    });
}

async function loadExpensesView() {
    const res = await window.api.listAllExpenses(50);
    const tbody = document.getElementById('expensesTableBody');
    tbody.innerHTML = '';

    res.data?.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#EXP-${e.id}</td>
            <td><span class="badge" style="background: var(--bg-card-hover);">${e.category}</span></td>
            <td style="color: var(--accent-rose); font-weight: bold;">-${e.amount.toFixed(2)} ج.م</td>
            <td>${e.description}</td>
            <td>${e.paid_to || '-'}</td>
            <td>${e.approved_by_name}</td>
            <td>${e.created_at}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadPurchasesView() {
    const supRes = await window.api.listSuppliers();
    const supTbody = document.getElementById('suppliersTableBody');
    supTbody.innerHTML = '';
    supRes.data?.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${s.name}</td>
            <td>${s.phone || '-'}</td>
            <td style="color: ${s.balance > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'}; font-weight: bold;">
                ${s.balance.toFixed(2)} ج.م
            </td>
        `;
        supTbody.appendChild(tr);
    });

    const invRes = await window.api.listPurchaseInvoices(30);
    const invTbody = document.getElementById('purchaseInvoicesTableBody');
    invTbody.innerHTML = '';
    invRes.data?.forEach(i => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: bold;">${i.invoice_number}</td>
            <td>${i.supplier_name}</td>
            <td style="font-weight: bold;">${i.total_amount.toFixed(2)} ج.م</td>
            <td>${i.paid_amount.toFixed(2)} ج.م</td>
            <td style="color: var(--accent-rose);">${i.remaining_amount.toFixed(2)} ج.م</td>
            <td><span class="badge ${i.payment_status === 'paid' ? 'badge-ok' : 'badge-low-stock'}">${i.payment_status === 'paid' ? 'مسددة' : 'آجلة'}</span></td>
            <td>${i.created_at}</td>
        `;
        invTbody.appendChild(tr);
    });
}

/* -------------------------------------------------------------
 * 7. REPORTS & ANALYTICS
 * ------------------------------------------------------------- */
function bindReportEvents() {
    document.getElementById('btnRefreshReports').addEventListener('click', loadReportsView);
}

async function loadReportsView() {
    const start = document.getElementById('reportStartDate').value;
    const end = document.getElementById('reportEndDate').value;

    const summaryRes = await window.api.getSalesSummary(start, end);
    if (summaryRes.success) {
        const t = summaryRes.data.totals;
        document.getElementById('reportsKpiGrid').innerHTML = `
            <div class="stat-card cyan">
                <span class="stat-label">عدد الفواتير المنفذة</span>
                <span class="stat-value">${t.total_invoices}</span>
            </div>
            <div class="stat-card emerald">
                <span class="stat-label">إجمالي المبيعات (الصافي)</span>
                <span class="stat-value">${t.net_sales.toFixed(2)} ج.م</span>
            </div>
            <div class="stat-card emerald">
                <span class="stat-label">مجمل الربح التقديري</span>
                <span class="stat-value">${t.gross_profit.toFixed(2)} ج.م (${t.profitMarginPercent}%)</span>
            </div>
            <div class="stat-card amber">
                <span class="stat-label">المبيعات النقدية vs الشبكة</span>
                <span class="stat-value" style="font-size: 16px;">كاش: ${t.cash_sales.toFixed(0)} | شبكة: ${t.card_sales.toFixed(0)}</span>
            </div>
        `;
    }

    const topRes = await window.api.getTopSelling(10, start, end);
    const topTbody = document.getElementById('topSellingTableBody');
    topTbody.innerHTML = '';
    topRes.data?.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${item.item_name}</td>
            <td style="text-align: center; font-weight: bold;">${item.total_quantity_sold}</td>
            <td style="color: var(--accent-emerald); font-weight: bold;">${item.total_revenue.toFixed(2)} ج.م</td>
            <td>${item.total_profit.toFixed(2)} ج.م</td>
        `;
        topTbody.appendChild(tr);
    });

    const catRes = await window.api.getCategorySales(start, end);
    const catTbody = document.getElementById('categorySalesTableBody');
    catTbody.innerHTML = '';
    catRes.data?.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600;">${c.category_name}</td>
            <td style="text-align: center;">${c.total_units_sold}</td>
            <td style="color: var(--accent-emerald); font-weight: bold;">${c.total_revenue.toFixed(2)} ج.م</td>
        `;
        catTbody.appendChild(tr);
    });
}

/* -------------------------------------------------------------
 * 8. SETTINGS
 * ------------------------------------------------------------- */
function bindSettingsEvents() {
    document.getElementById('btnSaveSettings').addEventListener('click', async () => {
        const settingsMap = {
            store_name: document.getElementById('setting_store_name').value.trim(),
            store_phone: document.getElementById('setting_store_phone').value.trim(),
            store_address: document.getElementById('setting_store_address').value.trim(),
            tax_number: document.getElementById('setting_tax_number').value.trim(),
            receipt_footer: document.getElementById('setting_receipt_footer').value.trim(),
            printer_paper_width: document.getElementById('setting_printer_paper_width').value,
            cashier_max_discount_percent: document.getElementById('setting_cashier_max_discount_percent').value
        };

        const res = await window.api.updateSettings(settingsMap, state.currentUser.id);
        if (res.success) {
            alert('تم حفظ وتحديث الإعدادات بنجاح!');
            state.settings = res.data;
            document.getElementById('headerStoreName').innerText = state.settings.store_name;
        } else {
            alert(`خطأ في الحفظ: ${res.error}`);
        }
    });
}

async function loadSettings() {
    const res = await window.api.getSettings();
    if (res.success) {
        state.settings = res.data;
        if (state.settings.store_name) {
            document.getElementById('headerStoreName').innerText = state.settings.store_name;
        }
    }
}

function populateSettingsForm() {
    const s = state.settings;
    if (!s) return;
    document.getElementById('setting_store_name').value = s.store_name || '';
    document.getElementById('setting_store_phone').value = s.store_phone || '';
    document.getElementById('setting_store_address').value = s.store_address || '';
    document.getElementById('setting_tax_number').value = s.tax_number || '';
    document.getElementById('setting_receipt_footer').value = s.receipt_footer || '';
    document.getElementById('setting_printer_paper_width').value = s.printer_paper_width || '80mm';
    document.getElementById('setting_cashier_max_discount_percent').value = s.cashier_max_discount_percent || '5';
}

/* -------------------------------------------------------------
 * 9. MODAL HELPERS
 * ------------------------------------------------------------- */
function bindModals() {
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const overlay = btn.closest('.modal-overlay');
            if (overlay && overlay.id !== 'modalLogin') {
                overlay.classList.remove('active');
            }
        });
    });
}
