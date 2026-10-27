/**
 * Cotton Club POS - Frontend Application Logic
 * Interactive POS cart, scanner buffer, real-time drawer calculations,
 * and keyboard shortcut bindings.
 */

/**
 * Global HTML Escaping Utility for XSS Prevention
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

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
        createUser: (data, userId) => rpc('auth/create-user', { data, userId }),
        updateUser: (id, data, userId) => rpc('auth/update-user', { id, data, userId }),
        changePassword: (id, password, userId) => rpc('auth/change-password', { id, password, userId }),
        toggleUserStatus: (id, userId) => rpc('auth/toggle-status', { id, userId }),
        deleteUser: (id, userId) => rpc('auth/delete-user', { id, userId }),
        getUsersKpis: () => rpc('auth/users-kpis'),
        getActiveSession: () => rpc('session/get-active'),
        openSession: (userId, openingCash, notes) => rpc('session/open', { userId, openingCash, notes }),
        getSessionSummary: (sessionId) => rpc('session/get-summary', { sessionId }),
        closeSession: (sessionId, userId, actualCash, notes) => rpc('session/close', { sessionId, userId, actualCash, notes }),
        listSessions: (filters) => rpc('session/list', typeof filters === 'number' ? { limit: filters } : (filters || {})),
        searchProducts: (query, limit = 20, categoryId = null) => rpc('pos/search-products', { query, limit, categoryId }),
        findProductByBarcode: (barcode) => rpc('pos/find-barcode', { barcode }),
        searchCustomers: (query, limit) => rpc('pos/search-customers', { query, limit }),
        quickCreateCustomer: (data) => rpc('pos/quick-create-customer', data),
        listCustomers: (params) => rpc('customers/list', params || {}),
        getCustomerStats: () => rpc('customers/stats'),
        createCustomer: (data) => rpc('customers/create', { data }),
        updateCustomer: (id, data) => rpc('customers/update', { id, data }),
        deleteCustomer: (id) => rpc('customers/delete', { id }),
        getCustomerInvoices: (customerId, limit) => rpc('customers/invoices', { customerId, limit }),
        getDrawerCash: (sessionId) => rpc('pos/get-drawer-cash', { sessionId }),
        checkout: (saleData) => rpc('pos/checkout', saleData),
        getNextInvoiceNumber: (type) => rpc('pos/next-invoice-number', { type }),
        getInvoice: (id) => rpc('pos/get-invoice', { id }),
        voidInvoice: (invoiceId, managerUserId, reason) => rpc('pos/void-invoice', { invoiceId, managerUserId, reason }),
        listRecentInvoices: (limit) => rpc('pos/list-recent', { limit }),
        getInvoicesDashboard: (filters) => rpc('pos/invoices-dashboard', filters || {}),
        searchProductsByCategory: (categoryId, keyword, limit) => rpc('pos/search-by-category', { categoryId, keyword, limit }),
        listInventoryMovements: (productId, limit) => rpc('pos/list-inventory-movements', { productId, limit }),
        checkAutoCloseShift: (userId) => rpc('session/check-auto-close', { userId }),
        ensureActiveSession: (userId) => rpc('session/ensure-active', { userId }),
        rolloverShift: (userId) => rpc('session/rollover', { userId }),
        getDailyShiftSummary: (params) => rpc('session/shift-summary', params),
        listProducts: (filters) => rpc('inventory/list-products', filters),
        createProduct: (data, userId) => rpc('inventory/create-product', { data, userId }),
        updateProduct: (id, data, userId) => rpc('inventory/update-product', { id, data, userId }),
        deleteProduct: (id, userId) => rpc('inventory/delete-product', { id, userId }),
        adjustStock: (data, userId, sessionId) => rpc('inventory/adjust-stock', { data, userId, sessionId }),
        listStockAdjustments: (limit) => rpc('inventory/list-adjustments', { limit }),
        getInventoryValuation: () => rpc('inventory/valuation'),
        getCatalogOverview: () => rpc('inventory/overview'),
        listCategories: (filters) => rpc('inventory/list-categories', filters || {}),
        createCategory: (data) => rpc('inventory/create-category', data),
        updateCategory: (id, data) => rpc('inventory/update-category', { id, data }),
        deleteCategory: (id) => rpc('inventory/delete-category', { id }),
        getSuppliersOverview: () => rpc('purchases/get-suppliers-overview'),
        listSuppliers: (filters) => rpc('purchases/list-suppliers', filters || {}),
        createSupplier: (data, userId) => rpc('purchases/create-supplier', { data, userId }),
        updateSupplier: (id, data, userId) => rpc('purchases/update-supplier', { id, data, userId }),
        getSupplierLedger: (supplierId, filters) => rpc('purchases/get-supplier-ledger', { supplierId, filters }),
        recordSupplierSplitPayment: (data, userId) => rpc('purchases/record-split-payment', { data, userId }),
        createPurchaseInvoice: (data, userId) => rpc('purchases/create-invoice', { data, userId }),
        getPurchaseInvoice: (id) => rpc('purchases/get-invoice', { id }),
        recordSupplierPayment: (data, userId) => rpc('purchases/record-payment', { data, userId }),
        listPurchaseInvoices: (limit) => rpc('purchases/list-invoices', { limit }),
        createPurchaseReturn: (data, userId) => rpc('purchases/create-return', { data, userId }),
        listPurchaseReturns: (invoiceId) => rpc('purchases/list-returns', { invoiceId }),
        addExpense: (data, userId) => rpc('expenses/add', { data, userId }),
        getExpensesSummary: (params) => rpc('expenses/summary', params || {}),
        getExpensesAnalytics: (period) => rpc('expenses/analytics', { period }),
        getExpenseCategories: () => rpc('expenses/categories'),
        addExpenseCategory: (name, subcategories) => rpc('expenses/add-category', { name, subcategories }),
        deleteExpenseCategory: (id) => rpc('expenses/delete-category', { id }),
        listSessionExpenses: (sessionId) => rpc('expenses/list-session', { sessionId }),
        listAllExpenses: (options) => rpc('expenses/list-all', options || {}),
        getExpenseById: (id) => rpc('expenses/get', { id }),
        getSalesSummary: (startDate, endDate) => rpc('reports/sales-summary', { startDate, endDate }),
        getTopSelling: (limit, startDate, endDate) => rpc('reports/top-selling', { limit, startDate, endDate }),
        getCategorySales: (startDate, endDate) => rpc('reports/category-sales', { startDate, endDate }),
        getDashboardOverview: () => rpc('reports/dashboard-overview'),
        getComprehensiveAnalytics: (filters) => rpc('reports/comprehensive-analytics', filters || {}),
        previewReceiptHtml: (invoiceId) => rpc('printer/preview-invoice', { invoiceId }),
        printInvoiceReceipt: (invoiceId) => rpc('printer/print-invoice', { invoiceId }),
        printZReport: (sessionId) => rpc('printer/print-z-report', { sessionId }),
        getSettings: () => rpc('settings/get-all'),
        updateSettings: (settingsMap, userId) => rpc('settings/update', { settingsMap, userId }),
        // Treasury (الخزنة المركزية)
        getTreasuryBalance: () => rpc('treasury/balance'),
        treasuryDeposit: (data, userId) => rpc('treasury/deposit', { data, userId }),
        treasuryWithdraw: (data, userId) => rpc('treasury/withdraw', { data, userId }),
        transferShiftToTreasury: (sessionId, amount, userId) => rpc('treasury/transfer-shift', { sessionId, amount, userId }),
        treasuryTransferChannel: (data, userId) => rpc('treasury/transfer-channel', { data, userId }),
        listTreasuryTransactions: (params) => rpc('treasury/list-transactions', typeof params === 'number' ? { limit: params } : (params || {})),
        quickDisburseTreasury: (data, userId) => rpc('treasury/quick-disburse', { data, userId }),
        getTreasuryAnalytics: () => rpc('treasury/analytics'),
        treasuryAnalytics: () => rpc('treasury/analytics'),
        getBranchTransfers: (params) => rpc('treasury/branch-transfers', params || {}),
        getBranchSafes: () => rpc('treasury/branch-safes'),
        // Payroll & Staff (الموظفين والمرتبات)
        listEmployees: (activeOnly) => rpc('payroll/list-employees', { activeOnly }),
        getStaffKpis: () => rpc('payroll/staff-kpis'),
        toggleEmployeeStatus: (id, userId) => rpc('payroll/toggle-employee-status', { id, userId }),
        createEmployee: (data, userId) => rpc('payroll/create-employee', { data, userId }),
        updateEmployee: (id, data, userId) => rpc('payroll/update-employee', { id, data, userId }),
        deleteEmployee: (id, userId) => rpc('payroll/delete-employee', { id, userId }),
        disburseSalary: (data, userId) => rpc('payroll/disburse-salary', { data, userId }),
        getEmployeeMonthlyAdvances: (employeeId, month) => rpc('payroll/monthly-advances', { employeeId, month }),
        getEmployeePeriodAdvances: (employeeId, period) => rpc('payroll/period-advances', { employeeId, period }),
        getPayrollSummary: (period) => rpc('payroll/summary', { period }),
        checkEmployeePayoutStatus: (employeeId, month, period) => rpc('payroll/check-payout-status', { employeeId, month, period }),
        disburseBulkPayroll: (payoutsList, channel, userId) => rpc('payroll/disburse-bulk', { payoutsList, channel, userId }),
        listSalaryPayments: (params, period) => {
            let payload = {};
            if (typeof params === 'number') {
                payload.limit = params;
                if (period) {
                    if (period.month) payload.month = period.month;
                    if (period.startDate) payload.startDate = period.startDate;
                    if (period.endDate) payload.endDate = period.endDate;
                }
            } else if (typeof params === 'object' && params !== null) {
                payload = { ...params };
            }
            return rpc('payroll/list-salary-payments', payload);
        }
    };
}

// Global Application State
const state = {
    currentUser: null,
    activeSession: null,
    posMode: 'sale', // 'sale' | 'return'
    posRows: [],
    selectedCustomer: null,
    cart: [],
    discountPercent: 0,
    managerOverride: null,
    selectedPaymentMethod: 'cash',
    currentInvoiceId: null,
    drawerCash: 0,
    activeLookupCategoryId: 'all',
    settings: {}
};

// Performance Caches & Helpers
const posProductsCache = new Map();
const hubMetricsCache = {
    timestamp: 0,
    treasuryBal: '15,000.00',
    prodCount: '0',
    empCount: '2'
};

function debounce(fn, delay = 250) {
    let timer = null;
    return function(...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Global Lucide Icon Re-hydration Helper
function refreshIcons(container = document) {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons({
            root: container,
            attrs: {
                'stroke-width': 1.85
            }
        });
    }
}

// Clock
setInterval(() => {
    const timeEl = document.getElementById('clockTime');
    if (timeEl) {
        timeEl.innerText = new Date().toLocaleTimeString('ar-EG');
    } else {
        const el = document.getElementById('clockDisplay');
        if (el) el.innerText = new Date().toLocaleTimeString('ar-EG');
    }
}, 1000);

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    const initFunctions = [
        ['bindLoginPageEvents', bindLoginPageEvents],
        ['bindNavigation', bindNavigation],
        ['bindKeyboardShortcuts', bindKeyboardShortcuts],
        ['bindModals', bindModals],
        ['bindPosEvents', bindPosEvents],
        ['bindSessionEvents', bindSessionEvents],
        ['bindInventoryEvents', bindInventoryEvents],
        ['bindStockAuditEvents', bindStockAuditEvents],
        ['bindTreasuryEvents', bindTreasuryEvents],
        ['bindStaffEvents', bindStaffEvents],
        ['bindUsersEvents', bindUsersEvents],
        ['bindExpenseEvents', bindExpenseEvents],
        ['bindPurchasesEvents', bindPurchasesEvents],
        ['bindPurchaseInvoicesEvents', bindPurchaseInvoicesEvents],
        ['bindBarcodePrintEvents', bindBarcodePrintEvents],
        ['bindPurchaseReturnsEvents', bindPurchaseReturnsEvents],
        ['bindSettingsEvents', bindSettingsEvents],
        ['bindReportEvents', bindReportEvents]
    ];

    for (const [name, fn] of initFunctions) {
        try {
            if (typeof fn === 'function') fn();
        } catch (err) {
            console.error(`[App Init Error in ${name}]:`, err);
        }
    }

    // Initial Lucide Icon Rendering
    try {
        refreshIcons();
    } catch (e) {
        console.warn('Lucide icon refresh warning:', e);
    }

    // Initial POS Invoice Number Badge
    try {
        refreshPosInvoiceCode().catch(console.error);
    } catch (e) {
        console.warn('Invoice code refresh warning:', e);
    }
});

/* -------------------------------------------------------------
 * 1. AUTHENTICATION & DEDICATED LOGIN PAGE
 * ------------------------------------------------------------- */
function bindLoginPageEvents() {
    const tabAdmin = document.getElementById('tabPortalAdmin');
    const tabCashier = document.getElementById('tabPortalCashier');
    const infoText = document.getElementById('portalInfoText');
    const infoIcon = document.getElementById('portalInfoIcon');
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const loginBtnText = document.getElementById('loginBtnText');
    const toggleEye = document.getElementById('btnTogglePassword');

    // Portal Switcher (Admin / Cashier)
    tabAdmin.addEventListener('click', () => {
        tabAdmin.classList.add('active');
        tabCashier.classList.remove('active');
        if (infoIcon) infoIcon.innerHTML = '<i data-lucide="shield-check"></i>';
        infoText.innerHTML = 'دخول الإدارة العامة والمستودع الرئيسي<br>لوحة القيادة، المخازن المركزية، والتقارير المالية والتشغيلية.';
        usernameInput.value = 'ma';
        passwordInput.value = 'ma';
        loginBtnText.innerText = 'دخول لوحة الإدارة العامة';
        refreshIcons(document.getElementById('portalInfoCard'));
        usernameInput.focus();
    });

    tabCashier.addEventListener('click', () => {
        tabCashier.classList.add('active');
        tabAdmin.classList.remove('active');
        if (infoIcon) infoIcon.innerHTML = '<i data-lucide="store"></i>';
        infoText.innerHTML = 'دخول بوابة المبيعات ونقطة البيع (Sales)<br>مسح الباركود، إصدار الفواتير الفورية، وتسليم عهدة الوردية.';
        usernameInput.value = 'co';
        passwordInput.value = 'co';
        loginBtnText.innerText = 'دخول بوابة المبيعات (Cashier)';
        refreshIcons(document.getElementById('portalInfoCard'));
        usernameInput.focus();
    });

    // Password Toggle Eye
    toggleEye.addEventListener('click', () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        toggleEye.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}"></i>`;
        refreshIcons(toggleEye);
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

async function loadPosProducts() {
    try {
        const res = await window.api.listProducts();
        if (res && res.success && Array.isArray(res.data)) {
            posProductsCache.clear();
            res.data.forEach(p => {
                if (p.barcode) posProductsCache.set(p.barcode, p);
            });
        }
    } catch (err) {
        console.warn('POS products cache warmup skipped:', err);
    }
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
        const isAdmin = state.currentUser.role === 'admin';
        document.body.classList.toggle('role-admin', isAdmin);
        document.body.classList.toggle('role-cashier', !isAdmin);
        document.body.classList.toggle('role-sales', !isAdmin);
        const userNameEl = document.getElementById('headerUserName');
        if (userNameEl) userNameEl.innerText = state.currentUser.displayName;
        const userRoleEl = document.getElementById('headerUserRole');
        if (userRoleEl) userRoleEl.innerText = isAdmin ? 'مدير عام' : 'مسؤول مبيعات (Sales)';

        // Role-based sidebar menu and BI isolation (Cashier sees only POS, Session, Expenses, and Hub)
        document.querySelectorAll('.admin-only').forEach(el => {
            if (isAdmin) {
                el.style.removeProperty('display');
            } else {
                el.style.display = 'none';
            }
        });

        // Header Admin Badge & Users Button Visibility
        const headerRoleBadge = document.getElementById('headerRoleBadge');
        const headerBtnUsers = document.getElementById('headerBtnUsers');
        if (headerRoleBadge) headerRoleBadge.style.display = isAdmin ? 'inline-flex' : 'none';
        if (headerBtnUsers) headerBtnUsers.style.display = isAdmin ? 'inline-flex' : 'none';
        const headerStatus = document.querySelector('.header-status');
        if (headerStatus) refreshIcons(headerStatus);

        // Hide Dedicated Login Screen
        document.getElementById('loginScreen').style.display = 'none';

        // Safe background warmups (any non-critical failure will not abort hub render)
        try { await loadSettings(); } catch (e) { console.warn('loadSettings warning:', e); }
        try { await refreshSessionState(); } catch (e) { console.warn('refreshSessionState warning:', e); }
        try { await loadPosProducts(); } catch (e) { console.warn('loadPosProducts warning:', e); }

        // Switch to Hub landing page with role-tailored hover cards
        switchView('hub');
    } catch (err) {
        document.getElementById('loginScreen').style.display = 'flex';
        errorEl.innerText = err.message;
        errorEl.style.display = 'block';
    }
}

document.getElementById('btnLogout').addEventListener('click', () => {
    state.currentUser = null;
    document.body.classList.remove('role-admin', 'role-cashier', 'role-sales');
    clearCart();

    const headerRoleBadge = document.getElementById('headerRoleBadge');
    const headerBtnUsers = document.getElementById('headerBtnUsers');
    if (headerRoleBadge) headerRoleBadge.style.display = 'none';
    if (headerBtnUsers) headerBtnUsers.style.display = 'none';

    // Show Dedicated Login Screen
    const loginScreen = document.getElementById('loginScreen');
    loginScreen.style.display = 'flex';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginErrorMsg').style.display = 'none';
});

/* -------------------------------------------------------------
 * 2. NAVIGATION & ROLE HOVER CARDS (HUB)
 * ------------------------------------------------------------- */
function bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            switchView(view);
        });
    });

    // Wire all back-to-hub buttons across views
    document.querySelectorAll('.btn-back-hub').forEach(btn => {
        btn.addEventListener('click', () => {
            switchView('hub');
        });
    });
}

let renderRoleHubSeq = 0;

async function renderRoleHub() {
    if (!state.currentUser) return;
    const currentSeq = ++renderRoleHubSeq;
    const isCashier = state.currentUser.role === 'cashier';
    const grid = document.getElementById('hubCardsGrid');
    if (!grid) return;

    const titleEl = document.getElementById('hubWelcomeTitle');
    const subtitleEl = document.getElementById('hubWelcomeSubtitle');
    const roleTextEl = document.getElementById('welcomeRoleText');
    const dateEl = document.getElementById('welcomeCurrentDate');

    if (dateEl) {
        const now = new Date();
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.innerText = now.toLocaleDateString('ar-EG', dateOptions);
    }

    let groupsToRender = [];

    const userNameEl = document.getElementById('headerUserName');
    const userRoleEl = document.getElementById('headerUserRole');

    if (isCashier) {
        if (titleEl) {
            titleEl.innerHTML = `مرحباً بك، <span class="highlight-name">${state.currentUser.displayName || 'مسؤول المبيعات'}</span>`;
        }
        if (subtitleEl) {
            subtitleEl.innerText = 'بوابة المبيعات — لوحة الوصول السريع لعمليات نقطة البيع والوردية اليومية والمصروفات.';
        }
        if (roleTextEl) roleTextEl.innerText = 'مسؤول المبيعات (Sales)';
        if (userNameEl) userNameEl.innerText = state.currentUser.displayName || 'مسؤول المبيعات';
        if (userRoleEl) userRoleEl.innerText = 'مسؤول مبيعات (Sales)';

        grid.classList.add('cashier-mode');
        const scrollWrap = document.querySelector('.hub-grouped-scroll-wrap');
        if (scrollWrap) scrollWrap.classList.add('sales-center-wrap');

        grid.innerHTML = `
            <div class="sales-hero-card theme-pos" data-view="pos" role="button" tabindex="0">
                <div class="sales-card-icon-wrap">
                    <i data-lucide="shopping-cart"></i>
                </div>
                <h3 class="sales-card-title">نقطة البيع المباشر</h3>
                <p class="sales-card-desc">مسح باركود الملابس، إصدار فواتير نقدية وشبكة، وتطبيق الخصومات الفورية</p>
                <div class="sales-card-btn">
                    <span>دخول شاشة البيع</span>
                    <i data-lucide="arrow-left" class="icon-sm"></i>
                </div>
            </div>

            <div class="sales-hero-card theme-session" data-view="session" role="button" tabindex="0">
                <div class="sales-card-badge">Daily Session</div>
                <div class="sales-card-icon-wrap">
                    <i data-lucide="calendar-check"></i>
                </div>
                <h3 class="sales-card-title">الوردية اليومية والدرج</h3>
                <p class="sales-card-desc">استلام عهدة الوردية، متابعة نقدية الدرج، إغلاق الوردية وطباعة Z-Report</p>
                <div class="sales-card-btn">
                    <span>إدارة الوردية والدرج</span>
                    <i data-lucide="arrow-left" class="icon-sm"></i>
                </div>
            </div>

            <div class="sales-hero-card theme-expenses" data-view="expenses" role="button" tabindex="0">
                <div class="sales-card-badge">Petty Cash</div>
                <div class="sales-card-icon-wrap">
                    <i data-lucide="receipt"></i>
                </div>
                <h3 class="sales-card-title">المصروفات النثرية</h3>
                <p class="sales-card-desc">تسجيل سندات الصرف النثرية المستعجلة المخصومة مباشرة من درج الكاشير</p>
                <div class="sales-card-btn">
                    <span>سند صرف جديد</span>
                    <i data-lucide="arrow-left" class="icon-sm"></i>
                </div>
            </div>
        `;

        grid.querySelectorAll('.sales-hero-card').forEach(card => {
            const view = card.dataset.view;
            const activate = () => switchView(view);
            card.addEventListener('click', activate);
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activate();
                }
            });
        });

        refreshIcons(grid);
        return;
    } else {
        grid.classList.remove('cashier-mode');
        const scrollWrap = document.querySelector('.hub-grouped-scroll-wrap');
        if (scrollWrap) scrollWrap.classList.remove('sales-center-wrap');
        if (titleEl) {
            titleEl.innerHTML = `مرحباً بك، <span class="highlight-name">${state.currentUser.displayName || 'المدير العام'}</span>`;
        }
        if (subtitleEl) {
            subtitleEl.innerText = 'لوحة التحكم المركزية — متابعة المبيعات، المخزون، المشتريات، والعمليات المالية.';
        }
        if (roleTextEl) roleTextEl.innerText = 'مدير عام النظام';
        if (userNameEl) userNameEl.innerText = state.currentUser.displayName || 'المدير العام';
        if (userRoleEl) userRoleEl.innerText = 'مدير عام';

        // Update top header bar for admin user
        const headerRoleBadge = document.getElementById('headerRoleBadge');
        const headerBtnUsers = document.getElementById('headerBtnUsers');
        if (headerRoleBadge) headerRoleBadge.style.display = isCashier ? 'none' : 'inline-flex';
        if (headerBtnUsers) headerBtnUsers.style.display = isCashier ? 'none' : 'inline-flex';
        const headerStatus = document.querySelector('.header-status');
        if (headerStatus) refreshIcons(headerStatus);

        grid.classList.remove('cashier-mode');

        groupsToRender = [
            // Column 1: Sales & Analytics (المبيعات والتحليلات)
            {
                num: '1',
                title: 'المبيعات والتحليلات',
                countBadge: '4 أقسام',
                actions: [
                    {
                        view: 'session',
                        theme: 'theme-session',
                        icon: 'calendar-check',
                        title: 'الوردية اليومية والدرج',
                        desc: 'المطابقة المالية للوردية، متابعة نقدية الدرج، وسجل الحركات المباشرة'
                    },
                    {
                        view: 'sales-analytics',
                        theme: 'theme-reports',
                        icon: 'bar-chart-3',
                        title: 'تحليلات المبيعات وذكاء الأعمال',
                        desc: 'مؤشرات الأرباح وهوامش التكلفة، مسار النمو اليومي، وأداء البائعين'
                    },
                    {
                        view: 'customers',
                        theme: 'theme-pos',
                        icon: 'users',
                        title: 'العملاء',
                        desc: 'دليل بيانات العملاء، إجمالي المشتريات، وتصدير كشف العملاء إلى Excel'
                    },
                    {
                        view: 'sales-settings',
                        theme: 'theme-pos',
                        icon: 'sliders',
                        title: 'إعدادات البيع',
                        desc: 'سياسات الخصم، ورق طابعة الفواتير، وبيانات المتجر المطبوعة'
                    }
                ]
            },
            // Column 2: Inventory & Catalog (إدارة المخزون والأصناف)
            {
                num: '2',
                title: 'إدارة المخزون والأصناف',
                countBadge: '2 أقسام',
                actions: [
                    {
                        view: 'inventory-hub',
                        subTab: 'categories',
                        theme: 'theme-inventory',
                        icon: 'package',
                        title: 'المجموعات ودليل الأصناف',
                        desc: 'هيكلية المجموعات، كتالوج المنتجات، وقوائم الأسعار الفورية'
                    },
                    {
                        view: 'stock-audit',
                        theme: 'theme-audit',
                        icon: 'clipboard-check',
                        title: 'جرد المخزون بسندات التسوية',
                        desc: 'الجرد الميداني والمطابقة الفورية، معالجة العجز والزيادة'
                    }
                ]
            },
            // Column 3: Suppliers & Purchases (الموردين والمشتريات)
            {
                num: '3',
                title: 'الموردين والمشتريات',
                countBadge: '2 أقسام',
                actions: [
                    {
                        view: 'purchases-hub',
                        theme: 'theme-purchases',
                        icon: 'truck',
                        title: 'حسابات الموردين',
                        desc: 'دليل الموردين، كشوف الحسابات التفصيلية، والأرصدة الدائنة'
                    },
                    {
                        view: 'purchases-invoices',
                        theme: 'theme-purchases-invoices',
                        icon: 'receipt',
                        title: 'فواتير الشراء',
                        desc: 'تسجيل ومراجعة فواتير الشراء، تكلفة الوحدة، ودفعات الموردين'
                    }
                ]
            },
            // Column 4: Financial & Payroll (المالية والخزائن ومسير الرواتب)
            {
                num: '4',
                title: 'المالية والخزائن ومسير الرواتب',
                countBadge: '3 أقسام',
                actions: [
                    {
                        view: 'financial-hub',
                        subTab: 'treasury',
                        theme: 'theme-treasury',
                        icon: 'landmark',
                        title: 'خزنة مركزية',
                        desc: 'حساب الخزنة الرئيسي المستقل تماماً عن درج بيع الكاشير اليومي'
                    },
                    {
                        view: 'salaries',
                        theme: 'theme-salaries',
                        icon: 'banknote',
                        title: 'صرف مرتبات',
                        desc: 'مسيرات رواتب العاملين، السلف المؤقتة، والبدلات المعتمدة'
                    },
                    {
                        view: 'employees',
                        theme: 'theme-staff',
                        icon: 'users',
                        title: 'الموظفين',
                        desc: 'إدارة الموظفين، بيانات الاتصال، وتعيين الصلاحيات'
                    }
                ]
            }
        ];
    }

    // Sequence check before DOM manipulation
    if (currentSeq !== renderRoleHubSeq) return;

    // Atomic wipe and populate via DocumentFragment
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    groupsToRender.forEach(group => {
        const colEl = document.createElement('div');
        colEl.className = 'hub-group-column';

        // Column Header
        const headerEl = document.createElement('div');
        headerEl.className = 'group-column-header';
        headerEl.innerHTML = `
            <div class="group-header-right">
                <span class="group-badge-num">${group.num}</span>
                <h3 class="group-column-title">${group.title}</h3>
            </div>
            <span class="group-badge-count">${group.countBadge}</span>
        `;
        colEl.appendChild(headerEl);

        // Actions List
        const listEl = document.createElement('div');
        listEl.className = 'group-actions-list';

        group.actions.forEach(action => {
            const cardEl = document.createElement('div');
            cardEl.className = `nested-action-card ${action.theme}`;
            cardEl.dataset.view = action.view;
            cardEl.setAttribute('tabindex', '0');
            cardEl.setAttribute('role', 'button');
            cardEl.innerHTML = `
                <div class="nested-action-main">
                    <div class="nested-action-icon">
                        <i data-lucide="${action.icon}"></i>
                    </div>
                    <div class="nested-action-body">
                        <h4 class="nested-action-title">${action.title}</h4>
                        <p class="nested-action-desc">${action.desc}</p>
                    </div>
                </div>
                <div class="nested-action-arrow">
                    <i data-lucide="chevron-left" class="icon-sm"></i>
                </div>
            `;

            const activate = () => {
                switchView(action.view, action.subTab);
            };

            cardEl.addEventListener('click', activate);
            cardEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activate();
                }
            });

            listEl.appendChild(cardEl);
        });

        colEl.appendChild(listEl);
        fragment.appendChild(colEl);
    });

    grid.appendChild(fragment);
    refreshIcons(grid);
}

/* -------------------------------------------------------------
 * WORKSPACE TAB SWITCHERS
 * ------------------------------------------------------------- */
function switchSalesTab(tabName = 'session') {
    if (tabName === 'settings') {
        switchView('sales-settings');
        return;
    }

    const isAdmin = state.currentUser?.role === 'admin';
    const isAnalytics = tabName === 'analytics' && isAdmin;

    const panelSes = document.getElementById('panel-sales-session');
    const panelAna = document.getElementById('panel-sales-analytics');
    const tabSes = document.getElementById('tabBtnSalesSession');
    const tabAna = document.getElementById('tabBtnSalesAnalytics');
    const controlsSes = document.getElementById('salesSessionHeaderControls');
    const controlsAna = document.getElementById('salesAnalyticsHeaderControls');
    const titleEl = document.getElementById('salesHubMainTitle');
    const badgeEl = document.getElementById('salesHubMainBadge');
    const subtitleEl = document.getElementById('salesHubMainSubtitle');

    if (tabSes) tabSes.classList.toggle('active', !isAnalytics);
    if (tabAna) tabAna.classList.toggle('active', isAnalytics);

    if (panelSes) {
        panelSes.classList.toggle('active', !isAnalytics);
        panelSes.style.display = !isAnalytics ? 'block' : 'none';
    }
    if (panelAna) {
        panelAna.classList.toggle('active', isAnalytics);
        panelAna.style.display = isAnalytics ? 'flex' : 'none';
    }

    if (controlsSes) controlsSes.style.display = !isAnalytics ? 'flex' : 'none';
    if (controlsAna) controlsAna.style.display = isAnalytics ? 'flex' : 'none';

    if (titleEl) {
        titleEl.innerText = isAnalytics ? 'تحليلات المبيعات وذكاء الأعمال (Sales Analytics & BI)' : 'الوردية اليومية والدرج (Daily Shift)';
    }
    if (badgeEl) {
        badgeEl.innerText = isAnalytics ? 'ذكاء الأعمال والأرباح' : 'إدارة الوردية والدرج';
        badgeEl.style.background = isAnalytics ? '#EEF2FF' : '#ECFDF5';
        badgeEl.style.color = isAnalytics ? '#4F46E5' : '#059669';
        badgeEl.style.borderColor = isAnalytics ? '#C7D2FE' : '#A7F3D0';
    }
    if (subtitleEl) {
        subtitleEl.innerText = isAnalytics ? 'مؤشرات الأرباح وهوامش التكلفة، مسار المبيعات، ومصفوفة أداء البائعين والأقسام' : 'المطابقة المالية للوردية الحالية، نقدية الدرج، وسجل الحركات المباشرة';
    }

    // Role-based elements toggle
    document.querySelectorAll('.admin-only').forEach(el => {
        if (isAdmin) {
            el.style.removeProperty('display');
        } else {
            el.style.display = 'none';
        }
    });

    // Load active dashboard
    if (isAnalytics) {
        loadSalesAnalyticsDashboard();
    } else {
        loadDailyShiftSummary();
    }

    const viewHub = document.getElementById('view-sales-hub');
    if (viewHub) {
        viewHub.scrollTop = 0;
        refreshIcons(viewHub);
    }
}
window.switchSalesTab = switchSalesTab;

let activeCatalogTab = 'categories'; // 'categories' | 'items'

function switchCatalogTab(tabName) {
    activeCatalogTab = tabName === 'items' ? 'items' : 'categories';
    const isCategories = activeCatalogTab === 'categories';
    const tabBtnCats = document.getElementById('tabBtnCatalogCategories');
    const tabBtnItems = document.getElementById('tabBtnCatalogItems');
    const panelCats = document.getElementById('panel-catalog-categories');
    const panelItems = document.getElementById('panel-catalog-items');

    if (tabBtnCats && tabBtnItems && panelCats && panelItems) {
        tabBtnCats.classList.toggle('active', isCategories);
        tabBtnItems.classList.toggle('active', !isCategories);
        panelCats.classList.toggle('active', isCategories);
        panelItems.classList.toggle('active', !isCategories);
    }

    if (isCategories) {
        loadCategoriesTable();
    } else {
        loadCatalogItemsTable();
    }
}
window.switchCatalogTab = switchCatalogTab;

function switchInventoryTab(tabName) {
    if (tabName === 'audit') {
        switchView('stock-audit');
    } else {
        switchCatalogTab(tabName === 'items' ? 'items' : 'categories');
    }
}
window.switchInventoryTab = switchInventoryTab;

function switchPurchasesTab(tabName) {
    if (tabName === 'invoices') {
        switchView('purchases-invoices');
    } else {
        switchView('purchases-hub');
    }
}
window.switchPurchasesTab = switchPurchasesTab;

function switchFinancialTab(tabName) {
    if (tabName === 'salaries') {
        switchView('salaries');
        return;
    }
    if (tabName === 'employees') {
        switchView('employees');
        return;
    }

    const tabBtnTre = document.getElementById('tabBtnFinancialTreasury');
    const tabBtnSal = document.getElementById('tabBtnFinancialSalaries');
    const tabBtnEmp = document.getElementById('tabBtnFinancialEmployees');
    const panelTre = document.getElementById('panel-financial-treasury');
    const panelSal = document.getElementById('panel-financial-salaries');
    const panelEmp = document.getElementById('panel-financial-employees');

    if (tabBtnTre && tabBtnSal && tabBtnEmp && panelTre && panelSal && panelEmp) {
        tabBtnTre.classList.toggle('active', tabName === 'treasury');
        tabBtnSal.classList.toggle('active', tabName === 'salaries');
        tabBtnEmp.classList.toggle('active', tabName === 'employees');
        panelTre.classList.toggle('active', tabName === 'treasury');
        panelSal.classList.toggle('active', tabName === 'salaries');
        panelEmp.classList.toggle('active', tabName === 'employees');
    }

    if (tabName === 'treasury') {
        loadTreasuryView();
    } else {
        loadStaffView();
    }
}
window.switchFinancialTab = switchFinancialTab;

function switchStaffTab(tabName) {
    // Legacy helper compatibility for modals
    switchFinancialTab(tabName);
}
window.switchStaffTab = switchStaffTab;

function switchView(viewName, subTab = null) {
    closeCategoryProductLookup();

    // Map legacy alias views to unified workspace hubs
    if (viewName === 'session') {
        viewName = 'sales-hub';
        subTab = subTab || 'session';
    } else if (viewName === 'reports' || viewName === 'sales-analytics') {
        viewName = 'sales-hub';
        subTab = subTab || 'analytics';
    } else if (viewName === 'settings' || viewName === 'sales-settings') {
        viewName = 'sales-settings';
    } else if (viewName === 'inventory') {
        viewName = 'inventory-hub';
        subTab = subTab || 'categories';
    } else if (viewName === 'stock-audit') {
        viewName = 'stock-audit';
    } else if (viewName === 'purchases' || viewName === 'suppliers') {
        viewName = 'purchases-hub';
    } else if (viewName === 'invoices') {
        viewName = 'purchases-invoices';
    } else if (viewName === 'treasury') {
        viewName = 'financial-hub';
        subTab = subTab || 'treasury';
    } else if (viewName === 'staff' || viewName === 'employees') {
        viewName = 'employees';
    } else if (viewName === 'salaries' || viewName === 'payroll' || (viewName === 'financial-hub' && subTab === 'salaries')) {
        viewName = 'salaries';
    }

    // Restrict cashier to allowed views
    const cashierAllowed = ['hub', 'pos', 'session', 'expenses', 'sales-hub'];
    if (state.currentUser?.role === 'cashier' && !cashierAllowed.includes(viewName)) {
        alert('عذراً، هذه الصفحة متاحة لإدارة النظام فقط.');
        return;
    }

    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.view === viewName);
    });

    document.querySelectorAll('.view-panel').forEach(el => {
        el.classList.toggle('active', el.id === `view-${viewName}`);
    });

    if (viewName === 'hub') {
        renderRoleHub();
    } else if (viewName === 'pos') {
        refreshSessionState();
        populatePosSellers();
        refreshPosInvoiceCode();
        if (state.posRows.length === 0) {
            addBlankPosRow();
        } else {
            const firstRowBlank = state.posRows.find(r => !r.product);
            if (firstRowBlank) {
                document.getElementById(`posBarcode_${firstRowBlank.id}`)?.focus();
            }
        }
        updatePosTotals();
    } else if (viewName === 'sales-analytics') {
        loadSalesAnalyticsDashboard();
    } else if (viewName === 'customers') {
        loadCustomersView();
    } else if (viewName === 'sales-settings') {
        loadSalesSettingsView();
    } else if (viewName === 'sales-hub') {
        switchSalesTab(subTab || 'session');
    } else if (viewName === 'inventory-hub') {
        loadInventoryCatalogView(subTab);
    } else if (viewName === 'new-product') {
        prepareProductFormView(subTab);
    } else if (viewName === 'stock-audit') {
        loadStockAuditView();
    } else if (viewName === 'purchases-hub') {
        loadPurchasesView();
    } else if (viewName === 'purchases-invoices') {
        loadPurchaseInvoicesList();
    } else if (viewName === 'new-purchase-invoice') {
        prepareNewPurchaseInvoiceView();
    } else if (viewName === 'financial-hub') {
        switchFinancialTab(subTab || 'treasury');
    } else if (viewName === 'expenses') {
        switchExpensesTab(subTab || 'hub');
    } else if (viewName === 'employees') {
        loadEmployeesDashboard();
    } else if (viewName === 'salaries') {
        loadSalariesView();
    } else if (viewName === 'users') {
        loadUsersDashboard();
    }

    const activePanel = document.getElementById(`view-${viewName}`);
    if (activePanel) refreshIcons(activePanel);
}

// Expose switchView globally for inline event handlers and external hooks
window.switchView = switchView;

function isPosViewActive() {
    // 1. Strict exclusion: If expenses view is explicitly active, POS is NOT active
    const expensesView = document.getElementById('view-expenses');
    if (expensesView && expensesView.classList.contains('active')) return false;

    // 2. POS panel is active
    const posView = document.getElementById('view-pos');
    if (posView && posView.classList.contains('active')) return true;

    // 3. Active element is inside POS view
    if (document.activeElement && document.activeElement.closest('#view-pos')) return true;

    // 4. If current active panel is not POS, return false
    const activePanel = document.querySelector('.view-panel.active');
    if (activePanel && activePanel.id !== 'view-pos') return false;

    return true;
}
window.isPosViewActive = isPosViewActive;

function bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
        const key = e.key;
        const code = e.code;

        // 1. Escape: Close open modals, or navigate back to Hub
        if (key === 'Escape' || code === 'Escape') {
            const thermalModal = document.getElementById('modalThermalReceipt');
            if (thermalModal && (thermalModal.style.display === 'flex' || thermalModal.classList.contains('active'))) {
                e.preventDefault();
                e.stopPropagation();
                closeThermalReceiptModal();
                return;
            }

            const lookupModal = document.getElementById('modalCategoryProductLookup');
            if (lookupModal && (lookupModal.style.display === 'flex' || lookupModal.classList.contains('active') || !lookupModal.classList.contains('hidden'))) {
                e.preventDefault();
                e.stopPropagation();
                closeCategoryProductLookup();
                return;
            }

            const openModals = document.querySelectorAll('.modal-overlay.active:not(#modalLogin), .modal-backdrop.active');
            if (openModals.length > 0) {
                e.preventDefault();
                e.stopPropagation();
                openModals.forEach(m => {
                    m.classList.remove('active');
                    m.classList.add('hidden');
                    m.style.setProperty('display', 'none', 'important');
                });
                return;
            }

            // Dedicated views Escape navigation
            const isNewPurchaseActive = document.getElementById('view-new-purchase-invoice')?.classList.contains('active');
            if (isNewPurchaseActive) {
                e.preventDefault();
                e.stopPropagation();
                switchView('purchases-invoices');
                return;
            }

            const isNewProductActive = document.getElementById('view-new-product')?.classList.contains('active');
            if (isNewProductActive) {
                e.preventDefault();
                e.stopPropagation();
                switchView('inventory-hub', 'items');
                return;
            }

            const loginScreen = document.getElementById('loginScreen');
            const isLoginVisible = loginScreen && loginScreen.style.display !== 'none';
            if (state.currentUser && !isLoginVisible) {
                const activeView = document.querySelector('.view-panel.active');
                if (activeView && activeView.id !== 'view-hub') {
                    e.preventDefault();
                    e.stopPropagation();
                    switchView('hub');
                    return;
                }
            }
            return;
        }

        // 2. F11: Add blank row in POS (سطر جديد) or new purchase invoice
        if (key === 'F11' || code === 'F11' || e.keyCode === 122) {
            e.preventDefault();
            e.stopPropagation();

            const posView = document.getElementById('view-pos');
            if (isPosViewActive() || (posView && posView.classList.contains('active'))) {
                addBlankPosRow();
                return;
            }

            const isNewPurchaseActive = document.getElementById('view-new-purchase-invoice')?.classList.contains('active');
            const isInvoicesListActive = document.getElementById('view-purchases-invoices')?.classList.contains('active');
            const isPurchasesHubActive = document.getElementById('view-purchases-hub')?.classList.contains('active');
            if (isNewPurchaseActive) {
                if (typeof window.addNewPurchaseBlankRow === 'function') {
                    window.addNewPurchaseBlankRow();
                }
                return;
            }
            if (isInvoicesListActive || isPurchasesHubActive) {
                switchView('new-purchase-invoice');
                return;
            }
            return;
        }

        // 3. F1: ONLY for searching products - opens search popup without switching views
        const isF1Key = key === 'F1' || code === 'F1' || e.keyCode === 112 || key === 'Help';
        if (isF1Key) {
            e.preventDefault();
            e.stopPropagation();

            const activeBarInp = document.activeElement?.classList?.contains('pos-row-barcode-input') ? document.activeElement : null;
            openCategoryProductLookup(activeBarInp ? activeBarInp.value.trim() : '');
            return;
        }

        // 4. F10 / F4: Complete sale & print invoice in POS, or print thermal receipt modal
        if (key === 'F10' || code === 'F10' || e.keyCode === 121 || key === 'F4' || code === 'F4') {
            e.preventDefault();
            e.stopPropagation();

            // High priority: If thermal receipt modal is open, trigger thermal print!
            const thermalModal = document.getElementById('modalThermalReceipt');
            if (thermalModal && (thermalModal.style.display === 'flex' || thermalModal.classList.contains('active'))) {
                handleThermalPrint();
                return;
            }

            const isNewPurchaseActive = document.getElementById('view-new-purchase-invoice')?.classList.contains('active');
            if (isNewPurchaseActive) {
                submitNewPurchaseInvoiceView();
                return;
            }

            const isNewProductActive = document.getElementById('view-new-product')?.classList.contains('active');
            if (isNewProductActive && (key === 'F4' || code === 'F4')) {
                saveProductFormView(false);
                return;
            }

            const posView = document.getElementById('view-pos');
            if (posView && (posView.classList.contains('active') || isPosViewActive())) {
                executePosCheckout();
                return;
            }
            return;
        }

        // 5. F2: Toggle Sale / Return mode in POS
        if (key === 'F2' || code === 'F2') {
            const isPosActive = document.getElementById('view-pos')?.classList.contains('active');
            if (isPosActive) {
                e.preventDefault();
                e.stopPropagation();
                setPosMode(state.posMode === 'sale' ? 'return' : 'sale');
                return;
            }
        }

        // 6. F12 disabled per user request
        if (key === 'F12' || code === 'F12' || e.keyCode === 123) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
    }, true); // Capture phase: intercepts keystrokes before browser default actions (F1 help, F10 menu, F11 fullscreen)

    document.addEventListener('keydown', (e) => {
        if (e.key === 'F1' || e.code === 'F1' || e.keyCode === 112 || e.key === 'Help') {
            e.preventDefault();
            e.stopPropagation();
            const activeBarInp = document.activeElement?.classList?.contains('pos-row-barcode-input') ? document.activeElement : null;
            openCategoryProductLookup(activeBarInp ? activeBarInp.value.trim() : '');
        }
    }, true);

    // Intercept Windows/Browser default F1 Help dialog completely
    window.onhelp = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        openCategoryProductLookup();
        return false;
    };
    document.onhelp = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        openCategoryProductLookup();
        return false;
    };

    // Also suppress F1 and F12 on keyup to prevent any delayed browser help trigger or DevTools
    window.addEventListener('keyup', (e) => {
        if (e.key === 'F1' || e.code === 'F1' || e.keyCode === 112 || e.key === 'Help' || e.key === 'F12' || e.code === 'F12' || e.keyCode === 123) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    // Click outside modalCategoryProductLookup to close
    const catLookupModal = document.getElementById('modalCategoryProductLookup');
    if (catLookupModal) {
        catLookupModal.addEventListener('click', (e) => {
            if (e.target === catLookupModal) {
                closeCategoryProductLookup();
            }
        });
    }

    // OS-level F1, F10 and F11 accelerators forwarded directly by Electron main process
    if (window.api && typeof window.api.onF1Pressed === 'function') {
        window.api.onF1Pressed(() => {
            const activeBarInp = document.activeElement?.classList?.contains('pos-row-barcode-input') ? document.activeElement : null;
            openCategoryProductLookup(activeBarInp ? activeBarInp.value.trim() : '');
        });
    }

    if (window.api && typeof window.api.onF10Pressed === 'function') {
        window.api.onF10Pressed(() => {
            const thermalModal = document.getElementById('modalThermalReceipt');
            if (thermalModal && (thermalModal.style.display === 'flex' || thermalModal.classList.contains('active'))) {
                handleThermalPrint();
                return;
            }
            const posView = document.getElementById('view-pos');
            if (posView && (posView.classList.contains('active') || isPosViewActive())) {
                executePosCheckout();
            }
        });
    }

    if (window.api && typeof window.api.onF11Pressed === 'function') {
        window.api.onF11Pressed(() => {
            const posView = document.getElementById('view-pos');
            if (posView && (posView.classList.contains('active') || isPosViewActive())) {
                addBlankPosRow();
            }
        });
    }
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
 * 3. MASTER POS & SALES ARCHITECTURE (STRICT KEYBOARD & MULTI-TENDER)
 * ------------------------------------------------------------- */
let posRowCounter = 0;
let posCustomerDebounceTimer = null;
let posLookupAllProducts = [];

async function populatePosSellers() {
    const sel = document.getElementById('posSellerSelect');
    if (!sel) return;
    try {
        const res = await window.api.listUsers();
        if (res && res.success && res.data && res.data.length > 0) {
            // Branch sellers only - Admin does NOT sell in the branch!
            const branchSellers = res.data.filter(u => u.role !== 'admin' && (u.is_active === 1 || u.is_active === undefined));
            const usersToShow = branchSellers.length > 0 ? branchSellers : res.data;
            sel.innerHTML = usersToShow.map(u => {
                const isCurrent = state.currentUser && state.currentUser.id === u.id;
                const label = u.display_name || u.name || u.username;
                return `<option value="${u.id}" ${isCurrent ? 'selected' : ''}>${escapeHtml(label)} (بائع الفرع)</option>`;
            }).join('');
        }
    } catch (e) {
        console.error('Failed to populate POS sellers:', e);
    }
}

async function triggerCustomerDirectSearch() {
    const input = document.getElementById('posCustomerInput');
    const query = input?.value.trim();
    if (!query) return;
    const res = await window.api.searchCustomers(query, 10);
    const customerDropdown = document.getElementById('posCustomerDropdown');
    if (!customerDropdown) return;
    if (res.success && res.data && res.data.length > 0) {
        // Deduplicate by ID
        const unique = [];
        const seen = new Set();
        for (const c of res.data) {
            if (!seen.has(c.id)) {
                seen.add(c.id);
                unique.push(c);
            }
        }
        customerDropdown.innerHTML = unique.map(c => {
            const code = c.customer_code || ('CUST-' + String(c.id).padStart(4, '0'));
            return `
            <div class="pos-customer-dropdown-item" onclick="selectPosCustomer(${c.id}, '${escapeHtml(c.name)}', '${c.phone || ''}', ${c.points || 0})">
                <div>
                    <div class="cust-name">
                        <span style="background: #E2E8F0; color: #1E293B; font-size: 11px; padding: 1px 6px; border-radius: 4px; font-weight: 700; margin-left: 6px; font-family: monospace;">${code}</span>
                        ${escapeHtml(c.name)}
                    </div>
                    <div class="cust-phone">${escapeHtml(c.phone || 'بدون هاتف')}</div>
                </div>
                <div class="cust-pts">${c.points || 0} نقطة</div>
            </div>
            `;
        }).join('');
        customerDropdown.style.display = 'block';
    } else {
        openQuickCustomerModal(query);
    }
}

function bindPosEvents() {
    // 1. Initial blank row
    if (state.posRows.length === 0) {
        addBlankPosRow();
    } else {
        renderPosTable();
    }

    // Delegated delete handler to guarantee delete button click works 100%
    const gridBody = document.getElementById('posGridBody');
    if (gridBody && !gridBody._hasDeleteHandler) {
        gridBody._hasDeleteHandler = true;
        gridBody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-remove-row');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                const rowId = btn.dataset.rowId || btn.closest('tr')?.dataset.rowId;
                if (rowId) {
                    removePosRow(Number(rowId));
                }
            }
        });
    }

    populatePosSellers();

    // 2. Discount inputs sync
    const discountPercentInput = document.getElementById('posDiscountPercent');
    const discountAmountInput = document.getElementById('posDiscountAmount');

    if (discountAmountInput) {
        discountAmountInput.addEventListener('input', () => {
            const subtotal = getPosSubtotal();
            const amount = Number(discountAmountInput.value) || 0;
            if (subtotal > 0 && discountPercentInput) {
                const percent = Math.min(100, Math.max(0, Math.round((amount / subtotal) * 100)));
                discountPercentInput.value = percent;
                state.discountPercent = percent;
            }
            updatePosTotals();
        });
    }

    if (discountPercentInput && discountAmountInput) {
        discountPercentInput.addEventListener('input', () => {
            let percent = Number(discountPercentInput.value) || 0;
            if (percent < 0) percent = 0;
            if (percent > 100) percent = 100;
            discountPercentInput.value = percent;
            state.discountPercent = percent;

            const subtotal = getPosSubtotal();
            if (subtotal > 0) {
                discountAmountInput.value = Math.round((subtotal * (percent / 100)) * 100) / 100;
            }

            // Cashier ceiling check
            const maxCashierDiscount = Number(state.settings?.cashier_max_discount_percent || 5);
            const warningEl = document.getElementById('posCashierCeilingWarning');
            if (state.currentUser?.role === 'cashier' && percent > maxCashierDiscount) {
                if (warningEl) warningEl.style.display = 'flex';
            } else {
                if (warningEl) warningEl.style.display = 'none';
                state.managerOverride = null;
            }

            updatePosTotals();
        });
    }

    // 3. Multi-tender inputs sync
    ['posTenderCash', 'posTenderCard', 'posTenderTransfer'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => {
                document.querySelectorAll('.btn-pay-pill').forEach(b => b.classList.remove('active'));
                updatePosTotals();
            });
        }
    });

    // 4. Customer fast lookup input
    const customerInput = document.getElementById('posCustomerInput');
    const customerDropdown = document.getElementById('posCustomerDropdown');

    if (customerInput && customerDropdown) {
        customerInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                triggerCustomerDirectSearch();
            }
        });

        customerInput.addEventListener('input', () => {
            const query = customerInput.value.trim();
            clearTimeout(posCustomerDebounceTimer);
            if (!query) {
                customerDropdown.style.display = 'none';
                return;
            }
            posCustomerDebounceTimer = setTimeout(async () => {
                const res = await window.api.searchCustomers(query, 10);
                if (res.success && res.data && res.data.length > 0) {
                    const unique = [];
                    const seen = new Set();
                    for (const c of res.data) {
                        if (!seen.has(c.id)) {
                            seen.add(c.id);
                            unique.push(c);
                        }
                    }
                    customerDropdown.innerHTML = unique.map(c => {
                        const code = c.customer_code || ('CUST-' + String(c.id).padStart(4, '0'));
                        return `
                        <div class="pos-customer-dropdown-item" onclick="selectPosCustomer(${c.id}, '${escapeHtml(c.name)}', '${c.phone || ''}', ${c.points || 0})">
                            <div>
                                <div class="cust-name">
                                    <span style="background: #E2E8F0; color: #1E293B; font-size: 11px; padding: 1px 6px; border-radius: 4px; font-weight: 700; margin-left: 6px; font-family: monospace;">${code}</span>
                                    ${escapeHtml(c.name)}
                                </div>
                                <div class="cust-phone">${escapeHtml(c.phone || 'بدون هاتف')}</div>
                            </div>
                            <div class="cust-pts">${c.points || 0} نقطة</div>
                        </div>
                        `;
                    }).join('');
                    customerDropdown.style.display = 'block';
                } else {
                    customerDropdown.innerHTML = `
                        <div style="padding: 10px 14px; font-size: 12px; color: var(--text-muted); text-align: center;">
                            لا يوجد عميل بهذا الاسم أو الهاتف
                            <div style="margin-top: 6px;">
                                <button type="button" class="btn-primary" style="padding: 3px 10px; font-size: 11px;" onclick="openQuickCustomerModal('${escapeHtml(query)}')">
                                    + تسجيل عميل جديد الآن
                                </button>
                            </div>
                        </div>
                    `;
                    customerDropdown.style.display = 'block';
                }
            }, 180);
        });

        // Hide dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!customerInput.contains(e.target) && !customerDropdown.contains(e.target)) {
                customerDropdown.style.display = 'none';
            }
        });
    }

    // 4b. Customer Direct Phone & Name Auto-Lookup
    const directPhone = document.getElementById('posCustomerPhoneDirect');
    const directPhoneDropdown = document.getElementById('posDirectPhoneDropdown');
    let directPhoneTimer = null;

    if (directPhone && directPhoneDropdown) {
        directPhone.addEventListener('input', () => {
            const query = directPhone.value.trim();
            clearTimeout(directPhoneTimer);
            if (!query || query.length < 3) {
                directPhoneDropdown.style.display = 'none';
                return;
            }
            directPhoneTimer = setTimeout(async () => {
                const res = await window.api.searchCustomers(query, 6);
                if (res && res.success && res.data && res.data.length > 0) {
                    const exact = res.data.find(c => c.phone && c.phone.trim() === query);
                    if (exact && (!state.selectedCustomer || state.selectedCustomer.id !== exact.id)) {
                        selectPosCustomer(exact.id, exact.name, exact.phone, exact.points);
                    }

                    directPhoneDropdown.innerHTML = res.data.map(c => {
                        const code = c.customer_code || ('CUST-' + String(c.id).padStart(4, '0'));
                        return `
                        <div class="pos-customer-dropdown-item" onclick="selectPosCustomer(${c.id}, '${escapeHtml(c.name)}', '${c.phone || ''}', ${c.points || 0})">
                            <div>
                                <div class="cust-name">
                                    <span style="background: #E2E8F0; color: #1E293B; font-size: 11px; padding: 1px 6px; border-radius: 4px; font-weight: 700; margin-left: 6px; font-family: monospace;">${code}</span>
                                    ${escapeHtml(c.name)}
                                </div>
                                <div class="cust-phone">${escapeHtml(c.phone || 'بدون هاتف')}</div>
                            </div>
                            <div class="cust-pts">${c.points || 0} نقطة</div>
                        </div>
                        `;
                    }).join('');
                    directPhoneDropdown.style.display = 'block';
                } else {
                    directPhoneDropdown.style.display = 'none';
                }
            }, 180);
        });

        directPhone.addEventListener('blur', async () => {
            setTimeout(() => { directPhoneDropdown.style.display = 'none'; }, 250);
            const query = directPhone.value.trim();
            if (query && (!state.selectedCustomer || state.selectedCustomer.phone !== query)) {
                try {
                    const res = await window.api.searchCustomers(query, 1);
                    if (res && res.success && res.data && res.data.length > 0) {
                        const c = res.data[0];
                        if (c.phone && c.phone.trim() === query) {
                            selectPosCustomer(c.id, c.name, c.phone, c.points);
                        }
                    }
                } catch (_) {}
            }
        });
    }

    const directName = document.getElementById('posCustomerNameDirect');
    const directNameDropdown = document.getElementById('posDirectNameDropdown');
    let directNameTimer = null;

    if (directName && directNameDropdown) {
        directName.addEventListener('input', () => {
            const query = directName.value.trim();
            clearTimeout(directNameTimer);
            if (!query || query.length < 2) {
                directNameDropdown.style.display = 'none';
                return;
            }
            directNameTimer = setTimeout(async () => {
                const res = await window.api.searchCustomers(query, 6);
                if (res && res.success && res.data && res.data.length > 0) {
                    directNameDropdown.innerHTML = res.data.map(c => {
                        const code = c.customer_code || ('CUST-' + String(c.id).padStart(4, '0'));
                        return `
                        <div class="pos-customer-dropdown-item" onclick="selectPosCustomer(${c.id}, '${escapeHtml(c.name)}', '${c.phone || ''}', ${c.points || 0})">
                            <div>
                                <div class="cust-name">
                                    <span style="background: #E2E8F0; color: #1E293B; font-size: 11px; padding: 1px 6px; border-radius: 4px; font-weight: 700; margin-left: 6px; font-family: monospace;">${code}</span>
                                    ${escapeHtml(c.name)}
                                </div>
                                <div class="cust-phone">${escapeHtml(c.phone || 'بدون هاتف')}</div>
                            </div>
                            <div class="cust-pts">${c.points || 0} نقطة</div>
                        </div>
                        `;
                    }).join('');
                    directNameDropdown.style.display = 'block';
                } else {
                    directNameDropdown.style.display = 'none';
                }
            }, 180);
        });

        directName.addEventListener('blur', async () => {
            setTimeout(() => { directNameDropdown.style.display = 'none'; }, 250);
            const query = directName.value.trim();
            if (query && (!state.selectedCustomer || state.selectedCustomer.name.toLowerCase() !== query.toLowerCase())) {
                try {
                    const res = await window.api.searchCustomers(query, 5);
                    if (res && res.success && res.data && res.data.length > 0) {
                        const exact = res.data.find(c => c.name && c.name.trim().toLowerCase() === query.toLowerCase());
                        if (exact) {
                            selectPosCustomer(exact.id, exact.name, exact.phone, exact.points);
                        }
                    }
                } catch (_) {}
            }
        });
    }

    // 5. Lookup products modal search (F1)
    const lookupSearch = document.getElementById('lookupProductSearchInput');
    if (lookupSearch) {
        lookupSearch.addEventListener('input', () => {
            filterLookupProducts();
        });
        lookupSearch.addEventListener('keydown', (e) => {
            const rows = Array.from(document.querySelectorAll('#lookupProductsTableBody tr.lookup-item-row'));
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                let currentIdx = rows.findIndex(r => r.classList.contains('lookup-active-row'));
                if (currentIdx >= 0) rows[currentIdx].classList.remove('lookup-active-row');
                let nextIdx = (currentIdx + 1 < rows.length) ? currentIdx + 1 : 0;
                if (rows[nextIdx]) {
                    rows[nextIdx].classList.add('lookup-active-row');
                    rows[nextIdx].scrollIntoView({ block: 'nearest' });
                }
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                let currentIdx = rows.findIndex(r => r.classList.contains('lookup-active-row'));
                if (currentIdx >= 0) rows[currentIdx].classList.remove('lookup-active-row');
                let prevIdx = (currentIdx - 1 >= 0) ? currentIdx - 1 : rows.length - 1;
                if (rows[prevIdx]) {
                    rows[prevIdx].classList.add('lookup-active-row');
                    rows[prevIdx].scrollIntoView({ block: 'nearest' });
                }
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const activeRow = document.querySelector('#lookupProductsTableBody tr.lookup-active-row') || document.querySelector('#lookupProductsTableBody tr.lookup-item-row');
                if (activeRow) {
                    const prodId = activeRow.dataset.productId || activeRow.getAttribute('data-product-id');
                    if (prodId) {
                        addLookupProductToPos(Number(prodId));
                    } else {
                        const btn = activeRow.querySelector('.swm-btn-emerald, .btn-select-product');
                        if (btn) btn.click();
                        else activeRow.click();
                    }
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                closeCategoryProductLookup();
                return;
            }
        });
    }
}

/* -------------------------------------------------------------
 * LIVE SEARCH POP-UP FOLLOW (DROPDOWN ANCHORED UNDER INPUT)
 * ------------------------------------------------------------- */
let activeFollowRowId = null;
let followProductsList = [];
let followSelectedIndex = -1;
let followDebounceTimer = null;

function hideFollowPopup() {
    const popup = document.getElementById('posSearchFollowPopup');
    if (popup) popup.style.display = 'none';
    activeFollowRowId = null;
    followProductsList = [];
    followSelectedIndex = -1;
}

function positionFollowPopup(inputEl) {
    const popup = document.getElementById('posSearchFollowPopup');
    if (!popup || !inputEl) return;
    const rect = inputEl.getBoundingClientRect();
    const popupHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceBelow < popupHeight && rect.top > popupHeight) {
        popup.style.top = `${rect.top - popupHeight - 4}px`;
    } else {
        popup.style.top = `${rect.bottom + 4}px`;
    }

    const rightOffset = window.innerWidth - rect.right;
    popup.style.right = `${Math.max(10, rightOffset - 10)}px`;
    popup.style.left = 'auto';
    popup.style.display = 'block';
}

async function triggerFollowSearch(rowId, query, inputEl) {
    // Disabled: product search is only invoked when user presses F1
    hideFollowPopup();
}

function renderFollowPopupItems() {
    const listEl = document.getElementById('posFollowPopupList');
    if (!listEl) return;

    listEl.innerHTML = followProductsList.map((p, idx) => {
        let stockClass = 'stock-ok';
        if (p.current_stock <= 0) stockClass = 'stock-zero';
        else if (p.current_stock <= 5) stockClass = 'stock-low';

        let specs = [];
        if (p.color) specs.push(p.color);
        if (p.size) specs.push(p.size);
        if (p.brand) specs.push(p.brand);
        const specsText = specs.length > 0 ? specs.join(' / ') : '';

        const isSelected = idx === followSelectedIndex;

        return `
            <div class="follow-popup-item ${isSelected ? 'selected' : ''}" 
                 id="followItem_${idx}" 
                 onmousedown="event.preventDefault(); selectFollowProduct(${activeFollowRowId}, ${p.id})">
                <div>
                    <span class="popup-code-pill">${escapeHtml(p.barcode || p.product_code || String(p.id))}</span>
                </div>
                <div class="popup-prod-info">
                    <div class="popup-prod-name">${escapeHtml(p.item_name)}</div>
                    <div class="popup-prod-sub">
                        <span>${escapeHtml(specsText || '-')}</span>
                        ${p.category_name ? `• <span>${escapeHtml(p.category_name)}</span>` : ''}
                    </div>
                </div>
                <div style="text-align: center;">
                    <span class="popup-stock-badge ${stockClass}">
                        ${p.current_stock > 0 ? `${p.current_stock} متاح` : '0 متاح (نفذ)'}
                    </span>
                </div>
                <div class="popup-price-val">
                    ${Number(p.sell_price).toFixed(2)} ج.م
                </div>
            </div>
        `;
    }).join('');

    const selectedEl = document.getElementById(`followItem_${followSelectedIndex}`);
    if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
    }
}

function highlightFollowItem(index) {
    if (index < 0 || index >= followProductsList.length) return;
    followSelectedIndex = index;
    document.querySelectorAll('.follow-popup-item').forEach((item, idx) => {
        item.classList.toggle('selected', idx === followSelectedIndex);
    });
    const selectedEl = document.getElementById(`followItem_${followSelectedIndex}`);
    if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
    }
}

function selectFollowProduct(rowId, productId) {
    const prod = followProductsList.find(p => p.id === productId) || posLookupAllProducts.find(p => p.id === productId);
    if (!prod) return;

    let targetRow = state.posRows.find(r => r.id === rowId);
    if (!targetRow) {
        targetRow = state.posRows.find(r => r.product == null);
    }
    if (!targetRow) {
        addBlankPosRow();
        targetRow = state.posRows[state.posRows.length - 1];
    }

    hideFollowPopup();
    applyProductToRow(targetRow, prod);
}

// Global click outside to dismiss follow popup
document.addEventListener('click', (e) => {
    if (!e.target.closest('#posSearchFollowPopup') && !e.target.closest('.pos-row-barcode-input')) {
        hideFollowPopup();
    }
});

/**
 * Render the entire POS grid based on state.posRows
 * Exactly implements Screenshot 1 (Yellow blank search row with ||| icon & red delete badge)
 * and filled item rows with stock, qty, price, total & delete action.
 */

let posLiveDropdownState = {
    rowId: null,
    items: [],
    selectedIndex: 0,
    debounceTimer: null
};

function hidePosRowLiveDropdown(rowId) {
    const id = rowId != null ? rowId : posLiveDropdownState.rowId;
    if (id != null) {
        const dd = document.getElementById('posRowLiveDropdown_' + id);
        if (dd) {
            dd.style.display = 'none';
            dd.innerHTML = '';
        }
    }
    posLiveDropdownState.rowId = null;
    posLiveDropdownState.items = [];
    posLiveDropdownState.selectedIndex = 0;
}

function showPosRowLiveDropdown(rowId, items) {
    const dd = document.getElementById('posRowLiveDropdown_' + rowId);
    if (!dd || !items || items.length === 0) {
        hidePosRowLiveDropdown(rowId);
        return;
    }

    posLiveDropdownState.rowId = rowId;
    posLiveDropdownState.items = items;
    posLiveDropdownState.selectedIndex = 0;

    dd.innerHTML = items.map((p, idx) => {
        let stockClass = 'stock-ok';
        if (p.current_stock <= 0) stockClass = 'stock-zero';
        else if (p.current_stock <= 5) stockClass = 'stock-low';

        let specs = [];
        if (p.color) specs.push(p.color);
        if (p.size) specs.push(p.size);
        if (p.brand) specs.push(p.brand);
        const specsText = specs.length > 0 ? specs.join(' / ') : '';

        return `
            <div class="pos-live-dropdown-item ${idx === 0 ? 'active' : ''}" 
                 data-idx="${idx}" 
                 onmousedown="event.preventDefault(); selectPosLiveItem(${rowId}, ${p.id});">
                <div class="pos-live-item-right">
                    <span class="pos-live-barcode-pill">${escapeHtml(p.barcode || p.product_code || String(p.id))}</span>
                </div>
                <div class="pos-live-item-info">
                    <div class="pos-live-item-name">${escapeHtml(p.item_name)}</div>
                    <div class="pos-live-item-sub">
                        ${specsText ? `<span>${escapeHtml(specsText)}</span>` : ''}
                        ${p.category_name ? `<span> • ${escapeHtml(p.category_name)}</span>` : ''}
                    </div>
                </div>
                <div style="text-align: center;">
                    <span class="pos-live-stock-badge ${stockClass}">
                        ${p.current_stock > 0 ? `${p.current_stock} متاح` : '0 متاح (نفذ)'}
                    </span>
                </div>
                <div class="pos-live-price">
                    ${Number(p.sell_price).toFixed(2)} ج.م
                </div>
            </div>
        `;
    }).join('');

    dd.style.display = 'block';
}

function selectPosLiveItem(rowId, productId) {
    const item = posLiveDropdownState.items.find(p => p.id === productId) || 
                 (posLookupAllProducts || []).find(p => p.id === productId);
    hidePosRowLiveDropdown(rowId);
    if (!item) return;

    let targetRow = state.posRows.find(r => r.id === rowId);
    if (!targetRow || targetRow.product != null) {
        targetRow = state.posRows.find(r => !r.product);
    }
    if (!targetRow) {
        addBlankPosRow();
        targetRow = state.posRows[state.posRows.length - 1];
    }
    applyProductToRow(targetRow, item);
}
window.selectPosLiveItem = selectPosLiveItem;

// Global listener to close live row dropdown
document.addEventListener('click', (e) => {
    if (!e.target.closest('.pos-blank-search-wrap')) {
        hidePosRowLiveDropdown();
    }
});

function renderPosTable() {
    const tbody = document.getElementById('posGridBody');
    if (!tbody) return;

    if (!state.posRows || state.posRows.length === 0) {
        posRowCounter++;
        state.posRows = [{
            id: posRowCounter,
            barcode: '',
            product: null,
            quantity: 1,
            unitPrice: 0,
            lineTotal: 0
        }];
    }

    tbody.innerHTML = state.posRows.map((row, idx) => {
        const seq = idx + 1;
        if (!row.product) {
            // Screenshot 1: Soft Yellow Spanning Search Row
            return `
                <tr id="posRow_${row.id}" data-row-id="${row.id}" class="pos-row-blank">
                    <td class="row-seq-col" style="text-align: center; font-weight: 700; color: #64748B;">${seq}</td>
                    <td colspan="5" class="pos-blank-search-cell" style="padding: 6px 10px;">
                        <div class="pos-blank-search-wrap">
                            <input type="text" id="posBarcode_${row.id}" class="pos-row-barcode-input" 
                                   value="${escapeHtml(row.barcode || '')}"
                                   placeholder="أدخل باركود أو كود الصنف واضغط Enter، أو اضغط F1 لاختيار الصنف..." autocomplete="off">
                            <button type="button" class="pos-barcode-search-btn" onclick="openCategoryProductLookup(document.getElementById('posBarcode_${row.id}')?.value?.trim() || '')" title="بحث عن صنف (F1)">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                            </button>
                            <div id="posRowLiveDropdown_${row.id}" class="pos-row-live-dropdown" style="display: none;"></div>
                        </div>
                    </td>
                    <td class="pos-blank-action-cell" style="text-align: center; vertical-align: middle;">
                        <button type="button" class="btn-remove-row" data-row-id="${row.id}" onclick="removePosRow(${row.id})" title="حذف السطر">
                            <i data-lucide="trash-2" class="icon-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        } else {
            // Filled Product Row (7 columns matching table headers)
            const p = row.product;
            let stockClass = 'stock-ok';
            if (p.current_stock <= 0) stockClass = 'stock-zero';
            else if (p.current_stock <= 5) stockClass = 'stock-low';

            let specs = [];
            if (p.color) specs.push(p.color);
            if (p.size) specs.push(p.size);
            if (p.brand) specs.push(p.brand);
            const specsText = specs.length > 0 ? `(${specs.join(' / ')})` : '';

            const maxQty = state.posMode === 'sale' ? (p.current_stock || 1) : 9999;

            return `
                <tr id="posRow_${row.id}" data-row-id="${row.id}" class="pos-row-filled active-row">
                    <td class="row-seq-col" style="text-align: center; font-weight: 700; color: #0F172A;">${seq}</td>
                    <td>
                        <span class="product-code-tag">${escapeHtml(row.barcode || p.barcode || p.product_code || String(p.id))}</span>
                    </td>
                    <td>
                        <div class="prod-name-main">${escapeHtml(p.item_name)}</div>
                        <div class="prod-specs-sub">
                            ${specsText ? `<span>${escapeHtml(specsText)}</span>` : ''}
                            ${p.category_name ? `<span class="prod-category-badge" style="margin-right: 4px;">${escapeHtml(p.category_name)}</span>` : ''}
                        </div>
                    </td>
                    <td style="text-align: center;">
                        <span class="prod-stock-badge ${stockClass}">${p.current_stock} متاح</span>
                    </td>
                    <td style="text-align: center;">
                        <input type="number" id="posQty_${row.id}" class="pos-row-qty-input" min="1" max="${maxQty}" step="1" value="${row.quantity}">
                    </td>
                    <td style="text-align: left;" class="pos-row-price">
                        ${row.unitPrice.toFixed(2)} ج.م
                    </td>
                    <td>
                        <div class="pos-row-total-cell">
                            <span id="posTotal_${row.id}" class="pos-row-total-text">${row.lineTotal.toFixed(2)} ج.م</span>
                            <button type="button" class="btn-remove-row" data-row-id="${row.id}" onclick="removePosRow(${row.id})" title="حذف السطر">
                                <i data-lucide="trash-2" class="icon-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }).join('');

    refreshIcons(tbody);

    // Bind events to rendered rows
    state.posRows.forEach(row => {
        if (!row.product) {
            const input = document.getElementById(`posBarcode_${row.id}`);
            if (input) {
                input.addEventListener('input', () => {
                    const val = input.value.trim();
                    clearTimeout(posLiveDropdownState.debounceTimer);
                    if (!val) {
                        hidePosRowLiveDropdown(row.id);
                        return;
                    }
                    posLiveDropdownState.debounceTimer = setTimeout(async () => {
                        try {
                            const res = await window.api.searchProducts(val, 8);
                            if (res && res.success && res.data && res.data.length > 0 && input === document.activeElement) {
                                showPosRowLiveDropdown(row.id, res.data);
                            } else {
                                hidePosRowLiveDropdown(row.id);
                            }
                        } catch (_) {
                            hidePosRowLiveDropdown(row.id);
                        }
                    }, 100);
                });


                input.addEventListener('keydown', async (e) => {
                    const isF1 = e.key === 'F1' || e.code === 'F1' || e.keyCode === 112 || e.key === 'Help';
                    const isF10 = e.key === 'F10' || e.code === 'F10' || e.keyCode === 121;
                    const isF11 = e.key === 'F11' || e.code === 'F11' || e.keyCode === 122;

                    if (isF1) {
                        e.preventDefault();
                        e.stopPropagation();
                        hidePosRowLiveDropdown(row.id);
                        openCategoryProductLookup(input.value.trim());
                        return;
                    }
                    if (isF10) {
                        e.preventDefault();
                        e.stopPropagation();
                        hidePosRowLiveDropdown(row.id);
                        executePosCheckout();
                        return;
                    }
                    if (isF11) {
                        e.preventDefault();
                        e.stopPropagation();
                        hidePosRowLiveDropdown(row.id);
                        addBlankPosRow();
                        return;
                    }
                    if (e.key === 'ArrowDown') {
                        if (posLiveDropdownState.rowId === row.id && posLiveDropdownState.items.length > 0) {
                            e.preventDefault();
                            posLiveDropdownState.selectedIndex = (posLiveDropdownState.selectedIndex + 1) % posLiveDropdownState.items.length;
                            document.querySelectorAll(`#posRowLiveDropdown_${row.id} .pos-live-dropdown-item`).forEach((el, idx) => {
                                el.classList.toggle('active', idx === posLiveDropdownState.selectedIndex);
                                if (idx === posLiveDropdownState.selectedIndex) el.scrollIntoView({ block: 'nearest' });
                            });
                            return;
                        }
                    }
                    if (e.key === 'ArrowUp') {
                        if (posLiveDropdownState.rowId === row.id && posLiveDropdownState.items.length > 0) {
                            e.preventDefault();
                            posLiveDropdownState.selectedIndex = (posLiveDropdownState.selectedIndex - 1 + posLiveDropdownState.items.length) % posLiveDropdownState.items.length;
                            document.querySelectorAll(`#posRowLiveDropdown_${row.id} .pos-live-dropdown-item`).forEach((el, idx) => {
                                el.classList.toggle('active', idx === posLiveDropdownState.selectedIndex);
                                if (idx === posLiveDropdownState.selectedIndex) el.scrollIntoView({ block: 'nearest' });
                            });
                            return;
                        }
                    }
                    if (e.key === 'Escape') {
                        hidePosRowLiveDropdown(row.id);
                        return;
                    }
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (posLiveDropdownState.rowId === row.id && posLiveDropdownState.items.length > 0 && posLiveDropdownState.selectedIndex >= 0) {
                            const chosen = posLiveDropdownState.items[posLiveDropdownState.selectedIndex];
                            hidePosRowLiveDropdown(row.id);
                            applyProductToRow(row, chosen);
                            return;
                        }
                        await handlePosBarcodeScan(row.id, input.value.trim());
                    }
                });
            }
        } else {
            const qtyInput = document.getElementById(`posQty_${row.id}`);
            if (qtyInput) {
                qtyInput.addEventListener('focus', () => {
                    try { qtyInput.select(); } catch (_) {}
                });
                qtyInput.addEventListener('input', () => {
                    handlePosQtyChange(row.id, qtyInput.value);
                });
                qtyInput.addEventListener('keydown', (e) => {
                    const isF1 = e.key === 'F1' || e.code === 'F1' || e.keyCode === 112 || e.key === 'Help';
                    const isF10 = e.key === 'F10' || e.code === 'F10' || e.keyCode === 121;
                    const isF11 = e.key === 'F11' || e.code === 'F11' || e.keyCode === 122;

                    if (isF1) {
                        e.preventDefault();
                        e.stopPropagation();
                        openCategoryProductLookup();
                        return;
                    }
                    if (isF10) {
                        e.preventDefault();
                        e.stopPropagation();
                        executePosCheckout();
                        return;
                    }
                    if (isF11) {
                        e.preventDefault();
                        e.stopPropagation();
                        addBlankPosRow();
                        return;
                    }
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const blank = state.posRows.find(r => !r.product);
                        if (blank) {
                            const barInp = document.getElementById(`posBarcode_${blank.id}`);
                            if (barInp) {
                                barInp.focus();
                                barInp.select();
                            }
                        } else {
                            addBlankPosRow();
                        }
                    }
                });
            }
        }
    });

    updatePosStatsPills();
}

/**
 * Add a new blank row to POS table and focus its barcode cell (F11)
 */
function addBlankPosRow() {
    posRowCounter++;
    state.posRows.push({
        id: posRowCounter,
        barcode: '',
        product: null,
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0
    });

    renderPosTable();

    // Focus the new row barcode input
    const input = document.getElementById(`posBarcode_${posRowCounter}`);
    if (input) {
        setTimeout(() => {
            input.focus();
            input.select();
        }, 20);
    }
}
window.addBlankPosRow = addBlankPosRow;

/**
 * Handle scan or barcode entry on a specific row
 */
async function handlePosBarcodeScan(rowId, query) {
    hidePosRowLiveDropdown(rowId);
    if (!query || !query.trim()) return;
    const clean = query.trim();

    const row = state.posRows.find(r => r.id === rowId);
    if (!row) return;

    try {
        // 1. Try exact barcode / code / ID match
        const exactRes = await window.api.findProductByBarcode(clean);
        if (exactRes && exactRes.success && exactRes.data) {
            applyProductToRow(row, exactRes.data);
            return;
        }

        // 2. Search products by name, code, brand, category
        const searchRes = await window.api.searchProducts(clean, 20);
        if (searchRes && searchRes.success && searchRes.data && searchRes.data.length > 0) {
            if (searchRes.data.length === 1) {
                // Exactly one match -> apply directly
                applyProductToRow(row, searchRes.data[0]);
                return;
            } else {
                // Multiple matches -> open F1 search modal prefilled with query
                openCategoryProductLookup(clean);
                return;
            }
        }

        // 3. No match found -> open F1 search modal prefilled so user can browse
        openCategoryProductLookup(clean);
    } catch (err) {
        console.error('Error scanning/searching product for POS:', err);
        openCategoryProductLookup(clean);
    }
}

/**
 * Apply product data to a POS row:
 * Automatically detects if the product is already in the cart and increments its quantity
 * instead of creating duplicate rows.
 */
function applyProductToRow(row, product) {
    if (!product) return null;

    // Check if this product is already in the invoice cart
    const existingRow = state.posRows.find(r => r.product && (
        Number(r.product.id) === Number(product.id) ||
        (product.barcode && r.product.barcode === product.barcode) ||
        (product.product_code && r.product.product_code === product.product_code)
    ));

    if (existingRow) {
        // Enforce inventory stock limit in Sale mode
        if (state.posMode === 'sale') {
            const nextQty = existingRow.quantity + 1;
            if (nextQty > existingRow.product.current_stock) {
                alert(`تنبيه مخزني: الكمية المتاحة في المخزن للصنف (${product.item_name}) هي (${existingRow.product.current_stock}) فقط.`);
                if (row && !row.product) {
                    row.barcode = '';
                    const input = document.getElementById(`posBarcode_${row.id}`);
                    if (input) input.value = '';
                }
                renderPosTable();
                updatePosTotals();
                focusPosRowQty(existingRow.id);
                return existingRow;
            }
        }

        // Increment quantity of existing row
        existingRow.quantity += 1;
        existingRow.lineTotal = Math.round(existingRow.quantity * existingRow.unitPrice * 100) / 100;

        // Clear the barcode input of the blank row that initiated the duplicate scan
        if (row && row.id !== existingRow.id && !row.product) {
            row.barcode = '';
        }

        // Clean up redundant blank rows (keep exactly one blank row at bottom)
        const blankRows = state.posRows.filter(r => !r.product);
        if (blankRows.length > 1) {
            state.posRows = state.posRows.filter((r, idx) => r.product != null || idx === state.posRows.length - 1);
        } else if (blankRows.length === 0) {
            posRowCounter++;
            state.posRows.push({
                id: posRowCounter,
                barcode: '',
                product: null,
                quantity: 1,
                unitPrice: 0,
                lineTotal: 0
            });
        }

        renderPosTable();
        updatePosTotals();

        // Focus & select the quantity of the existing row
        focusPosRowQty(existingRow.id);
        return existingRow;
    }

    // New product: inventory stock check in Sale Mode
    if (state.posMode === 'sale') {
        if (product.current_stock <= 0) {
            alert(`تنبيه مخزني: الصنف (${product.item_name}) رصيده صفر بالمخزن ولا يمكن بيعه!`);
            if (row && !row.product) {
                row.barcode = '';
                const input = document.getElementById(`posBarcode_${row.id}`);
                if (input) input.value = '';
            }
            return null;
        }
    }

    // Target a blank row or create one
    let targetRow = row;
    if (!targetRow || targetRow.product != null) {
        targetRow = state.posRows.find(r => !r.product);
        if (!targetRow) {
            posRowCounter++;
            targetRow = {
                id: posRowCounter,
                barcode: '',
                product: null,
                quantity: 1,
                unitPrice: 0,
                lineTotal: 0
            };
            state.posRows.push(targetRow);
        }
    }

    targetRow.product = product;
    targetRow.barcode = product.barcode || product.product_code || String(product.id);
    targetRow.unitPrice = Number(product.sell_price) || 0;
    targetRow.quantity = 1;
    targetRow.lineTotal = targetRow.unitPrice;

    // Continuous workflow: ensure a blank row exists below for next scan
    const hasBlank = state.posRows.some(r => !r.product);
    if (!hasBlank) {
        posRowCounter++;
        state.posRows.push({
            id: posRowCounter,
            barcode: '',
            product: null,
            quantity: 1,
            unitPrice: 0,
            lineTotal: 0
        });
    }

    renderPosTable();
    updatePosTotals();

    // Automatically focus and highlight the quantity field of the selected product
    focusPosRowQty(targetRow.id);
    return targetRow;
}

/**
 * Reliably focus and highlight the quantity input of a specific POS row
 */
function focusPosRowQty(rowId) {
    if (!rowId) return;
    const tryFocus = () => {
        const qtyInput = document.getElementById(`posQty_${rowId}`);
        if (qtyInput) {
            qtyInput.focus();
            try { qtyInput.select(); } catch (_) {}
            return true;
        }
        return false;
    };
    tryFocus();
    requestAnimationFrame(tryFocus);
    setTimeout(tryFocus, 40);
    setTimeout(tryFocus, 100);
    setTimeout(tryFocus, 220);
}
window.focusPosRowQty = focusPosRowQty;

/**
 * Handle quantity change on row
 */
function handlePosQtyChange(rowId, val) {
    const row = state.posRows.find(r => r.id === rowId);
    if (!row || !row.product) return;

    let qty = Number(val) || 1;
    if (qty <= 0) qty = 1;

    // Enforce positive stock limit in Sale mode
    if (state.posMode === 'sale' && qty > row.product.current_stock) {
        alert(`الكمية المطلوبة (${qty}) تتجاوز الرصيد المتاح بالمخزن (${row.product.current_stock}) للصنف (${row.product.item_name}).`);
        qty = row.product.current_stock;
        const qtyInput = document.getElementById(`posQty_${rowId}`);
        if (qtyInput) qtyInput.value = qty;
    }

    row.quantity = qty;
    row.lineTotal = Math.round(row.quantity * row.unitPrice * 100) / 100;

    const totalCell = document.getElementById(`posTotal_${rowId}`);
    if (totalCell) totalCell.innerText = `${row.lineTotal.toFixed(2)} ج.م`;

    updatePosTotals();
}

/**
 * Remove a row from the POS table (Reliable deletion with single-row reset)
 */
function removePosRow(rowId) {
    const idx = state.posRows.findIndex(r => r.id === rowId);
    if (idx === -1) return;

    if (state.posRows.length <= 1) {
        // Clear and reset single row
        state.posRows[0].product = null;
        state.posRows[0].barcode = '';
        state.posRows[0].quantity = 1;
        state.posRows[0].unitPrice = 0;
        state.posRows[0].lineTotal = 0;
        renderPosTable();
        updatePosTotals();

        const input = document.getElementById(`posBarcode_${state.posRows[0].id}`);
        if (input) setTimeout(() => input.focus(), 20);
        return;
    }

    // Remove row
    state.posRows.splice(idx, 1);

    // Keep at least one blank row ready at bottom
    const hasBlank = state.posRows.some(r => !r.product);
    if (!hasBlank) {
        posRowCounter++;
        state.posRows.push({
            id: posRowCounter,
            barcode: '',
            product: null,
            quantity: 1,
            unitPrice: 0,
            lineTotal: 0
        });
    }

    renderPosTable();
    updatePosTotals();

    const blank = state.posRows.find(r => !r.product);
    if (blank) {
        const input = document.getElementById(`posBarcode_${blank.id}`);
        if (input) setTimeout(() => input.focus(), 20);
    }
}
window.removePosRow = removePosRow;

/**
 * Calculate Subtotal of all active rows
 */
function getPosSubtotal() {
    return state.posRows
        .filter(r => r.product != null)
        .reduce((sum, r) => sum + r.lineTotal, 0);
}

/**
 * Calculate grand total and update totals & 3-way balance match status
 */
function updatePosTotals() {
    const subtotal = Math.round(getPosSubtotal() * 100) / 100;
    const totalPieces = state.posRows
        .filter(r => r.product != null)
        .reduce((sum, r) => sum + r.quantity, 0);

    let discountAmount = Number(document.getElementById('posDiscountAmount')?.value) || 0;
    const finalTotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    // Update displays
    const subtotalEl = document.getElementById('posSubtotalDisplay');
    if (subtotalEl) subtotalEl.innerText = `${subtotal.toFixed(2)} ج.م`;

    const finalTotalEl = document.getElementById('posFinalTotalDisplay');
    if (finalTotalEl) finalTotalEl.innerText = `${finalTotal.toFixed(2)} ج.م`;

    // 3-way tender verification
    const cash = Number(document.getElementById('posTenderCash')?.value) || 0;
    const card = Number(document.getElementById('posTenderCard')?.value) || 0;
    const transfer = Number(document.getElementById('posTenderTransfer')?.value) || 0;

    const totalPaid = Math.round((cash + card + transfer) * 100) / 100;
    const diff = Math.round((totalPaid - finalTotal) * 100) / 100;

    const totalPaidEl = document.getElementById('posTotalPaidDisplay');
    if (totalPaidEl) totalPaidEl.innerText = `${totalPaid.toFixed(2)} ج.م`;

    const remainingEl = document.getElementById('posRemainingDisplay');
    if (remainingEl) remainingEl.innerText = `${Math.abs(diff).toFixed(2)} ج.م`;

    const badge = document.getElementById('posBalanceCheckBadge');
    const badgeText = document.getElementById('posBalanceMatchText');
    const checkoutBtn = document.getElementById('btnFinalizeSale');

    const hasActiveProducts = state.posRows.some(r => r.product != null);

    if (hasActiveProducts && finalTotal > 0 && Math.abs(diff) < 0.01) {
        if (badge) badge.className = 'status-match-pill match-perfect';
        if (badgeText) badgeText.innerText = 'مسدد بالكامل';
        if (checkoutBtn) checkoutBtn.disabled = false;
    } else if (hasActiveProducts && diff < 0) {
        if (badge) badge.className = 'status-match-pill match-under';
        if (badgeText) badgeText.innerText = `متبقي: ${Math.abs(diff).toFixed(2)} ج.م`;
        if (checkoutBtn) checkoutBtn.disabled = true;
    } else if (hasActiveProducts && diff > 0) {
        if (badge) badge.className = 'status-match-pill match-over';
        if (badgeText) badgeText.innerText = `مبلغ زائد: ${diff.toFixed(2)} ج.م`;
        if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
        if (badge) badge.className = 'status-match-pill match-perfect';
        if (badgeText) badgeText.innerText = hasActiveProducts ? 'غير مسدد' : 'مسدد بالكامل';
        if (checkoutBtn) checkoutBtn.disabled = true;
    }

    // Toggle Empty State Box in Table (Screenshot 1)
    const emptyBox = document.getElementById('posTableEmptyState');
    if (emptyBox) {
        emptyBox.style.display = hasActiveProducts ? 'none' : 'flex';
    }

    updatePosStatsPills();
}

function updatePosStatsPills() {
    const activeRows = state.posRows.filter(r => r.product != null);
    const countEl = document.getElementById('posRowsCount');
    if (countEl) countEl.innerText = activeRows.length;

    const piecesEl = document.getElementById('posTotalPiecesCount');
    if (piecesEl) {
        const pieces = activeRows.reduce((sum, r) => sum + r.quantity, 0);
        piecesEl.innerText = pieces;
    }
}

/**
 * 1-Click Quick Fill for Tenders
 */
function setQuickTender(type) {
    const subtotal = getPosSubtotal();
    const discountAmount = Number(document.getElementById('posDiscountAmount')?.value) || 0;
    const finalTotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    const cashInput = document.getElementById('posTenderCash');
    const cardInput = document.getElementById('posTenderCard');
    const transferInput = document.getElementById('posTenderTransfer');

    if (type === 'cash') {
        if (cashInput) cashInput.value = finalTotal;
        if (cardInput) cardInput.value = 0;
        if (transferInput) transferInput.value = 0;
    } else if (type === 'card') {
        if (cashInput) cashInput.value = 0;
        if (cardInput) cardInput.value = finalTotal;
        if (transferInput) transferInput.value = 0;
    } else if (type === 'transfer') {
        if (cashInput) cashInput.value = 0;
        if (cardInput) cardInput.value = 0;
        if (transferInput) transferInput.value = finalTotal;
    }

    document.querySelectorAll('.btn-pay-pill').forEach(b => b.classList.remove('active'));
    if (type === 'cash') document.getElementById('btnTenderCash')?.classList.add('active');
    if (type === 'card') document.getElementById('btnTenderCard')?.classList.add('active');
    if (type === 'transfer') document.getElementById('btnTenderTransfer')?.classList.add('active');

    updatePosTotals();
}

/**
 * Fill remaining balance for a specific tender
 */
function fillRemainingTender(type) {
    const subtotal = getPosSubtotal();
    const discountAmount = Number(document.getElementById('posDiscountAmount')?.value) || 0;
    const finalTotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    const cashInput = document.getElementById('posTenderCash');
    const cardInput = document.getElementById('posTenderCard');
    const transferInput = document.getElementById('posTenderTransfer');

    const cash = Number(cashInput?.value) || 0;
    const card = Number(cardInput?.value) || 0;
    const transfer = Number(transferInput?.value) || 0;

    if (type === 'cash') {
        const remainder = Math.max(0, Math.round((finalTotal - card - transfer) * 100) / 100);
        if (cashInput) cashInput.value = remainder;
    } else if (type === 'card') {
        const remainder = Math.max(0, Math.round((finalTotal - cash - transfer) * 100) / 100);
        if (cardInput) cardInput.value = remainder;
    } else if (type === 'transfer') {
        const remainder = Math.max(0, Math.round((finalTotal - cash - card) * 100) / 100);
        if (transferInput) transferInput.value = remainder;
    }

    updatePosTotals();
}

/**
 * Switch POS mode between 'sale' and 'return' (F2)
 */
function setPosMode(mode) {
    state.posMode = mode;

    const btnSale = document.getElementById('labelPosModeSale') || document.getElementById('btnPosModeSale');
    const btnReturn = document.getElementById('labelPosModeReturn') || document.getElementById('btnPosModeReturn');
    const radioSale = document.getElementById('radioPosModeSale') || btnSale?.querySelector('input[type="radio"]');
    const radioReturn = document.getElementById('radioPosModeReturn') || btnReturn?.querySelector('input[type="radio"]');
    const posView = document.getElementById('view-pos');
    const checkoutBtn = document.getElementById('btnFinalizeSale');
    const checkoutBtnText = document.getElementById('posCheckoutBtnText');
    const grandLabel = document.querySelector('.totals-main-row .main-label');

    if (mode === 'return') {
        btnReturn?.classList.add('active');
        btnSale?.classList.remove('active');
        if (radioReturn) radioReturn.checked = true;
        if (radioSale) radioSale.checked = false;
        posView?.classList.add('pos-return-mode');
        if (checkoutBtnText) checkoutBtnText.innerText = 'صرف المرتجع وطباعة الإشعار (F10)';
        if (checkoutBtn) checkoutBtn.style.backgroundColor = '#DC2626';
        if (grandLabel) grandLabel.innerText = 'المبلغ المنصرف للمرتجع (خصم من اليومية):';
    } else {
        btnSale?.classList.add('active');
        btnReturn?.classList.remove('active');
        if (radioSale) radioSale.checked = true;
        if (radioReturn) radioReturn.checked = false;
        posView?.classList.remove('pos-return-mode');
        if (checkoutBtnText) checkoutBtnText.innerText = 'إتمام البيع وطباعة الفاتورة (F10)';
        if (checkoutBtn) checkoutBtn.style.backgroundColor = '';
        if (grandLabel) grandLabel.innerText = 'المطلوب سداده:';
    }

    updatePosTotals();
    refreshPosInvoiceCode().catch(console.error);
}

/**
 * Customer Selection & Fast Clear
 */
function selectPosCustomer(id, name, phone, points) {
    state.selectedCustomer = { id, name, phone, points };
    const dropdown = document.getElementById('posCustomerDropdown');
    if (dropdown) dropdown.style.display = 'none';

    const input = document.getElementById('posCustomerInput');
    if (input) input.value = '';

    const directName = document.getElementById('posCustomerNameDirect');
    if (directName) directName.value = name || '';

    const directPhone = document.getElementById('posCustomerPhoneDirect');
    if (directPhone) directPhone.value = phone || '';

    const card = document.getElementById('posSelectedCustomerCard');
    if (card) {
        const custCode = 'CUST-' + String(id).padStart(4, '0');
        document.getElementById('posCustomerDisplayName').innerHTML = `<span style="background: #E0E7FF; color: #3730A3; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 6px; font-family: monospace;">${custCode}</span> ${escapeHtml(name)}`;
        document.getElementById('posCustomerDisplayPhone').innerText = phone || '';
        document.getElementById('posCustomerDisplayPoints').innerText = `${points || 0} نقطة`;
        card.style.display = 'inline-flex';
    }
}

function clearSelectedCustomer() {
    state.selectedCustomer = null;
    const card = document.getElementById('posSelectedCustomerCard');
    if (card) card.style.display = 'none';

    const directName = document.getElementById('posCustomerNameDirect');
    if (directName) directName.value = '';

    const directPhone = document.getElementById('posCustomerPhoneDirect');
    if (directPhone) directPhone.value = '';
}

function openQuickCustomerModal(prefilledName = '') {
    const modal = document.getElementById('modalQuickCustomer');
    const nameInput = document.getElementById('quickCustomerName');
    const phoneInput = document.getElementById('quickCustomerPhone');
    const notesInput = document.getElementById('quickCustomerNotes');

    if (nameInput) nameInput.value = prefilledName || '';
    if (phoneInput) phoneInput.value = '';
    if (notesInput) notesInput.value = '';

    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => nameInput?.focus(), 50);
    }
}

function closeQuickCustomerModal() {
    const modal = document.getElementById('modalQuickCustomer');
    if (modal) modal.style.display = 'none';
}

async function submitQuickCustomer() {
    const name = document.getElementById('quickCustomerName')?.value.trim();
    const phone = document.getElementById('quickCustomerPhone')?.value.trim();
    const notes = document.getElementById('quickCustomerNotes')?.value.trim();

    if (!name) {
        alert('اسم العميل مطلوب');
        return;
    }

    try {
        const res = await window.api.quickCreateCustomer({ name, phone, notes });
        if (res.success && res.data) {
            selectPosCustomer(res.data.id, res.data.name, res.data.phone, res.data.points);
            closeQuickCustomerModal();
        } else {
            alert(`خطأ في تسجيل العميل: ${res.error}`);
        }
    } catch (err) {
        alert(err.message);
    }
}

/**
 * F1 Categories & Product Lookup Modal (Ant Design Style)
 * Strictly opens product search popup without navigating away from current page
 */
async function openCategoryProductLookup(searchQuery = '') {
    const modal = document.getElementById('modalCategoryProductLookup');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('active');
    modal.classList.add('show');
    modal.style.display = 'block';
    modal.style.setProperty('display', 'block', 'important');
    modal.style.setProperty('z-index', '99999999', 'important');

    const searchInput = document.getElementById('lookupProductSearchInput');
    const clearBtn = document.getElementById('lookupSearchClearBtn');
    if (searchInput) {
        searchInput.value = searchQuery || '';
        if (clearBtn) {
            clearBtn.style.display = searchInput.value ? 'inline-flex' : 'none';
        }
        setTimeout(() => {
            searchInput.focus();
            searchInput.select();
        }, 50);
    }

    state.activeLookupCategoryId = 'all';

    // Trigger fresh live query immediately
    filterLookupProducts(true);

    // Load categories asynchronously in parallel without blocking product results
    loadLookupCategories();
}
window.openCategoryProductLookup = openCategoryProductLookup;

function closeCategoryProductLookup() {
    const modal = document.getElementById('modalCategoryProductLookup');
    if (modal) {
        modal.classList.remove('active');
        modal.classList.remove('show');
        modal.classList.add('hidden');
        modal.style.display = 'none';
        modal.style.setProperty('display', 'none', 'important');
    }

    // Return focus to active POS row barcode input if in POS view
    setTimeout(() => {
        const posView = document.getElementById('view-pos');
        if (posView && posView.classList.contains('active')) {
            const blank = state.posRows.find(r => !r.product);
            if (blank) {
                const barInp = document.getElementById(`posBarcode_${blank.id}`);
                if (barInp) {
                    barInp.focus();
                    barInp.select();
                }
            }
        }
    }, 50);
}
window.closeCategoryProductLookup = closeCategoryProductLookup;

function clearLookupSearch() {
    const searchInput = document.getElementById('lookupProductSearchInput');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    const clearBtn = document.getElementById('lookupSearchClearBtn');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    filterLookupProducts(true);
}
window.clearLookupSearch = clearLookupSearch;

async function loadLookupCategories() {
    if (!window.api || typeof window.api.listCategories !== 'function') return;
    try {
        const catRes = await window.api.listCategories({ activeOnly: true });
        const sidebar = document.getElementById('lookupCategoriesSidebar');
        if (catRes && catRes.success && catRes.data && sidebar) {
            const cats = catRes.data;
            const isAll = !state.activeLookupCategoryId || state.activeLookupCategoryId === 'all';
            sidebar.innerHTML = `
                <button type="button" class="ant-btn css-hzthjx ${isAll ? 'ant-btn-primary ant-btn-color-primary ant-btn-variant-solid' : 'ant-btn-text ant-btn-color-default ant-btn-variant-text'} ant-btn-rtl" style="text-align: right; justify-content: flex-start; margin-bottom: 4px; border-radius: 6px; font-weight: ${isAll ? '700' : '500'}; ${isAll ? 'background-color: rgb(37, 99, 235);' : ''} width: 100%;" data-cat-id="all" onclick="selectLookupCategory('all')">
                    <span>جميع الأصناف</span>
                </button>
                ${cats.map(c => {
                    const isSel = String(state.activeLookupCategoryId) === String(c.id);
                    return `
                        <button type="button" class="ant-btn css-hzthjx ${isSel ? 'ant-btn-primary ant-btn-color-primary ant-btn-variant-solid' : 'ant-btn-text ant-btn-color-default ant-btn-variant-text'} ant-btn-rtl" style="text-align: right; justify-content: flex-start; margin-bottom: 3px; border-radius: 6px; font-weight: ${isSel ? '700' : '500'}; ${isSel ? 'background-color: rgb(37, 99, 235);' : ''} overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;" data-cat-id="${c.id}" onclick="selectLookupCategory(${c.id})">
                            <span>${escapeHtml(c.name)}</span>
                        </button>
                    `;
                }).join('')}
            `;
        }
    } catch (err) {
        console.error('Failed to load lookup categories:', err);
    }
}
window.loadLookupCategories = loadLookupCategories;

const lookupModalElem = document.getElementById('modalCategoryProductLookup');
if (lookupModalElem) {
    lookupModalElem.addEventListener('click', (e) => {
        if (e.target === lookupModalElem) {
            closeCategoryProductLookup();
        }
    });
}

function selectLookupCategory(catId) {
    state.activeLookupCategoryId = catId;
    document.querySelectorAll('#lookupCategoriesSidebar button').forEach(btn => {
        const isMatch = String(btn.dataset.catId) === String(catId);
        if (isMatch) {
            btn.className = 'ant-btn css-hzthjx ant-btn-primary ant-btn-color-primary ant-btn-variant-solid ant-btn-rtl';
            btn.style.backgroundColor = 'rgb(37, 99, 235)';
            btn.style.fontWeight = '700';
            btn.style.color = '#ffffff';
        } else {
            btn.className = 'ant-btn css-hzthjx ant-btn-text ant-btn-color-default ant-btn-variant-text ant-btn-rtl';
            btn.style.backgroundColor = 'transparent';
            btn.style.fontWeight = '500';
            btn.style.color = '';
        }
    });
    filterLookupProducts();
}
window.selectLookupCategory = selectLookupCategory;

let lookupSearchDebounceTimer = null;

function filterLookupProducts(immediate = false) {
    const searchInput = document.getElementById('lookupProductSearchInput');
    const query = searchInput ? searchInput.value.trim() : '';
    const catId = state.activeLookupCategoryId;

    const clearBtn = document.getElementById('lookupSearchClearBtn');
    if (clearBtn) {
        clearBtn.style.display = query ? 'inline-flex' : 'none';
    }

    clearTimeout(lookupSearchDebounceTimer);

    const doFilter = async () => {
        try {
            const res = await window.api.searchProducts(query, 300, catId);
            const tbody = document.getElementById('lookupProductsTableBody');
            if (!tbody) return;

            if (!res.success || !res.data || res.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="ant-table-cell" style="text-align: center; color: rgba(0,0,0,0.45); padding: 48px 16px; font-size: 13px;">لا توجد أصناف مطابقة للبحث في مخزن المحل</td></tr>';
                return;
            }

            posLookupAllProducts = res.data;
            tbody.innerHTML = res.data.map((p, idx) => {
                const stock = Number(p.current_stock || 0);
                const stockColor = stock > 0 ? 'rgb(22, 163, 74)' : 'rgb(245, 34, 45)';

                let specs = [];
                if (p.color) specs.push(p.color);
                if (p.size) specs.push(p.size);
                if (p.brand) specs.push(p.brand);
                const specsText = specs.length > 0 ? `(${specs.join(' / ')})` : '';

                const categoryTag = p.category_name 
                    ? `<span class="ant-tag ant-tag-blue ant-tag-rtl css-hzthjx" style="font-size: 10px; margin-top: 3px;">${escapeHtml(p.category_name)}</span>` 
                    : '';

                const code = escapeHtml(p.barcode || p.product_code || ('ITM-' + p.id));
                const price = Number(p.sell_price || 0).toFixed(2);

                return `
                    <tr class="ant-table-row ant-table-row-level-0 lookup-item-row ${idx === 0 ? 'lookup-active-row' : ''}" data-row-key="${p.id}" data-product-id="${p.id}" style="cursor: pointer;" onmousedown="event.preventDefault();" onclick="addLookupProductToPos(${p.id})">
                        <td class="ant-table-cell">
                            <span class="ant-typography ant-typography-rtl css-hzthjx"><code>${code}</code></span>
                        </td>
                        <td class="ant-table-cell">
                            <div>
                                <span class="ant-typography ant-typography-rtl css-hzthjx" style="display: block; font-size: 13px;">
                                    <strong>${escapeHtml(p.item_name)} ${specsText}</strong>
                                </span>
                                ${categoryTag}
                            </div>
                        </td>
                        <td class="ant-table-cell">
                            <span class="ant-typography ant-typography-rtl css-hzthjx" style="color: rgb(22, 163, 74); font-size: 14px;">
                                <strong>${price} ج.م</strong>
                            </span>
                        </td>
                        <td class="ant-table-cell">
                            <span class="ant-badge ant-badge-not-a-wrapper ant-badge-rtl css-hzthjx">
                                <sup data-show="true" class="ant-scroll-number ant-badge-count ant-badge-multiple-words" title="${stock} متاح" style="background-color: ${stockColor}; font-size: 10px;">
                                    ${stock} متاح
                                </sup>
                            </span>
                        </td>
                        <td class="ant-table-cell">
                            <button type="button" class="ant-btn css-hzthjx ant-btn-primary ant-btn-color-primary ant-btn-variant-solid ant-btn-sm ant-btn-rtl swm-btn-emerald" style="border-radius: 6px;" onmousedown="event.preventDefault();" onclick="event.stopPropagation(); addLookupProductToPos(${p.id})">
                                <span class="ant-btn-icon">
                                    <span role="img" aria-label="check" class="anticon anticon-check">
                                        <svg viewBox="64 64 896 896" focusable="false" data-icon="check" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M912 190h-69.9c-9.8 0-19.1 4.5-25.1 12.2L404.7 724.5 207 474a32 32 0 00-25.1-12.2H112c-6.7 0-10.4 7.7-6.3 12.9l273.9 347c12.8 16.2 37.4 16.2 50.3 0l488.4-618.9c4.1-5.1.4-12.8-6.3-12.8z"></path></svg>
                                    </span>
                                </span>
                                <span>اختيار</span>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (e) {
            console.error('Filter lookup error:', e);
        }
    };

    if (immediate) {
        doFilter();
    } else {
        lookupSearchDebounceTimer = setTimeout(doFilter, 50);
    }
}

async function addLookupProductToPos(productId) {
    try {
        let prod = (posLookupAllProducts || []).find(p => Number(p.id) === Number(productId) || String(p.id) === String(productId));
        if (!prod) {
            const res = await window.api.searchProducts(String(productId), 1);
            if (res.success && res.data && res.data.length > 0) {
                prod = res.data[0];
            }
        }

        if (prod) {
            closeCategoryProductLookup();
            let targetRow = state.posRows.find(r => r.product == null);
            if (!targetRow) {
                posRowCounter++;
                targetRow = {
                    id: posRowCounter,
                    barcode: '',
                    product: null,
                    quantity: 1,
                    unitPrice: 0,
                    lineTotal: 0
                };
                state.posRows.push(targetRow);
            }

            applyProductToRow(targetRow, prod);
        }
    } catch (err) {
        console.error('Error applying lookup product to POS:', err);
    } finally {
        closeCategoryProductLookup();
    }
}
window.addLookupProductToPos = addLookupProductToPos;

/**
 * Manager Override Modal for Cashier Discount Ceiling
 */
function openManagerOverrideModal() {
    const modal = document.getElementById('modalManagerOverride');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('overrideManagerUser').value = '';
        document.getElementById('overrideManagerPass').value = '';
        setTimeout(() => document.getElementById('overrideManagerUser')?.focus(), 50);
    }
}

function closeManagerOverrideModal() {
    const modal = document.getElementById('modalManagerOverride');
    if (modal) modal.style.display = 'none';
}

async function confirmManagerOverride() {
    const username = document.getElementById('overrideManagerUser')?.value.trim();
    const password = document.getElementById('overrideManagerPass')?.value;

    if (!username || !password) {
        alert('يرجى إدخال اسم مستخدم وكلمة مرور المدير');
        return;
    }

    const res = await window.api.verifyManager(username, password);
    if (res.success) {
        state.managerOverride = { username, password };
        closeManagerOverrideModal();
        // Proceed with checkout
        executePosCheckout();
    } else {
        alert(`فشل التحقق من صلاحية المدير: ${res.error}`);
    }
}

/**
 * Execute POS Checkout & Instant Thermal Print (F4)
 */
async function executePosCheckout() {
    if (!state.activeSession) {
        const sessRes = await window.api.ensureActiveSession(state.currentUser?.id);
        if (sessRes && sessRes.success && sessRes.data) {
            state.activeSession = sessRes.data;
        }
    }

    const verifiedItems = state.posRows
        .filter(r => r.product != null)
        .map(r => ({
            productId: r.product.id,
            quantity: r.quantity,
            unitPrice: r.unitPrice,
            itemName: r.product.item_name
        }));

    if (verifiedItems.length === 0) {
        alert('سلة الفاتورة فارغة! يرجى مسح باركود الأصناف أولاً.');
        return;
    }

    // 1. Mandatory Customer Details Validation (حسب سياسة النظام)
    const reqName = state.settings?.require_customer_name === '1';
    const reqPhone = state.settings?.require_customer_phone === '1';
    const custName = state.selectedCustomer?.name || document.getElementById('posCustomerNameDirect')?.value.trim() || '';
    const custPhone = state.selectedCustomer?.phone || document.getElementById('posCustomerPhoneDirect')?.value.trim() || '';

    if (state.posMode === 'sale') {
        if (reqName && !custName) {
            alert('⚠️ إلزامية إدخال اسم العميل: يرجى كتابة اسم العميل لإتمام الفاتورة وفق سياسة النظام.');
            document.getElementById('posCustomerNameDirect')?.focus();
            return;
        }
        if (reqPhone && !custPhone) {
            alert('⚠️ إلزامية إدخال رقم هاتف العميل: يرجى إدخال رقم الهاتف للتواصل وبناء قاعدة بيانات العملاء.');
            document.getElementById('posCustomerPhoneDirect')?.focus();
            return;
        }
    }

    // 2. Salesperson Return Permission Check
    const allowReturns = state.settings?.allow_salesperson_returns !== '0';
    if (state.posMode === 'return' && !allowReturns && (state.currentUser?.role === 'cashier' || state.currentUser?.role === 'salesperson') && !state.managerOverride) {
        alert('🔒 إجراء المرتجعات قاصر على المشرفين وفق سياسة النظام. يلزم إدخال رمز تفويض المشرف.');
        openManagerOverrideModal();
        return;
    }

    // 3. Salesperson Direct Discount Permission Check
    const allowDiscount = state.settings?.allow_salesperson_discount !== '0';
    if (state.discountPercent > 0 && !allowDiscount && (state.currentUser?.role === 'cashier' || state.currentUser?.role === 'salesperson') && !state.managerOverride) {
        alert('🔒 منح الخصم المباشر غير مصرح به لحسابات البائعين وفق سياسة النظام. يلزم إدخال رمز تفويض المشرف.');
        openManagerOverrideModal();
        return;
    }

    // 4. Cashier discount ceiling check
    const maxCashierDiscount = Number(state.settings?.cashier_max_discount_percent || 5);
    if (state.currentUser?.role === 'cashier' && state.discountPercent > maxCashierDiscount && !state.managerOverride) {
        openManagerOverrideModal();
        return;
    }

    // Read payment tenders
    const cash = Number(document.getElementById('posTenderCash')?.value) || 0;
    const card = Number(document.getElementById('posTenderCard')?.value) || 0;
    const transfer = Number(document.getElementById('posTenderTransfer')?.value) || 0;

    // Return mode cash drawer safety check
    if (state.posMode === 'return' && cash > 0) {
        try {
            const drawerRes = await window.api.getDrawerCash(state.activeSession.id);
            const currentDrawer = Number(drawerRes?.data ?? drawerRes ?? 0);
            if (cash > currentDrawer) {
                alert(`عفواً! لا يتوفر رصيد نقدي كافٍ في الخزينة لإتمام المرتجع النقدي.\nالرصيد المتاح في الدرج: ${currentDrawer.toFixed(2)} ج.م\nالمطلوب صرفه نقداً: ${cash.toFixed(2)} ج.م`);
                return;
            }
        } catch (err) {
            console.error('Failed to verify drawer cash:', err);
        }
    }

    // Determine payment method label
    let paymentMethod = 'split';
    if (cash > 0 && card === 0 && transfer === 0) paymentMethod = 'cash';
    else if (card > 0 && cash === 0 && transfer === 0) paymentMethod = 'card';
    else if (transfer > 0 && cash === 0 && card === 0) paymentMethod = 'transfer';

    const checkoutBtn = document.getElementById('btnFinalizeSale');
    if (checkoutBtn) checkoutBtn.disabled = true;

    // Select the branch seller from posSellerSelect if available (Admin does not sell in branch)
    const posSellerElem = document.getElementById('posSellerSelect');
    let effectiveSellerUserId = state.currentUser?.id;
    if (posSellerElem && posSellerElem.value && !isNaN(Number(posSellerElem.value))) {
        effectiveSellerUserId = Number(posSellerElem.value);
    } else if (state.currentUser?.role === 'admin') {
        const firstSellerOpt = posSellerElem?.querySelector('option');
        if (firstSellerOpt && firstSellerOpt.value && !isNaN(Number(firstSellerOpt.value))) {
            effectiveSellerUserId = Number(firstSellerOpt.value);
        }
    }

    try {
        const payload = {
            sessionId: state.activeSession.id,
            userId: effectiveSellerUserId,
            userRole: state.currentUser.role,
            invoiceType: state.posMode,
            customerId: state.selectedCustomer?.id || null,
            customerName: state.selectedCustomer?.name || document.getElementById('posCustomerNameDirect')?.value.trim() || null,
            customerPhone: state.selectedCustomer?.phone || document.getElementById('posCustomerPhoneDirect')?.value.trim() || null,
            items: verifiedItems,
            discountPercent: state.discountPercent,
            discountAmount: Number(document.getElementById('posDiscountAmount')?.value) || 0,
            paymentMethod,
            splitPayments: { cash, card, transfer },
            managerOverride: state.managerOverride
        };

        const res = await window.api.checkout(payload);
        if (!res.success) {
            alert(`خطأ في اعتماد الفاتورة: ${res.error}`);
            if (checkoutBtn) checkoutBtn.disabled = false;
            return;
        }

        const invoice = res.data;
        state.currentInvoiceId = invoice.id;

        // Instantly reset the POS interface and prepare next invoice code
        clearCart();

        // Immediately refresh daily shift & session movements so new invoice is registered in the journal
        try {
            if (typeof loadDailyShiftSummary === 'function') {
                loadDailyShiftSummary();
            }
            if (typeof refreshSessionState === 'function') {
                refreshSessionState();
            }
        } catch (_) {}

        // Open Modern Thermal Receipt Modal (Cotton Club 74mm UI)
        openThermalReceiptModal(invoice);

        // Instant silent/preview print trigger
        try {
            handleThermalPrint();
        } catch (_) {}

    } catch (err) {
        alert(`فشل إتمام العملية: ${err.message}`);
    } finally {
        if (checkoutBtn) checkoutBtn.disabled = false;
    }
}

/**
 * ==============================================================
 * COTTON CLUB MODERN THERMAL RECEIPT ENGINE (74mm Continuous Roll)
 * - Functions Architecture: handlePrint, formatReceiptDate, parseReceiptPaymentBreakdown, onClose
 * - Features: Sale vs Return, Scannable Code39, 14-Day Return Policy, Zero Reload Cycle
 * ==============================================================
 */

/**
 * Safe Receipt Date Formatter - Prevents NaN/NaN/NaN across all platforms & Arabic locales.
 * Formats: YYYY/MM/DD - hh:mm (ص / م)
 */
function formatReceiptDate(dateVal) {
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
window.formatReceiptDate = formatReceiptDate;

/**
 * Parse & filter used payment breakdown methods with distinctive visual indicators
 */
function parseReceiptPaymentBreakdown(invoice) {
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
window.parseReceiptPaymentBreakdown = parseReceiptPaymentBreakdown;

/**
 * Generate Clean DOM for Cotton Club 74mm Thermal Receipt
 */
function generateThermalReceiptInnerHtml(invoice) {
    const isReturn = invoice.invoice_type === 'return';
    const formattedDate = formatReceiptDate(invoice.created_at);
    const activePayments = parseReceiptPaymentBreakdown(invoice);
    const storeName = state.settings?.store_name || 'Cotton Club Store';
    const storeAddress = state.settings?.store_address || '';
    const storePhone = state.settings?.store_phone || '';
    const taxNumber = state.settings?.tax_number || '';
    const footerText = state.settings?.receipt_footer || 'شكراً لزيارتكم ونسعد بخدمتكم دائماً';
    const currency = state.settings?.currency_symbol || 'ج.م';

    const items = invoice.lineItems || [];
    const linesHtml = items.map(item => `
        <tr>
            <td style="text-align: right; padding: 4px 0; vertical-align: top;">
                <div style="font-weight: 700; color: #0f172a; font-size: 11px; line-height: 1.3;">${escapeHtml(item.item_name)}</div>
                <div style="font-size: 9px; color: #64748b;">${escapeHtml(item.barcode || '')}</div>
            </td>
            <td style="text-align: center; padding: 4px 0; font-size: 11px; font-weight: 700; vertical-align: top;">${item.quantity}</td>
            <td style="text-align: center; padding: 4px 0; font-size: 10.5px; vertical-align: top;">${Number(item.unit_price).toFixed(2)}</td>
            <td style="text-align: left; padding: 4px 0; font-weight: 800; font-size: 11px; color: #0f172a; vertical-align: top;">${Number(item.line_total).toFixed(2)}</td>
        </tr>
    `).join('');

    const paymentsHtml = activePayments.map(m => `
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 3px 0; font-size: 10.5px;">
            <span style="background: ${m.bg}; color: ${m.color}; border: 1px solid ${m.border}; padding: 1px 6px; border-radius: 4px; font-weight: 700;">${m.name}</span>
            <span style="font-weight: 800; color: #0f172a;">${m.amount.toFixed(2)} ${currency}</span>
        </div>
    `).join('');

    return `
        <!-- 1. Header & Store Info -->
        <div style="text-align: center;">
            <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-bottom: 2px;">${escapeHtml(storeName)}</div>
            <div style="font-size: 10px; font-weight: 600; color: #475569; margin-bottom: 4px;">الملابس الجاهزة والقطنيات الفاخرة</div>
            ${isReturn 
                ? '<div style="background: #fee2e2; color: #b91c1c; border: 1px solid #f87171; padding: 3px 10px; border-radius: 4px; font-size: 11.5px; font-weight: 800; margin: 4px 0;">إيصال مرتجع مبيعات (Return)</div>' 
                : '<div style="background: #f0fdf4; color: #15803d; border: 1px solid #86efac; padding: 3px 10px; border-radius: 4px; font-size: 11.5px; font-weight: 800; margin: 4px 0;">إيصال مبيعات نقدية (Sale)</div>'}
            ${storeAddress ? `<div style="font-size: 10px; color: #475569;">${escapeHtml(storeAddress)}</div>` : ''}
            ${storePhone ? `<div style="font-size: 10px; color: #475569;">هاتف: ${escapeHtml(storePhone)}</div>` : ''}
            ${taxNumber ? `<div style="font-size: 9.5px; color: #64748b;">الرقم الضريبي: ${escapeHtml(taxNumber)}</div>` : ''}
        </div>

        <div style="border-top: 1.5px dashed #334155; margin: 7px 0;"></div>

        <!-- 2. Invoice Metadata (Audit & Administrative Accountability) -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.5px 0; font-size: 10.5px;">
            <span style="color: #64748b;">رقم الفاتورة:</span>
            <span style="font-weight: 700; font-family: monospace; font-size: 11.5px;">${escapeHtml(invoice.invoice_number)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.5px 0; font-size: 10.5px;">
            <span style="color: #64748b;">التاريخ والوقت:</span>
            <span style="font-weight: 700;">${formattedDate}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.5px 0; font-size: 10.5px;">
            <span style="color: #64748b;">الكاشير المسؤول:</span>
            <span>${escapeHtml(invoice.cashier_name || state.currentUser?.name || 'كاشير المحل')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.5px 0; font-size: 10.5px;">
            <span style="color: #64748b;">الفرع / الوردية:</span>
            <span>الفرع الرئيسي / ${escapeHtml(invoice.session_code || state.activeSession?.session_code || '-')}</span>
        </div>
        ${invoice.customer_name ? `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.5px 0; font-size: 10.5px;">
            <span style="color: #64748b;">العميل:</span>
            <span style="font-weight: 700;">${escapeHtml(invoice.customer_name)} ${invoice.customer_phone ? `(${escapeHtml(invoice.customer_phone)})` : ''}</span>
        </div>
        ` : ''}

        <div style="border-top: 1.5px dashed #334155; margin: 7px 0;"></div>

        <!-- 3. Items Grid Table -->
        <table style="width: 100%; border-collapse: collapse;">
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

        <div style="border-top: 1.5px dashed #334155; margin: 7px 0;"></div>

        <!-- 4. Subtotal & Discounts -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.5px 0; font-size: 10.5px;">
            <span style="color: #475569;">المجموع الفرعي:</span>
            <span style="font-weight: 700;">${Number(invoice.subtotal || invoice.final_total).toFixed(2)} ${currency}</span>
        </div>
        ${invoice.discount_amount > 0 ? `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.5px 0; font-size: 10.5px; color: #b91c1c;">
            <span>الخصم الممنوح (${invoice.discount_percent}%):</span>
            <span style="font-weight: 700;">-${Number(invoice.discount_amount).toFixed(2)} ${currency}</span>
        </div>
        ` : ''}

        <!-- 5. Grand Net Total Box (Prominent High Contrast Box) -->
        <div style="
            border: 1.5px solid #0f172a;
            background: #f1f5f9;
            border-radius: 6px;
            padding: 6px 8px;
            margin: 7px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        ">
            <span style="font-size: 13px; font-weight: 900; color: #0f172a;">
                ${isReturn ? 'المبلغ المسترد للمشتري:' : 'الصافي المطلوب سداده:'}
            </span>
            <span style="font-size: 15px; font-weight: 900; color: ${isReturn ? '#b91c1c' : '#0f172a'};">
                ${Number(invoice.final_total).toFixed(2)} ${currency}
            </span>
        </div>

        <!-- 6. Payment Breakdown Methods -->
        <div style="margin: 4px 0;">
            <div style="font-size: 10px; font-weight: 700; color: #475569; margin-bottom: 3px;">طريقة السداد المعتمدة:</div>
            ${paymentsHtml}
        </div>

        <div style="border-top: 1.5px dashed #334155; margin: 7px 0;"></div>

        <!-- 7. Legal Protection & Return Policy (14 Days) -->
        <div style="
            font-size: 9.5px;
            color: #475569;
            text-align: justify;
            line-height: 1.35;
            margin: 6px 0;
            padding: 5px;
            background: #f8fafc;
            border-radius: 4px;
            border: 1px dashed #cbd5e1;
        ">
            <b>شروط الاستبدال والاسترجاع:</b> البضاعة المباعة ترد وتستبدل خلال 14 يوماً من تاريخ الشراء بشرط وجود أصل الفاتورة وأن تكون الملابس بحالتها الأصلية غير مستعملة ومعلقة بها بطاقات الأسعار والأكواد.
        </div>

        <!-- 8. Encrypted Barcode for Direct Scanner Return (Code39) -->
        <div style="text-align: center; margin: 8px 0 4px 0;">
            <div style="font-family: 'Libre Barcode 39 Text', 'Courier New', monospace; font-size: 32px; line-height: 1; letter-spacing: 2px;">
                *${escapeHtml(invoice.invoice_number)}*
            </div>
            <div style="font-size: 9.5px; color: #64748b; font-weight: 700; margin-top: 1px;">
                ${escapeHtml(invoice.invoice_number)}
            </div>
        </div>

        <!-- 9. Brand Warm Greeting Footer -->
        <div style="text-align: center; font-size: 10.5px; margin-top: 6px; color: #334155;">
            <div style="font-weight: 700;">${escapeHtml(footerText)}</div>
            <div style="margin-top: 2px; font-size: 9.5px; color: #64748b; font-weight: 600;">Cotton Club Retail System</div>
        </div>
    `;
}

/**
 * Open Modern Thermal Receipt Modal
 */
function openThermalReceiptModal(invoice) {
    if (!invoice) return;
    state.activeThermalInvoice = invoice;

    const container = document.getElementById('thermal-receipt-container');
    if (container) {
        container.innerHTML = generateThermalReceiptInnerHtml(invoice);
    }

    const modal = document.getElementById('modalThermalReceipt');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        refreshIcons(modal);
    }
}
window.openThermalReceiptModal = openThermalReceiptModal;

/**
 * Print thermal receipt content directly (74mm continuous roll)
 */
function handleThermalPrint() {
    const container = document.getElementById('thermal-receipt-container');
    if (!container) return;

    const printWin = window.open('', '_blank', 'width=420,height=650');
    if (!printWin) {
        window.print();
        setTimeout(() => closeThermalReceiptModal(), 400);
        return;
    }

    const printHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <title>طباعة إيصال كوتون كلوب</title>
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
                padding: 6px;
                color: #0f172a;
                background: #fff;
                font-size: 11px;
                line-height: 1.4;
            }
        </style>
    </head>
    <body>
        ${container.innerHTML}
    </body>
    </html>
    `;

    printWin.document.write(printHtml);
    printWin.document.close();
    setTimeout(() => {
        printWin.focus();
        printWin.print();
        // After triggering print, close the receipt modal and prepare for the next invoice
        setTimeout(() => {
            closeThermalReceiptModal();
        }, 500);
    }, 250);
}
window.handleThermalPrint = handleThermalPrint;

/**
 * Export receipt as PDF (Triggers print dialog configured for Save as PDF)
 */
function exportReceiptPdf() {
    handleThermalPrint();
}
window.exportReceiptPdf = exportReceiptPdf;

/**
 * Close Thermal Receipt Modal & Execute Zero-Reload Cycle:
 * 1. Closes modal
 * 2. Clears completed invoice state
 * 3. Refreshes session & drawer cash in background
 * 4. Auto-focuses barcode input for the next customer
 */
async function closeThermalReceiptModal() {
    const modal = document.getElementById('modalThermalReceipt');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }

    // Zero-Reload Cycle
    clearCart();
    if (state.posMode === 'return') {
        setPosMode('sale');
    }
    refreshSessionState().catch(console.error);

    setTimeout(() => {
        const blank = state.posRows.find(r => !r.product);
        if (blank) {
            const barInp = document.getElementById(`posBarcode_${blank.id}`);
            if (barInp) {
                barInp.focus();
                barInp.select();
            }
        }
    }, 60);
}
window.closeThermalReceiptModal = closeThermalReceiptModal;

/**
 * Quick Print Thermal Invoice by ID
 */
async function printThermalInvoiceById(invoiceId) {
    try {
        const res = await window.api.getInvoice(invoiceId);
        if (res && res.success && res.data) {
            openThermalReceiptModal(res.data);
        } else {
            alert('تعذر تحميل بيانات الفاتورة');
        }
    } catch (e) {
        console.error('Error opening thermal receipt:', e);
    }
}
window.printThermalInvoiceById = printThermalInvoiceById;

/**
 * Clear POS Cart and start fresh (F12)
 */
async function refreshPosInvoiceCode() {
    const el = document.getElementById('posCurrentInvoiceNumber');
    if (!el) return;
    try {
        const mode = state.posMode || 'sale';
        const res = await window.api.getNextInvoiceNumber(mode);
        if (res && res.success && res.data) {
            el.innerText = res.data;
        } else if (res && res.data) {
            el.innerText = res.data;
        }
    } catch (err) {
        console.error('Failed to get next invoice number:', err);
    }
}
window.refreshPosInvoiceCode = refreshPosInvoiceCode;

async function cancelCurrentInvoice() {
    const hasItems = state.posRows.some(r => r.product != null);
    if (hasItems) {
        const ok = confirm('هل أنت متأكد من إلغاء الفاتورة الحالية والبدء بفاتورة جديدة؟');
        if (!ok) return;
    }
    clearCart();
    if (state.posMode === 'return') {
        setPosMode('sale');
    }
    await refreshPosInvoiceCode();
    showToast('تم إلغاء الفاتورة وتجهيز فاتورة جديدة فارغة', 'info');
}
window.cancelCurrentInvoice = cancelCurrentInvoice;

function clearCart() {
    state.posRows = [];
    state.discountPercent = 0;
    state.managerOverride = null;
    state.selectedCustomer = null;

    // 1. Reset all customer inputs
    const custInput = document.getElementById('posCustomerInput');
    if (custInput) custInput.value = '';

    const directNameInp = document.getElementById('posCustomerNameDirect');
    if (directNameInp) directNameInp.value = '';

    const directPhoneInp = document.getElementById('posCustomerPhoneDirect');
    if (directPhoneInp) directPhoneInp.value = '';

    // 2. Hide all dropdowns
    const dNameDrop = document.getElementById('posDirectNameDropdown');
    if (dNameDrop) dNameDrop.style.display = 'none';
    const dPhoneDrop = document.getElementById('posDirectPhoneDropdown');
    if (dPhoneDrop) dPhoneDrop.style.display = 'none';
    const cDrop = document.getElementById('posCustomerDropdown');
    if (cDrop) cDrop.style.display = 'none';

    // 3. Reset customer selection card & display
    const custCard = document.getElementById('posSelectedCustomerCard');
    if (custCard) custCard.style.display = 'none';

    const cDispName = document.getElementById('posCustomerDisplayName');
    if (cDispName) cDispName.innerHTML = '';
    const cDispPhone = document.getElementById('posCustomerDisplayPhone');
    if (cDispPhone) cDispPhone.innerText = '';
    const cDispPoints = document.getElementById('posCustomerDisplayPoints');
    if (cDispPoints) cDispPoints.innerText = '';

    // 4. Reset discounts
    const discPercentInput = document.getElementById('posDiscountPercent');
    if (discPercentInput) discPercentInput.value = 0;

    const discAmountInput = document.getElementById('posDiscountAmount');
    if (discAmountInput) discAmountInput.value = 0;

    const warningEl = document.getElementById('posCashierCeilingWarning');
    if (warningEl) warningEl.style.display = 'none';

    // 5. Reset multi-tender payments
    const cashInput = document.getElementById('posTenderCash');
    if (cashInput) cashInput.value = 0;
    const cardInput = document.getElementById('posTenderCard');
    if (cardInput) cardInput.value = 0;
    const transferInput = document.getElementById('posTenderTransfer');
    if (transferInput) transferInput.value = 0;

    // Reset tender pill buttons
    document.querySelectorAll('.btn-pay-pill').forEach(b => b.classList.remove('active'));
    document.getElementById('btnTenderCash')?.classList.add('active');

    // 6. Reset mode to sale if return was active
    if (state.posMode === 'return') {
        setPosMode('sale');
    }

    // 7. Hide search popup if visible
    if (typeof hideFollowPopup === 'function') {
        hideFollowPopup();
    }

    // 8. Reset table rows and add fresh blank row
    const tbody = document.getElementById('posGridBody');
    if (tbody) tbody.innerHTML = '';

    addBlankPosRow();
    updatePosTotals();
    refreshPosInvoiceCode().catch(console.error);

    // 9. Auto-focus the barcode search input for immediate scan
    setTimeout(() => {
        const blank = state.posRows.find(r => !r.product);
        if (blank) {
            const barInp = document.getElementById(`posBarcode_${blank.id}`);
            if (barInp) {
                barInp.focus();
                barInp.select();
            }
        }
    }, 60);
}

/**
 * Refresh Active Daily Session State and POS Drawer Indicators
 */
async function refreshSessionState() {
    try {
        let res = await window.api.getActiveSession();
        if (!res || !res.success || !res.data) {
            // Auto ensure continuous active session
            res = await window.api.ensureActiveSession(state.currentUser?.id || 1);
        }

        if (res && res.success && res.data) {
            state.activeSession = res.data;
            const codeEl = document.getElementById('posCurrentSessionCode');
            if (codeEl) codeEl.innerText = `${res.data.session_code} (يومية مستمرة)`;

            // Fetch live drawer cash balance
            const drawerRes = await window.api.getDrawerCash(res.data.id);
            const drawerCash = Number((drawerRes && drawerRes.data !== undefined) ? drawerRes.data : drawerRes) || 0;
            state.drawerCash = drawerCash;

            const cashEl = document.getElementById('posDrawerCashDisplay');
            if (cashEl) cashEl.innerText = `${drawerCash.toFixed(2)} ج.م`;
        } else {
            state.activeSession = null;
            state.drawerCash = 0;
            const codeEl = document.getElementById('posCurrentSessionCode');
            if (codeEl) codeEl.innerText = 'جاري تهيئة اليومية...';
            const cashEl = document.getElementById('posDrawerCashDisplay');
            if (cashEl) cashEl.innerText = '0.00 ج.م';
        }

        if (typeof loadSessionDashboard === 'function') {
            loadSessionDashboard();
        }
    } catch (err) {
        console.error('Failed to refresh session state:', err);
    }
}
window.refreshSessionState = refreshSessionState;

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
        const netTotal = s.netShiftTotal != null ? s.netShiftTotal : (s.totalSales - s.totalReturns - s.totalExpenses);
        const netCashVal = s.netCash != null ? s.netCash : (s.netCashSales - s.totalExpenses);
        const netCardVal = s.netCard != null ? s.netCard : s.netCardSales;
        const netTransVal = s.netTransfer != null ? s.netTransfer : s.netTransferSales;

        document.getElementById('closeSessionSummaryDetails').innerHTML = `
            <div style="display: flex; justify-content: space-between;"><strong>رصيد بداية اليوم (العهدة):</strong> <span>${s.openingCash.toFixed(2)} ج.م</span></div>
            <div style="display: flex; justify-content: space-between;"><strong>إجمالي المبيعات:</strong> <span>${s.totalSales.toFixed(2)} ج.م</span></div>
            <div style="display: flex; justify-content: space-between; color: #dc2626;"><strong>إجمالي المرتجعات:</strong> <span>-${s.totalReturns.toFixed(2)} ج.م</span></div>
            <div style="display: flex; justify-content: space-between; color: #ea580c;"><strong>المصروفات النثرية:</strong> <span>-${s.totalExpenses.toFixed(2)} ج.م</span></div>
            <div style="border-top: 1px dashed #CBD5E1; margin: 6px 0;"></div>
            <div style="display: flex; justify-content: space-between; font-weight: 800; color: #047857; font-size: 14px;">
                <strong>صافي اليومية (الربح/الإيراد):</strong> <span>${netTotal.toFixed(2)} ج.م</span>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 10px; font-size: 12px; margin-top: 4px; display: flex; flex-direction: column; gap: 3px;">
                <div style="display: flex; justify-content: space-between; color: #059669;"><span>• صافي الكاش (بعد المصروفات):</span><strong>${netCashVal.toFixed(2)} ج.م</strong></div>
                <div style="display: flex; justify-content: space-between; color: #2563eb;"><span>• صافي الفيزا والبطاقات:</span><strong>${netCardVal.toFixed(2)} ج.م</strong></div>
                <div style="display: flex; justify-content: space-between; color: #7c3aed;"><span>• صافي التحويلات (إنستاباي):</span><strong>${netTransVal.toFixed(2)} ج.م</strong></div>
            </div>
            <div style="font-weight: 800; color: #b45309; font-size: 14px; margin-top: 8px; padding: 8px 10px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px; display: flex; justify-content: space-between;">
                <strong>النقدية المتوقعة بالدرج:</strong> <span>${s.expectedCash.toFixed(2)} ج.م</span>
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

    // ──── COTTON CLUB DAILY SHIFT & CASHIER SETTLEMENT CONTROLS ────
    const shiftDateInput = document.getElementById('shiftDateFilter');
    if (shiftDateInput) {
        if (!shiftDateInput.value) {
            shiftDateInput.value = getLocalDateString();
        }
        shiftDateInput.addEventListener('change', () => loadDailyShiftSummary());
    }

    const shiftBranchInput = document.getElementById('shiftBranchFilter');
    if (shiftBranchInput) {
        shiftBranchInput.addEventListener('change', () => loadDailyShiftSummary());
    }

    const shiftSalespersonInput = document.getElementById('shiftSalespersonFilter');
    if (shiftSalespersonInput) {
        shiftSalespersonInput.addEventListener('change', () => loadDailyShiftSummary());
    }

    const btnRefreshShift = document.getElementById('btnRefreshShift');
    if (btnRefreshShift) {
        btnRefreshShift.addEventListener('click', () => {
            loadDailyShiftSummary();
            if (typeof loadSalesAnalyticsDashboard === 'function') {
                loadSalesAnalyticsDashboard();
            }
        });
    }

    const btnPrintShiftA4 = document.getElementById('btnPrintShiftA4');
    if (btnPrintShiftA4) {
        btnPrintShiftA4.addEventListener('click', () => printShiftReportA4());
    }

    // Segmented Control Filters (الكل / مبيعات فقط / مرتجعات فقط / مصروفات فقط)
    const segmentedGroup = document.getElementById('shiftSegmentedGroup');
    if (segmentedGroup) {
        segmentedGroup.addEventListener('click', (e) => {
            const btn = e.target.closest('.shift-segmented-btn');
            if (!btn) return;
            segmentedGroup.querySelectorAll('.shift-segmented-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentShiftTypeFilter = btn.dataset.type || 'all';
            applyShiftFilters();
        });
    }

    // Client-side Fast Live Search
    const shiftSearchInput = document.getElementById('shiftTxnSearchInput');
    let shiftSearchDebounce = null;
    if (shiftSearchInput) {
        shiftSearchInput.addEventListener('input', (e) => {
            clearTimeout(shiftSearchDebounce);
            shiftSearchDebounce = setTimeout(() => {
                currentShiftSearchQuery = (e.target.value || '').trim().toLowerCase();
                applyShiftFilters();
            }, 180);
        });
    }

    // Expand / Collapse Toggle Button (Show Last 5 vs Show All)
    const btnToggleTxnExpand = document.getElementById('btnToggleTxnExpand');
    if (btnToggleTxnExpand) {
        btnToggleTxnExpand.addEventListener('click', () => {
            shiftTxnExpanded = !shiftTxnExpanded;
            renderShiftTransactionsTable();
            const expandBar = document.getElementById('shiftTxnExpandBar');
            if (expandBar) refreshIcons(expandBar);
        });
    }
}

function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
window.getLocalDateString = getLocalDateString;

/**
 * Global state for Daily Shift & Cashier Settlement
 */
let currentDailyShiftData = null;
let currentShiftTypeFilter = 'all';
let currentShiftSearchQuery = '';
let shiftUsersCache = [];
let shiftTxnExpanded = false;

/**
 * Populate salesperson dropdown based on RBAC permissions
 */
async function initShiftSalespersonsDropdown() {
    const sel = document.getElementById('shiftSalespersonFilter');
    const branchSel = document.getElementById('shiftBranchFilter');
    if (!sel) return;

    try {
        if (shiftUsersCache.length === 0) {
            const res = await window.api.listUsers();
            if (res && res.success && Array.isArray(res.data)) {
                shiftUsersCache = res.data;
            }
        }

        const isSuperAdmin = state.currentUser && (state.currentUser.role === 'admin' || state.currentUser.role === 'super_admin');

        // RBAC: If not admin/super_admin, restrict to current user and branch
        if (!isSuperAdmin && state.currentUser) {
            sel.innerHTML = `<option value="${state.currentUser.id}">${state.currentUser.full_name || state.currentUser.username}</option>`;
            sel.disabled = true;
            if (branchSel) branchSel.disabled = true;
        } else {
            const currVal = sel.value;
            let html = '<option value="">كل الفرع (الكل)</option>';
            shiftUsersCache.forEach(u => {
                const roleLabel = u.role === 'admin' ? 'مدير' : u.role === 'cashier' ? 'كاشير' : 'بائع';
                html += `<option value="${u.id}">${u.full_name || u.username} (${roleLabel})</option>`;
            });
            sel.innerHTML = html;
            sel.disabled = false;
            if (currVal) sel.value = currVal;
            if (branchSel) branchSel.disabled = false;
        }
    } catch (err) {
        console.error('Error populating shift salespersons:', err);
    }
}

/**
 * 1. Main Daily Shift Loader: fetchSummary()
 * Path: GET /api/swm/pos/shift/summary or RPC session/shift-summary
 * Strict Accounting Engine & KPI Calculation
 */
async function loadDailyShiftSummary() {
    await initShiftSalespersonsDropdown();

    const dateInput = document.getElementById('shiftDateFilter');
    const branchInput = document.getElementById('shiftBranchFilter');
    const userSel = document.getElementById('shiftSalespersonFilter');

    const date = (dateInput && dateInput.value) ? dateInput.value : getLocalDateString();
    const branchId = (branchInput && branchInput.value !== 'all') ? branchInput.value : null;
    const userId = (userSel && userSel.value) ? Number(userSel.value) : null;

    try {
        const res = await window.api.getDailyShiftSummary({ date, branchId, userId });
        if (!res || !res.success || !res.data) {
            console.warn('Failed to load daily shift summary:', res);
            return;
        }

        currentDailyShiftData = res.data;
        const { kpi } = currentDailyShiftData;

        // ──── A. ROW 1: 5 EXECUTIVE METRIC CARDS ────
        // 1. Sales (Green #16a34a)
        const elSales = document.getElementById('shiftKpiSales');
        const elSalesSub = document.getElementById('shiftKpiSalesSub');
        if (elSales) elSales.innerText = `${(kpi.totalSales || 0).toFixed(2)} ج.م`;
        if (elSalesSub) elSalesSub.innerText = `${kpi.salesCount || 0} فاتورة بيع معتمدة`;

        // 2. Returns (Dark Red #dc2626)
        const elReturns = document.getElementById('shiftKpiReturns');
        const elReturnsSub = document.getElementById('shiftKpiReturnsSub');
        if (elReturns) elReturns.innerText = `-${(kpi.totalReturns || 0).toFixed(2)} ج.م`;
        if (elReturnsSub) elReturnsSub.innerText = `${kpi.returnsCount || 0} فاتورة مرتجع (بضاعة عائدة)`;

        // 3. Expenses (Orange #ea580c)
        const elExpenses = document.getElementById('shiftKpiExpenses');
        const elExpensesSub = document.getElementById('shiftKpiExpensesSub');
        if (elExpenses) elExpenses.innerText = `-${(kpi.totalExpenses || 0).toFixed(2)} ج.م`;
        if (elExpensesSub) elExpensesSub.innerText = `${kpi.expensesCount || 0} سند مصروف من الدرج`;

        // 4. Net Revenue (Emerald #059669) - الصافي = مبيعات - مرتجعات - مصروفات
        const elNet = document.getElementById('shiftKpiNet');
        const elNetSub = document.getElementById('shiftKpiNetSub');
        if (elNet) elNet.innerText = `${(kpi.netRevenue || 0).toFixed(2)} ج.م`;
        if (elNetSub) {
            elNetSub.innerHTML = `كاش: <strong>${(kpi.netCash || 0).toFixed(2)}</strong> | فيزا: <strong>${(kpi.netCard || 0).toFixed(2)}</strong> | تحويل: <strong>${(kpi.netTransfer || 0).toFixed(2)}</strong>`;
        }

        // 5. Expected Drawer Cash (Amber #b45309)
        const elDrawer = document.getElementById('shiftKpiDrawer');
        const elDrawerSub = document.getElementById('shiftKpiDrawerSub');
        if (elDrawer) elDrawer.innerText = `${(kpi.expectedDrawerCash || 0).toFixed(2)} ج.م`;
        if (elDrawerSub) elDrawerSub.innerText = `عهدة البداية: ${(kpi.openingCash || 0).toFixed(2)} ج.م (تستبعد الفيزا والتحويل)`;

        // ──── B. ROW 2: GRADIENT PAYMENT BREAKDOWN (تقسيم صافي اليومية) ────
        // 1. Cash Card (صافي الكاش = مبيعات كاش - مرتجعات كاش - مصروفات)
        const elCashAmt = document.getElementById('shiftCashAmount');
        const elCashCnt = document.getElementById('shiftCashCount');
        const elCashDet = document.getElementById('shiftCashBreakdown');
        if (elCashAmt) elCashAmt.innerText = `${(kpi.netCash || 0).toFixed(2)} ج.م`;
        if (elCashCnt) elCashCnt.innerText = `${(kpi.tender?.cash?.salesCount || 0) + (kpi.tender?.cash?.returnsCount || 0)} حركة`;
        if (elCashDet) {
            elCashDet.innerText = `مبيعات كاش: ${(kpi.tender?.cash?.sales || 0).toFixed(2)} | مرتجع: -${(kpi.tender?.cash?.returns || 0).toFixed(2)} | مصروفات: -${(kpi.totalExpenses || 0).toFixed(2)}`;
        }

        // 2. Card / Visa Card (صافي الفيزا = مبيعات فيزا - مرتجعات فيزا)
        const elCardAmt = document.getElementById('shiftCardAmount');
        const elCardCnt = document.getElementById('shiftCardCount');
        const elCardDet = document.getElementById('shiftCardBreakdown');
        if (elCardAmt) elCardAmt.innerText = `${(kpi.netCard || 0).toFixed(2)} ج.م`;
        if (elCardCnt) elCardCnt.innerText = `${(kpi.tender?.card?.salesCount || 0) + (kpi.tender?.card?.returnsCount || 0)} حركة`;
        if (elCardDet) {
            elCardDet.innerText = `مبيعات فيزا: ${(kpi.tender?.card?.sales || 0).toFixed(2)} | مرتجع فيزا: -${(kpi.tender?.card?.returns || 0).toFixed(2)}`;
        }

        // 3. Transfers / Instapay Card (صافي التحويلات = مبيعات تحويل - مرتجعات تحويل)
        const elTransAmt = document.getElementById('shiftTransAmount');
        const elTransCnt = document.getElementById('shiftTransCount');
        const elTransDet = document.getElementById('shiftTransBreakdown');
        if (elTransAmt) elTransAmt.innerText = `${(kpi.netTransfer || 0).toFixed(2)} ج.م`;
        if (elTransCnt) elTransCnt.innerText = `${(kpi.tender?.transfer?.salesCount || 0) + (kpi.tender?.transfer?.returnsCount || 0)} حركة`;
        if (elTransDet) {
            elTransDet.innerText = `مبيعات تحويل: ${(kpi.tender?.transfer?.sales || 0).toFixed(2)} | مرتجع تحويل: -${(kpi.tender?.transfer?.returns || 0).toFixed(2)}`;
        }

        // Dynamic Accounting Formula Bar
        const formulaText = document.getElementById('shiftReconciliationFormulaText');
        if (formulaText) {
            formulaText.innerHTML = `<span>القانون المحاسبي: صافي اليومية (<strong>${(kpi.netRevenue || 0).toFixed(2)} ج.م</strong>) = صافي كاش (<strong>${(kpi.netCash || 0).toFixed(2)}</strong>) + صافي فيزا (<strong>${(kpi.netCard || 0).toFixed(2)}</strong>) + صافي تحويلات (<strong>${(kpi.netTransfer || 0).toFixed(2)}</strong>)</span>`;
        }

        // Accounting Reconciliation Validation
        const reconciliationBadge = document.getElementById('shiftMatchStatusBadge');
        if (reconciliationBadge) {
            const calculatedSum = Math.round((kpi.netCash + kpi.netCard + kpi.netTransfer) * 100) / 100;
            const netRevRounded = Math.round(kpi.netRevenue * 100) / 100;
            const isMatched = Math.abs(calculatedSum - netRevRounded) < 0.05;

            if (isMatched) {
                reconciliationBadge.innerHTML = `<i data-lucide="check-circle" class="icon-xs"></i><span>✓ الحسابات والمطابقة متوازنة تماماً بالمليم</span>`;
                reconciliationBadge.style.color = '#34D399';
                reconciliationBadge.style.background = 'rgba(16, 185, 129, 0.2)';
            } else {
                reconciliationBadge.innerHTML = `<i data-lucide="alert-triangle" class="icon-xs"></i><span>تنبيه: يوجد فارق حسابي قدره ${Math.abs(calculatedSum - netRevRounded).toFixed(2)} ج.م</span>`;
                reconciliationBadge.style.color = '#F87171';
                reconciliationBadge.style.background = 'rgba(239, 68, 68, 0.2)';
            }
        }

        // ──── C. ROW 3: UNIFIED TRANSACTION TIMELINE ────
        applyShiftFilters();

    } catch (err) {
        console.error('Error loading daily shift summary:', err);
    }

    refreshIcons();
}

/**
 * Filter and render transactions client-side (Segmented Control + Fast Search)
 */
function applyShiftFilters() {
    if (!currentDailyShiftData || !Array.isArray(currentDailyShiftData.all_transactions)) {
        return;
    }

    const list = currentDailyShiftData.all_transactions;
    const typeFilter = currentShiftTypeFilter || 'all';
    const query = currentShiftSearchQuery || '';

    const filtered = list.filter(item => {
        // 1. Type Filter
        if (typeFilter !== 'all') {
            if (typeFilter === 'expense') {
                if (item.type !== 'expense') return false;
            } else if (typeFilter === 'returned_expense') {
                if (item.type !== 'returned_expense') return false;
            } else if (item.type !== typeFilter) {
                return false;
            }
        }

        // 2. Search Query Filter
        if (query) {
            const searchHaystack = [
                item.code || '',
                item.category || '',
                item.subcategory || '',
                item.description || '',
                item.beneficiary_name || '',
                item.recipient_name || '',
                item.customer_name || '',
                item.salesperson_name || '',
                item.cashier_name || '',
                item.notes || '',
                item.payment_method || ''
            ].join(' ').toLowerCase();

            if (!searchHaystack.includes(query)) {
                return false;
            }
        }

        return true;
    });

    // Update count badge
    const badge = document.getElementById('shiftTxnCountBadge');
    if (badge) {
        badge.innerText = `${filtered.length} حركة مسجلة`;
    }

    const showingCountEl = document.getElementById('shiftTxnShowingCount');
    const toggleExpandBtn = document.getElementById('btnToggleTxnExpand');
    const toggleExpandText = document.getElementById('btnToggleTxnExpandText');
    const toggleExpandIcon = document.getElementById('btnToggleTxnExpandIcon');
    const badgeHeader = document.getElementById('shiftTxnBadgeHeader');

    // Render ALL transactions directly under each other (full shift log)
    const toRender = filtered;

    if (toggleExpandBtn) {
        toggleExpandBtn.style.display = 'none';
    }
    if (showingCountEl) {
        showingCountEl.innerText = `عرض كافة الحركات المسجلة بالكامل (${filtered.length} حركة مسجلة)`;
    }
    if (badgeHeader) {
        badgeHeader.innerText = `كافة الحركات المسجلة (${filtered.length} حركة)`;
    }

    // Render table
    const tbody = document.getElementById('shiftTxnTableBody');
    const emptyState = document.getElementById('shiftTxnEmptyState');

    if (!tbody) return;
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    toRender.forEach(t => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #F1F5F9';

        // Badge according to transaction type
        let typeBadge = '';
        let amountHtml = '';
        let actionBtn = '';
        let partyHtml = '';
        let staffHtml = '';

        if (t.type === 'sale') {
            typeBadge = `<span class="badge-txn-sale"><i data-lucide="arrow-down-left" class="icon-xs" style="vertical-align: middle;"></i> مبيعات</span>`;
            amountHtml = `<span style="font-weight: 800; color: #16a34a; font-size: 13.5px;">+${(t.amount || 0).toFixed(2)} ج.م</span>`;
            actionBtn = `<button type="button" class="btn-royal-gold" onclick="handleViewInvoice(${t.id})" title="معاينة وطباعة الفاتورة حرارياً"><i data-lucide="receipt" class="icon-xs"></i><span>إيصال</span></button>`;
            staffHtml = `<div style="font-weight: 600; color: #1E293B;">${t.salesperson_name || t.cashier_name || '-'}</div>`;
            partyHtml = `
                <div style="line-height: 1.4;">
                    <div style="font-weight: 700; color: #1E293B; font-size: 12.5px;">${t.customer_name || 'عميل نقدي'}</div>
                    ${t.customer_phone ? `<div style="font-size: 11px; color: #64748B; direction: ltr; text-align: right;">${t.customer_phone}</div>` : (t.notes ? `<div style="font-size: 11px; color: #64748B;">${t.notes}</div>` : '')}
                </div>
            `;
        } else if (t.type === 'return') {
            typeBadge = `<span class="badge-txn-return"><i data-lucide="rotate-ccw" class="icon-xs" style="vertical-align: middle;"></i> مرتجع</span>`;
            amountHtml = `<span style="font-weight: 800; color: #dc2626; font-size: 13.5px;">-${(t.amount || 0).toFixed(2)} ج.م</span>`;
            actionBtn = `<button type="button" class="btn-royal-gold" onclick="handleViewInvoice(${t.id})" title="معاينة وطباعة الفاتورة حرارياً"><i data-lucide="receipt" class="icon-xs"></i><span>إيصال</span></button>`;
            staffHtml = `<div style="font-weight: 600; color: #1E293B;">${t.salesperson_name || t.cashier_name || '-'}</div>`;
            partyHtml = `
                <div style="line-height: 1.4;">
                    <div style="font-weight: 700; color: #1E293B; font-size: 12.5px;">${t.customer_name || 'عميل نقدي'}</div>
                    ${t.customer_phone ? `<div style="font-size: 11px; color: #64748B; direction: ltr; text-align: right;">${t.customer_phone}</div>` : (t.notes ? `<div style="font-size: 11px; color: #64748B;">${t.notes}</div>` : '')}
                </div>
            `;
        } else if (t.type === 'returned_expense') {
            typeBadge = `<span class="badge-txn-returned-expense" style="background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; font-weight: 700; padding: 3px 8px; border-radius: 6px; font-size: 11px;"><i data-lucide="corner-down-left" class="icon-xs" style="vertical-align: middle;"></i> مصروف مرتد</span>`;
            amountHtml = `<span style="font-weight: 800; color: #059669; font-size: 13.5px;">+${(t.amount || 0).toFixed(2)} ج.م</span>`;
            actionBtn = `<button type="button" class="btn-secondary" onclick="alert('سند إرجاع مصروف رقم: #${t.code || t.id}\\nالمستفيد / المسدد: ${t.beneficiary_name || t.recipient_name || t.customer_name || '-'}\\nالبيان: ${t.description || t.notes || '-'}\\nالمبلغ المرتد: +${t.amount} ج.م')" style="padding: 4px 8px; font-size: 11px; border-radius: 6px;"><i data-lucide="file-check" class="icon-xs"></i><span>سند</span></button>`;
            staffHtml = `<div style="font-weight: 600; color: #475467;">${t.cashier_name || 'الكاشير'}</div>`;

            const payer = t.beneficiary_name || t.recipient_name || (t.customer_name && t.customer_name !== 'عميل نقدي' ? t.customer_name : '');
            const cat = t.category || 'مصروف مرتد';
            const desc = t.description || t.notes || '';

            if (payer) {
                partyHtml = `
                    <div style="line-height: 1.4;">
                        <div style="font-weight: 800; color: #065F46; display: flex; align-items: center; gap: 6px;">
                            <span style="background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; border-radius: 4px; padding: 1px 6px; font-size: 10px; font-weight: 800;">المُسدّد</span>
                            <span style="font-size: 12.5px;">${payer}</span>
                        </div>
                        <div style="font-size: 11.5px; color: #64748B; margin-top: 3px;">
                            <strong style="color: #047857;">[${cat}]</strong> ${desc ? `— ${desc}` : ''}
                        </div>
                    </div>
                `;
            } else {
                partyHtml = `
                    <div style="line-height: 1.4;">
                        <div style="font-weight: 800; color: #065F46; display: flex; align-items: center; gap: 6px;">
                            <span style="background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; border-radius: 4px; padding: 1px 6px; font-size: 10px; font-weight: 800;">البند</span>
                            <span style="font-size: 12.5px;">${cat}</span>
                        </div>
                        ${desc ? `<div style="font-size: 11.5px; color: #64748B; margin-top: 3px;">${desc}</div>` : ''}
                    </div>
                `;
            }
        } else {
            // Outbound Expense (تسجيل مصروف)
            typeBadge = `<span class="badge-txn-expense"><i data-lucide="arrow-up-right" class="icon-xs" style="vertical-align: middle;"></i> مصروف</span>`;
            amountHtml = `<span style="font-weight: 800; color: #ea580c; font-size: 13.5px;">-${(t.amount || 0).toFixed(2)} ج.م</span>`;
            actionBtn = `<button type="button" class="btn-secondary" onclick="alert('سند مصروف رقم: #${t.code || t.id}\\nالمستلم / المستفيد: ${t.beneficiary_name || t.recipient_name || t.customer_name || '-'}\\nالبند: ${t.category || '-'}\\nالبيان: ${t.description || t.notes || '-'}\\nالمبلغ: ${t.amount} ج.م')" style="padding: 4px 8px; font-size: 11px; border-radius: 6px;"><i data-lucide="file-text" class="icon-xs"></i><span>سند</span></button>`;
            staffHtml = `<div style="font-weight: 600; color: #475467;">${t.cashier_name || 'الكاشير'}</div>`;

            const beneficiary = t.beneficiary_name || t.recipient_name || (t.customer_name && t.customer_name !== 'عميل نقدي' ? t.customer_name : '');
            const cat = t.category || 'مصروف تشغيل';
            const desc = t.description || t.notes || '';

            if (beneficiary) {
                partyHtml = `
                    <div style="line-height: 1.4;">
                        <div style="font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 6px;">
                            <span style="background: #FFF7ED; color: #C2410C; border: 1px solid #FED7AA; border-radius: 4px; padding: 1px 6px; font-size: 10px; font-weight: 800;">المستلم</span>
                            <span style="font-size: 12.5px;">${beneficiary}</span>
                        </div>
                        <div style="font-size: 11.5px; color: #64748B; margin-top: 3px;">
                            <strong style="color: #475467;">[${cat}]</strong> ${desc ? `— ${desc}` : ''}
                        </div>
                    </div>
                `;
            } else {
                partyHtml = `
                    <div style="line-height: 1.4;">
                        <div style="font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 6px;">
                            <span style="background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; border-radius: 4px; padding: 1px 6px; font-size: 10px; font-weight: 800;">البند</span>
                            <span style="font-size: 12.5px;">${cat}</span>
                        </div>
                        ${desc ? `<div style="font-size: 11.5px; color: #64748B; margin-top: 3px;">${desc}</div>` : ''}
                    </div>
                `;
            }
        }

        // Tender pill badges (supports single & multiple/split payment methods)
        const tenderBadge = renderTenderPillBadges(t);

        tr.innerHTML = `
            <td style="text-align: center;">${typeBadge}</td>
            <td style="font-weight: 800; color: #101828;">#${t.code || t.id}</td>
            <td style="color: #64748B; font-size: 11.5px; direction: ltr; text-align: right;">${t.time || '-'}</td>
            <td>${staffHtml}</td>
            <td>${partyHtml}</td>
            <td>${tenderBadge}</td>
            <td>${amountHtml}</td>
            <td style="text-align: center; white-space: nowrap;">${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });

    refreshIcons(tbody);
}

/**
 * Render tender pill badges with amounts (supports multiple/split methods)
 * e.g., "فيزا: 200.00 ج.م" and "كاش: 100.00 ج.م"
 */
function renderTenderPillBadges(t) {
    if (!t) return '';
    const total = Math.abs(Number(t.amount || t.raw_total || 0));
    let cash = Number(t.cash_amount || 0);
    let card = Number(t.card_amount || 0);
    let transfer = Number(t.transfer_amount || 0);

    // If individual split amounts are not explicitly set or are 0, deduce from payment_method
    if (cash === 0 && card === 0 && transfer === 0) {
        const pm = (t.payment_method || '').toLowerCase();
        if (pm === 'card' || pm === 'visa') {
            card = total;
        } else if (pm === 'transfer' || pm === 'instapay' || pm === 'bank_transfer') {
            transfer = total;
        } else {
            cash = total;
        }
    }

    const pills = [];

    // 1. Cash pill (First, matching reference)
    if (cash > 0) {
        pills.push(`<span class="tender-pill tender-pill-cash">كاش: ${cash.toFixed(2)} ج.م</span>`);
    }

    // 2. Visa / Card pill (Second, matching reference)
    if (card > 0) {
        pills.push(`<span class="tender-pill tender-pill-card">فيزا: ${card.toFixed(2)} ج.م</span>`);
    }

    // 3. Electronic Transfer pill (Third, matching reference)
    if (transfer > 0) {
        pills.push(`<span class="tender-pill tender-pill-transfer">تحويل: ${transfer.toFixed(2)} ج.م</span>`);
    }

    // Fallback if none matched
    if (pills.length === 0) {
        pills.push(`<span class="tender-pill tender-pill-drawer">كاش: ${total.toFixed(2)} ج.م</span>`);
    }

    return `<div class="tender-pill-group" style="display: flex !important; flex-direction: column !important; gap: 4px !important; align-items: flex-start !important;">${pills.join('')}</div>`;
}
window.renderTenderPillBadges = renderTenderPillBadges;

/**
 * Handle View & Reprint Invoice: Opens Cotton Club ThermalReceipt Modal
 * Path: GET /api/swm/pos/invoices/:id
 */
async function handleViewInvoice(invoiceId) {
    if (!invoiceId) return;
    try {
        const res = await window.api.getInvoice(invoiceId);
        const inv = (res && res.success !== false && res.data) ? res.data : (res && res.invoice ? res.invoice : res);

        if (!inv || !inv.id) {
            alert('تعذر تحميل بيانات الفاتورة');
            return;
        }

        // Open Cotton Club Thermal Receipt Modal
        if (typeof openThermalReceiptModal === 'function') {
            openThermalReceiptModal(inv);
        } else {
            alert(`فاتورة رقم: #${inv.invoice_number}\nالإجمالي: ${inv.final_total} ج.م`);
        }
    } catch (err) {
        console.error('Error fetching invoice for receipt preview:', err);
        alert('حدث خطأ أثناء تحميل الفاتورة: ' + err.message);
    }
}
window.handleViewInvoice = handleViewInvoice;

/**
 * Print Official A4 Shift Settlement Report (Cotton Club)
 * Formats official summary, breakdown tables, audit log, and 3 official signatures
 */
function printShiftReportA4() {
    if (!currentDailyShiftData) {
        alert('لا توجد بيانات وردية جاهزة للطباعة');
        return;
    }

    const { kpi, all_transactions, meta } = currentDailyShiftData;
    const dateVal = document.getElementById('shiftDateFilter')?.value || meta?.date || new Date().toISOString().slice(0, 10);
    const branchLabel = 'الفرع الرئيسي - COTTON CLUB';
    const salespersonVal = document.getElementById('shiftSalespersonFilter')?.selectedOptions?.[0]?.text || 'كل الفرع';
    const nowFormatted = new Date().toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'medium' });

    // Build Transactions HTML Table for A4
    let txnsHtml = '';
    all_transactions.forEach((t, idx) => {
        const typeLabel = t.type === 'sale' ? 'فاتورة بيع' : t.type === 'return' ? 'فاتورة مرتجع' : (t.type === 'returned_expense' ? 'مصروف مرتد' : 'مصروف نثري');
        const sign = (t.type === 'sale' || t.type === 'returned_expense') ? '+' : '-';
        const amtColor = t.type === 'sale' ? '#16a34a' : t.type === 'return' ? '#dc2626' : (t.type === 'returned_expense' ? '#059669' : '#ea580c');
        const tenderBadges = renderTenderPillBadges(t);

        let partyLabel = '-';
        if (t.type === 'expense') {
            const ben = t.beneficiary_name || t.recipient_name;
            const cat = t.category || 'مصروف';
            const desc = t.description || t.notes || '';
            partyLabel = ben ? `المستلم: ${ben} [${cat}${desc ? ' - ' + desc : ''}]` : `[${cat}] ${desc}`;
        } else if (t.type === 'returned_expense') {
            const payer = t.beneficiary_name || t.recipient_name;
            const cat = t.category || 'مرتد';
            const desc = t.description || t.notes || '';
            partyLabel = payer ? `المُسدّد: ${payer} [${cat}${desc ? ' - ' + desc : ''}]` : `[${cat}] ${desc}`;
        } else {
            partyLabel = t.customer_name ? `${t.customer_name}${t.customer_phone ? ' (' + t.customer_phone + ')' : ''}` : 'عميل نقدي';
        }

        txnsHtml += `
            <tr style="border-bottom: 1px solid #E2E8F0; font-size: 11px;">
                <td style="padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="padding: 6px; font-weight: bold;">#${t.code || t.id}</td>
                <td style="padding: 6px; direction: ltr; text-align: right;">${t.time || '-'}</td>
                <td style="padding: 6px;">${typeLabel}</td>
                <td style="padding: 6px;">${t.salesperson_name || t.cashier_name || '-'}</td>
                <td style="padding: 6px;">${partyLabel}</td>
                <td style="padding: 6px;">${tenderBadges}</td>
                <td style="padding: 6px; font-weight: bold; color: ${amtColor}; text-align: left;">${sign}${(t.amount || 0).toFixed(2)} ج.م</td>
            </tr>
        `;
    });

    const printContainer = document.getElementById('shiftA4PrintContainer');
    if (!printContainer) return;

    printContainer.innerHTML = `
        <div style="direction: rtl; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #0F172A;">
            <!-- Official Header -->
            <div style="border-bottom: 2.5px solid #0B0F17; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                    <h1 style="font-size: 24px; font-weight: 900; margin: 0; color: #0B0F17; letter-spacing: 1px;">COTTON CLUB</h1>
                    <div style="font-size: 13px; font-weight: 700; color: #64748B; margin-top: 2px;">نادي القطن للأزياء الراقية والملابس الجاهزة</div>
                    <div style="font-size: 15px; font-weight: 800; color: #0B0F17; margin-top: 6px;">تقرير تقفيل الوردية اليومية والمطابقة المالية الرسمية (Daily Shift Settlement)</div>
                </div>
                <div style="text-align: left; font-size: 11.5px; color: #475569; line-height: 1.5;">
                    <div><strong>تاريخ الوردية:</strong> ${dateVal}</div>
                    <div><strong>الفرع المستهدف:</strong> ${branchLabel}</div>
                    <div><strong>مسؤول الوردية:</strong> ${salespersonVal}</div>
                    <div><strong>تاريخ الاستخراج:</strong> ${nowFormatted}</div>
                </div>
            </div>

            <!-- Financial KPI Summary Cards Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1.5px solid #0B0F17;">
                <thead>
                    <tr style="background: #0B0F17; color: #DFCA95; font-size: 12px;">
                        <th style="padding: 8px; border: 1px solid #334155; text-align: center;">إجمالي المبيعات (الوارد)</th>
                        <th style="padding: 8px; border: 1px solid #334155; text-align: center;">إجمالي المرتجعات (سالب)</th>
                        <th style="padding: 8px; border: 1px solid #334155; text-align: center;">المصروفات النثرية</th>
                        <th style="padding: 8px; border: 1px solid #334155; text-align: center;">صافي إيراد الوردية</th>
                        <th style="padding: 8px; border: 1px solid #334155; text-align: center;">النقدية المتوقعة بالدرج</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="font-size: 14px; font-weight: 800; text-align: center; background: #F8FAFC;">
                        <td style="padding: 10px; border: 1px solid #CBD5E1; color: #16a34a;">${(kpi.totalSales || 0).toFixed(2)} ج.م<br><span style="font-size: 10.5px; color: #64748B; font-weight: normal;">(${kpi.salesCount || 0} فاتورة بيع)</span></td>
                        <td style="padding: 10px; border: 1px solid #CBD5E1; color: #dc2626;">-${(kpi.totalReturns || 0).toFixed(2)} ج.م<br><span style="font-size: 10.5px; color: #64748B; font-weight: normal;">(${kpi.returnsCount || 0} فاتورة مرتجع)</span></td>
                        <td style="padding: 10px; border: 1px solid #CBD5E1; color: #ea580c;">-${(kpi.totalExpenses || 0).toFixed(2)} ج.م<br><span style="font-size: 10.5px; color: #64748B; font-weight: normal;">(${kpi.expensesCount || 0} سند مصروف)</span></td>
                        <td style="padding: 10px; border: 1px solid #CBD5E1; color: #059669; background: #ECFDF5;">${(kpi.netRevenue || 0).toFixed(2)} ج.م<br><span style="font-size: 10.5px; color: #047857; font-weight: normal;">صافي الأرباح المحققة</span></td>
                        <td style="padding: 10px; border: 1px solid #CBD5E1; color: #b45309; background: #FFFBEB;">${(kpi.expectedDrawerCash || 0).toFixed(2)} ج.م<br><span style="font-size: 10.5px; color: #92400e; font-weight: normal;">(عهدة البداية: ${(kpi.openingCash || 0).toFixed(2)})</span></td>
                    </tr>
                </tbody>
            </table>

            <!-- Tender Breakdown Table -->
            <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 6px;">تقسيم صافي اليومية حسب قنوات الدفع (Payment Methods Breakdown):</div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11.5px; border: 1px solid #E2E8F0;">
                <thead>
                    <tr style="background: #F1F5F9; color: #334155; font-weight: bold;">
                        <th style="padding: 7px; border: 1px solid #CBD5E1; text-align: right;">طريقة الدفع</th>
                        <th style="padding: 7px; border: 1px solid #CBD5E1; text-align: center;">المبيعات</th>
                        <th style="padding: 7px; border: 1px solid #CBD5E1; text-align: center;">المرتجعات</th>
                        <th style="padding: 7px; border: 1px solid #CBD5E1; text-align: center;">المصروفات</th>
                        <th style="padding: 7px; border: 1px solid #CBD5E1; text-align: left;">صافي القناة</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; font-weight: bold;">نقداً (صافي كاش الدرج بعد المصروفات)</td>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; text-align: center;">${(kpi.tender?.cash?.sales || 0).toFixed(2)} ج.م</td>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; text-align: center; color: #dc2626;">-${(kpi.tender?.cash?.returns || 0).toFixed(2)} ج.م</td>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; text-align: center; color: #ea580c;">-${(kpi.totalExpenses || 0).toFixed(2)} ج.م</td>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; text-align: left; font-weight: bold; color: #16a34a;">${(kpi.netCash || 0).toFixed(2)} ج.م</td>
                    </tr>
                    <tr>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; font-weight: bold;">بطاقات وفيزا (Cards POS)</td>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; text-align: center;">${(kpi.tender?.card?.sales || 0).toFixed(2)} ج.م</td>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; text-align: center; color: #dc2626;">-${(kpi.tender?.card?.returns || 0).toFixed(2)} ج.م</td>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; text-align: center;">-</td>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; text-align: left; font-weight: bold; color: #2563eb;">${(kpi.netCard || 0).toFixed(2)} ج.م</td>
                    </tr>
                    <tr>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; font-weight: bold;">تحويلات بنكية وإنستاباي ومحافظ</td>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; text-align: center;">${(kpi.tender?.transfer?.sales || 0).toFixed(2)} ج.م</td>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; text-align: center; color: #dc2626;">-${(kpi.tender?.transfer?.returns || 0).toFixed(2)} ج.م</td>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; text-align: center;">-</td>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; text-align: left; font-weight: bold; color: #7c3aed;">${(kpi.netTransfer || 0).toFixed(2)} ج.م</td>
                    </tr>
                    <tr style="background: #F8FAFC; font-weight: 800; border-top: 2px solid #CBD5E1;">
                        <td style="padding: 7px; border: 1px solid #E2E8F0; color: #0B0F17;">الإجمالي (صافي إيراد الوردية العام)</td>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; text-align: center; color: #16a34a;">${(kpi.totalSales || 0).toFixed(2)} ج.م</td>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; text-align: center; color: #dc2626;">-${(kpi.totalReturns || 0).toFixed(2)} ج.م</td>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; text-align: center; color: #ea580c;">-${(kpi.totalExpenses || 0).toFixed(2)} ج.م</td>
                        <td style="padding: 7px; border: 1px solid #E2E8F0; text-align: left; font-size: 13px; color: #059669; background: #ECFDF5;">${(kpi.netRevenue || 0).toFixed(2)} ج.م</td>
                    </tr>
                </tbody>
            </table>

            <!-- Unified Audit Log Table -->
            <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 6px;">كشف الحركة التفصيلي اللحظي للوردية (${all_transactions.length} حركة):</div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #E2E8F0;">
                <thead>
                    <tr style="background: #F8FAFC; color: #475569; font-size: 11px; border-bottom: 1.5px solid #CBD5E1;">
                        <th style="padding: 6px; text-align: center; width: 30px;">م</th>
                        <th style="padding: 6px; text-align: right; width: 80px;">رقم الفاتورة</th>
                        <th style="padding: 6px; text-align: right; width: 70px;">التوقيت</th>
                        <th style="padding: 6px; text-align: right; width: 75px;">النوع</th>
                        <th style="padding: 6px; text-align: right; width: 90px;">البائع / الكاشير</th>
                        <th style="padding: 6px; text-align: right;">البيان / العميل</th>
                        <th style="padding: 6px; text-align: right; width: 85px;">طريقة السداد</th>
                        <th style="padding: 6px; text-align: left; width: 90px;">القيمة</th>
                    </tr>
                </thead>
                <tbody>
                    ${txnsHtml || '<tr><td colspan="8" style="text-align: center; padding: 12px; color: #94A3B8;">لا توجد حركات مسجلة في هذه الوردية</td></tr>'}
                </tbody>
            </table>

            <!-- 3 Official Signatures (الكاشير المسلّم - مدير الفرع - المراجع المالي ومستلم النقدية) -->
            <div style="margin-top: 30px; page-break-inside: avoid; border-top: 2px dashed #94A3B8; padding-top: 18px;">
                <div style="text-align: center; font-size: 12px; font-weight: 800; color: #0F172A; margin-bottom: 14px;">
                    اعتماد ومطابقة إغلاق الوردية وتسليم العهدة المالية
                </div>
                <table style="width: 100%; text-align: center; font-size: 12px; border-collapse: collapse;">
                    <tr>
                        <td style="width: 33.3%; vertical-align: top; padding: 10px; border: 1px solid #E2E8F0; border-radius: 8px;">
                            <div style="font-weight: 800; color: #0B0F17; margin-bottom: 40px;">
                                1. توقيع الكاشير المسلّم للوردية
                            </div>
                            <div style="border-bottom: 1px dotted #94A3B8; width: 80%; margin: 0 auto 6px;"></div>
                            <div style="font-size: 10.5px; color: #64748B;">الاسم / التاريخ والوقت</div>
                        </td>
                        <td style="width: 33.3%; vertical-align: top; padding: 10px; border: 1px solid #E2E8F0; border-radius: 8px;">
                            <div style="font-weight: 800; color: #0B0F17; margin-bottom: 40px;">
                                2. توقيع مدير الفرع
                            </div>
                            <div style="border-bottom: 1px dotted #94A3B8; width: 80%; margin: 0 auto 6px;"></div>
                            <div style="font-size: 10.5px; color: #64748B;">الاسم / التاريخ والوقت</div>
                        </td>
                        <td style="width: 33.3%; vertical-align: top; padding: 10px; border: 1px solid #E2E8F0; border-radius: 8px;">
                            <div style="font-weight: 800; color: #0B0F17; margin-bottom: 40px;">
                                3. توقيع المراجع المالي ومستلم النقدية
                            </div>
                            <div style="border-bottom: 1px dotted #94A3B8; width: 80%; margin: 0 auto 6px;"></div>
                            <div style="font-size: 10.5px; color: #64748B;">الاسم / التاريخ والوقت</div>
                        </td>
                    </tr>
                </table>
                <div style="text-align: center; font-size: 10px; color: #94A3B8; margin-top: 14px;">
                    تم استخراج هذا التقرير آلياً بواسطة نظام Cotton Club POS — جميع المبالغ المذكورة تخضع للمراجعة المالية المعتمدة.
                </div>
            </div>
        </div>
    `;

    // Trigger Print Dialog
    window.print();
}
window.printShiftReportA4 = printShiftReportA4;

// Backward-compatibility alias
window.loadSessionDashboard = loadDailyShiftSummary;


/**
 * Invoice Details Modal: Preview & Print
 */
async function viewInvoiceDetails(invoiceId) {
    try {
        const res = await window.api.getInvoice(invoiceId);
        const inv = (res && res.success !== false && res.data) ? res.data : res;

        if (!inv) {
            alert('تعذر تحميل بيانات الفاتورة');
            return;
        }

        const titleEl = document.getElementById('previewInvoiceTitle');
        const subTitleEl = document.getElementById('previewInvoiceSubtitle');
        const dateEl = document.getElementById('previewInvDate');
        const cashierEl = document.getElementById('previewInvCashier');
        const methodEl = document.getElementById('previewInvMethod');
        const customerEl = document.getElementById('previewInvCustomer');
        const subtotalEl = document.getElementById('previewInvSubtotal');
        const discountEl = document.getElementById('previewInvDiscount');
        const totalEl = document.getElementById('previewInvFinalTotal');
        const itemsBody = document.getElementById('previewInvItemsBody');

        if (titleEl) titleEl.innerText = `فاتورة مبيعات: #${inv.invoice_number}`;
        if (subTitleEl) subTitleEl.innerText = `كود الوردية: ${inv.session_code || '-'} | الحالة: ${inv.status === 'completed' ? 'معتمدة' : inv.status}`;
        if (dateEl) dateEl.innerText = formatInvoiceTimestamp(inv.created_at);
        if (cashierEl) cashierEl.innerText = inv.cashier_name || '-';
        if (methodEl) {
            methodEl.innerHTML = renderTenderPillBadges(inv);
        }
        if (customerEl) customerEl.innerText = inv.notes || 'عميل نقدي مباشر';
        if (subtotalEl) subtotalEl.innerText = `${(inv.subtotal || inv.final_total).toFixed(2)} ج.م`;
        if (discountEl) discountEl.innerText = `${(inv.discount_amount || 0).toFixed(2)} ج.م`;
        if (totalEl) totalEl.innerText = `${inv.final_total.toFixed(2)} ج.م`;

        if (itemsBody) {
            itemsBody.innerHTML = '';
            const items = inv.lineItems || [];
            if (items.length === 0) {
                itemsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 12px;">لا توجد أصناف مسجلة</td></tr>';
            } else {
                items.forEach(it => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-weight: 600;">${it.item_name}</td>
                        <td>${it.quantity}</td>
                        <td>${it.unit_price.toFixed(2)} ج.م</td>
                        <td style="font-weight: 700;">${it.line_total.toFixed(2)} ج.م</td>
                    `;
                    itemsBody.appendChild(tr);
                });
            }
        }

        const btnPrint = document.getElementById('btnPreviewPrintReceipt');
        if (btnPrint) {
            btnPrint.onclick = async () => {
                closeInvoicePreviewModal();
                openThermalReceiptModal(inv);
            };
        }

        const modal = document.getElementById('modalInvoicePreview');
        if (modal) modal.style.display = 'flex';
        refreshIcons(modal);
    } catch (e) {
        console.error('Error viewing invoice details:', e);
        alert('حدث خطأ أثناء معاينة الفاتورة');
    }
}
window.viewInvoiceDetails = viewInvoiceDetails;

function closeInvoicePreviewModal() {
    const modal = document.getElementById('modalInvoicePreview');
    if (modal) modal.style.display = 'none';
}
window.closeInvoicePreviewModal = closeInvoicePreviewModal;

/* -------------------------------------------------------------
 * 5. INVENTORY & CATALOG (المجموعات ودليل الأصناف المبسط)
 * ------------------------------------------------------------- */
let catalogCategoriesCache = [];
let catalogProductsCache = [];

async function loadInventoryCatalogView(tabToOpen = null) {
    // 1. Fetch 4 Executive KPIs
    try {
        const statsRes = await window.api.getCatalogOverview();
        if (statsRes && statsRes.success && statsRes.data) {
            const s = statsRes.data;
            const elCats = document.getElementById('kpiTotalCategories');
            const elProds = document.getElementById('kpiTotalProducts');
            const elLow = document.getElementById('kpiLowStockCount');
            const elOut = document.getElementById('kpiOutOfStockCount');
            if (elCats) elCats.innerText = s.total_categories || 0;
            if (elProds) elProds.innerText = s.total_products || 0;
            if (elLow) elLow.innerText = s.low_stock_count || 0;
            if (elOut) elOut.innerText = s.out_of_stock_count || 0;
        }
    } catch (e) {
        console.error('Error loading catalog overview:', e);
    }

    // 2. Fetch categories for filters and dropdowns
    try {
        const catRes = await window.api.listCategories();
        if (catRes && catRes.success) {
            catalogCategoriesCache = catRes.data || [];
            populateCatalogCategoriesDropdown();
        }
    } catch (e) {
        console.error('Error loading categories cache:', e);
    }

    // 3. Switch to desired or active tab
    if (tabToOpen) {
        switchCatalogTab(tabToOpen);
    } else {
        switchCatalogTab(activeCatalogTab);
    }
}
window.loadInventoryCatalogView = loadInventoryCatalogView;

function populateCatalogCategoriesDropdown() {
    const filterSel = document.getElementById('catalogCategoryFilter');
    if (filterSel) {
        const currentVal = filterSel.value;
        filterSel.innerHTML = '<option value="">كافة المجموعات</option>';
        catalogCategoriesCache.forEach(c => {
            filterSel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
        if (currentVal) filterSel.value = currentVal;
    }
}

async function loadCategoriesTable() {
    const searchInput = document.getElementById('categoriesSearchInput');
    const search = searchInput ? searchInput.value.trim() : '';

    try {
        const res = await window.api.listCategories({ search });
        const list = (res && res.success) ? (res.data || []) : [];
        catalogCategoriesCache = list;
        populateCatalogCategoriesDropdown();

        const countDisplay = document.getElementById('categoriesCountDisplay');
        if (countDisplay) {
            countDisplay.innerText = `عرض ${list.length} مجموعة`;
        }

        const tbody = document.getElementById('categoriesTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px; color: var(--text-muted);">
                        لا توجد مجموعات تطابق البحث. اضغط على "إضافة مجموعة" لإنشاء تصنيف جديد.
                    </td>
                </tr>
            `;
            return;
        }

        list.forEach(cat => {
            const tr = document.createElement('tr');
            const code = cat.category_code || `CAT-${String(cat.id).padStart(2, '0')}`;
            const itemsCount = cat.items_count || 0;

            tr.innerHTML = `
                <td><span class="mono-cat-code">${code}</span></td>
                <td>
                    <div style="font-weight: 700; color: #0f172a;">${cat.name}</div>
                    ${cat.description ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${cat.description}</div>` : ''}
                </td>
                <td style="text-align: center;">
                    <button class="cat-items-badge-btn" onclick="filterItemsByCategory(${cat.id})" title="عرض أصناف هذه المجموعة">
                        <i data-lucide="package" class="icon-xs"></i>
                        <span>${itemsCount} صنف</span>
                    </button>
                </td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 6px; justify-content: center;">
                        <button class="btn-icon" onclick="openEditCategoryModal(${cat.id})" title="تعديل المجموعة" style="padding: 4px; border-radius: 6px; border: 1px solid var(--border); background: #fff; cursor: pointer;">
                            <i data-lucide="edit-2" class="icon-xs" style="color: #2563eb;"></i>
                        </button>
                        <button class="btn-icon text-danger" onclick="deleteCategoryAction(${cat.id}, '${cat.name.replace(/'/g, "\\'")}')" title="حذف المجموعة" style="padding: 4px; border-radius: 6px; border: 1px solid var(--border); background: #fff; cursor: pointer;">
                            <i data-lucide="trash-2" class="icon-xs" style="color: #dc2626;"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        refreshIcons(tbody);
    } catch (e) {
        console.error('Error loading categories table:', e);
    }
}
window.loadCategoriesTable = loadCategoriesTable;

async function loadCatalogItemsTable() {
    const searchInput = document.getElementById('catalogItemsSearchInput');
    const search = searchInput ? searchInput.value.trim() : '';

    const catFilter = document.getElementById('catalogCategoryFilter');
    const categoryId = catFilter && catFilter.value ? Number(catFilter.value) : null;

    try {
        const res = await window.api.listProducts({
            search,
            categoryId,
            limit: 200
        });

        const list = (res && res.success) ? (res.data || []) : [];
        catalogProductsCache = list;

        const countDisplay = document.getElementById('catalogItemsCountDisplay');
        if (countDisplay) {
            countDisplay.innerText = `عرض ${list.length} صنف`;
        }

        const tbody = document.getElementById('catalogItemsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px; color: var(--text-muted);">
                        لا توجد أصناف تطابق معايير البحث والفلترة.
                    </td>
                </tr>
            `;
            return;
        }

        list.forEach(p => {
            const tr = document.createElement('tr');
            const code = p.product_code || `ITM-${String(p.id).padStart(6, '0')}`;

            tr.innerHTML = `
                <td><span class="mono-product-code">${code}</span></td>
                <td>
                    <div style="font-weight: 700; color: #0f172a;">${p.item_name}</div>
                </td>
                <td>
                    <span style="font-weight: 600; color: #334155;">${p.category_name || '<span style="color: var(--text-muted);">-</span>'}</span>
                </td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 6px; justify-content: center;">
                        <button class="btn-icon" onclick="openEditProductModal(${p.id})" title="تعديل الصنف" style="padding: 4px; border-radius: 6px; border: 1px solid var(--border); background: #fff; cursor: pointer;">
                            <i data-lucide="edit-2" class="icon-xs" style="color: #2563eb;"></i>
                        </button>
                        <button class="btn-icon text-danger" onclick="deleteProductAction(${p.id}, '${p.item_name.replace(/'/g, "\\'")}')" title="حذف الصنف" style="padding: 4px; border-radius: 6px; border: 1px solid var(--border); background: #fff; cursor: pointer;">
                            <i data-lucide="trash-2" class="icon-xs" style="color: #dc2626;"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        refreshIcons(tbody);
    } catch (e) {
        console.error('Error loading catalog items table:', e);
    }
}
window.loadCatalogItemsTable = loadCatalogItemsTable;

function filterItemsByCategory(catId) {
    switchCatalogTab('items');
    const catFilter = document.getElementById('catalogCategoryFilter');
    if (catFilter) {
        catFilter.value = String(catId);
    }
    loadCatalogItemsTable();
}
window.filterItemsByCategory = filterItemsByCategory;

// Category Modal Handlers
function openNewCategoryModal() {
    document.getElementById('categoryModalId').value = '';
    document.getElementById('categoryModalName').value = '';
    document.getElementById('categoryModalCode').value = '';
    document.getElementById('categoryModalDesc').value = '';

    const titleEl = document.getElementById('modalCategoryTitle');
    if (titleEl) {
        titleEl.innerHTML = `<i data-lucide="folder-plus" class="icon-sm" style="color: var(--primary);"></i><span>إضافة مجموعة جديدة</span>`;
    }

    document.getElementById('modalCategory').classList.add('active');
    refreshIcons(document.getElementById('modalCategory'));
    setTimeout(() => document.getElementById('categoryModalName').focus(), 50);
}
window.openNewCategoryModal = openNewCategoryModal;

function openEditCategoryModal(id) {
    const cat = catalogCategoriesCache.find(c => c.id === id);
    if (!cat) return;

    document.getElementById('categoryModalId').value = cat.id;
    document.getElementById('categoryModalName').value = cat.name || '';
    document.getElementById('categoryModalCode').value = cat.category_code || '';
    document.getElementById('categoryModalDesc').value = cat.description || '';

    const titleEl = document.getElementById('modalCategoryTitle');
    if (titleEl) {
        titleEl.innerHTML = `<i data-lucide="edit-2" class="icon-sm" style="color: var(--primary);"></i><span>تعديل المجموعة: ${cat.name}</span>`;
    }

    document.getElementById('modalCategory').classList.add('active');
    refreshIcons(document.getElementById('modalCategory'));
    setTimeout(() => document.getElementById('categoryModalName').focus(), 50);
}
window.openEditCategoryModal = openEditCategoryModal;

async function saveCategoryModal() {
    const id = document.getElementById('categoryModalId').value;
    const name = document.getElementById('categoryModalName').value.trim();
    const code = document.getElementById('categoryModalCode').value.trim();
    const desc = document.getElementById('categoryModalDesc').value.trim();

    if (!name) {
        alert('يرجى كتابة اسم المجموعة');
        return;
    }

    const payload = {
        name,
        code,
        categoryCode: code,
        description: desc
    };

    try {
        let res;
        if (id) {
            res = await window.api.updateCategory(Number(id), payload);
        } else {
            res = await window.api.createCategory(payload);
        }

        if (!res || !res.success) {
            alert(res?.error || 'حدث خطأ أثناء حفظ المجموعة');
            return;
        }

        document.getElementById('modalCategory').classList.remove('active');
        hubMetricsCache.timestamp = 0;
        await loadInventoryCatalogView();
    } catch (e) {
        alert('خطأ في الاتصال: ' + e.message);
    }
}
window.saveCategoryModal = saveCategoryModal;

async function deleteCategoryAction(id, name) {
    if (!confirm(`هل أنت متأكد من حذف المجموعة "${name}"؟`)) {
        return;
    }

    try {
        const res = await window.api.deleteCategory(id);
        if (!res || !res.success) {
            alert(res?.error || 'تعذر حذف المجموعة');
            return;
        }
        hubMetricsCache.timestamp = 0;
        await loadInventoryCatalogView();
    } catch (e) {
        alert('خطأ أثناء الحذف: ' + e.message);
    }
}
window.deleteCategoryAction = deleteCategoryAction;

// Dedicated Fit-Page Product View Handlers (New & Edit)
function openNewProductModal() {
    switchView('new-product');
}
window.openNewProductModal = openNewProductModal;

function openEditProductModal(id) {
    switchView('new-product', id);
}
window.openEditProductModal = openEditProductModal;

async function prepareProductFormView(productId = null) {
    const titleEl = document.getElementById('newProductViewTitle');
    const badgeEl = document.getElementById('newProductAutoCodeBadge');
    const idInput = document.getElementById('prodFormId');
    const nameInput = document.getElementById('prodFormName');
    const codeInput = document.getElementById('prodFormCode');
    const catSel = document.getElementById('prodFormCategory');
    const unitSel = document.getElementById('prodFormUnit');
    const brandInput = document.getElementById('prodFormBrand');
    const notesInput = document.getElementById('prodFormNotes');

    // Ensure categories cache is populated
    if (!catalogCategoriesCache || catalogCategoriesCache.length === 0) {
        const cRes = await window.api.listCategories();
        catalogCategoriesCache = cRes.data || [];
    }

    if (catSel) {
        catSel.innerHTML = '<option value="">-- اختر المجموعة / التصنيف --</option>';
        catalogCategoriesCache.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.innerText = `${c.name} (${c.category_code || 'CAT'})`;
            catSel.appendChild(opt);
        });
    }

    if (!productId) {
        // Mode: Add New Product - auto calculate next ITM-XXXXXX
        const maxId = (catalogProductsCache || []).reduce((max, p) => Math.max(max, p.id || 0), 0) + 1;
        const autoCode = `ITM-${String(maxId).padStart(6, '0')}`;

        if (titleEl) titleEl.innerText = 'إضافة صنف جديد (New Product Master)';
        if (badgeEl) badgeEl.innerText = autoCode;
        if (idInput) idInput.value = '';
        if (nameInput) nameInput.value = '';
        if (codeInput) {
            codeInput.value = autoCode;
            codeInput.readOnly = true;
        }
        if (brandInput) brandInput.value = '';
        if (unitSel) unitSel.value = 'قطعة';
        if (notesInput) notesInput.value = '';

        const activeCatFilter = document.getElementById('catalogCategoryFilter');
        if (catSel && activeCatFilter && activeCatFilter.value) {
            catSel.value = activeCatFilter.value;
        }

        setTimeout(() => nameInput?.focus(), 80);
    } else {
        // Mode: Edit Product
        const p = catalogProductsCache.find(x => x.id === Number(productId));
        if (!p) {
            alert('تعذر العثور على بيانات الصنف');
            switchView('inventory-hub', 'items');
            return;
        }

        const code = p.product_code || `ITM-${String(p.id).padStart(6, '0')}`;
        if (titleEl) titleEl.innerText = `تعديل بيانات الصنف: ${p.item_name}`;
        if (badgeEl) badgeEl.innerText = code;
        if (idInput) idInput.value = p.id;
        if (nameInput) nameInput.value = p.item_name || '';
        if (codeInput) {
            codeInput.value = code;
            codeInput.readOnly = true;
        }
        if (catSel) catSel.value = p.category_id ? String(p.category_id) : '';
        if (unitSel) unitSel.value = p.unit_of_measure || 'قطعة';
        if (brandInput) brandInput.value = p.brand || '';
        if (notesInput) notesInput.value = p.description || '';

        setTimeout(() => nameInput?.focus(), 80);
    }
}
window.prepareProductFormView = prepareProductFormView;

async function saveProductFormView(keepOpenForNext = false) {
    const id = document.getElementById('prodFormId')?.value;
    const itemName = document.getElementById('prodFormName')?.value.trim();
    const productCode = document.getElementById('prodFormCode')?.value.trim();
    const categoryId = document.getElementById('prodFormCategory')?.value;
    const unitOfMeasure = document.getElementById('prodFormUnit')?.value || 'قطعة';
    const brand = document.getElementById('prodFormBrand')?.value.trim();
    const description = document.getElementById('prodFormNotes')?.value.trim();

    if (!itemName) {
        alert('يرجى كتابة اسم الصنف / الموديل');
        document.getElementById('prodFormName')?.focus();
        return;
    }

    if (!categoryId) {
        alert('يرجى اختيار المجموعة / التصنيف للصنف');
        document.getElementById('prodFormCategory')?.focus();
        return;
    }

    const payload = {
        itemName,
        productCode: productCode || null,
        categoryId: Number(categoryId),
        unitOfMeasure,
        brand: brand || null,
        description: description || null,
        costPrice: 0,
        sellPrice: 0,
        wholesalePrice: 0,
        minSellingPrice: 0,
        initialStock: 0,
        reorderLevel: 5,
        minStockAlert: 5,
        status: 'active',
        isActive: 1
    };

    const userId = state.currentUser ? state.currentUser.id : 1;

    try {
        let res;
        if (id) {
            res = await window.api.updateProduct(Number(id), payload, userId);
        } else {
            res = await window.api.createProduct(payload, userId);
        }

        if (!res || !res.success) {
            alert(res?.error || 'حدث خطأ أثناء حفظ الصنف');
            return;
        }

        hubMetricsCache.timestamp = 0;

        if (keepOpenForNext) {
            // Keep on form view, reset fields for next product and set next auto ID
            const nextMaxId = (catalogProductsCache || []).reduce((max, p) => Math.max(max, p.id || 0), 0) + 2;
            const nextCode = `ITM-${String(nextMaxId).padStart(6, '0')}`;

            document.getElementById('prodFormId').value = '';
            document.getElementById('prodFormName').value = '';
            document.getElementById('prodFormCode').value = nextCode;
            document.getElementById('prodFormBrand').value = '';
            document.getElementById('prodFormNotes').value = '';
            document.getElementById('newProductAutoCodeBadge').innerText = nextCode;
            document.getElementById('prodFormName')?.focus();
        } else {
            switchView('inventory-hub', 'items');
        }
    } catch (e) {
        alert('خطأ في الاتصال: ' + e.message);
    }
}
window.saveProductFormView = saveProductFormView;

// Fallback for modal legacy if called
async function saveProductModal() {
    return saveProductFormView(false);
}
window.saveProductModal = saveProductModal;

async function deleteProductAction(id, name) {
    if (!confirm(`هل أنت متأكد من حذف الصنف "${name}" من الكتالوج؟`)) {
        return;
    }

    const userId = state.currentUser ? state.currentUser.id : 1;
    try {
        const res = await window.api.deleteProduct(id, userId);
        if (!res || !res.success) {
            alert(res?.error || 'تعذر حذف الصنف');
            return;
        }
        hubMetricsCache.timestamp = 0;
        await loadInventoryCatalogView();
    } catch (e) {
        alert('خطأ أثناء الحذف: ' + e.message);
    }
}
window.deleteProductAction = deleteProductAction;

function bindInventoryEvents() {
    // Categories tab toolbar
    const catSearch = document.getElementById('categoriesSearchInput');
    if (catSearch) catSearch.addEventListener('input', debounce(loadCategoriesTable, 250));

    const btnRefCat = document.getElementById('btnRefreshCategories');
    if (btnRefCat) btnRefCat.addEventListener('click', loadCategoriesTable);

    // Items tab toolbar
    const itemSearch = document.getElementById('catalogItemsSearchInput');
    if (itemSearch) itemSearch.addEventListener('input', debounce(loadCatalogItemsTable, 250));

    const catFilter = document.getElementById('catalogCategoryFilter');
    if (catFilter) catFilter.addEventListener('change', loadCatalogItemsTable);

    const btnRefItem = document.getElementById('btnRefreshCatalogItems');
    if (btnRefItem) btnRefItem.addEventListener('click', loadCatalogItemsTable);

    // Actions & Buttons
    const btnNewCat = document.getElementById('btnOpenNewCategoryModal');
    if (btnNewCat) btnNewCat.addEventListener('click', openNewCategoryModal);

    const btnQuickAdd = document.getElementById('btnQuickAddCat');
    if (btnQuickAdd) btnQuickAdd.addEventListener('click', openNewCategoryModal);

    const btnQuickAddFromForm = document.getElementById('btnQuickAddCatFromForm');
    if (btnQuickAddFromForm) btnQuickAddFromForm.addEventListener('click', openNewCategoryModal);

    const btnSaveCat = document.getElementById('btnSaveCategoryModal');
    if (btnSaveCat) btnSaveCat.addEventListener('click', saveCategoryModal);

    const btnNewProd = document.getElementById('btnOpenNewProductModal');
    if (btnNewProd) btnNewProd.addEventListener('click', openNewProductModal);

    // Dedicated Product View Actions
    const btnSaveProdView = document.getElementById('btnSaveProductView');
    if (btnSaveProdView) btnSaveProdView.addEventListener('click', () => saveProductFormView(false));

    const btnSaveAndAddAnother = document.getElementById('btnSaveAndAddAnother');
    if (btnSaveAndAddAnother) btnSaveAndAddAnother.addEventListener('click', () => saveProductFormView(true));

    // Handle Enter key on name and code fields to save
    const prodNameInp = document.getElementById('prodFormName');
    if (prodNameInp) {
        prodNameInp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveProductFormView(false);
            }
        });
    }
}

/* -------------------------------------------------------------
 * 6. EXPENSES & REFUNDED EXPENSES ARCHITECTURE (COTTON CLUB)
 * ------------------------------------------------------------- */
let activeExpensesTab = 'hub'; // 'hub' | 'ledger' | 'analytics'
let cachedExpenseCategories = [];
let cachedBranchEmployees = [];

function switchExpensesTab(tab) {
    closeCategoryProductLookup();
    if (tab === 'cashout' || tab === 'out') {
        showExpenseCashOutForm();
    } else if (tab === 'cashin' || tab === 'in') {
        showExpenseCashInForm();
    } else {
        showExpensesCardsHub();
    }
}
window.switchExpensesTab = switchExpensesTab;

async function populateExpenseCategories() {
    try {
        const res = await window.api.getExpenseCategories();
        if (res?.success && Array.isArray(res.data)) {
            cachedExpenseCategories = res.data;
        } else {
            cachedExpenseCategories = [
                { id: 'bills', name: 'فواتير ومرافق التشغيل', subcategories: ['كهرباء', 'مياه', 'إنترنت وتليفون', 'إيجار'] },
                { id: 'withdrawals', name: 'سلف وسحب بائعين', subcategories: ['سلفة شخصية', 'سحب عمولة مقدماً', 'عهدة تشغيل مؤقتة'], requiresStaff: true },
                { id: 'hospitality', name: 'ضيافة ونظافة وبوفيه', subcategories: ['مستلزمات نظافة', 'بوفيه ومشروبات', 'أدوات مكتبية'] },
                { id: 'shipping', name: 'شحن ونثريات', subcategories: ['مصاريف شحن وتوصيل', 'نثريات طارئة', 'صيانة سريعة'] },
                { id: 'refunded', name: 'مصروف مرتد (إيداع نقدية)', subcategories: ['استرداد باقي سلفة', 'باقي نثريات مشتريات', 'مرتجع فاتورة خدمات', 'أخرى'], isRefund: true },
                { id: 'other', name: 'مصروفات تشغيلية أخرى', subcategories: ['عام'] }
            ];
        }

        // Populate Expense Category select
        const catSelect = document.getElementById('expenseCategory');
        const filterSelect = document.getElementById('expCategoryFilter');

        if (catSelect) {
            catSelect.innerHTML = cachedExpenseCategories
                .filter(c => !c.isRefund)
                .map(c => `<option value="${c.name}">${c.name}</option>`)
                .join('');
            handleExpenseCategoryChange();
        }

        if (filterSelect) {
            filterSelect.innerHTML = '<option value="all">كل البنود والتصنيفات</option>' +
                cachedExpenseCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        }
    } catch (e) {
        console.error('Error fetching expense categories:', e);
    }
}

async function populateBranchEmployees() {
    try {
        const res = await window.api.listEmployees(true);
        if (res?.success && Array.isArray(res.data)) {
            cachedBranchEmployees = res.data;
        } else {
            cachedBranchEmployees = [];
        }

        const expEmpSelect = document.getElementById('expenseSalesperson');
        const refEmpSelect = document.getElementById('refundedExpenseSalesperson');

        const optionsHtml = '<option value="">-- اختر الموظف المستلم من طاقم عمل الفرع --</option>' +
            cachedBranchEmployees.map(e => `<option value="${e.user_id || e.id}">${e.full_name} (${e.job_title || 'موظف'})</option>`).join('');

        if (expEmpSelect) expEmpSelect.innerHTML = optionsHtml;

        const refOptionsHtml = '<option value="">-- اختر الموظف المسدد من طاقم عمل الفرع --</option>' +
            cachedBranchEmployees.map(e => `<option value="${e.user_id || e.id}">${e.full_name} (${e.job_title || 'موظف'})</option>`).join('');

        if (refEmpSelect) refEmpSelect.innerHTML = refOptionsHtml;

        const countTitle1 = document.getElementById('expStaffCountTitle');
        if (countTitle1) countTitle1.innerText = `طاقم عمل الفرع الحالي المستلم للسلفة (${cachedBranchEmployees.length} موظف مسجل)`;

        const countTitle2 = document.getElementById('refStaffCountTitle');
        if (countTitle2) countTitle2.innerText = `طاقم عمل الفرع الحالي المسدد للسلفة (${cachedBranchEmployees.length} موظف مسجل)`;
    } catch (e) {
        console.error('Error loading branch employees:', e);
    }
}

function handleExpenseCategoryChange() {
    const catSelect = document.getElementById('expenseCategory');
    const groupSalesperson = document.getElementById('expenseSalespersonGroup');
    const subcatSelect = document.getElementById('expenseSubcategory');
    if (!catSelect) return;

    const selectedName = catSelect.value || '';
    const categoryObj = cachedExpenseCategories.find(c => c.name === selectedName);

    // Dynamic Dependency Watcher: Show/Hide Salesperson dropdown (Image 2)
    const isStaffRelated = categoryObj?.requiresStaff || 
                           selectedName.includes('سلف') || 
                           selectedName.includes('سحب') || 
                           selectedName.includes('بائع') || 
                           selectedName.includes('موظف') ||
                           selectedName.includes('عهدة');

    if (groupSalesperson) {
        groupSalesperson.style.display = isStaffRelated ? 'block' : 'none';
        if (!isStaffRelated) {
            const expSp = document.getElementById('expenseSalesperson');
            if (expSp) expSp.value = '';
        }
    }

    // Populate Subcategories if available
    if (subcatSelect) {
        if (categoryObj && Array.isArray(categoryObj.subcategories) && categoryObj.subcategories.length > 0) {
            subcatSelect.innerHTML = categoryObj.subcategories.map(s => `<option value="${s}">${s}</option>`).join('');
        } else {
            subcatSelect.innerHTML = '<option value="">-- عام --</option>';
        }
    }

    refreshIcons(groupSalesperson);
}

function handleRefundedCategoryChange() {
    const refCat = document.getElementById('refundedExpenseCategory');
    const refGroup = document.getElementById('refundedExpenseSalespersonGroup');
    if (!refCat || !refGroup) return;

    const val = refCat.value || '';
    const isStaff = val.includes('سلفة') || val.includes('بائع') || val.includes('موظف');
    refGroup.style.display = isStaff ? 'block' : 'none';
    if (!isStaff) {
        const sp = document.getElementById('refundedExpenseSalesperson');
        if (sp) sp.value = '';
    }

    refreshIcons(refGroup);
}

// -------------------------------------------------------------------------
// Navigation between Cards Hub and Dedicated Forms (Exact Mockup UX)
// -------------------------------------------------------------------------
function showExpensesCardsHub() {
    closeCategoryProductLookup();
    const hub = document.getElementById('expensesCardsHub');
    const formOut = document.getElementById('expensesFormCashOut');
    const formIn = document.getElementById('expensesFormCashIn');

    if (hub) hub.style.display = 'block';
    if (formOut) formOut.style.display = 'none';
    if (formIn) formIn.style.display = 'none';

    loadExpensesView();
    refreshIcons(document.getElementById('view-expenses'));
}
window.showExpensesCardsHub = showExpensesCardsHub;

async function showExpenseCashOutForm() {
    if (!state.activeSession) {
        alert('يجب فتح وردية أولاً لتسجيل سند صرف من الدرج');
        return;
    }

    const hub = document.getElementById('expensesCardsHub');
    const formOut = document.getElementById('expensesFormCashOut');
    const formIn = document.getElementById('expensesFormCashIn');

    if (hub) hub.style.display = 'none';
    if (formIn) formIn.style.display = 'none';
    if (formOut) formOut.style.display = 'block';

    // Clear previous inputs
    const amountInp = document.getElementById('expenseAmount');
    if (amountInp) amountInp.value = '';
    const descInp = document.getElementById('expenseDescription');
    if (descInp) descInp.value = '';
    const paidToInp = document.getElementById('expensePaidTo');
    if (paidToInp) paidToInp.value = '';
    const spSelect = document.getElementById('expenseSalesperson');
    if (spSelect) spSelect.value = '';

    await populateBranchEmployees();
    await populateExpenseCategories();
    handleExpenseCategoryChange();

    refreshIcons(formOut);
    setTimeout(() => {
        const cat = document.getElementById('expenseCategory');
        if (cat) cat.focus();
    }, 100);
}
window.showExpenseCashOutForm = showExpenseCashOutForm;
window.openAddExpenseModal = showExpenseCashOutForm;

async function showExpenseCashInForm() {
    if (!state.activeSession) {
        alert('يجب فتح وردية أولاً لتسجيل سند مصروف مرتد إلى الدرج');
        return;
    }

    const hub = document.getElementById('expensesCardsHub');
    const formOut = document.getElementById('expensesFormCashOut');
    const formIn = document.getElementById('expensesFormCashIn');

    if (hub) hub.style.display = 'none';
    if (formOut) formOut.style.display = 'none';
    if (formIn) formIn.style.display = 'block';

    // Clear previous inputs
    const amountInp = document.getElementById('refundedExpenseAmount');
    if (amountInp) amountInp.value = '';
    const descInp = document.getElementById('refundedExpenseDescription');
    if (descInp) descInp.value = '';
    const paidToInp = document.getElementById('refundedExpensePaidTo');
    if (paidToInp) paidToInp.value = '';
    const spSelect = document.getElementById('refundedExpenseSalesperson');
    if (spSelect) spSelect.value = '';

    await populateBranchEmployees();
    handleRefundedCategoryChange();

    refreshIcons(formIn);
    setTimeout(() => {
        const refCat = document.getElementById('refundedExpenseCategory');
        if (refCat) refCat.focus();
    }, 100);
}
window.showExpenseCashInForm = showExpenseCashInForm;
window.openAddRefundedExpenseModal = showExpenseCashInForm;

function bindExpenseEvents() {
    // 2-Cards Hub Click Triggers
    const cardOut = document.getElementById('cardActionCashOut');
    if (cardOut) cardOut.addEventListener('click', showExpenseCashOutForm);

    const cardIn = document.getElementById('cardActionCashIn');
    if (cardIn) cardIn.addEventListener('click', showExpenseCashInForm);

    // Category Change Watchers
    const catSelect = document.getElementById('expenseCategory');
    if (catSelect) catSelect.addEventListener('change', handleExpenseCategoryChange);

    const refCatSelect = document.getElementById('refundedExpenseCategory');
    if (refCatSelect) refCatSelect.addEventListener('change', handleRefundedCategoryChange);

    // Save Expense (Cash Out -)
    const btnSaveExp = document.getElementById('btnSaveExpense');
    if (btnSaveExp) {
        btnSaveExp.addEventListener('click', async () => {
            const amount = parseFloat(document.getElementById('expenseAmount').value);
            const category = document.getElementById('expenseCategory').value;
            const subcategory = document.getElementById('expenseSubcategory')?.value || null;
            const description = document.getElementById('expenseDescription').value.trim();
            const paidTo = document.getElementById('expensePaidTo')?.value?.trim() || '';
            const salespersonId = document.getElementById('expenseSalesperson')?.value || null;

            if (!category) {
                alert('يرجى اختيار بند وتصنيف المصروف');
                document.getElementById('expenseCategory')?.focus();
                return;
            }

            if (isNaN(amount) || amount <= 0) {
                alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
                document.getElementById('expenseAmount')?.focus();
                return;
            }

            const isStaffRelated = category.includes('سلف') || category.includes('سحب') || category.includes('بائع') || category.includes('موظف') || category.includes('عهدة');
            if (isStaffRelated && !salespersonId) {
                alert('يرجى تحديد الموظف المستلم للسلفة من طاقم عمل الفرع');
                document.getElementById('expenseSalesperson')?.focus();
                return;
            }

            if (!description) {
                alert('يرجى كتابة بيان سبب الصرف والملاحظات بالتفصيل');
                document.getElementById('expenseDescription')?.focus();
                return;
            }

            const spSelect = document.getElementById('expenseSalesperson');
            const spText = spSelect && spSelect.selectedIndex > 0 ? spSelect.options[spSelect.selectedIndex].text.replace(/^[👤\s]+/, '').trim() : '';
            const recipientName = paidTo || spText || null;

            const res = await window.api.addExpense({
                operational_type: 'expense',
                sessionId: state.activeSession?.id,
                amount,
                category,
                subcategory,
                salesperson_id: salespersonId ? Number(salespersonId) : null,
                recipient_name: recipientName,
                description
            }, state.currentUser?.id);

            if (!res.success) {
                alert(res.error || 'حدث خطأ أثناء حفظ سند المصروف');
                return;
            }

            alert(`✔ تم تسجيل سند صرف المصروف بنجاح (${res.data?.voucher_code || ''}) وخصمه فورياً من نقدية الدرج بالوردية.`);
            showExpensesCardsHub();
            await refreshSessionState();
        });
    }

    // Save Refunded Expense (Cash In +)
    const btnSaveRef = document.getElementById('btnSaveRefundedExpense');
    if (btnSaveRef) {
        btnSaveRef.addEventListener('click', async () => {
            const amount = parseFloat(document.getElementById('refundedExpenseAmount').value);
            const category = document.getElementById('refundedExpenseCategory').value;
            const description = document.getElementById('refundedExpenseDescription').value.trim();
            const paidTo = document.getElementById('refundedExpensePaidTo')?.value?.trim() || '';
            const salespersonId = document.getElementById('refundedExpenseSalesperson')?.value || null;

            if (!category) {
                alert('يرجى اختيار تصنيف المصروف المرتد');
                document.getElementById('refundedExpenseCategory')?.focus();
                return;
            }

            if (isNaN(amount) || amount <= 0) {
                alert('يرجى إدخال مبلغ مرتد صحيح أكبر من الصفر');
                document.getElementById('refundedExpenseAmount')?.focus();
                return;
            }

            const isStaffRelated = category.includes('سلفة') || category.includes('بائع') || category.includes('موظف');
            if (isStaffRelated && !salespersonId) {
                alert('يرجى تحديد الموظف المسدد للسلفة');
                document.getElementById('refundedExpenseSalesperson')?.focus();
                return;
            }

            if (!description) {
                alert('يرجى كتابة بيان سبب إرجاع المبلغ والملاحظات بالتفصيل');
                document.getElementById('refundedExpenseDescription')?.focus();
                return;
            }

            const spSelect = document.getElementById('refundedExpenseSalesperson');
            const spText = spSelect && spSelect.selectedIndex > 0 ? spSelect.options[spSelect.selectedIndex].text.replace(/^[👤\s]+/, '').trim() : '';
            const recipientName = paidTo || spText || null;

            const res = await window.api.addExpense({
                operational_type: 'returned_expense',
                sessionId: state.activeSession?.id,
                amount,
                category,
                salesperson_id: salespersonId ? Number(salespersonId) : null,
                recipient_name: recipientName,
                description
            }, state.currentUser?.id);

            if (!res.success) {
                alert(res.error || 'حدث خطأ أثناء حفظ سند المصروف المرتد');
                return;
            }

            alert(`✔ تم تسجيل سند المصروف المرتد بنجاح (${res.data?.voucher_code || ''}) وإيداعه فورياً في نقدية الدرج بالوردية.`);
            showExpensesCardsHub();
            await refreshSessionState();
        });
    }

    // Filters and Search
    const searchInp = document.getElementById('expSearchInput');
    if (searchInp) searchInp.addEventListener('input', debounceExpensesSearch);

    const typeFilter = document.getElementById('expTypeFilter');
    if (typeFilter) typeFilter.addEventListener('change', () => loadExpensesView());

    const catFilter = document.getElementById('expCategoryFilter');
    if (catFilter) catFilter.addEventListener('change', () => loadExpensesView());

    const dateFilter = document.getElementById('expDateFilter');
    if (dateFilter) dateFilter.addEventListener('change', () => loadExpensesView());

    const btnRefresh = document.getElementById('btnRefreshExpensesList');
    if (btnRefresh) btnRefresh.addEventListener('click', () => loadExpensesView());

    // Analytics Period Change
    const periodSelect = document.getElementById('expAnalyticsPeriod');
    if (periodSelect) periodSelect.addEventListener('change', () => loadExpensesAnalytics());

    // Initialize categories and branch employees
    populateExpenseCategories();
    populateBranchEmployees();
}

let expSearchTimer = null;
function debounceExpensesSearch() {
    clearTimeout(expSearchTimer);
    expSearchTimer = setTimeout(() => {
        loadExpensesView();
    }, 250);
}

async function loadExpensesView() {
    // 0. Ensure default visibility
    const hub = document.getElementById('expensesCardsHub');
    const formOut = document.getElementById('expensesFormCashOut');
    const formIn = document.getElementById('expensesFormCashIn');
    if (formOut?.style.display !== 'block' && formIn?.style.display !== 'block') {
        if (hub) hub.style.display = 'block';
    }

    // 1. Session Status Strip
    const sessionTitle = document.getElementById('expActiveSessionTitle');
    const sessionDot = document.getElementById('expSessionDot');
    const drawerBal = document.getElementById('expSessionDrawerBal');

    if (state.activeSession) {
        if (sessionTitle) {
            sessionTitle.innerHTML = `الوردية النشطة: #${state.activeSession.session_code || state.activeSession.id} <span style="font-weight: normal; color: #64748B;">(${state.activeSession.cashier_name || 'الكاشير'})</span>`;
        }
        if (sessionDot) sessionDot.style.background = '#10B981';
        if (drawerBal) {
            drawerBal.innerHTML = `رصيد فتح الدرج: <strong style="color: #0F172A;">${(state.activeSession.opening_cash || 0).toFixed(2)} ج.م</strong>`;
        }
    } else {
        if (sessionTitle) {
            sessionTitle.innerHTML = `<span style="color: #DC2626;">⚠ لا توجد وردية مفتوحة حالياً (يجب فتح وردية للعمل على الدرج)</span>`;
        }
        if (sessionDot) sessionDot.style.background = '#DC2626';
        if (drawerBal) {
            drawerBal.innerHTML = `<span style="color: #94A3B8;">الدرج مغلق</span>`;
        }
    }

    // 2. Fetch Live Shift Expenses Summary
    try {
        const kpiRes = await window.api.getExpensesSummary({
            sessionId: state.activeSession ? state.activeSession.id : null
        });

        if (kpiRes?.success && kpiRes.data) {
            const k = kpiRes.data;
            const elTotalOut = document.getElementById('expHubTotalOut');
            const elCountOut = document.getElementById('expHubCountOut');
            const elTotalRefunded = document.getElementById('expHubTotalRefunded');
            const elCountRefunded = document.getElementById('expHubCountRefunded');
            const elNetExpense = document.getElementById('expHubNetExpense');

            const totalOut = Number(k.total_out || 0);
            const totalRefunded = Number(k.total_refunded || 0);
            const netExpense = Number(k.net_expense !== undefined ? k.net_expense : (totalOut - totalRefunded));

            if (elTotalOut) elTotalOut.innerText = `-${totalOut.toFixed(2)} ج.م`;
            if (elCountOut) elCountOut.innerText = `${k.count_out || 0} سند صرف مسجل`;
            if (elTotalRefunded) elTotalRefunded.innerText = `+${totalRefunded.toFixed(2)} ج.م`;
            if (elCountRefunded) elCountRefunded.innerText = `${k.count_refunded || 0} سند إيداع مرتد`;
            if (elNetExpense) {
                elNetExpense.innerText = `${netExpense >= 0 ? '-' : '+'}${Math.abs(netExpense).toFixed(2)} ج.م`;
                elNetExpense.style.color = netExpense > 0 ? '#DC2626' : (netExpense < 0 ? '#059669' : '#0F172A');
            }
        }
    } catch (e) {
        console.error('Error fetching expenses summary:', e);
    }

    const viewPanel = document.getElementById('view-expenses');
    if (viewPanel && window.lucide) {
        window.lucide.createIcons({ root: viewPanel });
    }
}

async function loadExpensesAnalytics() {
    const period = document.getElementById('expAnalyticsPeriod')?.value || 30;
    try {
        const res = await window.api.getExpensesAnalytics(period);
        if (!res?.success || !res.data) return;

        const d = res.data;
        const elAvg = document.getElementById('analyticsDailyAvg');
        const elToday = document.getElementById('analyticsTodayOut');
        const elTotal = document.getElementById('analyticsTotalPeriod');
        const elAlert = document.getElementById('expHighSpendAlert');
        const elCatList = document.getElementById('analyticsCategoryList');

        if (elAvg) elAvg.innerText = `${(d.daily_average || 0).toFixed(2)} ج.م`;
        if (elToday) elToday.innerText = `${(d.today_out || 0).toFixed(2)} ج.م`;
        if (elTotal) elTotal.innerText = `${(d.total_period_spend || 0).toFixed(2)} ج.م`;

        if (elAlert) {
            elAlert.style.display = d.is_high_spend_today ? 'flex' : 'none';
        }

        if (elCatList) {
            elCatList.innerHTML = '';
            const cats = d.category_breakdown || [];
            if (cats.length === 0) {
                elCatList.innerHTML = `<div style="text-align: center; color: #94A3B8; padding: 20px;">لا توجد مصروفات مسجلة خلال الفترة المحددة</div>`;
            } else {
                cats.forEach(c => {
                    const row = document.createElement('div');
                    row.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 700; margin-bottom: 6px;">
                            <span>${c.category}</span>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-family: 'Courier New', monospace; color: #0F172A;">${c.amount.toFixed(2)} ج.م</span>
                                <span style="background: #F1F5F9; color: #475467; padding: 2px 8px; border-radius: 9999px; font-size: 11px;">${c.percentage}%</span>
                            </div>
                        </div>
                        <div style="background: #F1F5F9; height: 8px; border-radius: 9999px; overflow: hidden;">
                            <div style="width: ${c.percentage}%; height: 100%; background: linear-gradient(90deg, #EA580C, #F97316); border-radius: 9999px;"></div>
                        </div>
                    `;
                    elCatList.appendChild(row);
                });
            }
        }
    } catch (e) {
        console.error('Error loading expenses analytics:', e);
    }
}

/* -------------------------------------------------------------
 * 6. PURCHASES & SUPPLIERS DUAL-VIEW ARCHITECTURE
 * ------------------------------------------------------------- */
let activeSuppliersView = 'master'; // 'master' | 'ledger'
let activeLedgerSupplierId = null;
let activeLedgerData = null;
let allSuppliersCache = [];
let availableTreasuryBalance = 0;

function bindPurchasesEvents() {
    // Master view buttons
    const btnNewSup = document.getElementById('btnOpenNewSupplierModal');
    if (btnNewSup) btnNewSup.addEventListener('click', openNewSupplierModal);

    const btnRefresh = document.getElementById('btnRefreshSuppliersMaster');
    if (btnRefresh) btnRefresh.addEventListener('click', loadSuppliersMasterView);

    const searchInput = document.getElementById('supplierSearchInput');
    if (searchInput) searchInput.addEventListener('input', applySuppliersFilter);

    const balFilter = document.getElementById('supplierBalanceFilter');
    if (balFilter) balFilter.addEventListener('change', applySuppliersFilter);

    const statFilter = document.getElementById('supplierStatusFilter');
    if (statFilter) statFilter.addEventListener('change', applySuppliersFilter);

    // Strict 5-field supplier modal submit
    const btnSaveSup = document.getElementById('btnSaveSupplier');
    if (btnSaveSup) btnSaveSup.addEventListener('click', saveSupplierModal);

    // Ledger View Back Button
    const btnBack = document.getElementById('btnBackToSuppliersMaster');
    if (btnBack) btnBack.addEventListener('click', backToSuppliersMasterView);

    // Ledger Filter Buttons
    const btnLedgerApply = document.getElementById('btnFilterLedgerApply');
    if (btnLedgerApply) btnLedgerApply.addEventListener('click', loadSupplierLedgerData);

    const btnLedgerReset = document.getElementById('btnFilterLedgerReset');
    if (btnLedgerReset) {
        btnLedgerReset.addEventListener('click', () => {
            const typeF = document.getElementById('ledgerTypeFilter');
            const startF = document.getElementById('ledgerStartDate');
            const endF = document.getElementById('ledgerEndDate');
            const queryF = document.getElementById('ledgerSearchInput');
            if (typeF) typeF.value = 'all';
            if (startF) startF.value = '';
            if (endF) endF.value = '';
            if (queryF) queryF.value = '';
            loadSupplierLedgerData();
        });
    }

    const typeFilter = document.getElementById('ledgerTypeFilter');
    if (typeFilter) typeFilter.addEventListener('change', loadSupplierLedgerData);

    // Ledger Banner Actions
    const btnLedgerPay = document.getElementById('btnLedgerOpenSplitPay');
    if (btnLedgerPay) {
        btnLedgerPay.addEventListener('click', () => {
            if (activeLedgerSupplierId) openSplitPaymentModal(activeLedgerSupplierId);
        });
    }

    const btnLedgerExcel = document.getElementById('btnLedgerExportExcel');
    if (btnLedgerExcel) btnLedgerExcel.addEventListener('click', exportLedgerToExcel);

    const btnLedgerPrint = document.getElementById('btnLedgerPrintA4');
    if (btnLedgerPrint) btnLedgerPrint.addEventListener('click', previewPrintableA4Statement);

    const btnTriggerPrint = document.getElementById('btnTriggerPrintNow');
    if (btnTriggerPrint) btnTriggerPrint.addEventListener('click', () => window.print());

    // Split Payment interactive listeners
    const splitTotal = document.getElementById('splitPayTotalAmount');
    const splitCash = document.getElementById('splitPayCash');
    const splitBank = document.getElementById('splitPayBank');
    const splitWallet = document.getElementById('splitPayWallet');

    if (splitTotal) splitTotal.addEventListener('input', recalculateSplitBreakdown);
    if (splitCash) splitCash.addEventListener('input', recalculateSplitBreakdown);
    if (splitBank) splitBank.addEventListener('input', recalculateSplitBreakdown);
    if (splitWallet) splitWallet.addEventListener('input', recalculateSplitBreakdown);

    const btnSubmitSplit = document.getElementById('btnSubmitSplitPayment');
    if (btnSubmitSplit) btnSubmitSplit.addEventListener('click', submitSplitPaymentModal);
}

async function loadPurchasesView() {
    if (activeSuppliersView === 'ledger' && activeLedgerSupplierId) {
        await loadSupplierLedgerData();
    } else {
        await loadSuppliersMasterView();
    }
}
window.loadPurchasesView = loadPurchasesView;

async function loadPurchaseInvoicesList() {
    try {
        const invRes = await window.api.listPurchaseInvoices(50);
        const invTbody = document.getElementById('purchaseInvoicesTableBody');
        if (invTbody && invRes.success) {
            invTbody.innerHTML = '';
            if (!invRes.data || invRes.data.length === 0) {
                invTbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
                            <i data-lucide="receipt" class="icon-lg" style="margin-bottom: 8px; display: block; opacity: 0.5;"></i>
                            لا توجد فواتير شراء مسجلة حتى الآن
                        </td>
                    </tr>
                `;
                refreshIcons(invTbody);
                return;
            }
            invRes.data?.forEach(i => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight: bold; font-family: monospace;">${i.invoice_number}</td>
                    <td>${i.supplier_name}</td>
                    <td style="font-weight: bold;">${i.total_amount.toFixed(2)} ج.م</td>
                    <td>${i.paid_amount.toFixed(2)} ج.م</td>
                    <td style="color: var(--accent-rose); font-weight: bold;">${i.remaining_amount.toFixed(2)} ج.م</td>
                    <td><span class="badge ${i.payment_status === 'paid' ? 'badge-ok' : 'badge-low-stock'}">${i.payment_status === 'paid' ? 'مسددة' : 'آجلة'}</span></td>
                    <td>${i.created_at}</td>
                `;
                invTbody.appendChild(tr);
            });
            refreshIcons(invTbody);
        }
    } catch (e) {
        console.error('[Purchases] Invoices load error:', e.message);
    }
}
window.loadPurchaseInvoicesList = loadPurchaseInvoicesList;

async function loadSuppliersMasterView() {
    try {
        // 1. Fetch Executive KPIs
        const overviewRes = await window.api.getSuppliersOverview();
        if (overviewRes.success && overviewRes.data) {
            const o = overviewRes.data;
            const elTotal = document.getElementById('kpiTotalSuppliers');
            const elPay = document.getElementById('kpiTotalPayables');
            const elDue = document.getElementById('kpiDueSuppliersCount');
            const elSet = document.getElementById('kpiSettledCount');

            if (elTotal) elTotal.innerText = o.totalSuppliers;
            if (elPay) elPay.innerText = `${o.totalPayables.toFixed(2)} ج.م`;
            if (elDue) elDue.innerText = o.dueSuppliersCount;
            if (elSet) elSet.innerText = o.settledAccountsCount;
        }

        // 2. Fetch Suppliers List
        const supRes = await window.api.listSuppliers();
        allSuppliersCache = supRes.success ? (supRes.data || []) : [];
        applySuppliersFilter();
    } catch (err) {
        console.error('[Suppliers] Master load error:', err.message);
    }
}

function applySuppliersFilter() {
    const searchInput = document.getElementById('supplierSearchInput');
    const balFilter = document.getElementById('supplierBalanceFilter');
    const statFilter = document.getElementById('supplierStatusFilter');
    const countDisplay = document.getElementById('suppliersCountDisplay');
    const tbody = document.getElementById('suppliersTableBody');
    if (!tbody) return;

    const query = (searchInput?.value || '').trim().toLowerCase();
    const balanceCriteria = balFilter?.value || 'all';
    const statusCriteria = statFilter?.value || 'all';

    const filtered = allSuppliersCache.filter(s => {
        // Text Search
        if (query) {
            const codeMatch = (s.supplier_code || '').toLowerCase().includes(query);
            const nameMatch = (s.name || '').toLowerCase().includes(query);
            const phoneMatch = (s.phone || '').toLowerCase().includes(query);
            if (!codeMatch && !nameMatch && !phoneMatch) return false;
        }

        // Balance Criteria
        const bal = Number(s.balance) || 0;
        if (balanceCriteria === 'due' && bal <= 0.001) return false;
        if (balanceCriteria === 'settled' && Math.abs(bal) > 0.001) return false;
        if (balanceCriteria === 'credit' && bal >= -0.001) return false;

        // Status Criteria
        const st = s.status || 'active';
        if (statusCriteria !== 'all' && st !== statusCriteria) return false;

        return true;
    });

    if (countDisplay) {
        countDisplay.innerText = `عرض ${filtered.length} من ${allSuppliersCache.length} مورد`;
    }

    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">
                    <i data-lucide="inbox" class="icon-lg" style="margin-bottom: 8px; display: block; opacity: 0.5;"></i>
                    لا توجد حسابات موردين مطابقة لمعايير البحث الحالية
                </td>
            </tr>
        `;
        refreshIcons(tbody);
        return;
    }

    filtered.forEach(s => {
        const bal = Number(s.balance) || 0;
        let balanceBadgeHtml = '';
        if (bal > 0.001) {
            balanceBadgeHtml = `<span class="badge-balance badge-balance-due"><i data-lucide="arrow-up-right" class="icon-xs"></i> ${bal.toFixed(2)} ج.م</span>`;
        } else if (bal < -0.001) {
            balanceBadgeHtml = `<span class="badge-balance badge-balance-credit"><i data-lucide="arrow-down-left" class="icon-xs"></i> ${Math.abs(bal).toFixed(2)} ج.م (لنا)</span>`;
        } else {
            balanceBadgeHtml = `<span class="badge-balance badge-balance-settled"><i data-lucide="check" class="icon-xs"></i> 0.00 ج.م</span>`;
        }

        const statusLabel = s.status === 'inactive' ? 'غير نشط' : s.status === 'blacklisted' ? 'محظور' : 'نشط';
        const statusClass = s.status === 'inactive' ? 'inactive' : s.status === 'blacklisted' ? 'blacklisted' : 'active';
        const codeDisplay = s.supplier_code || `SUP-${String(s.id).padStart(4, '0')}`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span class="mono-code-badge">${codeDisplay}</span>
            </td>
            <td>
                <div style="font-weight: 800; font-size: 14px; color: var(--text-primary);">${s.name}</div>
                ${s.address ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;"><i data-lucide="map-pin" class="icon-xs"></i> ${s.address}</div>` : ''}
            </td>
            <td>
                <div style="font-weight: 600; font-size: 13px;">${s.contact_person || '-'}</div>
                <div style="font-size: 12px; color: var(--text-secondary); direction: ltr; text-align: right;">${s.phone || '-'}</div>
            </td>
            <td style="text-align: left;">
                ${balanceBadgeHtml}
            </td>
            <td style="text-align: center;">
                <span class="status-capsule ${statusClass}">${statusLabel}</span>
            </td>
            <td style="text-align: center;">
                <div style="display: inline-flex; gap: 6px; align-items: center;">
                    <button class="btn-action-ledger" onclick="openSupplierLedgerView(${s.id})" title="عرض كشف الحساب التفصيلي">
                        <i data-lucide="file-text" class="icon-xs"></i>
                        <span>كشف الحساب</span>
                    </button>
                    <button class="btn-action-pay" onclick="openSplitPaymentModal(${s.id})" title="سداد دفعة بنظام الدفع المقسم">
                        <i data-lucide="banknote" class="icon-xs"></i>
                        <span>سداد</span>
                    </button>
                    <button class="btn-action-edit" onclick="openEditSupplierModal(${s.id})" title="تعديل بيانات المورد">
                        <i data-lucide="edit-3" class="icon-xs"></i>
                        <span>تعديل</span>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    refreshIcons(tbody);
}

/* Strict 5-Field Standard Modal Methods */
function openNewSupplierModal() {
    const modal = document.getElementById('modalSupplier');
    const title = document.getElementById('supplierModalTitle');
    const idInput = document.getElementById('supplierModalId');
    const nameInput = document.getElementById('supplierModalName');
    const contactInput = document.getElementById('supplierModalContact');
    const phoneInput = document.getElementById('supplierModalPhone');
    const addrInput = document.getElementById('supplierModalAddress');
    const openBalGroup = document.getElementById('groupSupplierOpeningBalance');
    const openBalInput = document.getElementById('supplierModalOpeningBalance');
    const statusGroup = document.getElementById('groupSupplierStatus');

    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    if (contactInput) contactInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (addrInput) addrInput.value = '';
    if (openBalInput) openBalInput.value = '0.00';
    if (openBalGroup) openBalGroup.style.display = 'block';
    if (statusGroup) statusGroup.style.display = 'none';
    if (title) title.innerText = 'إضافة مورد جديد';

    if (modal) modal.classList.add('active');
    if (nameInput) setTimeout(() => nameInput.focus(), 100);
}
window.openNewSupplierModal = openNewSupplierModal;

function openEditSupplierModal(id) {
    const supplier = allSuppliersCache.find(s => s.id === Number(id));
    if (!supplier) return;

    const modal = document.getElementById('modalSupplier');
    const title = document.getElementById('supplierModalTitle');
    const idInput = document.getElementById('supplierModalId');
    const nameInput = document.getElementById('supplierModalName');
    const contactInput = document.getElementById('supplierModalContact');
    const phoneInput = document.getElementById('supplierModalPhone');
    const addrInput = document.getElementById('supplierModalAddress');
    const openBalGroup = document.getElementById('groupSupplierOpeningBalance');
    const statusGroup = document.getElementById('groupSupplierStatus');
    const statusSelect = document.getElementById('supplierModalStatus');

    if (idInput) idInput.value = supplier.id;
    if (nameInput) nameInput.value = supplier.name || '';
    if (contactInput) contactInput.value = supplier.contact_person || '';
    if (phoneInput) phoneInput.value = supplier.phone || '';
    if (addrInput) addrInput.value = supplier.address || '';
    if (openBalGroup) openBalGroup.style.display = 'none'; // Lock opening balance on edit
    if (statusGroup) statusGroup.style.display = 'block';
    if (statusSelect) statusSelect.value = supplier.status || 'active';
    if (title) title.innerText = `تعديل بيانات المورد (${supplier.name})`;

    if (modal) modal.classList.add('active');
    if (nameInput) setTimeout(() => nameInput.focus(), 100);
}
window.openEditSupplierModal = openEditSupplierModal;

async function saveSupplierModal() {
    const idInput = document.getElementById('supplierModalId');
    const nameInput = document.getElementById('supplierModalName');
    const contactInput = document.getElementById('supplierModalContact');
    const phoneInput = document.getElementById('supplierModalPhone');
    const addrInput = document.getElementById('supplierModalAddress');
    const openBalInput = document.getElementById('supplierModalOpeningBalance');
    const statusSelect = document.getElementById('supplierModalStatus');

    const name = (nameInput?.value || '').trim();
    if (!name) {
        alert('يرجى كتابة اسم المورد / الشركة');
        if (nameInput) nameInput.focus();
        return;
    }

    const payload = {
        supplier_name: name,
        contact_person: (contactInput?.value || '').trim(),
        phone: (phoneInput?.value || '').trim(),
        address: (addrInput?.value || '').trim(),
        opening_balance: Number(openBalInput?.value) || 0,
        status: statusSelect?.value || 'active'
    };

    const isEdit = Boolean(idInput?.value);
    const supplierId = Number(idInput?.value);

    try {
        let res;
        if (isEdit) {
            res = await window.api.updateSupplier(supplierId, payload, state.currentUser?.id);
        } else {
            res = await window.api.createSupplier(payload, state.currentUser?.id);
        }

        if (res.success) {
            const modal = document.getElementById('modalSupplier');
            if (modal) modal.classList.remove('active');
            await loadSuppliersMasterView();
        } else {
            alert(res.error || 'فشل في حفظ بيانات المورد');
        }
    } catch (err) {
        alert('حدث خطأ أثناء حفظ المورد: ' + err.message);
    }
}

/* Dedicated Full-Page Ledger View (الواجهة A) */
async function openSupplierLedgerView(supplierId) {
    activeSuppliersView = 'ledger';
    activeLedgerSupplierId = Number(supplierId);

    const masterSection = document.getElementById('suppliersMasterView');
    const ledgerSection = document.getElementById('supplierLedgerView');

    if (masterSection) masterSection.style.display = 'none';
    if (ledgerSection) ledgerSection.style.display = 'flex';

    await loadSupplierLedgerData();
}
window.openSupplierLedgerView = openSupplierLedgerView;

function backToSuppliersMasterView() {
    activeSuppliersView = 'master';
    activeLedgerSupplierId = null;
    activeLedgerData = null;

    const masterSection = document.getElementById('suppliersMasterView');
    const ledgerSection = document.getElementById('supplierLedgerView');

    if (ledgerSection) ledgerSection.style.display = 'none';
    if (masterSection) masterSection.style.display = 'flex';

    loadSuppliersMasterView();
}
window.backToSuppliersMasterView = backToSuppliersMasterView;

async function loadSupplierLedgerData() {
    if (!activeLedgerSupplierId) return;

    const typeFilter = document.getElementById('ledgerTypeFilter')?.value || 'all';
    const startDate = document.getElementById('ledgerStartDate')?.value || '';
    const endDate = document.getElementById('ledgerEndDate')?.value || '';
    const query = (document.getElementById('ledgerSearchInput')?.value || '').trim();

    try {
        const res = await window.api.getSupplierLedger(activeLedgerSupplierId, {
            type: typeFilter,
            startDate: startDate || null,
            endDate: endDate || null,
            query: query || null
        });

        if (!res.success || !res.data) {
            alert(res.error || 'فشل تحميل كشف حساب المورد');
            return;
        }

        activeLedgerData = res.data;
        const { supplier, movements, summary } = activeLedgerData;

        // 1. Update Header Banner
        const nameEl = document.getElementById('ledgerSupplierName');
        const codeEl = document.getElementById('ledgerSupplierCode');
        const statEl = document.getElementById('ledgerSupplierStatus');
        const contactEl = document.getElementById('ledgerSupplierContact');
        const phoneEl = document.getElementById('ledgerSupplierPhone');
        const addrEl = document.getElementById('ledgerSupplierAddress');

        if (nameEl) nameEl.innerText = supplier.name;
        if (codeEl) codeEl.innerText = supplier.supplier_code || `SUP-${String(supplier.id).padStart(4, '0')}`;
        if (statEl) {
            statEl.innerText = supplier.status === 'inactive' ? 'غير نشط' : supplier.status === 'blacklisted' ? 'محظور' : 'نشط';
            statEl.className = `status-capsule ${supplier.status || 'active'}`;
        }
        if (contactEl) contactEl.innerText = supplier.contact_person || 'غير محدد';
        if (phoneEl) phoneEl.innerText = supplier.phone || 'غير مسجل';
        if (addrEl) addrEl.innerText = supplier.address || 'غير محدد';

        // 2. Update 4 Financial KPI Cards
        const opVal = document.getElementById('ledgerOpeningBalanceVal');
        const invVal = document.getElementById('ledgerTotalInvoicesVal');
        const payVal = document.getElementById('ledgerTotalPaymentsVal');
        const curVal = document.getElementById('ledgerCurrentBalanceVal');
        const badgeEl = document.getElementById('ledgerBalanceBadge');

        if (opVal) opVal.innerText = `${summary.openingBalance.toFixed(2)} ج.م`;
        if (invVal) invVal.innerText = `${summary.totalInvoices.toFixed(2)} ج.م`;
        if (payVal) payVal.innerText = `${summary.totalPayments.toFixed(2)} ج.م`;

        if (curVal) {
            curVal.innerText = `${summary.currentBalance.toFixed(2)} ج.م`;
            if (summary.currentBalance > 0.001) {
                curVal.style.color = '#b91c1c';
                if (badgeEl) badgeEl.innerText = 'مديونية مستحقة للمورد';
            } else if (summary.currentBalance < -0.001) {
                curVal.style.color = '#1d4ed8';
                if (badgeEl) badgeEl.innerText = 'رصيد دائن لصالح المتجر';
            } else {
                curVal.style.color = '#15803d';
                if (badgeEl) badgeEl.innerText = 'الحساب مسوى بالكامل 0.00';
            }
        }

        // 3. Render Chronological Ledger Table
        const tbody = document.getElementById('supplierLedgerTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (movements.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">
                        <i data-lucide="history" class="icon-lg" style="margin-bottom: 8px; display: block; opacity: 0.5;"></i>
                        لا توجد حركات مسجلة مطابقة لفلاتر كشف الحساب
                    </td>
                </tr>
            `;
            refreshIcons(tbody);
            return;
        }

        movements.forEach(m => {
            const tr = document.createElement('tr');
            const debitHtml = m.debit > 0 ? `<span style="color: #b91c1c; font-weight: 800;">+${m.debit.toFixed(2)} ج.م</span>` : '-';
            const creditHtml = m.credit > 0 ? `<span style="color: #15803d; font-weight: 800;">-${m.credit.toFixed(2)} ج.م</span>` : '-';
            const balColor = m.balanceAfter > 0.001 ? '#b91c1c' : m.balanceAfter < -0.001 ? '#1d4ed8' : '#15803d';

            tr.innerHTML = `
                <td style="font-size: 12px; color: var(--text-secondary);">${m.date}</td>
                <td><span class="mono-code-badge">${m.referenceNumber}</span></td>
                <td>
                    <div style="font-weight: 700; font-size: 13px;">${m.description}</div>
                </td>
                <td style="text-align: left;">${debitHtml}</td>
                <td style="text-align: left;">${creditHtml}</td>
                <td style="text-align: left; font-weight: 800; color: ${balColor};">
                    ${m.balanceAfter.toFixed(2)} ج.م
                </td>
            `;
            tbody.appendChild(tr);
        });

        // 4. Update Summary Footer
        const footDebit = document.getElementById('ledgerFootTotalDebit');
        const footCredit = document.getElementById('ledgerFootTotalCredit');
        const footBal = document.getElementById('ledgerFootClosingBalance');

        if (footDebit) footDebit.innerText = `${summary.totalInvoices.toFixed(2)} ج.م`;
        if (footCredit) footCredit.innerText = `${summary.totalPayments.toFixed(2)} ج.م`;
        if (footBal) {
            footBal.innerText = `${summary.currentBalance.toFixed(2)} ج.م`;
            footBal.style.color = summary.currentBalance > 0.001 ? '#b91c1c' : summary.currentBalance < -0.001 ? '#1d4ed8' : '#15803d';
        }

        refreshIcons(document.getElementById('supplierLedgerView'));
    } catch (err) {
        console.error('[Ledger] Load error:', err.message);
    }
}

/* Split Payment Engine with Strict Solvency Check & Smart Usability */
let currentSplitSupplier = null;

async function openSplitPaymentModal(supplierId) {
    const supplier = allSuppliersCache.find(s => s.id === Number(supplierId)) || activeLedgerData?.supplier;
    if (!supplier) return;
    currentSplitSupplier = supplier;

    const modal = document.getElementById('modalSupplierSplitPayment');
    const idInput = document.getElementById('splitPaySupplierId');
    const nameEl = document.getElementById('splitPaySupplierName');
    const codeBadge = document.getElementById('splitPaySupplierCodeBadge');
    const balEl = document.getElementById('splitPayCurrentBalance');
    const totalInput = document.getElementById('splitPayTotalAmount');
    const cashInput = document.getElementById('splitPayCash');
    const bankInput = document.getElementById('splitPayBank');
    const walletInput = document.getElementById('splitPayWallet');
    const notesInput = document.getElementById('splitPayNotes');
    const availEl = document.getElementById('splitPayTreasuryAvailable');
    const alertEl = document.getElementById('splitSolvencyAlert');

    if (idInput) idInput.value = supplier.id;
    if (codeBadge) codeBadge.innerText = supplier.supplier_code || `SUP-${String(supplier.id).padStart(4, '0')}`;
    if (nameEl) nameEl.innerText = supplier.name;
    const supBalance = Math.max(0, Number(supplier.balance || 0));
    if (balEl) balEl.innerText = `${supBalance.toFixed(2)} ج.م`;

    // Fetch live Central Treasury balance
    try {
        const treRes = await window.api.getTreasuryBalance();
        availableTreasuryBalance = treRes.success ? (Number(treRes.data?.balance) || 0) : 0;
        if (availEl) availEl.innerText = `${availableTreasuryBalance.toFixed(2)} ج.م`;
    } catch (e) {
        availableTreasuryBalance = 0;
    }

    // Smart default: If supplier has balance, set total to balance
    // Intelligently allocate: up to availableTreasuryBalance in cash, remainder in bank
    const defaultAmount = supBalance > 0 ? supBalance : 0;
    if (totalInput) totalInput.value = defaultAmount > 0 ? defaultAmount.toFixed(2) : '0.00';
    
    if (defaultAmount > 0) {
        const defaultCash = Math.min(defaultAmount, availableTreasuryBalance);
        const defaultBank = Math.max(0, Math.round((defaultAmount - defaultCash) * 100) / 100);
        if (cashInput) cashInput.value = defaultCash.toFixed(2);
        if (bankInput) bankInput.value = defaultBank.toFixed(2);
        if (walletInput) walletInput.value = '0.00';
    } else {
        if (cashInput) cashInput.value = '0.00';
        if (bankInput) bankInput.value = '0.00';
        if (walletInput) walletInput.value = '0.00';
    }

    if (notesInput) notesInput.value = '';
    if (alertEl) alertEl.style.display = 'none';

    recalculateSplitBreakdown();
    if (modal) {
        modal.classList.add('active');
        refreshIcons(modal);
    }
    if (totalInput) setTimeout(() => totalInput.focus(), 100);
}
window.openSplitPaymentModal = openSplitPaymentModal;

function setSplitPayPreset(type) {
    if (!currentSplitSupplier) return;
    const debt = Math.max(0, Number(currentSplitSupplier.balance || 0));
    const totalInput = document.getElementById('splitPayTotalAmount');
    const cashInput = document.getElementById('splitPayCash');
    const bankInput = document.getElementById('splitPayBank');
    const walletInput = document.getElementById('splitPayWallet');

    let newTotal = 0;
    if (type === 'full') {
        newTotal = debt;
    } else if (type === 'half') {
        newTotal = Math.round((debt * 0.5) * 100) / 100;
    } else if (type === 'treasury') {
        newTotal = Math.min(debt, availableTreasuryBalance);
    } else if (type === 'zero') {
        newTotal = 0;
    }

    if (totalInput) totalInput.value = newTotal > 0 ? newTotal.toFixed(2) : '0.00';

    if (newTotal > 0) {
        const cVal = Math.min(newTotal, availableTreasuryBalance);
        const bVal = Math.max(0, Math.round((newTotal - cVal) * 100) / 100);
        if (cashInput) cashInput.value = cVal.toFixed(2);
        if (bankInput) bankInput.value = bVal.toFixed(2);
        if (walletInput) walletInput.value = '0.00';
    } else {
        if (cashInput) cashInput.value = '0.00';
        if (bankInput) bankInput.value = '0.00';
        if (walletInput) walletInput.value = '0.00';
    }

    recalculateSplitBreakdown();
}
window.setSplitPayPreset = setSplitPayPreset;

function allocateAllToMethod(method) {
    const totalInput = document.getElementById('splitPayTotalAmount');
    const cashInput = document.getElementById('splitPayCash');
    const bankInput = document.getElementById('splitPayBank');
    const walletInput = document.getElementById('splitPayWallet');

    const total = Math.max(0, Number(totalInput?.value) || 0);
    if (cashInput) cashInput.value = method === 'cash' ? total.toFixed(2) : '0.00';
    if (bankInput) bankInput.value = method === 'bank' ? total.toFixed(2) : '0.00';
    if (walletInput) walletInput.value = method === 'wallet' ? total.toFixed(2) : '0.00';

    recalculateSplitBreakdown();
}
window.allocateAllToMethod = allocateAllToMethod;

function allocateRemainingToMethod(method) {
    const totalInput = document.getElementById('splitPayTotalAmount');
    const cashInput = document.getElementById('splitPayCash');
    const bankInput = document.getElementById('splitPayBank');
    const walletInput = document.getElementById('splitPayWallet');

    const total = Math.max(0, Number(totalInput?.value) || 0);
    const cash = method === 'cash' ? 0 : (Number(cashInput?.value) || 0);
    const bank = method === 'bank' ? 0 : (Number(bankInput?.value) || 0);
    const wallet = method === 'wallet' ? 0 : (Number(walletInput?.value) || 0);

    const rem = Math.max(0, Math.round((total - cash - bank - wallet) * 100) / 100);

    if (method === 'cash' && cashInput) cashInput.value = rem.toFixed(2);
    if (method === 'bank' && bankInput) bankInput.value = rem.toFixed(2);
    if (method === 'wallet' && walletInput) walletInput.value = rem.toFixed(2);

    recalculateSplitBreakdown();
}
window.allocateRemainingToMethod = allocateRemainingToMethod;

function autoFixTreasurySolvency() {
    const totalInput = document.getElementById('splitPayTotalAmount');
    const cashInput = document.getElementById('splitPayCash');
    const bankInput = document.getElementById('splitPayBank');

    const total = Math.max(0, Number(totalInput?.value) || 0);
    const allowedCash = Math.min(total, Math.max(0, availableTreasuryBalance));
    const remainder = Math.max(0, Math.round((total - allowedCash) * 100) / 100);

    if (cashInput) cashInput.value = allowedCash.toFixed(2);
    if (bankInput) {
        bankInput.value = remainder.toFixed(2);
    }

    recalculateSplitBreakdown();
}
window.autoFixTreasurySolvency = autoFixTreasurySolvency;

function recalculateSplitBreakdown() {
    const totalInput = document.getElementById('splitPayTotalAmount');
    const cashInput = document.getElementById('splitPayCash');
    const bankInput = document.getElementById('splitPayBank');
    const walletInput = document.getElementById('splitPayWallet');
    const sumDisplay = document.getElementById('splitSumDisplay');
    const remDisplay = document.getElementById('splitRemainingDisplay');
    const statusMsg = document.getElementById('splitStatusMessage');
    const alertEl = document.getElementById('splitSolvencyAlert');
    const alertText = document.getElementById('splitSolvencyAlertText');
    const submitBtn = document.getElementById('btnSubmitSplitPayment');
    const postBalanceEl = document.getElementById('splitPayPostBalance');
    const postBadgeEl = document.getElementById('splitPayPostBalanceBadge');

    const total = Math.round((Number(totalInput?.value) || 0) * 100) / 100;
    const cash = Math.round((Number(cashInput?.value) || 0) * 100) / 100;
    const bank = Math.round((Number(bankInput?.value) || 0) * 100) / 100;
    const wallet = Math.round((Number(walletInput?.value) || 0) * 100) / 100;

    const currentDebt = currentSplitSupplier ? Math.max(0, Number(currentSplitSupplier.balance || 0)) : 0;
    const postBalance = Math.max(0, Math.round((currentDebt - total) * 100) / 100);

    if (postBalanceEl) postBalanceEl.innerText = `${postBalance.toFixed(2)} ج.م`;
    if (postBadgeEl) {
        if (postBalance === 0 && total > 0) {
            postBadgeEl.innerText = 'خالص بالكامل (0.00)';
            postBadgeEl.style.color = '#15803d';
            postBadgeEl.style.fontWeight = '800';
        } else {
            postBadgeEl.innerText = 'سداد جزئي';
            postBadgeEl.style.color = '#1d4ed8';
            postBadgeEl.style.fontWeight = 'normal';
        }
    }

    const sum = Math.round((cash + bank + wallet) * 100) / 100;
    const remaining = Math.round((total - sum) * 100) / 100;

    if (sumDisplay) sumDisplay.innerText = `${sum.toFixed(2)} ج.م`;
    if (remDisplay) {
        if (Math.abs(remaining) < 0.01) {
            remDisplay.innerHTML = `<span style="color: #15803d;">0.00 ج.م (مطابق تماماً)</span>`;
        } else if (remaining > 0) {
            remDisplay.innerHTML = `<span style="color: #c2410c;">متبقي ${remaining.toFixed(2)} ج.م</span>`;
        } else {
            remDisplay.innerHTML = `<span style="color: #b91c1c;">زيادة ${Math.abs(remaining).toFixed(2)} ج.م</span>`;
        }
    }

    let hasSolvencyError = false;
    // Strict Treasury Solvency Check on Cash portion
    if (cash > availableTreasuryBalance) {
        hasSolvencyError = true;
        if (alertEl) alertEl.style.display = 'block';
        if (alertText) {
            const deficit = Math.round((cash - availableTreasuryBalance) * 100) / 100;
            alertText.innerText = `رصيد الكاش بالخزينة لا يكفي (${availableTreasuryBalance.toFixed(2)} ج.م). يوجد عجز بمقدار (${deficit.toFixed(2)} ج.م). اضغط على "معالجة تلقائية ذكية" لضبط الكاش وتحويل الفارق إلى إنستاباي فوراً.`;
        }
    } else {
        if (alertEl) alertEl.style.display = 'none';
    }

    const isMatch = Math.abs(remaining) < 0.01 && total > 0;
    if (statusMsg) {
        if (isMatch && !hasSolvencyError) {
            statusMsg.innerHTML = '<span style="color: #15803d; display: flex; align-items: center; gap: 4px;">✓ المبالغ متطابقة بنجاح وجاهزة للاعتماد الفوري</span>';
        } else if (hasSolvencyError) {
            statusMsg.innerHTML = '<span style="color: #b91c1c; display: flex; align-items: center; gap: 4px;">⚠ يوجد عجز في رصيد الخزينة المركزية للكاش المطلوب</span>';
        } else {
            statusMsg.innerHTML = `<span style="color: #c2410c; display: flex; align-items: center; gap: 4px;">⚠ فرق توزيع: ${remaining > 0 ? `متبقي ${remaining.toFixed(2)} ج.م غير موزعة` : `المبالغ تتجاوز الإجمالي بـ ${Math.abs(remaining).toFixed(2)} ج.م`}</span>`;
        }
    }

    if (submitBtn) {
        submitBtn.disabled = !isMatch || hasSolvencyError;
        submitBtn.style.opacity = (!isMatch || hasSolvencyError) ? '0.5' : '1';
        submitBtn.style.cursor = (!isMatch || hasSolvencyError) ? 'not-allowed' : 'pointer';
    }
}

async function submitSplitPaymentModal() {
    const idInput = document.getElementById('splitPaySupplierId');
    const totalInput = document.getElementById('splitPayTotalAmount');
    const cashInput = document.getElementById('splitPayCash');
    const bankInput = document.getElementById('splitPayBank');
    const walletInput = document.getElementById('splitPayWallet');
    const notesInput = document.getElementById('splitPayNotes');

    const supplierId = Number(idInput?.value);
    const totalAmount = Math.round((Number(totalInput?.value) || 0) * 100) / 100;
    const cash = Math.round((Number(cashInput?.value) || 0) * 100) / 100;
    const bank = Math.round((Number(bankInput?.value) || 0) * 100) / 100;
    const wallet = Math.round((Number(walletInput?.value) || 0) * 100) / 100;

    if (!supplierId || totalAmount <= 0) {
        showCustomAlert('يرجى تحديد مبلغ سداد صحيح أكبر من الصفر', 'تنبيه', 'warning');
        return;
    }

    const sum = Math.round((cash + bank + wallet) * 100) / 100;
    if (Math.abs(sum - totalAmount) > 0.01) {
        showCustomAlert(`مجموع وسائل السداد (${sum.toFixed(2)} ج.م) لا يتطابق مع الإجمالي المطلوب (${totalAmount.toFixed(2)} ج.م)`, 'تنبيه', 'warning');
        return;
    }

    if (cash > availableTreasuryBalance) {
        showCustomAlert(`رصيد الكاش بالخزينة المركزية غير كافٍ. المتاح حالياً: ${availableTreasuryBalance.toFixed(2)} ج.م والمطلوب كاش: ${cash.toFixed(2)} ج.م. يمكنك استخدام زر "معالجة تلقائية ذكية" لضبط الكاش وتحويل الفارق لإنستاباي/بنك.`, 'تنبيه', 'warning');
        return;
    }

    const submitBtn = document.getElementById('btnSubmitSplitPayment');
    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>جاري اعتماد السند...</span>';
        }

        const res = await window.api.recordSupplierSplitPayment({
            supplierId,
            totalAmount,
            paymentBreakdown: {
                cash,
                bankTransfer: bank,
                eWallet: wallet
            },
            notes: (notesInput?.value || '').trim(),
            sessionId: state.activeSession?.id || null
        }, state.currentUser?.id);

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="check-circle" class="icon-sm"></i><span>تأكيد واعتماد سند الصرف</span>';
        }

        if (res && res.success) {
            const modal = document.getElementById('modalSupplierSplitPayment');
            if (modal) modal.classList.remove('active');

            if (activeSuppliersView === 'ledger' && activeLedgerSupplierId) {
                await loadSupplierLedgerData();
            } else {
                await loadSuppliersMasterView();
            }

            const voucher = {
                voucherNumber: res.data.voucherNumber,
                paidAmount: res.data.paidAmount,
                supplierName: currentSplitSupplier ? currentSplitSupplier.name : 'المورد',
                supplierCode: currentSplitSupplier ? (currentSplitSupplier.supplier_code || `SUP-${currentSplitSupplier.id}`) : '',
                balanceAfter: res.data.supplierBalanceAfter !== undefined ? res.data.supplierBalanceAfter : (currentSplitSupplier ? Math.max(0, currentSplitSupplier.balance - res.data.paidAmount) : 0),
                breakdown: { cash, bank, wallet },
                notes: (notesInput?.value || '').trim(),
                date: new Date().toLocaleString('ar-EG'),
                user: state.currentUser?.display_name || 'مسؤول النظام'
            };

            showSupplierPaymentSuccessModal(voucher);
        } else {
            showCustomAlert(res?.error || res?.message || 'فشل في تسجيل سند السداد', 'خطأ');
        }
    } catch (err) {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="check-circle" class="icon-sm"></i><span>تأكيد واعتماد سند الصرف</span>';
        }
        showCustomAlert('حدث خطأ أثناء اعتماد السداد: ' + (err.message || ''), 'خطأ');
    }
}

function showSupplierPaymentSuccessModal(voucher) {
    let msg = `تم اعتماد سند السداد بنجاح!\nرقم السند: ${voucher.voucherNumber}\nالمبلغ المسدد: ${voucher.paidAmount.toFixed(2)} ج.م`;
    if (voucher.breakdown.cash > 0) {
        msg += `\n• نقداً (خزينة مركزية): ${voucher.breakdown.cash.toFixed(2)} ج.م`;
    }
    if (voucher.breakdown.bank > 0) {
        msg += `\n• تحويل بنكي / إنستاباي: ${voucher.breakdown.bank.toFixed(2)} ج.م`;
    }
    if (voucher.breakdown.wallet > 0) {
        msg += `\n• محفظة إلكترونية: ${voucher.breakdown.wallet.toFixed(2)} ج.م`;
    }
    msg += `\nالمديونية المتبقية للمورد: ${Number(voucher.balanceAfter).toFixed(2)} ج.م`;

    showCustomAlert(msg, 'تم اعتماد سند الصرف بنجاح', 'success');
    
    // Prepare printable voucher document
    prepareSupplierVoucherPrintDoc(voucher);
}

function prepareSupplierVoucherPrintDoc(v) {
    const doc = document.getElementById('printableSupplierVoucherDoc');
    if (!doc) return;

    doc.innerHTML = `
        <div style="border-bottom: 2px dashed #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h2 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a;">Cotton Club Store | كوتن كلوب</h2>
                <span style="font-size: 13px; color: #475569; font-weight: 700;">سند صرف نقدي وإلكتروني للمورد</span>
            </div>
            <div style="text-align: left;">
                <span style="font-family: monospace; font-size: 14px; font-weight: 800; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1; display: inline-block;">
                    ${v.voucherNumber}
                </span>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">${v.date}</div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <div>
                <span style="font-size: 11px; color: #64748b; display: block;">اسم المورد / الشركة:</span>
                <strong style="font-size: 15px; color: #0f172a;">${v.supplierName}</strong>
                <div style="font-size: 11px; color: #64748b; font-family: monospace;">${v.supplierCode}</div>
            </div>
            <div style="text-align: left;">
                <span style="font-size: 11px; color: #64748b; display: block;">المبلغ الإجمالي المسدد:</span>
                <strong style="font-size: 20px; color: #15803d; font-weight: 900;">${v.paidAmount.toFixed(2)} ج.م</strong>
                <div style="font-size: 11px; color: #475569;">المتبقي بعد السند: <strong>${Number(v.balanceAfter).toFixed(2)} ج.م</strong></div>
            </div>
        </div>

        <div style="margin-bottom: 16px;">
            <span style="font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 6px; display: block;">تفصيل وسائل الصرف المعتمدة:</span>
            <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
                <thead>
                    <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                        <th style="padding: 6px 10px; text-align: right;">طريقة الدفع</th>
                        <th style="padding: 6px 10px; text-align: left;">المبلغ المسدد</th>
                    </tr>
                </thead>
                <tbody>
                    ${v.breakdown.cash > 0 ? `<tr><td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">نقداً (الخزينة المركزية)</td><td style="padding: 6px 10px; text-align: left; font-weight: 800; border-bottom: 1px solid #e2e8f0;">${v.breakdown.cash.toFixed(2)} ج.م</td></tr>` : ''}
                    ${v.breakdown.bank > 0 ? `<tr><td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">تحويل بنكي / إنستاباي</td><td style="padding: 6px 10px; text-align: left; font-weight: 800; border-bottom: 1px solid #e2e8f0;">${v.breakdown.bank.toFixed(2)} ج.م</td></tr>` : ''}
                    ${v.breakdown.wallet > 0 ? `<tr><td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">محفظة إلكترونية</td><td style="padding: 6px 10px; text-align: left; font-weight: 800; border-bottom: 1px solid #e2e8f0;">${v.breakdown.wallet.toFixed(2)} ج.م</td></tr>` : ''}
                </tbody>
            </table>
        </div>

        ${v.notes ? `
            <div style="margin-bottom: 16px; background: #fffbeb; padding: 8px 12px; border-radius: 4px; border: 1px solid #fef3c7; font-size: 12px;">
                <strong>البيان / ملاحظات:</strong> ${v.notes}
            </div>
        ` : ''}

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 14px;">
            <div>
                <span style="font-size: 11px; color: #64748b; display: block; margin-bottom: 30px;">توقيع أمين الخزينة</span>
                <span style="border-top: 1px dashed #94a3b8; display: block; width: 80%; margin: 0 auto; font-size: 11px; padding-top: 4px;">${v.user}</span>
            </div>
            <div>
                <span style="font-size: 11px; color: #64748b; display: block; margin-bottom: 30px;">توقيع المحاسب المالي</span>
                <span style="border-top: 1px dashed #94a3b8; display: block; width: 80%; margin: 0 auto; font-size: 11px; padding-top: 4px;">المراجعة والاعتماد</span>
            </div>
            <div>
                <span style="font-size: 11px; color: #64748b; display: block; margin-bottom: 30px;">توقيع مستلم الدفعة (المندوب)</span>
                <span style="border-top: 1px dashed #94a3b8; display: block; width: 80%; margin: 0 auto; font-size: 11px; padding-top: 4px;">الاسم والتوقيع</span>
            </div>
        </div>
    `;

    const printBtn = document.getElementById('btnExecutePrintVoucher');
    if (printBtn) {
        printBtn.onclick = () => window.print();
    }
}
window.openPrintSupplierVoucherModal = function() {
    const modal = document.getElementById('modalPrintPaymentVoucherPreview');
    if (modal) {
        modal.classList.add('active');
        refreshIcons(modal);
    }
};

/* 6.1 Direct Export to Excel (.csv with \uFEFF UTF-8 BOM) */
function exportLedgerToExcel() {
    if (!activeLedgerData || !activeLedgerData.supplier) {
        alert('لا توجد بيانات كشف حساب للتصدير');
        return;
    }

    const { supplier, movements, summary } = activeLedgerData;
    const today = new Date().toISOString().slice(0, 10);

    const escapeCsv = (val) => {
        const s = String(val ?? '').replace(/"/g, '""');
        return `"${s}"`;
    };

    const rows = [];
    rows.push([escapeCsv('كشف حساب مورد معتمد - Cotton Club Store')].join(','));
    rows.push([escapeCsv('اسم المورد / الشركة:'), escapeCsv(supplier.name)].join(','));
    rows.push([escapeCsv('كود المورد:'), escapeCsv(supplier.supplier_code || `SUP-${supplier.id}`)].join(','));
    rows.push([escapeCsv('رقم الهاتف:'), escapeCsv(supplier.phone || '-')].join(','));
    rows.push([escapeCsv('الشخص المسؤول:'), escapeCsv(supplier.contact_person || '-')].join(','));
    rows.push([escapeCsv('تاريخ التصدير:'), escapeCsv(new Date().toLocaleString('ar-EG'))].join(','));
    rows.push(['']);

    // Summary Box
    rows.push([
        escapeCsv('الرصيد الافتتاحي السابق'),
        escapeCsv('إجمالي فواتير التوريد (مدين +)'),
        escapeCsv('إجمالي المدفوعات والمسدد (دائن -)'),
        escapeCsv('صافي الرصيد المستحق الحالي')
    ].join(','));
    rows.push([
        escapeCsv(`${summary.openingBalance.toFixed(2)} EGP`),
        escapeCsv(`${summary.totalInvoices.toFixed(2)} EGP`),
        escapeCsv(`${summary.totalPayments.toFixed(2)} EGP`),
        escapeCsv(`${summary.currentBalance.toFixed(2)} EGP`)
    ].join(','));
    rows.push(['']);

    // Movements Table
    rows.push([
        escapeCsv('التاريخ'),
        escapeCsv('رقم السند / المرجع'),
        escapeCsv('نوع الحركة'),
        escapeCsv('البيان وتفاصيل الدفع'),
        escapeCsv('مدين (+ توريد)'),
        escapeCsv('دائن (- مسدد)'),
        escapeCsv('الرصيد التراكمي EGP')
    ].join(','));

    movements.forEach(m => {
        rows.push([
            escapeCsv(m.date),
            escapeCsv(m.referenceNumber),
            escapeCsv(m.type === 'invoice' ? 'فاتورة توريد' : 'سند سداد'),
            escapeCsv(m.description),
            escapeCsv(m.debit > 0 ? m.debit.toFixed(2) : '0.00'),
            escapeCsv(m.credit > 0 ? m.credit.toFixed(2) : '0.00'),
            escapeCsv(m.balanceAfter.toFixed(2))
        ].join(','));
    });

    rows.push(['']);
    rows.push([
        escapeCsv('الإجمالي الختامي'),
        escapeCsv(''),
        escapeCsv(''),
        escapeCsv(''),
        escapeCsv(summary.totalInvoices.toFixed(2)),
        escapeCsv(summary.totalPayments.toFixed(2)),
        escapeCsv(summary.currentBalance.toFixed(2))
    ].join(','));

    // UTF-8 BOM (\uFEFF) ensures Excel renders Arabic flawlessly without garbled text
    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `كشف_حساب_${supplier.name.replace(/\s+/g, '_')}_${supplier.supplier_code || 'SUP'}_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* 6.2 Printable Statement Voucher (A4 Layout) */
function previewPrintableA4Statement() {
    if (!activeLedgerData || !activeLedgerData.supplier) {
        alert('لا توجد بيانات كشف حساب متاحة للمعاينة والطباعة');
        return;
    }

    const { supplier, movements, summary } = activeLedgerData;
    const sheet = document.getElementById('printableA4Document');
    const modal = document.getElementById('modalPrintStatementPreview');
    if (!sheet) return;

    let movementsRowsHtml = '';
    movements.forEach((m, idx) => {
        movementsRowsHtml += `
            <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td>${m.date}</td>
                <td style="font-family: monospace; font-weight: bold;">${m.referenceNumber}</td>
                <td>${m.description}</td>
                <td style="text-align: left; color: #b91c1c; font-weight: bold;">${m.debit > 0 ? m.debit.toFixed(2) : '-'}</td>
                <td style="text-align: left; color: #15803d; font-weight: bold;">${m.credit > 0 ? m.credit.toFixed(2) : '-'}</td>
                <td style="text-align: left; font-weight: 800;">${m.balanceAfter.toFixed(2)}</td>
            </tr>
        `;
    });

    sheet.innerHTML = `
        <div class="statement-print-header">
            <div class="statement-brand-block">
                <img src="assets/logo.png" alt="Cotton Club Logo">
                <div>
                    <h2 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a;">COTTON CLUB STORE</h2>
                    <span style="font-size: 12px; color: #64748b;">نظام إدارة المبيعات والمخزون والحسابات العامة</span>
                </div>
            </div>
            <div style="text-align: left; font-size: 12px; color: #475569;">
                <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">كشف حساب مورد رسمي</div>
                <div>تاريخ الاستخراج: <strong>${new Date().toLocaleDateString('ar-EG')}</strong></div>
                <div>الوقت: <strong>${new Date().toLocaleTimeString('ar-EG')}</strong></div>
            </div>
        </div>

        <div class="statement-info-grid">
            <div>
                <div>اسم المورد / الشركة: <strong>${supplier.name}</strong></div>
                <div style="margin-top: 4px;">كود الحساب: <strong style="font-family: monospace;">${supplier.supplier_code || 'SUP-' + supplier.id}</strong></div>
                <div style="margin-top: 4px;">العنوان: <strong>${supplier.address || 'غير محدد'}</strong></div>
            </div>
            <div>
                <div>المسؤول المباشر: <strong>${supplier.contact_person || 'غير محدد'}</strong></div>
                <div style="margin-top: 4px;">رقم الهاتف: <strong>${supplier.phone || 'غير مسجل'}</strong></div>
                <div style="margin-top: 4px;">الحالة التشغيلية: <strong>${supplier.status === 'active' ? 'حساب نشط' : supplier.status}</strong></div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; text-align: center; border-radius: 4px;">
                <div style="font-size: 11px; color: #64748b;">الرصيد الافتتاحي</div>
                <div style="font-size: 15px; font-weight: 800; margin-top: 2px;">${summary.openingBalance.toFixed(2)} ج.م</div>
            </div>
            <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 10px; text-align: center; border-radius: 4px;">
                <div style="font-size: 11px; color: #b91c1c;">إجمالي التوريدات (مدين +)</div>
                <div style="font-size: 15px; font-weight: 800; color: #b91c1c; margin-top: 2px;">${summary.totalInvoices.toFixed(2)} ج.م</div>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 10px; text-align: center; border-radius: 4px;">
                <div style="font-size: 11px; color: #15803d;">إجمالي المسدد (دائن -)</div>
                <div style="font-size: 15px; font-weight: 800; color: #15803d; margin-top: 2px;">${summary.totalPayments.toFixed(2)} ج.م</div>
            </div>
            <div style="background: #eff6ff; border: 1px solid #93c5fd; padding: 10px; text-align: center; border-radius: 4px;">
                <div style="font-size: 11px; color: #1d4ed8;">الرصيد المستحق النهائي</div>
                <div style="font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 2px;">${summary.currentBalance.toFixed(2)} ج.م</div>
            </div>
        </div>

        <table class="statement-table">
            <thead>
                <tr>
                    <th style="width: 35px; text-align: center;">#</th>
                    <th style="width: 120px;">التاريخ</th>
                    <th style="width: 120px;">رقم السند</th>
                    <th>البيان والتفاصيل</th>
                    <th style="width: 90px; text-align: left;">مدين (+)</th>
                    <th style="width: 90px; text-align: left;">دائن (-)</th>
                    <th style="width: 100px; text-align: left;">الرصيد التراكمي</th>
                </tr>
            </thead>
            <tbody>
                ${movementsRowsHtml}
            </tbody>
            <tfoot style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #0f172a;">
                <tr>
                    <td colspan="4" style="text-align: right; padding: 10px;">الإجمالي الختامي:</td>
                    <td style="text-align: left; color: #b91c1c;">${summary.totalInvoices.toFixed(2)}</td>
                    <td style="text-align: left; color: #15803d;">${summary.totalPayments.toFixed(2)}</td>
                    <td style="text-align: left; font-size: 13px; font-weight: 900;">${summary.currentBalance.toFixed(2)} ج.م</td>
                </tr>
            </tfoot>
        </table>

        <div class="statement-signatures-grid">
            <div>
                <div class="signature-box-title">المحاسب المالي المختص</div>
                <div class="signature-box-line"></div>
            </div>
            <div>
                <div class="signature-box-title">أمين الخزينة العامة</div>
                <div class="signature-box-line"></div>
            </div>
            <div>
                <div class="signature-box-title">إدارة المراجعة والاعتماد</div>
                <div class="signature-box-line"></div>
            </div>
        </div>
    `;

    if (modal) modal.classList.add('active');
}

/* -------------------------------------------------------------
 * 6.5 CUSTOMERS DIRECTORY & CRM (إدارة وسجل العملاء وتصدير الشيت)
 * ------------------------------------------------------------- */
let customersCache = [];
let customersViewInitialized = false;

async function loadCustomersView() {
    try {
        // 1. Fetch KPI metrics and customers list in parallel
        const [statsRes, listRes] = await Promise.all([
            window.api.getCustomerStats ? window.api.getCustomerStats() : { success: false },
            window.api.listCustomers ? window.api.listCustomers({ limit: 500, sortBy: 'spent_desc' }) : { success: false }
        ]);

        // 2. Update KPI Cards
        const stats = statsRes && statsRes.success ? (statsRes.data || statsRes) : {};
        const totalCust = stats.totalCustomers !== undefined ? stats.totalCustomers : (listRes?.data?.length || 0);
        const totalSpent = stats.totalSpent !== undefined ? stats.totalSpent : 0;
        const avgSpent = stats.avgSpent !== undefined ? stats.avgSpent : 0;
        const activeCust = stats.customersWithInvoices !== undefined ? stats.customersWithInvoices : 0;

        const kpiCustTotal = document.getElementById('kpiCustTotal');
        const kpiCustTotalSpent = document.getElementById('kpiCustTotalSpent');
        const kpiCustAvgSpent = document.getElementById('kpiCustAvgSpent');
        const kpiCustActive = document.getElementById('kpiCustActive');
        const custCountBadge = document.getElementById('custCountBadge');

        if (kpiCustTotal) kpiCustTotal.innerText = Number(totalCust).toLocaleString('ar-EG');
        if (kpiCustTotalSpent) kpiCustTotalSpent.innerText = `${Number(totalSpent).toFixed(2)} ج.م`;
        if (kpiCustAvgSpent) kpiCustAvgSpent.innerText = `${Number(avgSpent).toFixed(2)} ج.م`;
        if (kpiCustActive) kpiCustActive.innerText = Number(activeCust).toLocaleString('ar-EG');
        if (custCountBadge) custCountBadge.innerText = `${totalCust} عميل`;

        // 3. Store and render table
        customersCache = (listRes && listRes.success ? listRes.data : (Array.isArray(listRes) ? listRes : [])) || [];
        renderCustomersTable(customersCache);

        // 4. Bind events once
        if (!customersViewInitialized) {
            bindCustomersEvents();
            customersViewInitialized = true;
        }

        const viewCust = document.getElementById('view-customers');
        if (viewCust) refreshIcons(viewCust);
    } catch (err) {
        console.error('Error loading customers view:', err);
    }
}
window.loadCustomersView = loadCustomersView;

function renderCustomersTable(customers) {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    if (!customers || customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #64748B;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <i data-lucide="users" class="icon-lg" style="color: #94A3B8;"></i>
                        <span style="font-size: 14px; font-weight: 700;">لا يوجد عملاء مسجلون حالياً مطابِقون للبحث</span>
                        <span style="font-size: 12px; color: #94A3B8;">يمكنك إضافة عميل جديد باستخدام الزر أعلاه</span>
                    </div>
                </td>
            </tr>
        `;
        refreshIcons(tbody);
        return;
    }

    tbody.innerHTML = customers.map(c => {
        const spent = Number(c.total_spent || 0);
        const invoices = Number(c.invoices_count || 0);
        const points = Number(c.points || 0);
        const phone = c.phone || '—';
        const email = c.email || '—';
        const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
        const code = `CUST-${String(c.id).padStart(4, '0')}`;

        return `
            <tr style="border-bottom: 1px solid #E2E8F0; transition: background 0.15s ease;">
                <td style="padding: 10px 16px; text-align: center; font-family: monospace; font-weight: 700; color: #475569; font-size: 12px;">
                    <span style="background: #F1F5F9; padding: 3px 8px; border-radius: 6px; border: 1px solid #CBD5E1;">${code}</span>
                </td>
                <td style="padding: 10px 18px; text-align: right;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 28px; height: 28px; border-radius: 50%; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px;">
                            ${escapeHtml((c.name || 'ع')[0])}
                        </div>
                        <div>
                            <div style="font-weight: 700; color: #0F172A; font-size: 13px;">${escapeHtml(c.name)}</div>
                            ${c.notes ? `<div style="font-size: 11px; color: #64748B; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(c.notes)}">${escapeHtml(c.notes)}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td style="padding: 10px 16px; text-align: center; font-size: 12.5px; direction: ltr; font-weight: 600; color: #334155;">
                    ${phone !== '—' ? `<a href="tel:${escapeHtml(phone)}" style="color: #2563EB; text-decoration: none;">${escapeHtml(phone)}</a>` : '—'}
                </td>
                <td style="padding: 10px 16px; text-align: right; font-size: 12px; color: #64748B;">
                    ${email !== '—' ? `<span style="direction: ltr; display: inline-block;">${escapeHtml(email)}</span>` : '—'}
                </td>
                <td style="padding: 10px 16px; text-align: left; font-weight: 800; color: #059669; font-size: 13px;">
                    ${spent.toFixed(2)} ج.م
                </td>
                <td style="padding: 10px 16px; text-align: center;">
                    <button type="button" onclick="viewCustomerInvoices(${c.id}, '${escapeHtml(c.name).replace(/'/g, "\\'")}')" class="btn-table-action" style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11.5px; color: #334155; cursor: pointer;" title="عرض سجل فواتير العميل">
                        ${invoices} فواتير
                    </button>
                </td>
                <td style="padding: 10px 16px; text-align: center;">
                    <span style="background: #FEF3C7; color: #92400E; font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; border: 1px solid #FCD34D;">
                        ⭐ ${points}
                    </span>
                </td>
                <td style="padding: 10px 16px; text-align: center; font-size: 11.5px; color: #64748B;">
                    ${dateStr}
                </td>
                <td style="padding: 10px 18px; text-align: center;">
                    <div style="display: inline-flex; align-items: center; gap: 6px;">
                        <button type="button" onclick="openCustomerModal(${c.id})" class="btn-table-action" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #CBD5E1; background: #FFFFFF; color: #2563EB; cursor: pointer;" title="تعديل بيانات العميل">
                            <i data-lucide="edit-3" class="icon-xs"></i>
                        </button>
                        <button type="button" onclick="deleteCustomerConfirm(${c.id}, '${escapeHtml(c.name).replace(/'/g, "\\'")}')" class="btn-table-action" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #FCA5A5; background: #FEF2F2; color: #DC2626; cursor: pointer;" title="حذف العميل">
                            <i data-lucide="trash-2" class="icon-xs"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    refreshIcons(tbody);
}

function exportCustomersToExcel() {
    if (!customersCache || customersCache.length === 0) {
        alert('لا توجد بيانات عملاء لتصديرها.');
        return;
    }

    // CSV Header with Arabic Columns
    const headers = [
        'كود العميل',
        'اسم العميل',
        'رقم الهاتف',
        'البريد الإلكتروني',
        'إجمالي المشتريات (ج.م)',
        'عدد الفواتير',
        'نقاط الولاء',
        'تاريخ التسجيل',
        'ملاحظات'
    ];

    const escapeCsvField = (field) => {
        if (field === null || field === undefined) return '""';
        const str = String(field).replace(/"/g, '""');
        return `"${str}"`;
    };

    const rows = customersCache.map(c => [
        escapeCsvField(`CUST-${String(c.id).padStart(4, '0')}`),
        escapeCsvField(c.name || ''),
        escapeCsvField(c.phone || ''),
        escapeCsvField(c.email || ''),
        escapeCsvField(Number(c.total_spent || 0).toFixed(2)),
        escapeCsvField(c.invoices_count || 0),
        escapeCsvField(c.points || 0),
        escapeCsvField(c.created_at || ''),
        escapeCsvField(c.notes || '')
    ].join(','));

    // Combine with BOM (\uFEFF) for Microsoft Excel Arabic recognition
    const csvContent = '\uFEFF' + [headers.map(escapeCsvField).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const today = new Date().toISOString().slice(0, 10);
    const fileName = `CottonClub_Customers_${today}.csv`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}
window.exportCustomersToExcel = exportCustomersToExcel;

function bindCustomersEvents() {
    const searchInput = document.getElementById('custSearchInput');
    const sortSelect = document.getElementById('custSortSelect');

    const applyFilter = () => {
        const query = (searchInput?.value || '').trim().toLowerCase();
        const sortBy = sortSelect?.value || 'spent_desc';

        let filtered = [...customersCache];

        if (query) {
            filtered = filtered.filter(c => 
                (c.name && c.name.toLowerCase().includes(query)) ||
                (c.phone && c.phone.includes(query)) ||
                (c.email && c.email.toLowerCase().includes(query)) ||
                (c.notes && c.notes.toLowerCase().includes(query))
            );
        }

        if (sortBy === 'spent_desc') {
            filtered.sort((a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0));
        } else if (sortBy === 'spent_asc') {
            filtered.sort((a, b) => Number(a.total_spent || 0) - Number(b.total_spent || 0));
        } else if (sortBy === 'invoices_desc') {
            filtered.sort((a, b) => Number(b.invoices_count || 0) - Number(a.invoices_count || 0));
        } else if (sortBy === 'newest') {
            filtered.sort((a, b) => Number(b.id) - Number(a.id));
        } else if (sortBy === 'name_asc') {
            filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
        }

        renderCustomersTable(filtered);
    };

    if (searchInput) {
        searchInput.addEventListener('input', applyFilter);
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', applyFilter);
    }
}

function resetCustomerFilters() {
    const searchInput = document.getElementById('custSearchInput');
    const sortSelect = document.getElementById('custSortSelect');
    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'spent_desc';
    renderCustomersTable(customersCache);
}
window.resetCustomerFilters = resetCustomerFilters;

function openCustomerModal(customerId = null) {
    const modal = document.getElementById('modalCustomerForm');
    const titleEl = document.getElementById('modalCustomerTitle');
    const form = document.getElementById('customerForm');
    if (!modal) return;

    if (form) form.reset();
    const idInput = document.getElementById('custFormId');
    if (idInput) idInput.value = customerId || '';

    if (customerId) {
        if (titleEl) titleEl.innerText = 'تعديل بيانات العميل';
        const cust = customersCache.find(c => c.id === customerId);
        if (cust) {
            const nameEl = document.getElementById('custFormName');
            const phoneEl = document.getElementById('custFormPhone');
            const emailEl = document.getElementById('custFormEmail');
            const pointsEl = document.getElementById('custFormPoints');
            const notesEl = document.getElementById('custFormNotes');
            if (nameEl) nameEl.value = cust.name || '';
            if (phoneEl) phoneEl.value = cust.phone || '';
            if (emailEl) emailEl.value = cust.email || '';
            if (pointsEl) pointsEl.value = cust.points || 0;
            if (notesEl) notesEl.value = cust.notes || '';
        }
    } else {
        if (titleEl) titleEl.innerText = 'إضافة عميل جديد';
    }

    modal.style.display = 'flex';
    refreshIcons(modal);
}
window.openCustomerModal = openCustomerModal;

function closeCustomerModal() {
    const modal = document.getElementById('modalCustomerForm');
    if (modal) modal.style.display = 'none';
}
window.closeCustomerModal = closeCustomerModal;

async function handleCustomerFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('custFormId')?.value;
    const name = document.getElementById('custFormName')?.value?.trim();
    const phone = document.getElementById('custFormPhone')?.value?.trim();
    const email = document.getElementById('custFormEmail')?.value?.trim();
    const points = Number(document.getElementById('custFormPoints')?.value || 0);
    const notes = document.getElementById('custFormNotes')?.value?.trim();

    if (!name) {
        alert('يرجى إدخال اسم العميل.');
        return;
    }

    try {
        let res;
        if (id) {
            res = await window.api.updateCustomer(Number(id), { name, phone, email, points, notes });
        } else {
            res = await window.api.createCustomer({ name, phone, email, notes });
        }

        if (res && (res.success || res.id)) {
            closeCustomerModal();
            loadCustomersView();
        } else {
            alert('حدث خطأ أثناء حفظ بيانات العميل: ' + (res?.error || 'يرجى مراجعة البيانات'));
        }
    } catch (err) {
        alert('خطأ: ' + err.message);
    }
}
window.handleCustomerFormSubmit = handleCustomerFormSubmit;

async function deleteCustomerConfirm(id, name) {
    if (!confirm(`هل أنت متأكد من حذف العميل "${name}" من النظام؟`)) {
        return;
    }
    try {
        const res = await window.api.deleteCustomer(id);
        if (res && res.success !== false) {
            loadCustomersView();
        } else {
            alert('تعذر حذف العميل: ' + (res?.error || ''));
        }
    } catch (err) {
        alert('خطأ أثناء الحذف: ' + err.message);
    }
}
window.deleteCustomerConfirm = deleteCustomerConfirm;

async function viewCustomerInvoices(customerId, customerName) {
    const modal = document.getElementById('modalCustomerInvoices');
    const titleEl = document.getElementById('modalCustInvoicesTitle');
    const subEl = document.getElementById('modalCustInvoicesSub');
    const tbody = document.getElementById('custInvoicesTableBody');
    if (!modal) return;

    if (titleEl) titleEl.innerText = `سجل فواتير: ${customerName}`;
    if (subEl) subEl.innerText = `كود العميل: CUST-${String(customerId).padStart(4, '0')}`;
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">جارٍ تحميل الفواتير...</td></tr>';

    modal.style.display = 'flex';
    refreshIcons(modal);

    try {
        const res = await window.api.getCustomerInvoices(customerId, 50);
        const invoices = res && res.success ? res.data : (Array.isArray(res) ? res : []);

        if (!invoices || invoices.length === 0) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: #64748B;">لا توجد فواتير بيع مسجلة لهذا العميل حتى الآن.</td></tr>';
            return;
        }

        if (tbody) {
            tbody.innerHTML = invoices.map(inv => {
                const total = Number(inv.final_total || 0).toFixed(2);
                const isRet = inv.invoice_type === 'return';
                const date = inv.created_at ? new Date(inv.created_at).toLocaleString('ar-EG') : '—';
                const payMethodMap = { cash: 'كاش', card: 'فيزا', transfer: 'تحويل', split: 'مجزأ' };

                return `
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                        <td style="padding: 8px 12px; font-weight: 700; font-family: monospace; text-align: center;">${escapeHtml(inv.invoice_number)}</td>
                        <td style="padding: 8px 12px; text-align: center;">
                            <span style="padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; ${isRet ? 'background: #FEE2E2; color: #DC2626;' : 'background: #DCFCE7; color: #16A34A;'}">
                                ${isRet ? 'مرتجع' : 'فاتورة بيع'}
                            </span>
                        </td>
                        <td style="padding: 8px 12px; text-align: left; font-weight: 800; color: #059669;">${total} ج.م</td>
                        <td style="padding: 8px 12px; text-align: center; font-size: 11.5px;">${payMethodMap[inv.payment_method] || inv.payment_method}</td>
                        <td style="padding: 8px 12px; text-align: center; font-size: 11px; color: #64748B;">${date}</td>
                        <td style="padding: 8px 12px; text-align: center; font-size: 11.5px; font-weight: 600;">${escapeHtml(inv.cashier_name || 'الكاشير')}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #DC2626; padding: 20px;">خطأ في تحميل الفواتير: ${escapeHtml(err.message)}</td></tr>`;
    }
}
window.viewCustomerInvoices = viewCustomerInvoices;

function closeCustomerInvoicesModal() {
    const modal = document.getElementById('modalCustomerInvoices');
    if (modal) modal.style.display = 'none';
}
window.closeCustomerInvoicesModal = closeCustomerInvoicesModal;

/* -------------------------------------------------------------
 * 7. SALES ANALYTICS & BI DASHBOARD (تحليلات المبيعات وأداء البائعين)
 * ------------------------------------------------------------- */
let currentAnalyticsFilters = {
    period: 'all',
    startDate: null,
    endDate: null,
    sellerId: null
};

let analyticsSellersDropdownLoaded = false;

function bindReportEvents() {
    // 1. Custom date range filter buttons
    const btnFilterDates = document.getElementById('btnFilterAnalyticsDates');
    if (btnFilterDates) {
        btnFilterDates.addEventListener('click', () => {
            currentAnalyticsFilters.startDate = document.getElementById('analyticsStartDate')?.value || null;
            currentAnalyticsFilters.endDate = document.getElementById('analyticsEndDate')?.value || null;
            loadSalesAnalyticsDashboard();
        });
    }

    const startInput = document.getElementById('analyticsStartDate');
    const endInput = document.getElementById('analyticsEndDate');
    if (startInput) {
        startInput.addEventListener('change', () => {
            currentAnalyticsFilters.startDate = startInput.value || null;
            loadSalesAnalyticsDashboard();
        });
    }
    if (endInput) {
        endInput.addEventListener('change', () => {
            currentAnalyticsFilters.endDate = endInput.value || null;
            loadSalesAnalyticsDashboard();
        });
    }

    // 2. Seller filter dropdown
    const sellerSelect = document.getElementById('analyticsFilterSeller');
    if (sellerSelect) {
        sellerSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            currentAnalyticsFilters.sellerId = (val && val !== 'all') ? Number(val) : null;
            loadSalesAnalyticsDashboard();
        });
    }

    // 3. Reset filters button
    const btnReset = document.getElementById('btnResetAnalyticsFilter');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            currentAnalyticsFilters = {
                period: 'all',
                startDate: null,
                endDate: null,
                sellerId: null
            };

            document.querySelectorAll('.analytics-period-pill').forEach(p => p.classList.remove('active'));
            const allPill = document.querySelector('.analytics-period-pill[data-period="all"]');
            if (allPill) allPill.classList.add('active');

            const customRange = document.getElementById('analyticsCustomDateRange');
            if (customRange) customRange.style.display = 'none';

            if (startInput) startInput.value = '';
            if (endInput) endInput.value = '';
            if (sellerSelect) sellerSelect.value = 'all';

            loadSalesAnalyticsDashboard();
        });
    }
}

function applyAnalyticsPeriod(period) {
    document.querySelectorAll('.analytics-period-pill').forEach(p => p.classList.remove('active'));
    const pill = document.querySelector(`.analytics-period-pill[data-period="${period}"]`);
    if (pill) pill.classList.add('active');

    const customRange = document.getElementById('analyticsCustomDateRange');
    currentAnalyticsFilters.period = period;

    if (period === 'custom') {
        if (customRange) customRange.style.display = 'flex';
        return;
    }

    if (customRange) customRange.style.display = 'none';

    const today = new Date();
    let startDate = null;
    let endDate = null;

    switch (period) {
        case 'all':
            startDate = null;
            endDate = null;
            break;
        case 'today':
            startDate = formatDateISO(today);
            endDate = formatDateISO(today);
            break;
        case 'yesterday': {
            const y = new Date(today);
            y.setDate(y.getDate() - 1);
            startDate = formatDateISO(y);
            endDate = formatDateISO(y);
            break;
        }
        case 'week': {
            const w = new Date(today);
            const dayOfWeek = w.getDay();
            const diff = (dayOfWeek + 1) % 7; // Egypt week starts Saturday
            w.setDate(w.getDate() - diff);
            startDate = formatDateISO(w);
            endDate = formatDateISO(today);
            break;
        }
        case 'month': {
            const m = new Date(today.getFullYear(), today.getMonth(), 1);
            startDate = formatDateISO(m);
            endDate = formatDateISO(today);
            break;
        }
        default:
            startDate = null;
            endDate = null;
    }

    currentAnalyticsFilters.startDate = startDate;
    currentAnalyticsFilters.endDate = endDate;
    loadSalesAnalyticsDashboard();
}
window.applyAnalyticsPeriod = applyAnalyticsPeriod;

async function loadSalesAnalyticsDashboard(filters = null) {
    if (state.currentUser?.role !== 'admin') {
        const biSec = document.getElementById('shiftBiAnalyticsSection');
        if (biSec) biSec.style.display = 'none';
        const panelAna = document.getElementById('panel-sales-analytics');
        if (panelAna) panelAna.style.display = 'none';
        return;
    }

    const activeFilters = filters || currentAnalyticsFilters;

    try {
        const res = await window.api.getComprehensiveAnalytics(activeFilters);
        const data = (res && res.success !== false && res.data) ? res.data : (res && res.kpis ? res : null);
        if (!data) return;
        const { kpis, timeline, categories, tenders, sellers, topProducts, allSellers, hourlyDistribution, dayOfWeekDistribution } = data;

        // SVG Donut Chart Generation Helper
        function generateSvgDonut(items, totalValue, centerSub = 'إجمالي', size = 140) {
            if (!items || items.length === 0 || totalValue <= 0) {
                return `
                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #94A3B8; text-align: center; font-weight: 700;">
                        لا توجد بيانات
                    </div>
                `;
            }

            const radius = 48;
            const strokeWidth = 18;
            const circumference = 2 * Math.PI * radius; // ~301.59
            let accumulatedOffset = 0;

            const segmentsHtml = items.map(item => {
                const val = item.value || 0;
                const pct = Math.max(0, val / totalValue);
                const dashLength = pct * circumference;
                const spaceLength = circumference - dashLength;
                const strokeDashoffset = -accumulatedOffset;
                accumulatedOffset += dashLength;

                return `<circle cx="65" cy="65" r="${radius}" fill="none" stroke="${item.color}" stroke-width="${strokeWidth}" stroke-dasharray="${dashLength.toFixed(2)} ${spaceLength.toFixed(2)}" stroke-dashoffset="${strokeDashoffset.toFixed(2)}" style="transition: all 0.5s ease; cursor: pointer;"><title>${escapeHtml(item.label)}: ${val.toFixed(2)} ج.م (${Math.round(pct * 100)}%)</title></circle>`;
            }).join('');

            const formattedTotal = totalValue >= 1000 ? `${(totalValue / 1000).toFixed(1)}k` : totalValue.toFixed(0);

            return `
                <svg class="donut-svg" width="${size}" height="${size}" viewBox="0 0 130 130">
                    <circle cx="65" cy="65" r="${radius}" fill="none" stroke="#F1F5F9" stroke-width="${strokeWidth}"></circle>
                    ${segmentsHtml}
                </svg>
                <div class="donut-center-label">
                    <span class="donut-center-val">${formattedTotal}</span>
                    <span class="donut-center-sub">${centerSub}</span>
                </div>
            `;
        }

        // 1. Populate Sellers Dropdown with Branch Sellers only (Admin does NOT sell in branch)
        const selSeller = document.getElementById('analyticsFilterSeller');
        if (selSeller && allSellers && allSellers.length > 0 && !analyticsSellersDropdownLoaded) {
            const currentVal = selSeller.value;
            selSeller.innerHTML = '<option value="all">كافة بائعي الفرع</option>';
            // Exclude admin if present in allSellers
            const branchSellers = allSellers.filter(u => u.role !== 'admin');
            branchSellers.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                const displayName = u.employee_name ? `${u.employee_name} (${u.display_name})` : (u.display_name || u.username);
                opt.innerText = `${displayName} (بائع الفرع)`;
                selSeller.appendChild(opt);
            });
            if (currentVal && Array.from(selSeller.options).some(o => o.value === String(currentVal))) {
                selSeller.value = currentVal;
            }
            analyticsSellersDropdownLoaded = true;
        }

        // 2. Executive KPIs
        const elNetSales = document.getElementById('anKpiNetSales');
        const elGrossProfit = document.getElementById('anKpiGrossProfit');
        const elProfitMargin = document.getElementById('anKpiProfitMargin');
        const elTotalCost = document.getElementById('anKpiTotalCost');
        const elInvoicesCount = document.getElementById('anKpiInvoicesCount');
        const elAov = document.getElementById('anKpiAvgOrderValue');
        const elBasketPieces = document.getElementById('anKpiBasketPieces');
        const elDiscounts = document.getElementById('anKpiTotalDiscounts');
        const elDiscountRate = document.getElementById('anKpiDiscountRate');
        const elPieces = document.getElementById('anKpiTotalPieces');
        const elCatsCount = document.getElementById('anKpiCategoriesCount');

        if (elNetSales) elNetSales.innerText = `${kpis.netSales.toFixed(2)} ج.م`;
        if (elGrossProfit) elGrossProfit.innerText = `${kpis.grossProfit.toFixed(2)} ج.م`;
        if (elProfitMargin) elProfitMargin.innerText = `هامش: ${kpis.profitMargin}%`;
        if (elTotalCost) elTotalCost.innerText = `التكلفة: ${(kpis.netSales - kpis.grossProfit).toFixed(2)} ج.م`;
        if (elInvoicesCount) elInvoicesCount.innerText = `${kpis.totalInvoices} فاتورة مسجلة`;
        if (elAov) elAov.innerText = `${kpis.avgOrderValue.toFixed(2)} ج.م`;
        if (elBasketPieces) elBasketPieces.innerText = `${kpis.avgBasketPieces} قطعة/فاتورة`;
        if (elDiscounts) elDiscounts.innerText = `${kpis.totalDiscounts.toFixed(2)} ج.م`;
        if (elDiscountRate) elDiscountRate.innerText = `معدل الخصم: ${kpis.discountRate}%`;
        if (elPieces) elPieces.innerText = `${kpis.totalPieces} قطعة`;
        if (elCatsCount) elCatsCount.innerText = `${categories.length} أقسام نشطة`;

        // 3. Render Trend Bar Chart
        const chartContainer = document.getElementById('analyticsTrendChartContainer');
        if (chartContainer) {
            chartContainer.innerHTML = '';
            if (!timeline || timeline.length === 0) {
                chartContainer.innerHTML = `
                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px; font-weight: 600;">
                        لا توجد حركات مبيعات كافية لرسم المسار البياني في هذه الفترة
                    </div>
                `;
            } else {
                const maxRevenue = Math.max(...timeline.map(t => Math.max(t.day_revenue, t.day_profit, 1)));
                timeline.forEach(t => {
                    const revHeight = Math.max(8, Math.round((t.day_revenue / maxRevenue) * 160));
                    const profitHeight = Math.max(6, Math.round((t.day_profit / maxRevenue) * 160));

                    const col = document.createElement('div');
                    col.className = 'trend-bar-column';
                    col.innerHTML = `
                        <div class="trend-bar-tooltip">
                            <div>${t.sale_date}</div>
                            <div>مبيعات: ${t.day_revenue.toFixed(2)} ج.م</div>
                            <div style="color: #34D399;">أرباح: ${t.day_profit.toFixed(2)} ج.م</div>
                            <div style="color: #94A3B8;">${t.invoices_count} فاتورة (${t.day_pieces} قطع)</div>
                        </div>
                        <div class="trend-bars-duo">
                            <div class="bar-pill revenue" style="height: ${revHeight}px;" title="المبيعات: ${t.day_revenue} ج.م"></div>
                            <div class="bar-pill profit" style="height: ${profitHeight}px;" title="الربح: ${t.day_profit} ج.م"></div>
                        </div>
                        <div class="trend-bar-label">${t.sale_date.slice(5)}</div>
                    `;
                    chartContainer.appendChild(col);
                });
            }
        }

        // 4. Render Category Contribution with Donut Chart
        const catDonutContainer = document.getElementById('analyticsCategoryDonutContainer');
        const catList = document.getElementById('analyticsCategoryBarsList');
        const catColors = ['#4F46E5', '#0284C7', '#059669', '#D97706', '#7C3AED', '#DB2777', '#2563EB', '#16A34A'];

        if (catDonutContainer) {
            const donutItems = (categories || []).map((c, i) => ({
                label: c.category_name,
                value: c.category_revenue || 0,
                color: catColors[i % catColors.length]
            }));
            const totalCatRev = donutItems.reduce((acc, curr) => acc + curr.value, 0);
            catDonutContainer.innerHTML = generateSvgDonut(donutItems, totalCatRev, 'الأقسام', 130);
        }

        if (catList) {
            catList.innerHTML = '';
            if (!categories || categories.length === 0) {
                catList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 14px; font-size: 12px;">لا توجد مبيعات للأقسام</div>';
            } else {
                categories.forEach((c, i) => {
                    const rowColor = catColors[i % catColors.length];
                    const row = document.createElement('div');
                    row.className = 'category-bar-row';
                    row.innerHTML = `
                        <div class="category-bar-info">
                            <span style="display: flex; align-items: center; gap: 6px;">
                                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${rowColor}; display: inline-block;"></span>
                                <span>${escapeHtml(c.category_name)} (${c.units_sold} قطعة)</span>
                            </span>
                            <span style="color: #0F172A; font-weight: 800;">${c.category_revenue.toFixed(2)} ج.م (${c.share_percent}%)</span>
                        </div>
                        <div class="category-track">
                            <div class="category-fill" style="width: ${Math.min(100, Math.max(4, c.share_percent))}%; background: ${rowColor};"></div>
                        </div>
                    `;
                    catList.appendChild(row);
                });
            }
        }

        // 5. Render Tenders Mix with Mini Radial/Donut
        const tendersDonutContainer = document.getElementById('analyticsTendersDonutContainer');
        const tendersContainer = document.getElementById('analyticsTendersMixContainer');
        const tenderMap = { 
            cash: { label: 'نقداً (كاش)', icon: 'banknote', color: '#059669', bg: '#ECFDF3' }, 
            card: { label: 'بطاقات وفيزا', icon: 'credit-card', color: '#2563EB', bg: '#EFF8FF' }, 
            transfer: { label: 'إنستاباي ومحافظ', icon: 'smartphone', color: '#7C3AED', bg: '#F5F3FF' },
            split: { label: 'مقسم / إلكتروني', icon: 'split', color: '#D97706', bg: '#FEF3C7' } 
        };
        const allTenderSum = (tenders || []).reduce((sum, t) => sum + t.total, 0);

        if (tendersDonutContainer) {
            const tenderDonutItems = (tenders || []).map(t => {
                const meta = tenderMap[t.payment_method] || { label: t.payment_method, color: '#64748B' };
                return {
                    label: meta.label,
                    value: t.total || 0,
                    color: meta.color
                };
            });
            tendersDonutContainer.innerHTML = generateSvgDonut(tenderDonutItems, allTenderSum, 'الدفع', 110);
        }

        if (tendersContainer) {
            tendersContainer.innerHTML = '';
            (tenders || []).forEach(t => {
                const meta = tenderMap[t.payment_method] || { label: t.payment_method, icon: 'dollar-sign', color: '#64748B', bg: '#F1F5F9' };
                const pct = allTenderSum > 0 ? Math.round((t.total / allTenderSum) * 100) : 0;

                const card = document.createElement('div');
                card.style.cssText = `background: ${meta.bg}; border: 1px solid ${meta.color}33; border-radius: 10px; padding: 8px 12px; display: flex; flex-direction: column; gap: 3px;`;
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; font-weight: 700; color: ${meta.color};">
                        <span style="display: flex; align-items: center; gap: 4px;"><i data-lucide="${meta.icon}" class="icon-xs"></i> ${meta.label}</span>
                        <span class="badge" style="background: #FFFFFF; color: ${meta.color}; font-weight: 800; font-size: 10px;">${pct}%</span>
                    </div>
                    <div style="font-size: 14.5px; font-weight: 900; color: #0F172A;">${t.total.toFixed(2)} ج.م</div>
                    <div style="font-size: 10px; color: #64748B;">${t.count} عملية مسجلة</div>
                `;
                tendersContainer.appendChild(card);
            });
        }

        // 5.B Render Hourly Peak Trading 24h Bar Chart
        const hourlyContainer = document.getElementById('analyticsHourlyChartContainer');
        if (hourlyContainer) {
            hourlyContainer.innerHTML = '';
            const hours = hourlyDistribution || [];
            const maxHourSales = Math.max(...hours.map(h => h.total_sales || 0), 1);

            hours.forEach(h => {
                const hSales = h.total_sales || 0;
                const barHeight = Math.max(6, Math.round((hSales / maxHourSales) * 140));
                let pillClass = 'hourly-bar-pill';
                if (hSales >= maxHourSales * 0.7 && hSales > 0) pillClass += ' super-peak';
                else if (hSales >= maxHourSales * 0.35 && hSales > 0) pillClass += ' peak';

                const hourStr = String(h.hour_num).padStart(2, '0');
                const col = document.createElement('div');
                col.className = 'hourly-bar-col';
                col.innerHTML = `
                    <div class="hourly-bar-tooltip">
                        <div style="font-size: 11.5px; font-weight: 800; color: #F8FAFC;">الساعة ${hourStr}:00</div>
                        <div style="color: #818CF8;">المبيعات: ${hSales.toFixed(2)} ج.م</div>
                        <div style="color: #34D399;">الأرباح: ${(h.total_profit || 0).toFixed(2)} ج.م</div>
                        <div style="color: #94A3B8;">${h.count || 0} فاتورة منفذة</div>
                    </div>
                    <div class="${pillClass}" style="height: ${barHeight}px;"></div>
                    <div class="hourly-bar-label">${hourStr}</div>
                `;
                hourlyContainer.appendChild(col);
            });
        }

        // 5.C Render Day of Week Distribution Chart
        const dowContainer = document.getElementById('analyticsDowChartContainer');
        if (dowContainer) {
            dowContainer.innerHTML = '';
            const dows = dayOfWeekDistribution || [];
            const maxDowSales = Math.max(...dows.map(d => d.total_sales || 0), 1);
            const peakDay = dows.reduce((best, curr) => ((curr.total_sales || 0) > (best?.total_sales || 0) ? curr : best), null);

            const peakBadge = document.getElementById('peakDayBadge');
            if (peakBadge && peakDay && peakDay.total_sales > 0) {
                peakBadge.innerText = `ذروة الأسبوع: ${peakDay.day_name} (${peakDay.total_sales.toFixed(0)} ج.م)`;
            }

            dows.forEach(d => {
                const dSales = d.total_sales || 0;
                const barHeight = Math.max(10, Math.round((dSales / maxDowSales) * 130));
                const isPeak = peakDay && d.day_index === peakDay.day_index && dSales > 0;

                const col = document.createElement('div');
                col.className = 'dow-bar-col';
                col.innerHTML = `
                    <div class="dow-bar-tooltip">
                        <div style="font-size: 11.5px; font-weight: 800; color: #F8FAFC;">يوم ${d.day_name}</div>
                        <div style="color: #60A5FA;">المبيعات: ${dSales.toFixed(2)} ج.م</div>
                        <div style="color: #34D399;">الأرباح: ${(d.total_profit || 0).toFixed(2)} ج.م</div>
                        <div style="color: #94A3B8;">${d.count || 0} فاتورة منفذة</div>
                    </div>
                    <div class="dow-bar-pill ${isPeak ? 'peak-day' : ''}" style="height: ${barHeight}px;"></div>
                    <div class="dow-bar-label">${d.day_name}</div>
                `;
                dowContainer.appendChild(col);
            });
        }

        // 6. Render Sellers Performance Matrix & Leaderboard
        const sellersBadge = document.getElementById('sellersActiveBadge');
        if (sellersBadge) sellersBadge.innerText = `${sellers.length} بائع نشط`;

        const spotlightCard = document.getElementById('topSellerSpotlightCard');
        if (spotlightCard) {
            if (sellers && sellers.length > 0 && sellers[0].total_sales > 0) {
                const top = sellers[0];
                spotlightCard.style.display = 'flex';
                spotlightCard.innerHTML = `
                    <div class="spotlight-left">
                        <div class="spotlight-trophy">
                            <i data-lucide="crown"></i>
                        </div>
                        <div>
                            <div class="spotlight-title">🏆 بائع الشهر الأكثر مبيعاً (TOP PERFORMER)</div>
                            <div class="spotlight-name">${top.display_name}</div>
                        </div>
                    </div>
                    <div class="spotlight-stats">
                        <div class="spotlight-stat-item">
                            <div class="spotlight-stat-val">${top.total_sales.toFixed(2)} ج.م</div>
                            <div class="spotlight-stat-lbl">إجمالي مبيعات البائع</div>
                        </div>
                        <div class="spotlight-stat-item">
                            <div class="spotlight-stat-val">${top.sales_share}%</div>
                            <div class="spotlight-stat-lbl">المساهمة في مبيعات المتجر</div>
                        </div>
                        <div class="spotlight-stat-item">
                            <div class="spotlight-stat-val">${top.avg_order_value.toFixed(2)} ج.م</div>
                            <div class="spotlight-stat-lbl">متوسط حجم الفاتورة</div>
                        </div>
                        <div class="spotlight-stat-item">
                            <div class="spotlight-stat-val">${top.invoices_count}</div>
                            <div class="spotlight-stat-lbl">فواتير منجزة</div>
                        </div>
                    </div>
                `;
            } else {
                spotlightCard.style.display = 'none';
            }
        }

        const sellersTbody = document.getElementById('sellersPerformanceTableBody');
        const sellersEmpty = document.getElementById('sellersEmptyState');
        if (sellersTbody) {
            sellersTbody.innerHTML = '';
            if (!sellers || sellers.length === 0) {
                if (sellersEmpty) sellersEmpty.style.display = 'block';
            } else {
                if (sellersEmpty) sellersEmpty.style.display = 'none';
                sellers.forEach((s, idx) => {
                    const tr = document.createElement('tr');
                    const rankBadge = idx === 0 ? '<span style="color: #D97706; font-size: 15px; font-weight: 900;">🥇 #1</span>' : (idx === 1 ? '<span style="color: #64748B; font-size: 14px; font-weight: 900;">🥈 #2</span>' : `<span style="font-weight: 700; color: #94A3B8;">#${idx + 1}</span>`);
                    const badgeHtml = s.badge === 'top_performer'
                        ? '<span class="seller-badge top_performer"><i data-lucide="star" class="icon-xs"></i> توب سيلر</span>'
                        : (s.badge === 'high_volume'
                            ? '<span class="seller-badge high_volume"><i data-lucide="zap" class="icon-xs"></i> مبيعات قوية</span>'
                            : '<span class="seller-badge active"><i data-lucide="user-check" class="icon-xs"></i> نشط</span>');

                    tr.innerHTML = `
                        <td style="text-align: right;">${rankBadge}</td>
                        <td>
                            <div style="font-weight: 800; color: #1E293B; font-size: 13.5px;">${s.display_name}</div>
                            <div style="font-size: 11px; color: var(--text-muted);">@${s.username} • ${s.job_title || 'مسؤول مبيعات بالفرع'}</div>
                        </td>
                        <td style="text-align: center; font-weight: 800;">${s.invoices_count}</td>
                        <td style="font-weight: 900; color: #027A48; font-size: 14px;">${s.total_sales.toFixed(2)} ج.م</td>
                        <td style="text-align: center;">
                            <div style="font-weight: 800; color: #4338CA;">${s.sales_share}%</div>
                            <div style="width: 50px; height: 4px; background: #E0E7FF; border-radius: 4px; margin: 2px auto 0 auto; overflow: hidden;">
                                <div style="height: 100%; width: ${s.sales_share}%; background: #4F46E5;"></div>
                            </div>
                        </td>
                        <td style="font-weight: 700; color: #1E293B;">${s.avg_order_value.toFixed(2)} ج.م</td>
                        <td style="text-align: center; font-weight: 700; color: #475467;">${s.total_pieces} قطعة</td>
                        <td style="font-weight: 600; color: #B45309;">${s.total_discounts.toFixed(2)} ج.م (${s.discount_rate}%)</td>
                        <td style="font-weight: 800; color: #059669;">${s.total_profit.toFixed(2)} ج.م</td>
                        <td style="text-align: center;">${badgeHtml}</td>
                    `;
                    sellersTbody.appendChild(tr);
                });
            }
        }

        // 7. Render Top Movers Products & Visual Comparative Chart
        const topMoversVisual = document.getElementById('analyticsTopMoversVisualContainer');
        if (topMoversVisual) {
            topMoversVisual.innerHTML = '';
            const top5 = (topProducts || []).slice(0, 5);
            if (top5.length > 0) {
                const maxTopRev = Math.max(...top5.map(p => p.total_revenue || 0), 1);
                const chartWrapper = document.createElement('div');
                chartWrapper.className = 'top-movers-visual-chart';

                top5.forEach((p, idx) => {
                    const revPct = Math.min(100, Math.round(((p.total_revenue || 0) / maxTopRev) * 100));
                    const profitPct = (p.total_revenue || 0) > 0 ? Math.min(100, Math.round(((p.total_profit || 0) / p.total_revenue) * 100)) : 0;
                    const rankClass = idx === 0 ? 'rank-1' : (idx === 1 ? 'rank-2' : (idx === 2 ? 'rank-3' : ''));
                    const rankLabel = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));

                    const row = document.createElement('div');
                    row.className = 'top-mover-bar-row';
                    row.innerHTML = `
                        <div class="top-mover-header">
                            <span class="top-mover-name">
                                <span class="top-mover-rank ${rankClass}">${rankLabel}</span>
                                <span>${escapeHtml(p.item_name)}</span>
                                <span style="font-size: 11px; color: #64748B; font-weight: normal;">(${escapeHtml(p.category_name)})</span>
                            </span>
                            <div class="top-mover-metrics">
                                <span style="color: #0F172A; font-weight: 800;">${p.total_revenue.toFixed(2)} ج.م</span>
                                <span style="color: #059669; font-weight: 700;">+${p.total_profit.toFixed(2)} ج.م ربح</span>
                                <span style="color: #6366F1; font-weight: 700;">${p.total_quantity_sold} قطعة</span>
                            </div>
                        </div>
                        <div class="top-mover-track-wrap">
                            <div class="top-mover-fill-rev" style="width: ${revPct}%;" title="الإيراد: ${p.total_revenue} ج.م"></div>
                            <div class="top-mover-fill-profit" style="width: ${profitPct}%;" title="نسبة الربح: ${profitPct}%"></div>
                        </div>
                    `;
                    chartWrapper.appendChild(row);
                });
                topMoversVisual.appendChild(chartWrapper);
            }
        }

        const prodTbody = document.getElementById('anTopProductsTableBody');
        if (prodTbody) {
            prodTbody.innerHTML = '';
            if (!topProducts || topProducts.length === 0) {
                prodTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">لا توجد أصناف مباعة في هذه الفترة</td></tr>';
            } else {
                topProducts.forEach(p => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>
                            <div style="font-weight: 700; color: #1E293B; font-size: 12.5px;">${escapeHtml(p.item_name)}</div>
                            <div style="font-family: monospace; font-size: 11px; color: var(--text-muted);">${escapeHtml(p.barcode)}</div>
                        </td>
                        <td style="color: #475467; font-size: 12px;"><span class="badge" style="background: #F1F5F9;">${escapeHtml(p.category_name)}</span></td>
                        <td style="text-align: center; font-weight: 800; color: #0F172A;">${p.total_quantity_sold}</td>
                        <td style="font-weight: 800; color: #027A48;">${p.total_revenue.toFixed(2)} ج.م</td>
                        <td style="font-weight: 800; color: #15803D;">${p.total_profit.toFixed(2)} ج.م</td>
                    `;
                    prodTbody.appendChild(tr);
                });
            }
        }

        // 8. Render Smart Decision Insights & Margin Gauge
        const marginGaugeContainer = document.getElementById('analyticsMarginGaugeContainer');
        if (marginGaugeContainer) {
            const margin = kpis.profitMargin || 0;
            const isGood = margin >= 35;
            const isMid = margin >= 20 && margin < 35;
            const statusText = isGood ? 'معدل ربحية ممتاز' : (isMid ? 'معدل ربحية متزن' : 'هامش ربح منخفض');
            const statusColor = isGood ? '#10B981' : (isMid ? '#F59E0B' : '#EF4444');

            marginGaugeContainer.innerHTML = `
                <div class="margin-gauge-card">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <div style="width: 52px; height: 52px; border-radius: 50%; background: ${statusColor}22; border: 2.5px solid ${statusColor}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 900; color: ${statusColor};">
                            ${margin}%
                        </div>
                        <div>
                            <div style="font-size: 14px; font-weight: 800; color: #FFFFFF;">${statusText} (Gross Margin)</div>
                            <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">نسبة صافي العائد الربحي من المبيعات بعد خصم تكلفة البضاعة</div>
                        </div>
                    </div>
                    <div style="text-align: left;">
                        <div style="font-size: 11.5px; color: #94A3B8;">صافي الأرباح المحققة</div>
                        <div style="font-size: 17px; font-weight: 900; color: #34D399;">${kpis.grossProfit.toFixed(2)} ج.م</div>
                    </div>
                </div>
            `;
        }

        const insightsContainer = document.getElementById('analyticsSmartInsightsContainer');
        if (insightsContainer) {
            insightsContainer.innerHTML = '';

            // Insight 1: Top Category
            if (categories && categories.length > 0) {
                const topCat = categories[0];
                const card1 = document.createElement('div');
                card1.className = 'smart-insight-card insight-star';
                card1.innerHTML = `
                    <div class="smart-insight-icon"><i data-lucide="award" class="icon-sm" style="color: #16A34A;"></i></div>
                    <div class="smart-insight-body">
                        <h5>القسم الحصان الرابح: ${escapeHtml(topCat.category_name)}</h5>
                        <p>يساهم بنسبة <strong>${topCat.share_percent}%</strong> من إجمالي مبيعات المتجر، ويحقق هامش ربح تشغيلي <strong>${topCat.profit_margin}%</strong>. يُوصى بتعزيز مخزون هذا القسم والتفاوض على خصومات كميات مع الموردين.</p>
                    </div>
                `;
                insightsContainer.appendChild(card1);
            }

            // Insight 2: Top Seller
            if (sellers && sellers.length > 0) {
                const topS = sellers[0];
                const card2 = document.createElement('div');
                card2.className = 'smart-insight-card insight-opportunity';
                card2.innerHTML = `
                    <div class="smart-insight-icon"><i data-lucide="trending-up" class="icon-sm" style="color: #2563EB;"></i></div>
                    <div class="smart-insight-body">
                        <h5>كفاءة البيع: ${escapeHtml(topS.display_name)} يقود المبيعات</h5>
                        <p>حقق إيراد <strong>${topS.total_sales.toFixed(2)} ج.م</strong> بمتوسط سلة <strong>${topS.avg_order_value.toFixed(2)} ج.م</strong>. يُقترح تعميم أسلوب عرضه واقتراحه للقطع التكميلية (Cross-selling) على باقي الكادر.</p>
                    </div>
                `;
                insightsContainer.appendChild(card2);
            }

            // Insight 3: Discounts & Pricing Health
            const card3 = document.createElement('div');
            const isDiscountHigh = kpis.discountRate > 5;
            card3.className = `smart-insight-card ${isDiscountHigh ? 'insight-alert' : 'insight-opportunity'}`;
            card3.innerHTML = `
                <div class="smart-insight-icon"><i data-lucide="${isDiscountHigh ? 'alert-triangle' : 'shield-check'}" class="icon-sm" style="color: ${isDiscountHigh ? '#D97706' : '#2563EB'};"></i></div>
                <div class="smart-insight-body">
                    <h5>${isDiscountHigh ? 'تنبيه مراقبة سياسة الخصومات' : 'انضباط ممتاز في سياسة التسعير والخصومات'}</h5>
                    <p>${isDiscountHigh ? `بلغت نسبة الخصومات <strong>${kpis.discountRate}%</strong> بإجمالي <strong>${kpis.totalDiscounts.toFixed(2)} ج.م</strong>، يُفضل تدقيق الخصومات اليدوية لضمان عدم تأكل هامش الربح.` : `معدل الخصومات الحالي <strong>${kpis.discountRate}%</strong> منضبط تماماً دون إهدار لهوامش الربحية الإجمالية (${kpis.profitMargin}%).`}</p>
                </div>
            `;
            insightsContainer.appendChild(card3);
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }
    } catch (err) {
        console.error('Error loading sales analytics dashboard:', err);
    }

    refreshIcons(document.getElementById('view-sales-analytics'));
}
window.loadSalesAnalyticsDashboard = loadSalesAnalyticsDashboard;

/* -------------------------------------------------------------
 * 8. SALES & POS SETTINGS CONTROLLER
 * ------------------------------------------------------------- */
function updateLiveReceiptPreview() {
    const storeName = document.getElementById('setting_store_name')?.value.trim() || 'Cotton Club Store';
    const storePhone = document.getElementById('setting_store_phone')?.value.trim() || '';
    const storeAddress = document.getElementById('setting_store_address')?.value.trim() || 'القاهرة، مصر';
    const taxNumber = document.getElementById('setting_tax_number')?.value.trim() || '123-456-789';
    const currency = document.getElementById('setting_currency_symbol')?.value.trim() || 'ج.م';
    const footerText = document.getElementById('setting_receipt_footer')?.value.trim() || 'شكراً لزيارتكم - البضاعة المباعة ترد وتستبدل خلال 14 يوماً';
    const paperWidth = document.getElementById('setting_printer_paper_width')?.value || '80mm';
    const showBarcode = document.getElementById('setting_enable_barcode_on_receipt')?.value !== 'false';
    const maxDiscount = document.getElementById('setting_cashier_max_discount_percent')?.value || '5';
    const autoPrint = document.getElementById('setting_auto_print_receipt')?.value !== 'false';

    // Update Live Thermal Card Container
    const simCard = document.getElementById('thermalPaperSim');
    const badgeWidth = document.getElementById('previewPaperWidthBadge');
    if (simCard) {
        simCard.classList.toggle('width-80mm', paperWidth === '80mm');
        simCard.classList.toggle('width-58mm', paperWidth === '58mm');
    }
    if (badgeWidth) {
        badgeWidth.textContent = paperWidth === '58mm' ? '58 مم' : '80 مم';
    }

    const prevName = document.getElementById('prevStoreName');
    if (prevName) prevName.textContent = storeName;

    const prevAddress = document.getElementById('prevStoreAddress');
    if (prevAddress) prevAddress.textContent = storeAddress;

    const prevPhone = document.getElementById('prevStorePhone');
    if (prevPhone) {
        prevPhone.textContent = storePhone ? `هاتف: ${storePhone}` : '';
        prevPhone.style.display = storePhone ? 'block' : 'none';
    }

    const prevTax = document.getElementById('prevTaxNumber');
    if (prevTax) {
        prevTax.textContent = taxNumber ? `س.ت / ضريبي: ${taxNumber}` : '';
        prevTax.style.display = taxNumber ? 'block' : 'none';
    }

    document.querySelectorAll('.prevCurrency').forEach(el => {
        el.textContent = currency;
    });

    const prevFooter = document.getElementById('prevFooterText');
    if (prevFooter) prevFooter.textContent = footerText;

    const barcodeBox = document.getElementById('prevBarcodeBox');
    const barcodeSvg = document.getElementById('prevBarcodeSvg');
    if (barcodeBox) barcodeBox.style.display = showBarcode ? 'flex' : 'none';
    if (showBarcode && barcodeSvg && typeof generateCode128Svg === 'function') {
        barcodeSvg.outerHTML = generateCode128Svg('INV-2026-0042', 32);
    }

    const prevTime = document.getElementById('prevCurrentTime');
    if (prevTime) {
        const now = new Date();
        prevTime.textContent = now.toLocaleDateString('ar-EG') + ' ' + now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }

    // Update KPI Summary Cards at the top
    const kpiName = document.getElementById('kpiSettingsStoreName');
    if (kpiName) kpiName.textContent = storeName;

    const kpiDiscount = document.getElementById('kpiSettingsMaxDiscount');
    if (kpiDiscount) kpiDiscount.textContent = `${maxDiscount}%`;

    const kpiWidth = document.getElementById('kpiSettingsPrinterWidth');
    if (kpiWidth) kpiWidth.textContent = paperWidth === '58mm' ? '58 مم (صغير)' : '80 مم (قياسي)';

    const kpiAuto = document.getElementById('kpiSettingsAutoPrint');
    if (kpiAuto) kpiAuto.textContent = autoPrint ? 'مفعلة تلقائياً' : 'معطلة (يدوي)';
}
window.updateLiveReceiptPreview = updateLiveReceiptPreview;

function triggerTestReceiptPrint() {
    const simCard = document.getElementById('thermalPaperSim');
    if (!simCard) return;

    const paperWidth = document.getElementById('setting_printer_paper_width')?.value || '80mm';
    const widthPx = paperWidth === '58mm' ? '270px' : '360px';

    const printWin = window.open('', '_blank', 'width=450,height=600');
    if (!printWin) {
        alert('يرجى السماح بالنوافذ المنبثقة لإجراء الطباعة التجريبية.');
        return;
    }

    printWin.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>طباعة تجريبية - إيصال مبيعات</title>
            <style>
                @page { size: ${paperWidth} auto; margin: 0; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, monospace;
                    width: ${widthPx};
                    margin: 0 auto;
                    padding: 10px;
                    color: #000;
                    font-size: 12px;
                    line-height: 1.4;
                    direction: rtl;
                }
                .thermal-receipt-divider { border-top: 1px dashed #000; margin: 8px 0; }
                .thermal-receipt-line { display: flex; justify-content: space-between; align-items: center; margin: 2px 0; }
                .thermal-receipt-line.bold { font-weight: bold; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th, td { padding: 3px 0; }
                .thermal-barcode-box { text-align: center; margin: 10px 0; display: flex; flex-direction: column; align-items: center; }
            </style>
        </head>
        <body>
            ${simCard.innerHTML}
            <script>
                window.onload = function() {
                    window.focus();
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            </script>
        </body>
        </html>
    `);
    printWin.document.close();
}
window.triggerTestReceiptPrint = triggerTestReceiptPrint;

function bindSettingsEvents() {
    const saveBtn = document.getElementById('btnSaveSettings');
    const saveRulesBtn = document.getElementById('btnSavePosRules');

    const handleSave = async () => {
        const maxDiscountRules = document.getElementById('setting_cashier_max_discount_percent_rules')?.value;
        const maxDiscount = maxDiscountRules || document.getElementById('setting_cashier_max_discount_percent')?.value || '5';

        const settingsMap = {
            store_name: document.getElementById('setting_store_name')?.value.trim() || 'Cotton Club Store',
            store_phone: document.getElementById('setting_store_phone')?.value.trim() || '',
            store_address: document.getElementById('setting_store_address')?.value.trim() || '',
            tax_number: document.getElementById('setting_tax_number')?.value.trim() || '',
            currency_symbol: document.getElementById('setting_currency_symbol')?.value.trim() || 'ج.م',
            receipt_footer: document.getElementById('setting_receipt_footer')?.value.trim() || '',
            printer_paper_width: document.getElementById('setting_printer_paper_width')?.value || '80mm',
            cashier_max_discount_percent: maxDiscount,
            return_policy_days: document.getElementById('setting_return_policy_days')?.value || '14',
            allow_below_cost_sale: document.getElementById('setting_allow_below_cost_sale')?.value || 'warn',
            auto_print_receipt: document.getElementById('setting_auto_print_receipt')?.value || 'true',
            enable_barcode_on_receipt: document.getElementById('setting_enable_barcode_on_receipt')?.value || 'true',
            auto_close_shift_time: document.getElementById('setting_auto_close_shift_time')?.value || '03:00',
            auto_shift_rollover_enabled: document.getElementById('setting_auto_shift_rollover_enabled')?.value || '1',
            // POS Rules & Permissions (Card 4)
            allow_salesperson_discount: document.getElementById('setting_allow_salesperson_discount')?.checked ? '1' : '0',
            require_supervisor_discount: document.getElementById('setting_require_supervisor_discount')?.checked ? '1' : '0',
            allow_salesperson_returns: document.getElementById('setting_allow_salesperson_returns')?.checked ? '1' : '0',
            require_customer_name: document.getElementById('setting_require_customer_name')?.checked ? '1' : '0',
            require_customer_phone: document.getElementById('setting_require_customer_phone')?.checked ? '1' : '0',
            default_opening_float: document.getElementById('setting_default_opening_float')?.value || '0'
        };

        const userId = state.currentUser?.id || 1;
        const res = await window.api.updateSettings(settingsMap, userId);
        if (res.success) {
            state.settings = res.data;
            const storeNameEl = document.getElementById('headerStoreName');
            if (storeNameEl) storeNameEl.innerText = state.settings.store_name;
            updateLiveReceiptPreview();
            alert('✅ تم حفظ وتطبيق إعدادات وقواعد البيع فورياً على نظام الكاشير!');
        } else {
            alert(`خطأ في حفظ الإعدادات: ${res.error}`);
        }
    };

    if (saveBtn) saveBtn.addEventListener('click', handleSave);
    if (saveRulesBtn) saveRulesBtn.addEventListener('click', handleSave);

    // Two-way sync between standard max discount and Card 4 max discount
    const d1 = document.getElementById('setting_cashier_max_discount_percent');
    const d2 = document.getElementById('setting_cashier_max_discount_percent_rules');
    if (d1 && d2) {
        d1.addEventListener('input', () => { d2.value = d1.value; });
        d2.addEventListener('input', () => { d1.value = d2.value; updateLiveReceiptPreview(); });
    }

    const testPrintBtn = document.getElementById('btnTestPrintReceipt');
    if (testPrintBtn) {
        testPrintBtn.addEventListener('click', triggerTestReceiptPrint);
    }

    // Attach real-time input listeners to all setting fields
    const liveFields = [
        'setting_store_name',
        'setting_store_phone',
        'setting_store_address',
        'setting_tax_number',
        'setting_currency_symbol',
        'setting_receipt_footer',
        'setting_printer_paper_width',
        'setting_cashier_max_discount_percent',
        'setting_cashier_max_discount_percent_rules',
        'setting_return_policy_days',
        'setting_allow_below_cost_sale',
        'setting_auto_print_receipt',
        'setting_enable_barcode_on_receipt',
        'setting_auto_close_shift_time',
        'setting_auto_shift_rollover_enabled',
        'setting_default_opening_float'
    ];

    liveFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateLiveReceiptPreview);
            el.addEventListener('change', updateLiveReceiptPreview);
        }
    });
}

async function loadSettings() {
    const res = await window.api.getSettings();
    if (res.success) {
        state.settings = res.data;
        if (state.settings.store_name) {
            const storeNameEl = document.getElementById('headerStoreName');
            if (storeNameEl) storeNameEl.innerText = state.settings.store_name;
        }
    }
}

function populateSettingsForm() {
    const s = state.settings || {};
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };
    const setChecked = (id, bool) => {
        const el = document.getElementById(id);
        if (el) el.checked = !!bool;
    };

    setVal('setting_store_name', s.store_name || 'Cotton Club Store');
    setVal('setting_store_phone', s.store_phone || '');
    setVal('setting_store_address', s.store_address || '');
    setVal('setting_tax_number', s.tax_number || '');
    setVal('setting_currency_symbol', s.currency_symbol || 'ج.م');
    setVal('setting_receipt_footer', s.receipt_footer || 'شكراً لزيارتكم - البضاعة المباعة ترد وتستبدل خلال 14 يوماً');
    setVal('setting_printer_paper_width', s.printer_paper_width || '80mm');
    setVal('setting_cashier_max_discount_percent', s.cashier_max_discount_percent || '5');
    setVal('setting_cashier_max_discount_percent_rules', s.cashier_max_discount_percent || '5');
    setVal('setting_return_policy_days', s.return_policy_days || '14');
    setVal('setting_allow_below_cost_sale', s.allow_below_cost_sale || 'warn');
    setVal('setting_auto_print_receipt', s.auto_print_receipt !== undefined ? String(s.auto_print_receipt) : 'true');
    setVal('setting_enable_barcode_on_receipt', s.enable_barcode_on_receipt !== undefined ? String(s.enable_barcode_on_receipt) : 'true');
    setVal('setting_auto_close_shift_time', s.auto_close_shift_time || '03:00');
    setVal('setting_auto_shift_rollover_enabled', s.auto_shift_rollover_enabled !== undefined ? String(s.auto_shift_rollover_enabled) : '1');

    // POS Rules & Permissions (Card 4)
    setChecked('setting_allow_salesperson_discount', s.allow_salesperson_discount !== '0');
    setChecked('setting_require_supervisor_discount', s.require_supervisor_discount === '1');
    setChecked('setting_allow_salesperson_returns', s.allow_salesperson_returns !== '0');
    setChecked('setting_require_customer_name', s.require_customer_name === '1');
    setChecked('setting_require_customer_phone', s.require_customer_phone === '1');
    setVal('setting_default_opening_float', s.default_opening_float || '0');
}

async function loadSalesSettingsView() {
    await loadSettings();
    populateSettingsForm();
    updateLiveReceiptPreview();
    const panel = document.getElementById('view-sales-settings');
    if (panel) refreshIcons(panel);
}
window.loadSalesSettingsView = loadSalesSettingsView;

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

/* -------------------------------------------------------------
 * 10. STOCK AUDIT & PHYSICAL ADJUSTMENT VOUCHERS
 * ------------------------------------------------------------- */
let allAuditProductsCache = [];
let allAdjustmentsCache = [];
let activeAuditSheetTab = 'in_stock';
let auditCategoriesCache = [];

function bindStockAuditEvents() {
    // 1. Dual-View Mode Switchers (Sheet vs Ledger)
    const btnTabSheet = document.getElementById('btnTabAuditSheet');
    const btnTabLedger = document.getElementById('btnTabAuditLedger');
    if (btnTabSheet) btnTabSheet.addEventListener('click', () => switchAuditMainView('sheet'));
    if (btnTabLedger) btnTabLedger.addEventListener('click', () => switchAuditMainView('ledger'));

    // 2. Audit Sheet Search & Category Filters
    const sheetSearch = document.getElementById('auditSheetSearchInput');
    if (sheetSearch) sheetSearch.addEventListener('input', renderStockAuditSheetTable);

    const sheetCat = document.getElementById('auditSheetCategoryFilter');
    if (sheetCat) sheetCat.addEventListener('change', renderStockAuditSheetTable);

    // 3. Refresh Button
    const refreshBtn = document.getElementById('btnRefreshStockAudit');
    if (refreshBtn) refreshBtn.addEventListener('click', loadStockAuditView);

    // 4. Manual Modal Open Button
    const openRecountBtn = document.getElementById('btnOpenStockRecountModal');
    if (openRecountBtn) {
        openRecountBtn.addEventListener('click', () => {
            populateAuditProductSelect(allAuditProductsCache);
            const filterInput = document.getElementById('recountProductFilter');
            if (filterInput) filterInput.value = '';

            document.getElementById('recountCurrentStock').value = '';
            document.getElementById('recountUnitCost').value = '';
            document.getElementById('recountActualStock').value = '';
            document.getElementById('recountNotes').value = '';
            document.getElementById('recountDiffBanner').style.display = 'none';

            document.getElementById('modalStockRecount').classList.add('active');
            refreshIcons(document.getElementById('modalStockRecount'));
        });
    }

    // 5. Manual Modal Inputs
    const filterInput = document.getElementById('recountProductFilter');
    if (filterInput) {
        filterInput.addEventListener('input', () => {
            const term = filterInput.value.trim().toLowerCase();
            const filtered = term ? allAuditProductsCache.filter(p => 
                (p.item_name && p.item_name.toLowerCase().includes(term)) ||
                (p.barcode && p.barcode.toLowerCase().includes(term))
            ) : allAuditProductsCache;
            populateAuditProductSelect(filtered);
        });
    }

    const recountSel = document.getElementById('recountProductSelect');
    if (recountSel) {
        recountSel.addEventListener('change', () => {
            const opt = recountSel.options[recountSel.selectedIndex];
            if (opt && opt.value) {
                document.getElementById('recountCurrentStock').value = opt.dataset.stock || 0;
                document.getElementById('recountUnitCost').value = Number(opt.dataset.cost || 0).toFixed(2);
            } else {
                document.getElementById('recountCurrentStock').value = '';
                document.getElementById('recountUnitCost').value = '';
            }
            updateStockRecountDiffBanner();
        });
    }

    const actualInput = document.getElementById('recountActualStock');
    if (actualInput) actualInput.addEventListener('input', updateStockRecountDiffBanner);

    const submitRecountBtn = document.getElementById('btnSubmitStockRecount');
    if (submitRecountBtn) submitRecountBtn.addEventListener('click', submitManualStockRecount);

    // 6. Row-Level Quick Audit Confirmation Modal Submit
    const btnConfirmRow = document.getElementById('btnConfirmRowAuditSubmit');
    if (btnConfirmRow) btnConfirmRow.addEventListener('click', submitRowAuditConfirm);

    // 7. Ledger Filters
    const searchInput = document.getElementById('auditSearchInput');
    if (searchInput) searchInput.addEventListener('input', filterAndRenderStockAdjustments);

    const typeFilter = document.getElementById('auditFilterType');
    if (typeFilter) typeFilter.addEventListener('change', filterAndRenderStockAdjustments);
}

function switchAuditMainView(mode) {
    const sheetPanel = document.getElementById('panelStockAuditSheet');
    const ledgerPanel = document.getElementById('panelStockAuditLedger');
    const btnSheet = document.getElementById('btnTabAuditSheet');
    const btnLedger = document.getElementById('btnTabAuditLedger');

    if (mode === 'sheet') {
        if (sheetPanel) sheetPanel.style.display = 'flex';
        if (ledgerPanel) ledgerPanel.style.display = 'none';
        if (btnSheet) btnSheet.classList.add('active');
        if (btnLedger) btnLedger.classList.remove('active');
    } else {
        if (sheetPanel) sheetPanel.style.display = 'none';
        if (ledgerPanel) ledgerPanel.style.display = 'flex';
        if (btnSheet) btnSheet.classList.remove('active');
        if (btnLedger) btnLedger.classList.add('active');
        filterAndRenderStockAdjustments();
    }
    refreshIcons();
}

window.switchAuditSheetTab = function(tabKey) {
    activeAuditSheetTab = tabKey;

    const tabInStock = document.getElementById('tabAuditInStock');
    const tabZeroStock = document.getElementById('tabAuditZeroStock');
    const tabAll = document.getElementById('tabAuditAll');

    if (tabInStock) tabInStock.classList.toggle('active', tabKey === 'in_stock');
    if (tabZeroStock) tabZeroStock.classList.toggle('active', tabKey === 'zero_stock');
    if (tabAll) tabAll.classList.toggle('active', tabKey === 'all');

    const banner = document.getElementById('stockAuditBanner');
    const bannerTitle = document.getElementById('stockAuditBannerTitle');
    const bannerDesc = document.getElementById('stockAuditBannerDesc');
    const bannerIconWrap = document.getElementById('stockAuditBannerIconWrap');

    if (banner) {
        banner.className = 'stock-audit-banner';
        if (tabKey === 'in_stock') {
            bannerIconWrap.innerHTML = '<i data-lucide="check-circle-2" class="icon-md"></i>';
            bannerTitle.style.color = '#166534';
            bannerTitle.innerText = 'كشف الأصناف ذات الأرصدة المتوفرة (> 0)';
            bannerDesc.innerText = 'يعرض فقط المنتجات المسجل لها كميات مخزنية فعلية في النظام (> 0)، وهي القائمة الأساسية المعتمدة للجرد الدوري والمطابقة الميدانية.';
        } else if (tabKey === 'zero_stock') {
            banner.classList.add('banner-zero');
            bannerIconWrap.innerHTML = '<i data-lucide="ban" class="icon-md"></i>';
            bannerTitle.style.color = '#991b1b';
            bannerTitle.innerText = 'كشف الأصناف منعدمة الرصيد (= 0)';
            bannerDesc.innerText = 'يعرض المنتجات التي نفد رصيدها بالكامل في المخزن (= 0) لإجراء المعاينة وحصر العجز أو تسوية بضاعة واردة.';
        } else {
            banner.classList.add('banner-all');
            bannerIconWrap.innerHTML = '<i data-lucide="layers" class="icon-md"></i>';
            bannerTitle.style.color = '#1e40af';
            bannerTitle.innerText = 'كشف كافة أصناف المخزون (شامل)';
            bannerDesc.innerText = 'يعرض جميع الأصناف المسجلة في النظام سواء كانت متوفرة أو منعدمة الرصيد لإجراء الجرد العام الشامل.';
        }
        refreshIcons(banner);
    }

    renderStockAuditSheetTable();
};

async function loadStockAuditView() {
    // 1. Fetch Products
    const pRes = await window.api.listProducts({});
    allAuditProductsCache = (pRes && pRes.data) ? pRes.data : [];

    // 2. Fetch Categories for filter dropdown
    if (auditCategoriesCache.length === 0) {
        const cRes = await window.api.listCategories({});
        auditCategoriesCache = (cRes && cRes.data) ? cRes.data : [];
        const catSel = document.getElementById('auditSheetCategoryFilter');
        if (catSel) {
            catSel.innerHTML = '<option value="all">كافة المجموعات</option>';
            auditCategoriesCache.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.innerText = c.name;
                catSel.appendChild(opt);
            });
        }
    }

    // 3. Compute Quick Filter Tab Counts
    const inStockCount = allAuditProductsCache.filter(p => Number(p.current_stock || 0) > 0).length;
    const zeroStockCount = allAuditProductsCache.filter(p => Number(p.current_stock || 0) <= 0).length;
    const allCount = allAuditProductsCache.length;

    const kpiInStock = document.getElementById('kpiAuditInStockCount');
    if (kpiInStock) kpiInStock.innerText = `${inStockCount} صنف`;

    const kpiZeroStock = document.getElementById('kpiAuditZeroStockCount');
    if (kpiZeroStock) kpiZeroStock.innerText = `${zeroStockCount} صنف`;

    const kpiAll = document.getElementById('kpiAuditAllCount');
    if (kpiAll) kpiAll.innerText = `${allCount} صنف`;

    // 4. Render main interactive sheet
    renderStockAuditSheetTable();

    // 5. Load past adjustments ledger
    await loadStockAuditLedgerData();
}

function renderStockAuditSheetTable() {
    const tbody = document.getElementById('stockAuditSheetTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchTerm = (document.getElementById('auditSheetSearchInput')?.value || '').trim().toLowerCase();
    const catFilter = document.getElementById('auditSheetCategoryFilter')?.value || 'all';

    let list = allAuditProductsCache;

    // Filter by Tab
    if (activeAuditSheetTab === 'in_stock') {
        list = list.filter(p => Number(p.current_stock || 0) > 0);
    } else if (activeAuditSheetTab === 'zero_stock') {
        list = list.filter(p => Number(p.current_stock || 0) <= 0);
    }

    // Filter by Category
    if (catFilter !== 'all') {
        list = list.filter(p => String(p.category_id) === String(catFilter));
    }

    // Filter by Search Query
    if (searchTerm) {
        list = list.filter(p =>
            (p.barcode && p.barcode.toLowerCase().includes(searchTerm)) ||
            (p.product_code && p.product_code.toLowerCase().includes(searchTerm)) ||
            (p.item_name && p.item_name.toLowerCase().includes(searchTerm)) ||
            (p.category_name && p.category_name.toLowerCase().includes(searchTerm))
        );
    }

    const countDisplay = document.getElementById('auditSheetCountDisplay');
    if (countDisplay) countDisplay.innerText = `${list.length} صنف معروض`;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 32px;">لا توجد أصناف تطابق معايير البحث الحالية</td></tr>';
        return;
    }

    list.forEach(p => {
        const bookStock = Number(p.current_stock || 0);
        const costPrice = Number(p.cost_price || 0);
        const sellPrice = Number(p.sell_price || 0);
        const totalValuation = Math.round(bookStock * costPrice * 100) / 100;
        
        let profitMargin = 0;
        if (sellPrice > 0) {
            profitMargin = Math.round(((sellPrice - costPrice) / sellPrice) * 1000) / 10;
        }

        const tr = document.createElement('tr');
        tr.id = `auditRow_${p.id}`;
        tr.innerHTML = `
            <!-- 1. كود الصنف / الباركود -->
            <td style="font-family: monospace; font-weight: 800; color: #1e3a8a;">
                <div>${p.product_code || p.barcode}</div>
                <div style="font-size: 11px; color: var(--text-muted); font-family: monospace;">${p.barcode}</div>
            </td>

            <!-- 2. اسم الصنف والمجموعة -->
            <td>
                <div style="font-weight: 800; color: var(--text-primary); font-size: 14px;">${p.item_name}</div>
                <div style="font-size: 11.5px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                    <i data-lucide="tag" class="icon-xs" style="color: var(--primary);"></i>
                    <span>${p.category_name || 'عام'}</span>
                </div>
            </td>

            <!-- 3. التسعير والهامش -->
            <td>
                <div class="pricing-breakdown-box">
                    <div class="pricing-line">
                        <span style="color: var(--text-muted);">البيع:</span>
                        <strong style="color: #0284c7;">${sellPrice.toFixed(2)} ج.م</strong>
                    </div>
                    <div class="pricing-line">
                        <span style="color: var(--text-muted);">التكلفة:</span>
                        <strong>${costPrice.toFixed(2)} ج.م</strong>
                    </div>
                    <div class="margin-pill">الهامش: ${profitMargin}%</div>
                </div>
            </td>

            <!-- 4. الرصيد الدفتري (النظام) -->
            <td style="text-align: center;">
                <span class="badge ${bookStock > 0 ? 'badge-ok' : 'badge-low-stock'}" style="font-size: 12px; padding: 4px 10px; font-weight: 800;">
                    ${bookStock} قطعة
                </span>
            </td>

            <!-- 5. إجمالي القيمة التقديرية -->
            <td style="text-align: left; font-weight: 800; font-size: 13.5px; color: var(--text-primary);">
                ${totalValuation.toFixed(2)} ج.م
            </td>

            <!-- 6. الرصيد الفعلي (المحصى) - Interactive Input -->
            <td style="text-align: center;">
                <div class="actual-stock-input-wrap">
                    <input type="number" class="input-row-actual-stock" min="0" step="1" placeholder="أدخل الفعلي..." data-id="${p.id}" data-book="${bookStock}" id="actualStockInput_${p.id}" oninput="handleRowActualStockInput(${p.id})">
                </div>
            </td>

            <!-- 7. الفارق (عجز / زيادة) -->
            <td style="text-align: center;" id="rowDiffCell_${p.id}">
                <span style="color: var(--text-muted); font-weight: 700;">-</span>
            </td>

            <!-- 8. إجراءات: جرد مخزون -->
            <td style="text-align: center;">
                <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                    <button type="button" class="btn-apply-row-audit" onclick="openRowAuditConfirmModal(${p.id})" title="تطبيق سند جرد المخزون لهذا الصنف">
                        <i data-lucide="clipboard-check" class="icon-xs"></i>
                        <span>جرد مخزون</span>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    refreshIcons(tbody);
}

window.handleRowActualStockInput = function(productId) {
    const input = document.getElementById(`actualStockInput_${productId}`);
    const diffCell = document.getElementById(`rowDiffCell_${productId}`);
    if (!input || !diffCell) return;

    const valStr = input.value.trim();
    if (valStr === '') {
        diffCell.innerHTML = '<span style="color: var(--text-muted); font-weight: 700;">-</span>';
        return;
    }

    const actual = Number(valStr);
    const book = Number(input.dataset.book || 0);
    const diff = actual - book;

    if (diff === 0) {
        diffCell.innerHTML = '<span style="color: #2563eb; font-weight: 800; background: #eff6ff; padding: 3px 8px; border-radius: 4px; border: 1px solid #bfdbfe;">مطابق (0)</span>';
    } else if (diff < 0) {
        diffCell.innerHTML = `<span style="color: #b91c1c; font-weight: 800; background: #fef2f2; padding: 3px 8px; border-radius: 4px; border: 1px solid #fecaca;">عجز: ${diff}</span>`;
    } else {
        diffCell.innerHTML = `<span style="color: #15803d; font-weight: 800; background: #f0fdf4; padding: 3px 8px; border-radius: 4px; border: 1px solid #bbf7d0;">فائض: +${diff}</span>`;
    }
};

window.openRowAuditConfirmModal = function(productId) {
    const p = allAuditProductsCache.find(x => x.id === productId);
    if (!p) return;

    const input = document.getElementById(`actualStockInput_${productId}`);
    const actualVal = input ? input.value.trim() : '';

    if (actualVal === '') {
        alert('يرجى إدخال الرصيد الفعلي أولاً في خانة «الرصيد الفعلي (المحصى)» للصنف');
        if (input) input.focus();
        return;
    }

    const book = Number(p.current_stock || 0);
    const actual = Number(actualVal);
    const diff = actual - book;

    document.getElementById('rowAuditProductId').value = p.id;
    document.getElementById('rowAuditProductName').innerText = p.item_name;
    document.getElementById('rowAuditProductCode').innerText = `${p.product_code || p.barcode} (${p.category_name || 'عام'})`;
    document.getElementById('rowAuditBookStock').innerText = `${book} قطعة`;
    document.getElementById('rowAuditActualStock').innerText = `${actual} قطعة`;

    const diffBox = document.getElementById('rowAuditDiffBox');
    const diffLabel = document.getElementById('rowAuditDiffLabel');
    const diffVal = document.getElementById('rowAuditDiffVal');
    const reasonSel = document.getElementById('rowAuditReason');

    if (diff === 0) {
        diffBox.style.background = '#eff6ff';
        diffLabel.style.color = '#1d4ed8';
        diffVal.style.color = '#1e40af';
        diffVal.innerText = '0 (مطابق)';
        if (reasonSel) reasonSel.value = 'inventory_count';
    } else if (diff < 0) {
        diffBox.style.background = '#fef2f2';
        diffLabel.style.color = '#991b1b';
        diffVal.style.color = '#b91c1c';
        diffVal.innerText = `${diff} (عجز)`;
        if (reasonSel) reasonSel.value = 'damage';
    } else {
        diffBox.style.background = '#f0fdf4';
        diffLabel.style.color = '#166534';
        diffVal.style.color = '#15803d';
        diffVal.innerText = `+${diff} (فائض)`;
        if (reasonSel) reasonSel.value = 'other';
    }

    document.getElementById('rowAuditNotes').value = '';
    document.getElementById('modalRowAuditConfirm').classList.add('active');
    refreshIcons(document.getElementById('modalRowAuditConfirm'));
};

async function submitRowAuditConfirm() {
    const productId = Number(document.getElementById('rowAuditProductId').value);
    const p = allAuditProductsCache.find(x => x.id === productId);
    if (!p) return;

    const input = document.getElementById(`actualStockInput_${productId}`);
    const actualVal = input ? input.value.trim() : '';
    if (actualVal === '') {
        alert('الكمية الفعلية مفقودة');
        return;
    }

    const actualStock = Number(actualVal);
    const bookStock = Number(p.current_stock || 0);
    const diff = actualStock - bookStock;

    const reason = document.getElementById('rowAuditReason').value;
    const userNotes = document.getElementById('rowAuditNotes').value.trim();

    const adjustmentType = diff < 0 ? 'decrease' : diff > 0 ? 'increase' : 'recount';
    const quantity = diff === 0 ? actualStock : Math.abs(diff);
    const noteDetails = `الرصيد الدفتري: ${bookStock} -> الفعلي: ${actualStock} | الفارق: ${diff >= 0 ? '+' + diff : diff}${userNotes ? ' | ' + userNotes : ''}`;

    const res = await window.api.adjustStock({
        productId,
        adjustmentType,
        quantity,
        reason,
        notes: noteDetails
    }, state.currentUser.id, state.activeSession?.id);

    if (!res.success) {
        alert(`خطأ في تطبيق سند التسوية: ${res.error}`);
        return;
    }

    alert(`تم بنجاح اعتماد سند جرد المخزون للصنف «${p.item_name}»!\nالرصيد السابق: ${bookStock} | الرصيد الفعلي الجديد: ${actualStock} (${diff >= 0 ? '+' + diff : diff})`);
    document.getElementById('modalRowAuditConfirm').classList.remove('active');
    await loadStockAuditView();
}

async function submitManualStockRecount() {
    const sel = document.getElementById('recountProductSelect');
    const productId = sel.value;
    if (!productId) {
        alert('يرجى اختيار الصنف المراد جرده وتسويته أولاً');
        return;
    }

    const bookStock = Number(document.getElementById('recountCurrentStock').value) || 0;
    const actualVal = document.getElementById('recountActualStock').value.trim();
    if (actualVal === '') {
        alert('يرجى إدخال الكمية الفعلية المحصية بالرف');
        return;
    }

    const actualStock = Number(actualVal);
    const diff = actualStock - bookStock;
    const reason = document.getElementById('recountReason').value;
    const userNotes = document.getElementById('recountNotes').value.trim();

    const adjustmentType = diff < 0 ? 'decrease' : diff > 0 ? 'increase' : 'recount';
    const quantity = diff === 0 ? actualStock : Math.abs(diff);
    const noteDetails = `الرصيد الدفتري: ${bookStock} -> الفعلي: ${actualStock} | الفارق: ${diff >= 0 ? '+' + diff : diff}${userNotes ? ' | ' + userNotes : ''}`;

    const res = await window.api.adjustStock({
        productId: Number(productId),
        adjustmentType,
        quantity,
        reason,
        notes: noteDetails
    }, state.currentUser.id, state.activeSession?.id);

    if (!res.success) {
        alert(`خطأ في تطبيق سند التسوية: ${res.error}`);
        return;
    }

    alert(`تم تطبيق سند التسوية بنجاح!\nالرصيد السابق: ${bookStock} | الفعلي الجديد: ${actualStock} (${diff >= 0 ? '+' + diff : diff})`);
    document.getElementById('modalStockRecount').classList.remove('active');
    await loadStockAuditView();
}

function populateAuditProductSelect(products) {
    const sel = document.getElementById('recountProductSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- اختر الصنف المراد جرده وتسويته --</option>';
    products.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.dataset.stock = p.current_stock;
        opt.dataset.cost = p.cost_price || 0;
        opt.dataset.barcode = p.barcode;
        opt.dataset.name = p.item_name;
        opt.innerText = `${p.barcode} - ${p.item_name} (رصيد دفتري: ${p.current_stock} | تكلفة: ${Number(p.cost_price || 0).toFixed(2)} ج.م)`;
        sel.appendChild(opt);
    });
}

function updateStockRecountDiffBanner() {
    const bookVal = document.getElementById('recountCurrentStock').value;
    const actualVal = document.getElementById('recountActualStock').value;
    const unitCost = Number(document.getElementById('recountUnitCost').value) || 0;
    const banner = document.getElementById('recountDiffBanner');
    if (!banner) return;

    if (bookVal === '' || actualVal === '') {
        banner.style.display = 'none';
        return;
    }

    const book = Number(bookVal);
    const actual = Number(actualVal);
    const diff = actual - book;
    const costImpact = Math.abs(diff) * unitCost;

    banner.style.display = 'block';
    if (diff === 0) {
        banner.style.background = '#ECFDF5';
        banner.style.color = '#065F46';
        banner.style.border = '1px solid #A7F3D0';
        banner.innerText = 'الكمية الفعلية المحصية مطابقة تماماً للرصيد الدفتري (فارق 0 قطعة)';
    } else if (diff < 0) {
        banner.style.background = '#FEF2F2';
        banner.style.color = '#991B1B';
        banner.style.border = '1px solid #FECACA';
        banner.innerText = `عجز ونقص مخزني: ${diff} قطعة | الأثر المالي التقديري: -${costImpact.toFixed(2)} ج.م (سيتم خفض رصيد المخزن وتسجيل السند)`;
    } else {
        banner.style.background = '#EFF6FF';
        banner.style.color = '#1E40AF';
        banner.style.border = '1px solid #BFDBFE';
        banner.innerText = `فائض وزيادة مخزنية: +${diff} قطعة | القيمة المضافة المقدرة: +${costImpact.toFixed(2)} ج.م (سيتم زيادة رصيد المخزن وتسجيل السند)`;
    }
}

async function loadStockAuditLedgerData() {
    const res = await window.api.listStockAdjustments(100);
    allAdjustmentsCache = (res && res.data) ? res.data : [];

    let deficitCount = 0;
    let surplusCount = 0;
    let matchedCount = 0;

    allAdjustmentsCache.forEach(a => {
        if (a.adjustment_type === 'decrease' || (a.notes && a.notes.includes('عجز'))) {
            deficitCount++;
        } else if (a.adjustment_type === 'increase' || (a.notes && a.notes.includes('فائض'))) {
            surplusCount++;
        } else {
            matchedCount++;
        }
    });

    const kpiTotal = document.getElementById('kpiTotalAuditCount');
    if (kpiTotal) kpiTotal.innerText = allAdjustmentsCache.length;

    const kpiDeficit = document.getElementById('kpiAuditDeficitCount');
    if (kpiDeficit) kpiDeficit.innerText = deficitCount;

    const kpiSurplus = document.getElementById('kpiAuditSurplusCount');
    if (kpiSurplus) kpiSurplus.innerText = surplusCount;

    const kpiMatched = document.getElementById('kpiAuditMatchedCount');
    if (kpiMatched) kpiMatched.innerText = matchedCount;
}

function filterAndRenderStockAdjustments() {
    const tbody = document.getElementById('stockAdjustmentsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchTerm = (document.getElementById('auditSearchInput')?.value || '').trim().toLowerCase();
    const filterType = document.getElementById('auditFilterType')?.value || 'all';

    let list = allAdjustmentsCache;

    if (searchTerm) {
        list = list.filter(a =>
            String(a.id).includes(searchTerm) ||
            (a.barcode && a.barcode.toLowerCase().includes(searchTerm)) ||
            (a.item_name && a.item_name.toLowerCase().includes(searchTerm)) ||
            (a.user_name && a.user_name.toLowerCase().includes(searchTerm))
        );
    }

    if (filterType === 'deficit') {
        list = list.filter(a => a.adjustment_type === 'decrease' || (a.notes && a.notes.includes('عجز')));
    } else if (filterType === 'surplus') {
        list = list.filter(a => a.adjustment_type === 'increase' || (a.notes && a.notes.includes('فائض')));
    } else if (filterType === 'recount') {
        list = list.filter(a => a.adjustment_type === 'recount' || a.reason === 'inventory_count');
    }

    const countDisplay = document.getElementById('auditCountDisplay');
    if (countDisplay) countDisplay.innerText = `${list.length} حركة`;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 24px;">لا توجد سندات تسوية مخزنية مطابقة للبحث</td></tr>';
        return;
    }

    const reasonMap = {
        'inventory_count': 'جرد دوري مطابق',
        'damage': 'تالف وهالك تصنيع',
        'theft': 'عجز وفقدان غير مبرر',
        'expired': 'منتهي الصلاحية',
        'other': 'أخرى / تسوية رصيد'
    };

    list.forEach(a => {
        const isDeficit = a.adjustment_type === 'decrease' || (a.notes && a.notes.includes('عجز'));
        const isSurplus = a.adjustment_type === 'increase' || (a.notes && a.notes.includes('فائض'));

        let diffBadge = '';
        let typeBadge = '';

        if (isDeficit) {
            diffBadge = `<span style="color: var(--accent-rose); font-weight: 800;">-${a.quantity}</span>`;
            typeBadge = `<span class="badge" style="background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;">عجز مخزني (-)</span>`;
        } else if (isSurplus) {
            diffBadge = `<span style="color: var(--accent-emerald); font-weight: 800;">+${a.quantity}</span>`;
            typeBadge = `<span class="badge" style="background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;">فائض مخزني (+)</span>`;
        } else {
            diffBadge = `<span style="color: #2563eb; font-weight: 800;">مطابق (0)</span>`;
            typeBadge = `<span class="badge" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;">جرد مطابق / تسوية</span>`;
        }

        let bookStockText = '-';
        let actualStockText = a.adjustment_type === 'recount' ? a.quantity : '-';
        if (a.notes) {
            const m = a.notes.match(/الرصيد الدفتري:\s*(\d+)\s*->\s*الفعلي:\s*(\d+)/);
            if (m) {
                bookStockText = m[1];
                actualStockText = m[2];
            }
        }

        const reasonLabel = reasonMap[a.reason] || a.reason || '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 800; font-family: monospace; color: var(--primary);">#ADJ-${String(a.id).padStart(4, '0')}</td>
            <td style="font-family: monospace; font-weight: 700;">${a.barcode || '-'}</td>
            <td style="font-weight: 700;">${a.item_name || '-'}</td>
            <td style="text-align: center; color: var(--text-muted); font-weight: 600;">${bookStockText}</td>
            <td style="text-align: center; font-weight: 800;">${actualStockText}</td>
            <td style="text-align: center;">${diffBadge}</td>
            <td style="text-align: center;">${typeBadge}</td>
            <td style="font-size: 12px;"><strong>${reasonLabel}</strong>${a.notes ? `<div style="color: var(--text-muted); font-size: 11px;">${a.notes}</div>` : ''}</td>
            <td style="font-size: 12px; font-weight: 600;">${a.user_name || '-'}</td>
            <td style="font-size: 12px; color: var(--text-muted); font-family: monospace;">${a.created_at || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

/* -------------------------------------------------------------
 * 10.1 PURCHASE INVOICES (فواتير الشراء والتوريد الواردة)
 * ------------------------------------------------------------- */
let allPurchaseInvoicesCache = [];
let allPurchaseProductsCache = [];
let newPurchaseViewCart = [];
let newPurchaseSelectedMethods = new Set(['cash']);
let isManualSplitActive = false;

function bindPurchaseInvoicesEvents() {
    const btnRefresh = document.getElementById('btnRefreshPurchaseInvoices');
    if (btnRefresh) btnRefresh.addEventListener('click', loadPurchaseInvoicesList);

    const searchInput = document.getElementById('purchaseInvoiceSearchInput');
    if (searchInput) searchInput.addEventListener('input', filterAndRenderPurchaseInvoices);

    const statusFilter = document.getElementById('purchaseInvoiceStatusFilter');
    if (statusFilter) statusFilter.addEventListener('change', filterAndRenderPurchaseInvoices);

    // Open dedicated view instead of modal
    const btnOpenNew = document.getElementById('btnOpenNewPurchaseInvoiceModal');
    if (btnOpenNew) {
        btnOpenNew.addEventListener('click', () => {
            switchView('new-purchase-invoice');
        });
    }

    // Add blank row buttons for interactive inline grid
    const btnAddTop = document.getElementById('btnAddNewRowTop');
    if (btnAddTop) btnAddTop.addEventListener('click', addNewPurchaseBlankRow);

    const btnAddBottom = document.getElementById('btnAddNewRowBottom');
    if (btnAddBottom) btnAddBottom.addEventListener('click', addNewPurchaseBlankRow);

    // Setup purchase quick search bar handler
    setupNewPurchaseQuickSearch();

    // Totals inputs in new purchase invoice view
    const discountInput = document.getElementById('newPurchaseViewDiscount');
    const shippingInput = document.getElementById('newPurchaseViewShipping');
    const taxInput = document.getElementById('newPurchaseViewTax');
    if (discountInput) discountInput.addEventListener('input', () => recalculateNewPurchaseViewTotals('meta_input'));
    if (shippingInput) shippingInput.addEventListener('input', () => recalculateNewPurchaseViewTotals('meta_input'));
    if (taxInput) taxInput.addEventListener('input', () => recalculateNewPurchaseViewTotals('meta_input'));

    // Multi-Tender Payment Methods Toggle Buttons
    const btnCash = document.getElementById('tenderBtnCash');
    const btnBank = document.getElementById('tenderBtnBank');
    const btnWallet = document.getElementById('tenderBtnWallet');
    const btnCredit = document.getElementById('tenderBtnCredit');

    if (btnCash) btnCash.addEventListener('click', () => toggleTenderMethod('cash'));
    if (btnBank) btnBank.addEventListener('click', () => toggleTenderMethod('bankTransfer'));
    if (btnWallet) btnWallet.addEventListener('click', () => toggleTenderMethod('eWallet'));
    if (btnCredit) btnCredit.addEventListener('click', () => toggleTenderMethod('credit'));

    // Payment amounts live recalculation
    const cashAmountInput = document.getElementById('tenderAmountCash');
    const bankAmountInput = document.getElementById('tenderAmountBank');
    const walletAmountInput = document.getElementById('tenderAmountWallet');
    const creditAmountInput = document.getElementById('tenderAmountCredit');

    if (cashAmountInput) cashAmountInput.addEventListener('input', () => recalculateNewPurchaseViewTotals('cash_input'));
    if (bankAmountInput) bankAmountInput.addEventListener('input', () => recalculateNewPurchaseViewTotals('bank_input'));
    if (walletAmountInput) walletAmountInput.addEventListener('input', () => recalculateNewPurchaseViewTotals('wallet_input'));
    if (creditAmountInput) creditAmountInput.addEventListener('input', () => recalculateNewPurchaseViewTotals('credit_input'));

    // Action bar buttons
    // Action bar buttons - open in-app confirmation modal
    const btnSubmitTop = document.getElementById('btnTopSubmitNewPurchaseView');
    const btnSubmitBottom = document.getElementById('btnBottomSubmitNewPurchaseView');
    const btnSubmitFallback = document.getElementById('btnSubmitNewPurchaseView');
    if (btnSubmitTop) btnSubmitTop.onclick = openConfirmPurchaseInvoiceModal;
    if (btnSubmitBottom) btnSubmitBottom.onclick = openConfirmPurchaseInvoiceModal;
    if (btnSubmitFallback) btnSubmitFallback.onclick = openConfirmPurchaseInvoiceModal;

    const btnExecuteConfirm = document.getElementById('btnExecuteSubmitPurchase');
    if (btnExecuteConfirm) btnExecuteConfirm.onclick = executeSubmitPurchaseInvoice;

    const btnSuccessGo = document.getElementById('btnSuccessCloseAndGoInvoices');
    if (btnSuccessGo) {
        btnSuccessGo.onclick = () => {
            const modal = document.getElementById('modalPurchaseInvoiceSuccess');
            if (modal) modal.classList.remove('active');
            switchView('purchases-invoices');
        };
    }

    const btnBarcode = document.getElementById('btnPrintGoodsBarcode');
    if (btnBarcode) btnBarcode.addEventListener('click', printGoodsBarcodeView);

    const btnPrint = document.getElementById('btnPrintPurchaseInvoice');
    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            window.print();
        });
    }

    const btnPrintModal = document.getElementById('btnPrintModalPurchaseInvoice');
    if (btnPrintModal) {
        btnPrintModal.addEventListener('click', () => {
            window.print();
        });
    }
}

function setupProductCombobox() {
    const searchInput = document.getElementById('newPurchaseProductSearchInput');
    const toggleBtn = document.getElementById('btnToggleProductDropdown');
    const menu = document.getElementById('newPurchaseProductDropdownList');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterAndRenderProductCombobox(e.target.value);
            if (menu) menu.classList.add('show');
        });

        searchInput.addEventListener('focus', () => {
            filterAndRenderProductCombobox(searchInput.value);
            if (menu) menu.classList.add('show');
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (menu) menu.classList.remove('show');
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const firstOption = menu?.querySelector('.combobox-option');
                if (firstOption && firstOption.dataset.id) {
                    const prod = allPurchaseProductsCache.find(p => p.id === Number(firstOption.dataset.id));
                    if (prod) selectProductFromCombobox(prod);
                }
            }
        });
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (menu) {
                const isOpen = menu.classList.contains('show');
                if (!isOpen) {
                    filterAndRenderProductCombobox(searchInput ? searchInput.value : '');
                    menu.classList.add('show');
                } else {
                    menu.classList.remove('show');
                }
            }
        });
    }

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.product-combobox-container')) {
            if (menu) menu.classList.remove('show');
        }
    });

    // Quick fill remaining unpaid amount
    const btnQuickFill = document.getElementById('btnQuickFillRemaining');
    if (btnQuickFill) {
        btnQuickFill.addEventListener('click', quickFillRemainingTender);
    }
}

function filterAndRenderProductCombobox(query = '') {
    const menu = document.getElementById('newPurchaseProductDropdownList');
    if (!menu) return;

    const term = (query || '').trim().toLowerCase();
    const filtered = allPurchaseProductsCache.filter(p => {
        if (!term) return true;
        const name = (p.item_name || '').toLowerCase();
        const code = (p.barcode || p.product_code || '').toLowerCase();
        const cat = (p.category_name || '').toLowerCase();
        return name.includes(term) || code.includes(term) || cat.includes(term);
    });

    if (filtered.length === 0) {
        menu.innerHTML = `<div class="combobox-empty-message">لا توجد نتائج مطابقة لـ "${query}"</div>`;
        return;
    }

    menu.innerHTML = '';
    filtered.forEach(p => {
        const itemEl = document.createElement('div');
        itemEl.className = 'combobox-option';
        itemEl.dataset.id = p.id;
        const code = p.barcode || p.product_code || '-';
        const cost = Number(p.cost_price || 0).toFixed(2);
        const sell = Number(p.sell_price || 0).toFixed(2);

        itemEl.innerHTML = `
            <div class="combobox-option-main">
                <div class="combobox-option-title">${p.item_name}</div>
                <div class="combobox-option-meta">
                    <span class="combobox-badge-barcode">${code}</span>
                    <span class="combobox-badge-cat">${p.category_name || 'عام'}</span>
                </div>
            </div>
        `;

        itemEl.addEventListener('click', (e) => {
            e.stopPropagation();
            selectProductFromCombobox(p);
        });

        menu.appendChild(itemEl);
    });
}

function selectProductFromCombobox(prod) {
    const searchInput = document.getElementById('newPurchaseProductSearchInput');
    const prodSel = document.getElementById('newPurchaseViewProductSelect');
    const menu = document.getElementById('newPurchaseProductDropdownList');
    const costInput = document.getElementById('newPurchaseViewItemCost');
    const sellInput = document.getElementById('newPurchaseViewItemSell');
    const qtyInput = document.getElementById('newPurchaseViewItemQty');
    const discInput = document.getElementById('newPurchaseViewItemDiscount');

    if (searchInput) {
        searchInput.value = `[${prod.barcode || prod.product_code || ''}] ${prod.item_name}`;
    }
    if (prodSel) {
        prodSel.value = prod.id;
    }
    if (costInput) {
        costInput.value = '';
        costInput.placeholder = '0.00';
    }
    if (sellInput) {
        sellInput.value = '';
        sellInput.placeholder = '0.00';
    }
    if (qtyInput) {
        qtyInput.value = '1';
    }
    if (discInput) {
        discInput.value = '0';
    }

    if (menu) menu.classList.remove('show');
    updateToolbarLinePreview();
    if (costInput) {
        costInput.focus();
    } else if (qtyInput) {
        qtyInput.focus();
    }
}

function quickFillRemainingTender() {
    isManualSplitActive = true;
    const subtotal = newPurchaseViewCart.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = Math.max(0, Number(document.getElementById('newPurchaseViewDiscount')?.value) || 0);
    const shipping = Math.max(0, Number(document.getElementById('newPurchaseViewShipping')?.value) || 0);
    const tax = Math.max(0, Number(document.getElementById('newPurchaseViewTax')?.value) || 0);
    const finalTotal = Math.max(0, Math.round((subtotal - discount + shipping + tax) * 100) / 100);

    const cashInput = document.getElementById('tenderAmountCash');
    const bankInput = document.getElementById('tenderAmountBank');
    const walletInput = document.getElementById('tenderAmountWallet');
    const creditInput = document.getElementById('tenderAmountCredit');

    let currentCash = newPurchaseSelectedMethods.has('cash') ? (Number(cashInput?.value) || 0) : 0;
    let currentBank = newPurchaseSelectedMethods.has('bankTransfer') ? (Number(bankInput?.value) || 0) : 0;
    let currentWallet = newPurchaseSelectedMethods.has('eWallet') ? (Number(walletInput?.value) || 0) : 0;

    if (newPurchaseSelectedMethods.has('credit')) {
        const remainingForCredit = Math.max(0, Math.round((finalTotal - currentCash - currentBank - currentWallet) * 100) / 100);
        if (creditInput) creditInput.value = remainingForCredit.toFixed(2);
    } else if (newPurchaseSelectedMethods.has('cash')) {
        const remainingForCash = Math.max(0, Math.round((finalTotal - currentBank - currentWallet) * 100) / 100);
        if (cashInput) cashInput.value = remainingForCash.toFixed(2);
    } else if (newPurchaseSelectedMethods.has('bankTransfer')) {
        const remainingForBank = Math.max(0, Math.round((finalTotal - currentCash - currentWallet) * 100) / 100);
        if (bankInput) bankInput.value = remainingForBank.toFixed(2);
    } else if (newPurchaseSelectedMethods.has('eWallet')) {
        const remainingForWallet = Math.max(0, Math.round((finalTotal - currentCash - currentBank) * 100) / 100);
        if (walletInput) walletInput.value = remainingForWallet.toFixed(2);
    }

    recalculateNewPurchaseViewTotals('quick_fill');
}

function updateToolbarLinePreview() {
    const qty = Math.max(1, Number(document.getElementById('newPurchaseViewItemQty')?.value) || 1);
    const cost = Math.max(0, Number(document.getElementById('newPurchaseViewItemCost')?.value) || 0);
    const disc = Math.max(0, Math.min(100, Number(document.getElementById('newPurchaseViewItemDiscount')?.value) || 0));

    const lineGross = qty * cost;
    const lineDiscount = lineGross * (disc / 100);
    const lineTotal = Math.max(0, Math.round((lineGross - lineDiscount) * 100) / 100);

    const previewEl = document.getElementById('newPurchaseViewItemLineTotalPreview');
    if (previewEl) {
        previewEl.innerText = `${lineTotal.toFixed(2)} ج.م`;
    }
}

async function prepareNewPurchaseInvoiceView() {
    newPurchaseViewCart = [{
        productId: null,
        barcode: '',
        itemName: '',
        categoryName: '',
        quantity: 1,
        unitCost: 0,
        sellPrice: 0,
        discountPercent: 0,
        lineTotal: 0
    }];
    newPurchaseSelectedMethods = new Set(['cash']);
    isManualSplitActive = false;

    // Clear and reset form fields
    const refInput = document.getElementById('newPurchaseViewReference');
    if (refInput) refInput.value = '';

    const notesInput = document.getElementById('newPurchaseViewNotes');
    if (notesInput) notesInput.value = '';

    const discInput = document.getElementById('newPurchaseViewDiscount');
    if (discInput) discInput.value = '0';

    const shipInput = document.getElementById('newPurchaseViewShipping');
    if (shipInput) shipInput.value = '0';

    const taxInput = document.getElementById('newPurchaseViewTax');
    if (taxInput) taxInput.value = '0';

    const dateInput = document.getElementById('newPurchaseViewDate');
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

    const cashInput = document.getElementById('tenderAmountCash');
    if (cashInput) cashInput.value = '0';

    const bankInput = document.getElementById('tenderAmountBank');
    if (bankInput) bankInput.value = '0';

    const walletInput = document.getElementById('tenderAmountWallet');
    if (walletInput) walletInput.value = '0';

    const creditInput = document.getElementById('tenderAmountCredit');
    if (creditInput) creditInput.value = '0';

    updateTenderUI();

    // 1. Populate Suppliers Select
    const supRes = await window.api.listSuppliers({});
    const supSel = document.getElementById('newPurchaseViewSupplierSelect');
    if (supSel) {
        supSel.innerHTML = '<option value="">-- اختر الشركة الموردة / التاجر --</option>';
        (supRes.data || []).forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.innerText = `${s.name} (${s.supplier_code || 'SUP'}) - مديونية حالية: ${Number(s.balance || 0).toFixed(2)} ج.م`;
            supSel.appendChild(opt);
        });
    }

    // 2. Load Products Cache for inline table row selectors
    const pRes = await window.api.listProducts({});
    allPurchaseProductsCache = pRes.data || [];

    // 3. Central Treasury Balance Hint
    const tRes = await window.api.getTreasuryBalance();
    const tBal = Number(tRes?.data?.balance || 0);
    const tHint = document.getElementById('tenderTreasuryBalanceHint');
    if (tHint) {
        tHint.innerText = `رصيد الخزنة المتاح: ${tBal.toFixed(2)} ج.م`;
        tHint.dataset.balance = tBal;
    }

    renderNewPurchaseViewCart();
}

function syncNewPurchaseCartFromDOM() {
    if (!Array.isArray(newPurchaseViewCart)) return;
    newPurchaseViewCart.forEach((item, index) => {
        const prodSelect = document.getElementById(`rowProduct_${index}`);
        const barInput = document.getElementById(`rowBarcode_${index}`);
        const qtyInput = document.getElementById(`rowQty_${index}`);
        const costInput = document.getElementById(`rowCost_${index}`);
        const sellInput = document.getElementById(`rowSell_${index}`);
        const discInput = document.getElementById(`rowDisc_${index}`);

        if (prodSelect && prodSelect.value) {
            const pid = Number(prodSelect.value);
            if (pid) {
                const prod = (allPurchaseProductsCache || []).find(p => p.id === pid);
                if (prod) {
                    item.productId = prod.id;
                    item.barcode = prod.barcode || prod.product_code || (barInput ? barInput.value : item.barcode);
                    item.itemName = prod.item_name;
                    item.categoryName = prod.category_name || '-';
                }
            }
        } else if (barInput && barInput.value.trim()) {
            item.barcode = barInput.value.trim();
        }

        if (qtyInput) item.quantity = Math.max(1, Number(qtyInput.value) || 1);
        if (costInput) item.unitCost = Math.max(0, Number(costInput.value) || 0);
        if (sellInput) item.sellPrice = Math.max(0, Number(sellInput.value) || 0);
        if (discInput) item.discountPercent = Math.max(0, Math.min(100, Number(discInput.value) || 0));

        const gross = item.quantity * item.unitCost;
        const discount = gross * (item.discountPercent / 100);
        item.lineTotal = Math.round((gross - discount) * 100) / 100;
    });
}

function setupNewPurchaseQuickSearch() {
    const input = document.getElementById('newPurchaseQuickSearchInput');
    if (!input || input.dataset.bound === 'true') return;
    input.dataset.bound = 'true';

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const term = (input.value || '').trim().toLowerCase();
            if (!term) return;

            const prod = (allPurchaseProductsCache || []).find(p => 
                (p.barcode && p.barcode.toLowerCase() === term) || 
                (p.product_code && p.product_code.toLowerCase() === term) ||
                (p.item_name && p.item_name.toLowerCase().includes(term))
            );

            if (!prod) {
                alert(`لم يتم العثور على صنف بالاسم أو الباركود: ${input.value}`);
                return;
            }

            syncNewPurchaseCartFromDOM();

            let targetIdx = newPurchaseViewCart.length - 1;
            if (targetIdx < 0 || newPurchaseViewCart[targetIdx].productId) {
                newPurchaseViewCart.push({
                    productId: prod.id,
                    barcode: prod.barcode || prod.product_code || '',
                    itemName: prod.item_name,
                    categoryName: prod.category_name || '-',
                    quantity: 1,
                    unitCost: 0,
                    sellPrice: 0,
                    discountPercent: 0,
                    lineTotal: 0
                });
                targetIdx = newPurchaseViewCart.length - 1;
            } else {
                newPurchaseViewCart[targetIdx].productId = prod.id;
                newPurchaseViewCart[targetIdx].barcode = prod.barcode || prod.product_code || '';
                newPurchaseViewCart[targetIdx].itemName = prod.item_name;
                newPurchaseViewCart[targetIdx].categoryName = prod.category_name || '-';
            }

            renderNewPurchaseViewCart();
            input.value = '';

            setTimeout(() => {
                const costInp = document.getElementById(`rowCost_${targetIdx}`);
                if (costInp) {
                    costInp.focus();
                    costInp.select();
                }
            }, 60);
        }
    });
}

window.addNewPurchaseBlankRow = function() {
    syncNewPurchaseCartFromDOM();
    newPurchaseViewCart.push({
        productId: null,
        barcode: '',
        itemName: '',
        categoryName: '',
        quantity: 1,
        unitCost: 0,
        sellPrice: 0,
        discountPercent: 0,
        lineTotal: 0
    });
    window.newPurchaseViewCart = newPurchaseViewCart;
    renderNewPurchaseViewCart();
    setTimeout(() => {
        const lastIdx = newPurchaseViewCart.length - 1;
        const barInp = document.getElementById(`rowBarcode_${lastIdx}`);
        const sel = document.getElementById(`rowProduct_${lastIdx}`);
        if (barInp) {
            barInp.focus();
            barInp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else if (sel) {
            sel.focus();
            sel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 60);
};

window.onRowProductSelectChange = function(index, productId) {
    if (!newPurchaseViewCart[index]) return;
    const item = newPurchaseViewCart[index];
    const pid = Number(productId);
    if (!pid) {
        item.productId = null;
        item.barcode = '';
        item.itemName = '';
        item.categoryName = '';
    } else {
        const prod = allPurchaseProductsCache.find(p => p.id === pid);
        if (prod) {
            item.productId = prod.id;
            item.barcode = prod.barcode || prod.product_code || '';
            item.itemName = prod.item_name;
            item.categoryName = prod.category_name || '-';
        }
    }

    // Direct update to prevent rebuilding the DOM and losing focus
    const barInp = document.getElementById(`rowBarcode_${index}`);
    if (barInp) barInp.value = item.barcode;
    const catBadge = document.getElementById(`rowCatBadge_${index}`);
    if (catBadge) catBadge.innerText = item.categoryName || '-';

    const costInp = document.getElementById(`rowCost_${index}`);
    if (costInp) costInp.focus();
    recalculateNewPurchaseViewTotals('cart_change');
};

window.onRowBarcodeChange = function(index, barcodeVal) {
    if (!newPurchaseViewCart[index]) return;
    const term = (barcodeVal || '').trim().toLowerCase();
    if (!term) return;
    const prod = allPurchaseProductsCache.find(p => 
        (p.barcode && p.barcode.toLowerCase() === term) || 
        (p.product_code && p.product_code.toLowerCase() === term)
    );
    if (prod) {
        const sel = document.getElementById(`rowProduct_${index}`);
        if (sel) sel.value = prod.id;
        window.onRowProductSelectChange(index, prod.id);
    } else {
        alert(`لم يتم العثور على صنف بالباركود: ${barcodeVal}`);
    }
};

window.handleRowKeydown = function(event, index) {
    if (event.key === 'Enter') {
        event.preventDefault();
        // If on barcode input, trigger onRowBarcodeChange if text present
        if (event.target && event.target.id && event.target.id.startsWith('rowBarcode_')) {
            const val = (event.target.value || '').trim();
            if (val) {
                window.onRowBarcodeChange(index, val);
                return;
            }
        }
        if (index === newPurchaseViewCart.length - 1) {
            addNewPurchaseBlankRow();
        } else {
            const nextProduct = document.getElementById(`rowBarcode_${index + 1}`) || document.getElementById(`rowProduct_${index + 1}`);
            if (nextProduct) nextProduct.focus();
        }
    }
};

function renderNewPurchaseViewCart() {
    const tbody = document.getElementById('newPurchaseViewTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (newPurchaseViewCart.length === 0) {
        newPurchaseViewCart.push({
            productId: null,
            barcode: '',
            itemName: '',
            categoryName: '',
            quantity: 1,
            unitCost: 0,
            sellPrice: 0,
            discountPercent: 0,
            lineTotal: 0
        });
    }

    newPurchaseViewCart.forEach((item, index) => {
        const tr = document.createElement('tr');
        const cost = item.unitCost || 0;
        const sell = item.sellPrice || 0;
        const marginPct = cost > 0 ? Math.round(((sell - cost) / cost) * 100) : 0;
        let badgeClass = 'neutral';
        let badgeText = `${marginPct}% ربح`;
        if (marginPct > 0) {
            badgeClass = 'positive';
            badgeText = `+${marginPct}% ربح`;
        } else if (marginPct < 0) {
            badgeClass = 'negative';
            badgeText = `${marginPct}% خسارة`;
        }

        const productOptionsHtml = (allPurchaseProductsCache || []).map(p => {
            const isSel = p.id === item.productId ? 'selected' : '';
            const codeStr = p.barcode || p.product_code ? `[${p.barcode || p.product_code}] ` : '';
            return `<option value="${p.id}" ${isSel}>${codeStr}${p.item_name} (${p.category_name || '-'})</option>`;
        }).join('');

        tr.innerHTML = `
            <td style="text-align: center; font-weight: 800; color: #64748b; font-size: 12px;">${index + 1}</td>
            <td>
                <input type="text" id="rowBarcode_${index}" class="form-control" style="height: 38px; font-family: monospace; font-weight: 800; font-size: 12px; color: var(--primary);" value="${item.barcode || ''}" placeholder="كود / باركود..." onchange="onRowBarcodeChange(${index}, this.value)" onkeydown="handleRowKeydown(event, ${index})">
            </td>
            <td>
                <select id="rowProduct_${index}" class="form-control select-clean" style="height: 38px; font-weight: 700; font-size: 13px;" onchange="onRowProductSelectChange(${index}, this.value)" onkeydown="handleRowKeydown(event, ${index})">
                    <option value="">-- اختر الصنف من الدليل --</option>
                    ${productOptionsHtml}
                </select>
            </td>
            <td style="text-align: center;">
                <span id="rowCatBadge_${index}" class="badge" style="background: #f1f5f9; color: #475569; font-weight: 700; padding: 4px 8px; display: inline-block;">${item.categoryName || '-'}</span>
            </td>
            <td style="text-align: center;">
                <input type="number" id="rowQty_${index}" class="input-table-qty" min="1" step="1" value="${item.quantity}" oninput="updateNewPurchaseRowLive(${index})" onkeydown="handleRowKeydown(event, ${index})">
            </td>
            <td style="text-align: center;">
                <input type="number" id="rowCost_${index}" class="input-table-cost" min="0" step="0.25" placeholder="0.00" value="${item.unitCost ? item.unitCost : ''}" oninput="updateNewPurchaseRowLive(${index})" onkeydown="handleRowKeydown(event, ${index})">
            </td>
            <td style="text-align: center;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 3px;">
                    <input type="number" id="rowSell_${index}" class="input-table-sell" min="0" step="0.25" placeholder="0.00" value="${item.sellPrice ? item.sellPrice : ''}" oninput="updateNewPurchaseRowLive(${index})" onkeydown="handleRowKeydown(event, ${index})">
                    <span id="rowMargin_${index}" class="row-margin-badge ${badgeClass}">${badgeText}</span>
                </div>
            </td>
            <td style="text-align: center;">
                <input type="number" id="rowDisc_${index}" class="input-table-discount" min="0" max="100" step="0.5" value="${item.discountPercent || 0}" oninput="updateNewPurchaseRowLive(${index})" onkeydown="handleRowKeydown(event, ${index})">
            </td>
            <td style="text-align: left;">
                <strong id="rowTotal_${index}" style="font-size: 14px; font-weight: 900; color: var(--primary);">${item.lineTotal.toFixed(2)} ج.م</strong>
            </td>
            <td style="text-align: center;">
                <button type="button" class="btn-del" onclick="removeNewPurchaseRow(${index})" title="حذف السطر" style="width: 32px; height: 32px; padding: 0;">
                    <i data-lucide="trash-2" class="icon-xs"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    refreshIcons(tbody);
    recalculateNewPurchaseViewTotals('cart_change');
}

window.updateNewPurchaseRowLive = function(index) {
    if (!newPurchaseViewCart[index]) return;
    const item = newPurchaseViewCart[index];

    const qty = Math.max(1, Number(document.getElementById(`rowQty_${index}`)?.value) || 1);
    const cost = Math.max(0, Number(document.getElementById(`rowCost_${index}`)?.value) || 0);
    const sell = Math.max(0, Number(document.getElementById(`rowSell_${index}`)?.value) || 0);
    const disc = Math.max(0, Math.min(100, Number(document.getElementById(`rowDisc_${index}`)?.value) || 0));

    item.quantity = qty;
    item.unitCost = cost;
    item.sellPrice = sell;
    item.discountPercent = disc;

    const lineGross = qty * cost;
    const lineDiscount = lineGross * (disc / 100);
    item.lineTotal = Math.round((lineGross - lineDiscount) * 100) / 100;

    const totalEl = document.getElementById(`rowTotal_${index}`);
    if (totalEl) {
        totalEl.innerText = `${item.lineTotal.toFixed(2)} ج.م`;
    }

    // Live update margin badge
    const marginEl = document.getElementById(`rowMargin_${index}`);
    if (marginEl) {
        const marginPct = cost > 0 ? Math.round(((sell - cost) / cost) * 100) : 0;
        marginEl.className = 'row-margin-badge';
        if (marginPct > 0) {
            marginEl.classList.add('positive');
            marginEl.innerText = `+${marginPct}% ربح`;
        } else if (marginPct < 0) {
            marginEl.classList.add('negative');
            marginEl.innerText = `${marginPct}% خسارة`;
        } else {
            marginEl.classList.add('neutral');
            marginEl.innerText = `${marginPct}% ربح`;
        }
    }

    recalculateNewPurchaseViewTotals('cart_change');
};

window.removeNewPurchaseRow = function(index) {
    syncNewPurchaseCartFromDOM();
    newPurchaseViewCart.splice(index, 1);
    if (newPurchaseViewCart.length === 0) {
        newPurchaseViewCart.push({
            productId: null,
            barcode: '',
            itemName: '',
            categoryName: '',
            quantity: 1,
            unitCost: 0,
            sellPrice: 0,
            discountPercent: 0,
            lineTotal: 0
        });
    }
    renderNewPurchaseViewCart();
};

function toggleTenderMethod(method) {
    if (newPurchaseSelectedMethods.has(method)) {
        if (newPurchaseSelectedMethods.size === 1) {
            alert('يجب الإبقاء على وسيلة دفع واحدة على الأقل');
            return;
        }
        newPurchaseSelectedMethods.delete(method);
        // Clear amount for unselected method
        if (method === 'cash') document.getElementById('tenderAmountCash').value = '0';
        if (method === 'bankTransfer') document.getElementById('tenderAmountBank').value = '0';
        if (method === 'eWallet') document.getElementById('tenderAmountWallet').value = '0';
        if (method === 'credit') document.getElementById('tenderAmountCredit').value = '0';

        if (newPurchaseSelectedMethods.size === 1) {
            isManualSplitActive = false;
        }
    } else {
        newPurchaseSelectedMethods.add(method);
        const subtotal = newPurchaseViewCart.reduce((sum, item) => sum + item.lineTotal, 0);
        const discount = Math.max(0, Number(document.getElementById('newPurchaseViewDiscount')?.value) || 0);
        const shipping = Math.max(0, Number(document.getElementById('newPurchaseViewShipping')?.value) || 0);
        const tax = Math.max(0, Number(document.getElementById('newPurchaseViewTax')?.value) || 0);
        const finalTotal = Math.max(0, Math.round((subtotal - discount + shipping + tax) * 100) / 100);

        const cashVal = newPurchaseSelectedMethods.has('cash') ? (Number(document.getElementById('tenderAmountCash')?.value) || 0) : 0;
        const bankVal = newPurchaseSelectedMethods.has('bankTransfer') ? (Number(document.getElementById('tenderAmountBank')?.value) || 0) : 0;
        const walletVal = newPurchaseSelectedMethods.has('eWallet') ? (Number(document.getElementById('tenderAmountWallet')?.value) || 0) : 0;

        if (method === 'credit') {
            const rem = Math.max(0, Math.round((finalTotal - cashVal - bankVal - walletVal) * 100) / 100);
            const crInp = document.getElementById('tenderAmountCredit');
            if (crInp) crInp.value = rem.toFixed(2);
        }
    }

    updateTenderUI();
    recalculateNewPurchaseViewTotals('method_toggle');
}

function updateTenderUI() {
    const btnCash = document.getElementById('tenderBtnCash');
    const btnBank = document.getElementById('tenderBtnBank');
    const btnWallet = document.getElementById('tenderBtnWallet');
    const btnCredit = document.getElementById('tenderBtnCredit');

    const rowCash = document.getElementById('tenderRowCash');
    const rowBank = document.getElementById('tenderRowBank');
    const rowWallet = document.getElementById('tenderRowWallet');
    const rowCredit = document.getElementById('tenderRowCredit');
    const treasuryRow = document.getElementById('tenderTreasuryRow');

    const isCashActive = newPurchaseSelectedMethods.has('cash');
    const isBankActive = newPurchaseSelectedMethods.has('bankTransfer');
    const isWalletActive = newPurchaseSelectedMethods.has('eWallet');
    const isCreditActive = newPurchaseSelectedMethods.has('credit');

    if (btnCash) btnCash.classList.toggle('active', isCashActive);
    if (btnBank) btnBank.classList.toggle('active', isBankActive);
    if (btnWallet) btnWallet.classList.toggle('active', isWalletActive);
    if (btnCredit) btnCredit.classList.toggle('active', isCreditActive);

    if (rowCash) rowCash.style.display = isCashActive ? 'flex' : 'none';
    if (rowBank) rowBank.style.display = isBankActive ? 'flex' : 'none';
    if (rowWallet) rowWallet.style.display = isWalletActive ? 'flex' : 'none';
    if (rowCredit) rowCredit.style.display = isCreditActive ? 'flex' : 'none';
    if (treasuryRow) treasuryRow.style.display = isCashActive ? 'flex' : 'none';
}

function recalculateNewPurchaseViewTotals(source = 'general') {
    const validItems = newPurchaseViewCart.filter(item => item.productId);
    const subtotal = validItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = Math.max(0, Number(document.getElementById('newPurchaseViewDiscount')?.value) || 0);
    const shipping = Math.max(0, Number(document.getElementById('newPurchaseViewShipping')?.value) || 0);
    const tax = Math.max(0, Number(document.getElementById('newPurchaseViewTax')?.value) || 0);

    const finalTotal = Math.max(0, Math.round((subtotal - discount + shipping + tax) * 100) / 100);

    const cashInput = document.getElementById('tenderAmountCash');
    const bankInput = document.getElementById('tenderAmountBank');
    const walletInput = document.getElementById('tenderAmountWallet');
    const creditInput = document.getElementById('tenderAmountCredit');

    const hasCash = newPurchaseSelectedMethods.has('cash');
    const hasBank = newPurchaseSelectedMethods.has('bankTransfer');
    const hasWallet = newPurchaseSelectedMethods.has('eWallet');
    const hasCredit = newPurchaseSelectedMethods.has('credit');

    // 1. Auto-Reconcile single method or default view:
    if ((source === 'cart_change' || source === 'meta_input' || source === 'general' || source === 'method_toggle') && !isManualSplitActive) {
        if (newPurchaseSelectedMethods.size === 1) {
            if (hasCash && cashInput) cashInput.value = finalTotal.toFixed(2);
            if (hasBank && bankInput) bankInput.value = finalTotal.toFixed(2);
            if (hasWallet && walletInput) walletInput.value = finalTotal.toFixed(2);
            if (hasCredit && creditInput) creditInput.value = finalTotal.toFixed(2);
        } else if (hasCash && hasCredit && !hasBank && !hasWallet) {
            let cVal = Number(cashInput?.value) || 0;
            if (cVal > finalTotal) {
                cVal = finalTotal;
                if (cashInput) cashInput.value = cVal.toFixed(2);
            }
            const rem = Math.max(0, Math.round((finalTotal - cVal) * 100) / 100);
            if (creditInput) creditInput.value = rem.toFixed(2);
        }
    }

    // 2. Synchronize across inputs when typing:
    if (source === 'cash_input') {
        isManualSplitActive = true;
        const cVal = Number(cashInput?.value) || 0;
        const bVal = hasBank ? (Number(bankInput?.value) || 0) : 0;
        const wVal = hasWallet ? (Number(walletInput?.value) || 0) : 0;
        if (hasCredit && creditInput) {
            const remCredit = Math.max(0, Math.round((finalTotal - cVal - bVal - wVal) * 100) / 100);
            creditInput.value = remCredit.toFixed(2);
        }
    } else if (source === 'credit_input') {
        isManualSplitActive = true;
        const crVal = Number(creditInput?.value) || 0;
        const bVal = hasBank ? (Number(bankInput?.value) || 0) : 0;
        const wVal = hasWallet ? (Number(walletInput?.value) || 0) : 0;
        if (hasCash && cashInput) {
            const remCash = Math.max(0, Math.round((finalTotal - crVal - bVal - wVal) * 100) / 100);
            cashInput.value = remCash.toFixed(2);
        }
    } else if (source === 'bank_input' || source === 'wallet_input') {
        isManualSplitActive = true;
        const cVal = hasCash ? (Number(cashInput?.value) || 0) : 0;
        const bVal = hasBank ? (Number(bankInput?.value) || 0) : 0;
        const wVal = hasWallet ? (Number(walletInput?.value) || 0) : 0;
        if (hasCredit && creditInput) {
            const remCredit = Math.max(0, Math.round((finalTotal - cVal - bVal - wVal) * 100) / 100);
            creditInput.value = remCredit.toFixed(2);
        }
    } else if (source === 'cart_change' || source === 'meta_input') {
        if (hasCredit && creditInput) {
            const cVal = hasCash ? (Number(cashInput?.value) || 0) : 0;
            const bVal = hasBank ? (Number(bankInput?.value) || 0) : 0;
            const wVal = hasWallet ? (Number(walletInput?.value) || 0) : 0;
            const remCredit = Math.max(0, Math.round((finalTotal - cVal - bVal - wVal) * 100) / 100);
            creditInput.value = remCredit.toFixed(2);
        } else if (hasCash && cashInput && !hasBank && !hasWallet && !hasCredit) {
            cashInput.value = finalTotal.toFixed(2);
        }
    }

    // 3. Current active values:
    const cashVal = hasCash ? Math.max(0, Number(cashInput?.value) || 0) : 0;
    const bankVal = hasBank ? Math.max(0, Number(bankInput?.value) || 0) : 0;
    const walletVal = hasWallet ? Math.max(0, Number(walletInput?.value) || 0) : 0;
    const creditVal = hasCredit ? Math.max(0, Number(creditInput?.value) || 0) : 0;

    // Actual immediate payments (cash outflows: Cash + Bank + Wallet)
    const totalPaidImmediate = Math.round((cashVal + bankVal + walletVal) * 100) / 100;

    // Remaining due as credit debt to supplier
    const remainingDue = hasCredit ? creditVal : Math.max(0, Math.round((finalTotal - totalPaidImmediate) * 100) / 100);
    const totalDistributed = Math.round((totalPaidImmediate + (hasCredit ? creditVal : 0)) * 100) / 100;

    // 4. Update Totals Card Displays:
    const subtotalDisp = document.getElementById('newPurchaseViewSubtotal');
    if (subtotalDisp) subtotalDisp.innerText = `${subtotal.toFixed(2)} ج.م`;

    const finalDisp = document.getElementById('newPurchaseViewFinalTotal');
    if (finalDisp) finalDisp.innerText = `${finalTotal.toFixed(2)} ج.م`;

    const paidDisp = document.getElementById('newPurchaseViewTotalPaid');
    if (paidDisp) paidDisp.innerText = `${totalPaidImmediate.toFixed(2)} ج.م`;

    const remDisp = document.getElementById('newPurchaseViewRemaining');
    if (remDisp) remDisp.innerText = `${remainingDue.toFixed(2)} ج.م`;

    const distDisp = document.getElementById('tenderTotalDistributed');
    if (distDisp) {
        if (Math.abs(totalDistributed - finalTotal) < 0.01 && finalTotal > 0) {
            distDisp.innerHTML = `${totalDistributed.toFixed(2)} ج.م <span style="font-size: 11px; color: #16a34a; font-weight: 800; margin-right: 6px;">(موزع بالكامل 100%)</span>`;
        } else if (totalDistributed > finalTotal) {
            distDisp.innerHTML = `${totalDistributed.toFixed(2)} ج.م <span style="font-size: 11px; color: #dc2626; font-weight: 800; margin-right: 6px;">(زيادة ${(totalDistributed - finalTotal).toFixed(2)} ج.م)</span>`;
        } else {
            distDisp.innerHTML = `${totalDistributed.toFixed(2)} ج.م <span style="font-size: 11px; color: #d97706; font-weight: 800; margin-right: 6px;">(متبقي ${(finalTotal - totalDistributed).toFixed(2)} ج.م)</span>`;
        }
    }

    // Update Bottom Action Bar KPIs
    const totalPieces = validItems.reduce((sum, item) => sum + item.quantity, 0);
    const barItems = document.getElementById('barTotalUniqueItems');
    if (barItems) barItems.innerText = `${validItems.length} صنف`;

    const barPieces = document.getElementById('barTotalPieces');
    if (barPieces) barPieces.innerText = `${totalPieces} قطعة`;

    const barFinal = document.getElementById('barFinalTotal');
    if (barFinal) barFinal.innerText = `${finalTotal.toFixed(2)} ج.م`;

    const barPaid = document.getElementById('barTotalPaid');
    if (barPaid) barPaid.innerText = `${totalPaidImmediate.toFixed(2)} ج.م`;

    const barRem = document.getElementById('barTotalRemaining');
    if (barRem) barRem.innerText = `${remainingDue.toFixed(2)} ج.م`;
}

function showCustomAlert(message, title = 'تنبيه', type = 'warning') {
    const modal = document.getElementById('modalCustomAlert');
    if (!modal) {
        alert(message);
        return;
    }
    const titleEl = document.getElementById('customAlertTitle');
    const msgEl = document.getElementById('customAlertMessage');
    const iconBox = document.getElementById('customAlertIconBox');
    const icon = document.getElementById('customAlertIcon');

    if (titleEl) titleEl.innerText = title;
    if (msgEl) msgEl.innerText = message;

    if (iconBox && icon) {
        if (type === 'error') {
            iconBox.style.background = '#fee2e2';
            iconBox.style.color = '#dc2626';
            icon.setAttribute('data-lucide', 'alert-circle');
        } else if (type === 'info') {
            iconBox.style.background = '#e0f2fe';
            iconBox.style.color = '#0284c7';
            icon.setAttribute('data-lucide', 'info');
        } else {
            iconBox.style.background = '#fef3c7';
            iconBox.style.color = '#d97706';
            icon.setAttribute('data-lucide', 'alert-triangle');
        }
        refreshIcons(modal);
    }
    modal.classList.add('active');
}
window.showCustomAlert = showCustomAlert;

let isSubmittingPurchaseInvoice = false;
let pendingPurchaseInvoicePayload = null;

function openConfirmPurchaseInvoiceModal() {
    if (isSubmittingPurchaseInvoice) return;
    syncNewPurchaseCartFromDOM();

    const supSel = document.getElementById('newPurchaseViewSupplierSelect');
    const supId = supSel?.value;
    if (!supId) {
        showCustomAlert('يرجى اختيار الشركة الموردة / التاجر قبل اعتماد الفاتورة', 'تنبيه مطلوب', 'warning');
        return;
    }

    const supName = supSel.options[supSel.selectedIndex]?.text || 'مورد غير محدد';

    const validItems = newPurchaseViewCart.filter(i => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
        showCustomAlert('يرجى اختيار صنف واحد على الأقل وتحديد كميته قبل اعتماد الفاتورة', 'لا توجد أصناف', 'warning');
        return;
    }

    const subtotal = validItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = Math.max(0, Number(document.getElementById('newPurchaseViewDiscount')?.value) || 0);
    const shipping = Math.max(0, Number(document.getElementById('newPurchaseViewShipping')?.value) || 0);
    const tax = Math.max(0, Number(document.getElementById('newPurchaseViewTax')?.value) || 0);
    const finalTotal = Math.max(0, Math.round((subtotal - discount + shipping + tax) * 100) / 100);

    const cashVal = newPurchaseSelectedMethods.has('cash') ? (Number(document.getElementById('tenderAmountCash')?.value) || 0) : 0;
    const bankVal = newPurchaseSelectedMethods.has('bankTransfer') ? (Number(document.getElementById('tenderAmountBank')?.value) || 0) : 0;
    const walletVal = newPurchaseSelectedMethods.has('eWallet') ? (Number(document.getElementById('tenderAmountWallet')?.value) || 0) : 0;
    const creditVal = newPurchaseSelectedMethods.has('credit') ? (Number(document.getElementById('tenderAmountCredit')?.value) || 0) : 0;

    const totalPaidImmediate = Math.round((cashVal + bankVal + walletVal) * 100) / 100;
    const remainingDebt = Math.max(0, Math.round((finalTotal - totalPaidImmediate) * 100) / 100);

    if (cashVal < 0 || bankVal < 0 || walletVal < 0 || creditVal < 0) {
        showCustomAlert('مبالغ السداد لا يمكن أن تكون سالبة', 'خطأ في المدفوعات', 'error');
        return;
    }

    if (totalPaidImmediate > finalTotal) {
        showCustomAlert(`إجمالي المدفوعات المسددة فوراً (${totalPaidImmediate.toFixed(2)} ج.م) لا يمكن أن يتجاوز الإجمالي النهائي المستحق (${finalTotal.toFixed(2)} ج.م)`, 'خطأ في المدفوعات', 'error');
        return;
    }

    if (newPurchaseSelectedMethods.has('credit') && creditVal > remainingDebt) {
        showCustomAlert(`المبلغ الآجل (${creditVal.toFixed(2)} ج.م) لا يمكن أن يتجاوز المتبقي المستحق للفاتورة (${remainingDebt.toFixed(2)} ج.م)`, 'خطأ في المدفوعات', 'error');
        return;
    }

    const payFromTreasury = document.getElementById('tenderPayFromTreasury')?.checked === true;
    if (cashVal > 0 && payFromTreasury) {
        const tBal = Number(document.getElementById('tenderTreasuryBalanceHint')?.dataset?.balance || 0);
        if (cashVal > tBal) {
            showCustomAlert(`رصيد الخزنة المركزية المتاح (${tBal.toFixed(2)} ج.م) غير كافٍ لسداد الدفعة النقدية (${cashVal.toFixed(2)} ج.م).`, 'رصيد الخزنة غير كافٍ', 'warning');
            return;
        }
    }

    const ref = (document.getElementById('newPurchaseViewReference')?.value || '').trim();
    const generalNotes = (document.getElementById('newPurchaseViewNotes')?.value || '').trim();
    const fullNotes = ref ? (generalNotes ? `إذن/فاتورة: ${ref} | ${generalNotes}` : `إذن/فاتورة: ${ref}`) : generalNotes;
    const totalPieces = validItems.reduce((sum, item) => sum + item.quantity, 0);

    // Populate modal summary fields
    const supNameEl = document.getElementById('confirmPurchaseSupplierName');
    if (supNameEl) supNameEl.innerText = supName.split(' - ')[0] || supName;

    const itemsCountEl = document.getElementById('confirmPurchaseItemsCount');
    if (itemsCountEl) itemsCountEl.innerText = `${validItems.length} صنف (${totalPieces} قطعة)`;

    const totalEl = document.getElementById('confirmPurchaseFinalTotal');
    if (totalEl) totalEl.innerText = `${finalTotal.toFixed(2)} ج.م`;

    const paidEl = document.getElementById('confirmPurchasePaidAmount');
    if (paidEl) paidEl.innerText = `${totalPaidImmediate.toFixed(2)} ج.م`;

    const breakdownParts = [];
    if (cashVal > 0) breakdownParts.push(`نقداً: ${cashVal.toFixed(2)}`);
    if (bankVal > 0) breakdownParts.push(`بنك: ${bankVal.toFixed(2)}`);
    if (walletVal > 0) breakdownParts.push(`محفظة: ${walletVal.toFixed(2)}`);
    const breakdownEl = document.getElementById('confirmPurchasePaidBreakdown');
    if (breakdownEl) breakdownEl.innerText = breakdownParts.length > 0 ? breakdownParts.join(' | ') : 'لا يوجد سداد فوري';

    const remainingEl = document.getElementById('confirmPurchaseRemainingDebt');
    if (remainingEl) remainingEl.innerText = `${remainingDebt.toFixed(2)} ج.م`;

    pendingPurchaseInvoicePayload = {
        supplierId: Number(supId),
        items: validItems.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            sellPrice: i.sellPrice,
            discountPercent: i.discountPercent
        })),
        subtotal,
        discountAmount: discount,
        shippingCost: shipping,
        taxAmount: tax,
        totalAmount: finalTotal,
        paymentBreakdown: {
            cash: cashVal,
            bankTransfer: bankVal,
            eWallet: walletVal,
            credit: creditVal > 0 ? creditVal : remainingDebt
        },
        paidAmount: totalPaidImmediate,
        payFromTreasury,
        notes: fullNotes
    };

    const modal = document.getElementById('modalConfirmPurchaseInvoice');
    if (modal) {
        modal.classList.add('active');
        refreshIcons(modal);
    }
}
window.openConfirmPurchaseInvoiceModal = openConfirmPurchaseInvoiceModal;
window.submitNewPurchaseInvoiceView = openConfirmPurchaseInvoiceModal;

async function executeSubmitPurchaseInvoice() {
    if (isSubmittingPurchaseInvoice) return;
    if (!pendingPurchaseInvoicePayload) return;

    isSubmittingPurchaseInvoice = true;
    const btn = document.getElementById('btnExecuteSubmitPurchase');
    const btnText = document.getElementById('btnExecuteSubmitPurchaseText');
    if (btn) btn.disabled = true;
    if (btnText) btnText.innerText = 'جاري الاعتماد والحفظ...';

    try {
        const res = await window.api.createPurchaseInvoice(pendingPurchaseInvoicePayload, state.currentUser.id);
        if (!res.success) {
            showCustomAlert(`خطأ في حفظ فاتورة الشراء: ${res.error}`, 'فشل الحفظ', 'error');
            return;
        }

        // Close confirmation modal
        const confirmModal = document.getElementById('modalConfirmPurchaseInvoice');
        if (confirmModal) confirmModal.classList.remove('active');

        // Show Success Modal
        const successModal = document.getElementById('modalPurchaseInvoiceSuccess');
        const invNumEl = document.getElementById('purchaseSuccessInvoiceNum');
        const detailsEl = document.getElementById('purchaseSuccessDetailsText');

        const invNum = res.data.invoice_number || res.data.invoiceNumber || 'INV-PUR';
        if (invNumEl) invNumEl.innerText = invNum;

        // Save last created invoice for instant barcode printing
        lastCreatedPurchaseInvoice = {
            ...res.data,
            invoice_number: invNum,
            items: (res.data && res.data.items && res.data.items.length > 0)
                ? res.data.items
                : newPurchaseViewCart.map(c => ({
                    barcode: c.barcode,
                    item_name: c.itemName,
                    quantity: c.quantity,
                    sell_price: c.sellPrice || 0,
                    unit_cost: c.unitCost || 0
                }))
        };

        const debt = pendingPurchaseInvoicePayload.totalAmount - pendingPurchaseInvoicePayload.paidAmount;
        let details = `تم حفظ واعتماد الفاتورة بنجاح. تم تحديث أرصدة المخزون، وسعر التكلفة وسعر البيع النهائي للأصناف.`;
        if (debt > 0) {
            details += `\nتم تسجيل مديونية بقيمة ${debt.toFixed(2)} ج.م في حساب المورد.`;
        }
        if (detailsEl) detailsEl.innerText = details;

        if (successModal) {
            successModal.classList.add('active');
            refreshIcons(successModal);
        }

        pendingPurchaseInvoicePayload = null;
    } catch (err) {
        showCustomAlert('حدث خطأ غير متوقع أثناء اعتماد الفاتورة: ' + err.message, 'خطأ', 'error');
    } finally {
        isSubmittingPurchaseInvoice = false;
        if (btn) btn.disabled = false;
        if (btnText) btnText.innerText = 'تأكيد واعتماد الفاتورة';
    }
}
window.executeSubmitPurchaseInvoice = executeSubmitPurchaseInvoice;

function printGoodsBarcodeView() {
    if (newPurchaseViewCart.length === 0) {
        showCustomAlert('لا توجد أصناف في جدول الفاتورة لطباعة باركود لها. يرجى إضافة أصناف أولاً.', 'تنبيه', 'warning');
        return;
    }
    openPurchaseBarcodeModal('مسودة فاتورة جديدة', newPurchaseViewCart);
}

async function loadPurchaseInvoicesList() {
    const res = await window.api.listPurchaseInvoices(100);
    allPurchaseInvoicesCache = (res && res.data) ? res.data : [];

    // Calculate Purchase KPIs
    let totalPurchases = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    allPurchaseInvoicesCache.forEach(inv => {
        const tot = Number(inv.total_amount || 0);
        const pd = Number(inv.paid_amount || 0);
        const rem = Number(inv.remaining_amount || 0);
        totalPurchases += tot;
        totalPaid += pd;
        totalRemaining += rem;
    });

    const kpiCount = document.getElementById('kpiTotalPurchasesCount');
    if (kpiCount) kpiCount.innerText = allPurchaseInvoicesCache.length;

    const kpiAmount = document.getElementById('kpiTotalPurchasesAmount');
    if (kpiAmount) kpiAmount.innerText = `${totalPurchases.toFixed(2)} ج.م`;

    const kpiPaid = document.getElementById('kpiPurchasesPaid');
    if (kpiPaid) kpiPaid.innerText = `${totalPaid.toFixed(2)} ج.م`;

    const kpiRem = document.getElementById('kpiPurchasesRemaining');
    if (kpiRem) kpiRem.innerText = `${totalRemaining.toFixed(2)} ج.م`;

    filterAndRenderPurchaseInvoices();
}

function filterAndRenderPurchaseInvoices() {
    const tbody = document.getElementById('purchaseInvoicesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchTerm = (document.getElementById('purchaseInvoiceSearchInput')?.value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('purchaseInvoiceStatusFilter')?.value || 'all';

    let list = allPurchaseInvoicesCache;

    if (searchTerm) {
        list = list.filter(i =>
            (i.invoice_number && i.invoice_number.toLowerCase().includes(searchTerm)) ||
            (i.supplier_name && i.supplier_name.toLowerCase().includes(searchTerm)) ||
            (i.notes && i.notes.toLowerCase().includes(searchTerm))
        );
    }

    if (statusFilter !== 'all') {
        list = list.filter(i => i.payment_status === statusFilter);
    }

    const countDisplay = document.getElementById('purchaseInvoicesCountDisplay');
    if (countDisplay) countDisplay.innerText = `${list.length} فاتورة`;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">لا توجد فواتير شراء مسجلة تطابق البحث</td></tr>';
        return;
    }

    list.forEach(inv => {
        let statusBadge = '';
        if (inv.payment_status === 'paid') {
            statusBadge = '<span class="badge" style="background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;">مسددة بالكامل</span>';
        } else if (inv.payment_status === 'partial') {
            statusBadge = '<span class="badge" style="background: #fffbeb; color: #b45309; border: 1px solid #fde68a;">دفعة جزئية</span>';
        } else {
            statusBadge = '<span class="badge" style="background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;">آجلة بالكامل</span>';
        }

        let returnBadge = '';
        if (inv.return_status === 'full') {
            returnBadge = ' <span class="badge" style="background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5;">مرتجعة بالكامل</span>';
        } else if (inv.return_status === 'partial') {
            returnBadge = ' <span class="badge" style="background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa;">مرتجع جزئي</span>';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 800; color: var(--primary);">${inv.invoice_number}</td>
            <td style="font-weight: 700;">${inv.supplier_name || '-'}</td>
            <td style="text-align: left; font-weight: 800;">${Number(inv.total_amount).toFixed(2)} ج.م</td>
            <td style="text-align: left; color: #15803d; font-weight: 700;">${Number(inv.paid_amount).toFixed(2)} ج.م</td>
            <td style="text-align: left; color: #b91c1c; font-weight: 800;">${Number(inv.remaining_amount).toFixed(2)} ج.م</td>
            <td style="text-align: center;">${statusBadge}${returnBadge}</td>
            <td style="font-size: 12px; color: var(--text-muted); font-family: monospace;">${inv.created_at || '-'}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button type="button" class="btn-secondary" onclick="viewPurchaseInvoiceDetails(${inv.id})" style="padding: 4px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
                    <i data-lucide="eye" class="icon-xs"></i>
                    <span>عرض</span>
                </button>
                <button type="button" class="btn-secondary" onclick="openInvoiceBarcodesModal(${inv.id})" title="طباعة ملصقات الباركود لكل قطعة" style="padding: 4px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; color: #0284c7; border-color: #bae6fd;">
                    <i data-lucide="barcode" class="icon-xs"></i>
                    <span>باركود</span>
                </button>
                <button type="button" class="btn-secondary" onclick="openReturnPurchaseModal(${inv.id})" title="إرجاع أصناف من هذه الفاتورة للمورد" style="padding: 4px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; color: #dc2626; border-color: #fecaca; background: #fff5f5;">
                    <i data-lucide="undo-2" class="icon-xs"></i>
                    <span>إرجاع للمورد</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    refreshIcons(tbody);
}

window.viewPurchaseInvoiceDetails = async function(invoiceId) {
    try {
        const res = await window.api.getPurchaseInvoice(invoiceId);
        const inv = (res && res.data) ? res.data : (res && res.invoice_number ? res : null);
        if (!inv) {
            showCustomAlert('تعذر تحميل تفاصيل الفاتورة المطلوبة', 'خطأ');
            return;
        }

        currentViewedPurchaseInvoice = inv;

        const numBadge = document.getElementById('viewInvoiceNumBadge');
        if (numBadge) numBadge.innerText = inv.invoice_number || `PUR-${inv.id}`;

        const supEl = document.getElementById('viewInvoiceSupplierName');
        if (supEl) supEl.innerText = inv.supplier_name || 'مورد عام';

        const dateEl = document.getElementById('viewInvoiceDate');
        if (dateEl) dateEl.innerText = inv.created_at || '-';

        const totEl = document.getElementById('viewInvoiceTotal');
        if (totEl) totEl.innerText = `${Number(inv.total_amount || 0).toFixed(2)} ج.م`;

        const paidEl = document.getElementById('viewInvoicePaid');
        if (paidEl) paidEl.innerText = `${Number(inv.paid_amount || 0).toFixed(2)} ج.م`;

        const remEl = document.getElementById('viewInvoiceRemaining');
        if (remEl) remEl.innerText = `${Number(inv.remaining_amount || 0).toFixed(2)} ج.م`;

        const notesEl = document.getElementById('viewInvoiceNotesText');
        if (notesEl) notesEl.innerText = inv.notes ? `ملاحظات: ${inv.notes}` : '';

        const statusBadge = document.getElementById('viewInvoiceStatusBadge');
        if (statusBadge) {
            if (inv.payment_status === 'paid') {
                statusBadge.className = 'badge';
                statusBadge.style.cssText = 'background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;';
                statusBadge.innerText = 'مسددة بالكامل';
            } else if (inv.payment_status === 'partial') {
                statusBadge.className = 'badge';
                statusBadge.style.cssText = 'background: #fffbeb; color: #b45309; border: 1px solid #fde68a;';
                statusBadge.innerText = 'دفعة جزئية';
            } else {
                statusBadge.className = 'badge';
                statusBadge.style.cssText = 'background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;';
                statusBadge.innerText = 'آجلة بالكامل';
            }
        }

        const tbody = document.getElementById('viewInvoiceItemsTableBody');
        if (tbody) {
            tbody.innerHTML = '';
            (inv.items || []).forEach(item => {
                const tr = document.createElement('tr');
                const escapedName = (item.item_name || '').replace(/'/g, "\\'");
                const bCode = item.barcode || item.product_code || '-';
                tr.innerHTML = `
                    <td style="font-family: monospace; font-weight: 700;">${bCode}</td>
                    <td style="font-weight: 700;">${item.item_name || 'صنف غير محدد'}</td>
                    <td style="text-align: center; font-weight: 800;">${item.quantity || 0}</td>
                    <td style="text-align: left; font-weight: 600;">${Number(item.unit_cost || 0).toFixed(2)} ج.م</td>
                    <td style="text-align: left; font-weight: 700; color: #2563eb;">${Number(item.sell_price || 0).toFixed(2)} ج.م</td>
                    <td style="text-align: left; font-weight: 800; color: var(--primary);">${Number(item.line_total || 0).toFixed(2)} ج.م</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-secondary" onclick="openSingleItemBarcodeModal('${bCode}', '${escapedName}', ${item.sell_price || 0}, ${item.quantity || 1})" style="padding: 3px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; color: #0284c7; border-color: #bae6fd;" title="طباعة ملصقات الباركود لهذا الصنف">
                            <i data-lucide="barcode" class="icon-xs"></i>
                            <span>(${item.quantity || 1})</span>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        const modal = document.getElementById('modalViewPurchaseInvoice');
        if (modal) {
            modal.classList.add('active');
            refreshIcons(modal);
        }
    } catch (err) {
        console.error('Error viewing purchase invoice details:', err);
        showCustomAlert('حدث خطأ أثناء تحميل تفاصيل الفاتورة: ' + (err.message || ''), 'خطأ');
    }
};

/* -------------------------------------------------------------
 * 10.B PURCHASE INVOICE BARCODE GENERATOR & MULTI-LABEL PRINTER
 * ------------------------------------------------------------- */
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

function generateCode128Svg(text, height = 36) {
    if (!text) return '';
    const clean = String(text).trim().replace(/[^\x20-\x7E]/g, '');
    if (!clean) return '';

    let codes = [104]; // Start B
    let checksum = 104;
    for (let i = 0; i < clean.length; i++) {
        const val = clean.charCodeAt(i) - 32;
        codes.push(val);
        checksum += val * (i + 1);
    }
    codes.push(checksum % 103);
    codes.push(106); // Stop

    let modules = '';
    codes.forEach(c => {
        const pattern = CODE128_PATTERNS[c];
        if (pattern) {
            for (let j = 0; j < pattern.length; j++) {
                modules += (j % 2 === 0 ? '1' : '0').repeat(Number(pattern[j]));
            }
        }
    });

    const quiet = '0000000000';
    const all = quiet + modules + quiet;
    const totalW = all.length;

    let rects = '';
    let inBar = false;
    let barStart = 0;
    for (let x = 0; x <= all.length; x++) {
        const isOne = x < all.length && all[x] === '1';
        if (isOne && !inBar) {
            inBar = true;
            barStart = x;
        } else if (!isOne && inBar) {
            inBar = false;
            const w = x - barStart;
            rects += `<rect x="${barStart}" y="0" width="${w}" height="${height}" fill="#000" />`;
        }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${height}" width="100%" height="${height}" preserveAspectRatio="none" style="display: block;">
        <rect width="100%" height="100%" fill="#fff" />
        ${rects}
    </svg>`;
}

let barcodePrintState = {
    invoiceNumber: '',
    items: []
};

let currentViewedPurchaseInvoice = null;
let lastCreatedPurchaseInvoice = null;

function openPurchaseBarcodeModal(invoiceNum, items, fallbackTitle = '') {
    const list = items || [];
    if (list.length === 0) {
        showCustomAlert('لا توجد أصناف صالحة لطباعة باركود لها', 'تنبيه', 'warning');
        return;
    }

    barcodePrintState.invoiceNumber = invoiceNum || fallbackTitle || 'PUR-XXXX';
    barcodePrintState.items = list.map(item => ({
        barcode: item.barcode || item.product_code || `ITM-${item.product_id || '000'}`,
        item_name: item.item_name || item.itemName || 'صنف بدون اسم',
        sell_price: Number(item.sell_price || item.sellPrice || 0),
        quantity: Math.max(1, Number(item.quantity || 1)),
        print_qty: Math.max(1, Number(item.quantity || 1)) // default 1 label per piece!
    }));

    const numEl = document.getElementById('barcodeModalInvoiceNumText');
    if (numEl) numEl.innerText = barcodePrintState.invoiceNumber;

    const totalRecEl = document.getElementById('barcodeModalTotalReceivedQty');
    if (totalRecEl) {
        const totalPieces = barcodePrintState.items.reduce((sum, i) => sum + i.quantity, 0);
        totalRecEl.innerText = `${totalPieces} قطعة`;
    }

    renderBarcodePrintItemsTable();
    updateBarcodeLivePreview();

    const modal = document.getElementById('modalPrintPurchaseBarcodes');
    if (modal) {
        modal.classList.add('active');
        refreshIcons(modal);
    }
}
window.openPurchaseBarcodeModal = openPurchaseBarcodeModal;

window.openSingleItemBarcodeModal = function(barcode, itemName, sellPrice, quantity) {
    openPurchaseBarcodeModal(null, [{
        barcode,
        item_name: itemName,
        sell_price: sellPrice,
        quantity: quantity || 1
    }], `صنف: ${itemName}`);
};

window.openInvoiceBarcodesModal = async function(invoiceId) {
    try {
        const res = await window.api.getPurchaseInvoice(invoiceId);
        const inv = (res && res.data) ? res.data : (res && res.invoice_number ? res : null);
        if (!inv || !inv.items || inv.items.length === 0) {
            showCustomAlert('تعذر تحميل بيانات الفاتورة أو لا توجد أصناف مسجلة بها', 'تنبيه', 'warning');
            return;
        }
        openPurchaseBarcodeModal(inv.invoice_number, inv.items);
    } catch (err) {
        showCustomAlert('حدث خطأ أثناء تحميل الفاتورة للطباعة: ' + err.message, 'خطأ', 'error');
    }
};

function renderBarcodePrintItemsTable() {
    const tbody = document.getElementById('barcodePrintItemsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let grandTotal = 0;

    barcodePrintState.items.forEach((item, idx) => {
        grandTotal += Number(item.print_qty || 0);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 700; color: var(--text-primary);">${item.barcode}</td>
            <td style="font-weight: 700;">${item.item_name}</td>
            <td style="text-align: left; font-weight: 700; color: #2563eb;">${Number(item.sell_price).toFixed(2)} ج.م</td>
            <td style="text-align: center; font-weight: 800; background: #f8fafc;">${item.quantity}</td>
            <td style="text-align: center;">
                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                    <button type="button" class="btn-secondary" onclick="stepBarcodeItemQty(${idx}, -1)" style="width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; border-radius: 4px;">-</button>
                    <input type="number" min="0" max="9999" value="${item.print_qty}" onchange="changeBarcodeItemQty(${idx}, this.value)" style="width: 65px; height: 30px; text-align: center; font-weight: 900; font-size: 13px; border-radius: 4px; border: 1.5px solid var(--border-color); background: #ffffff;">
                    <button type="button" class="btn-secondary" onclick="stepBarcodeItemQty(${idx}, 1)" style="width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; border-radius: 4px;">+</button>
                </div>
            </td>
            <td style="text-align: center; padding: 4px 8px;">
                <div style="max-width: 100px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 2px; border-radius: 3px; background: #fff;">
                    ${generateCode128Svg(item.barcode, 20)}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    const grandTotalEl = document.getElementById('barcodePrintGrandTotal');
    if (grandTotalEl) grandTotalEl.innerText = grandTotal;
}

window.stepBarcodeItemQty = function(idx, delta) {
    if (barcodePrintState.items[idx]) {
        const cur = Number(barcodePrintState.items[idx].print_qty || 0);
        barcodePrintState.items[idx].print_qty = Math.max(0, cur + delta);
        renderBarcodePrintItemsTable();
        updateBarcodeLivePreview();
    }
};

window.changeBarcodeItemQty = function(idx, val) {
    if (barcodePrintState.items[idx]) {
        const parsed = parseInt(val, 10);
        barcodePrintState.items[idx].print_qty = isNaN(parsed) ? 0 : Math.max(0, parsed);
        renderBarcodePrintItemsTable();
        updateBarcodeLivePreview();
    }
};

function updateBarcodeLivePreview() {
    const container = document.getElementById('barcodeLiveStickerPreviewContainer');
    if (!container) return;

    const firstActive = barcodePrintState.items.find(i => i.print_qty > 0) || barcodePrintState.items[0];
    if (!firstActive) {
        container.innerHTML = '<span style="color: var(--text-muted); font-size: 12px;">لا توجد أصناف محددة للمعاينة</span>';
        return;
    }

    const showStore = document.getElementById('chkBarcodeIncludeStore')?.checked ?? true;
    const showPrice = document.getElementById('chkBarcodeIncludePrice')?.checked ?? true;
    const showCode = document.getElementById('chkBarcodeIncludeCode')?.checked ?? true;

    const svg = generateCode128Svg(firstActive.barcode, 28);

    container.innerHTML = `
        <div style="background: #ffffff; border: 1.5px solid #0f172a; border-radius: 5px; padding: 6px 12px; width: 190px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 2px;">
            ${showStore ? '<div style="font-size: 10px; font-weight: 800; color: #000; letter-spacing: 0.5px;">COTTON CLUB</div>' : ''}
            <div style="font-size: 10.5px; font-weight: 700; color: #000; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${firstActive.item_name}</div>
            <div style="width: 100%; margin: 2px 0;">${svg}</div>
            ${showCode ? `<div style="font-family: monospace; font-size: 9.5px; font-weight: 800; letter-spacing: 1px; color: #000;">${firstActive.barcode}</div>` : ''}
            ${showPrice ? `<div style="font-size: 11px; font-weight: 900; color: #000; border-top: 1px dashed #94a3b8; width: 100%; padding-top: 2px; margin-top: 2px;">السعر: ${Number(firstActive.sell_price).toFixed(2)} ج.م</div>` : ''}
        </div>
    `;
}

function bindBarcodePrintEvents() {
    const sizeSelect = document.getElementById('barcodeLabelSizeSelect');
    if (sizeSelect) sizeSelect.addEventListener('change', updateBarcodeLivePreview);

    ['chkBarcodeIncludeStore', 'chkBarcodeIncludePrice', 'chkBarcodeIncludeCode'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateBarcodeLivePreview);
    });

    const btnReset = document.getElementById('btnBarcodeResetToInvoiceQty');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            barcodePrintState.items.forEach(item => {
                item.print_qty = item.quantity;
            });
            renderBarcodePrintItemsTable();
            updateBarcodeLivePreview();
        });
    }

    const btnZero = document.getElementById('btnBarcodeZeroAll');
    if (btnZero) {
        btnZero.addEventListener('click', () => {
            barcodePrintState.items.forEach(item => {
                item.print_qty = 0;
            });
            renderBarcodePrintItemsTable();
            updateBarcodeLivePreview();
        });
    }

    const btnHeader = document.getElementById('btnOpenPurchaseBarcodeModal');
    if (btnHeader) {
        btnHeader.addEventListener('click', () => {
            if (currentViewedPurchaseInvoice) {
                openPurchaseBarcodeModal(currentViewedPurchaseInvoice.invoice_number, currentViewedPurchaseInvoice.items);
            }
        });
    }

    const btnFooter = document.getElementById('btnPrintInvoiceBarcodesFooter');
    if (btnFooter) {
        btnFooter.addEventListener('click', () => {
            if (currentViewedPurchaseInvoice) {
                openPurchaseBarcodeModal(currentViewedPurchaseInvoice.invoice_number, currentViewedPurchaseInvoice.items);
            }
        });
    }

    const btnSuccess = document.getElementById('btnSuccessPrintBarcodes');
    if (btnSuccess) {
        btnSuccess.addEventListener('click', () => {
            const successModal = document.getElementById('modalPurchaseInvoiceSuccess');
            if (successModal) successModal.classList.remove('active');

            if (lastCreatedPurchaseInvoice) {
                openPurchaseBarcodeModal(lastCreatedPurchaseInvoice.invoice_number, lastCreatedPurchaseInvoice.items);
            }
        });
    }

    const btnExecute = document.getElementById('btnExecutePrintBarcodes');
    if (btnExecute) {
        btnExecute.addEventListener('click', executePrintBarcodes);
    }
}

function executePrintBarcodes() {
    const itemsToPrint = barcodePrintState.items.filter(i => Number(i.print_qty) > 0);
    const totalStickers = itemsToPrint.reduce((sum, i) => sum + Number(i.print_qty), 0);

    if (totalStickers === 0) {
        showCustomAlert('يرجى تحديد كمية طباعة لملصق واحد على الأقل', 'تنبيه', 'warning');
        return;
    }

    const size = document.getElementById('barcodeLabelSizeSelect')?.value || '38x25';
    const showStore = document.getElementById('chkBarcodeIncludeStore')?.checked ?? true;
    const showPrice = document.getElementById('chkBarcodeIncludePrice')?.checked ?? true;
    const showCode = document.getElementById('chkBarcodeIncludeCode')?.checked ?? true;

    let pageCss = '';
    let stickerCss = '';
    let isA4 = (size === 'a4');

    if (size === '38x25') {
        pageCss = '@page { size: 38mm 25mm; margin: 0; }';
        stickerCss = 'width: 38mm; height: 24.5mm; padding: 1.5mm 2mm; box-sizing: border-box;';
    } else if (size === '50x25') {
        pageCss = '@page { size: 50mm 25mm; margin: 0; }';
        stickerCss = 'width: 50mm; height: 24.5mm; padding: 1.5mm 3mm; box-sizing: border-box;';
    } else if (size === '50x30') {
        pageCss = '@page { size: 50mm 30mm; margin: 0; }';
        stickerCss = 'width: 50mm; height: 29.5mm; padding: 2mm 3mm; box-sizing: border-box;';
    } else {
        pageCss = '@page { size: A4; margin: 8mm; }';
        stickerCss = 'width: 60mm; height: 35mm; padding: 2.5mm; border: 1px dashed #ccc; box-sizing: border-box; margin: 2mm;';
    }

    let stickersHtml = '';

    itemsToPrint.forEach(item => {
        const svg = generateCode128Svg(item.barcode, 32);
        const count = Number(item.print_qty);

        for (let i = 0; i < count; i++) {
            stickersHtml += `
                <div class="sticker-item" style="${stickerCss} display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; page-break-inside: avoid; break-inside: avoid; ${!isA4 ? 'page-break-after: always; break-after: page;' : ''} background: #fff; overflow: hidden;">
                    ${showStore ? '<div style="font-size: 8pt; font-weight: 800; letter-spacing: 0.5px; color: #000; line-height: 1;">COTTON CLUB</div>' : ''}
                    <div style="font-size: 8pt; font-weight: 700; color: #000; line-height: 1.1; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.item_name}</div>
                    <div style="width: 95%; margin: 1px 0;">${svg}</div>
                    ${showCode ? `<div style="font-family: monospace; font-size: 7.5pt; font-weight: 800; letter-spacing: 1px; color: #000; line-height: 1;">${item.barcode}</div>` : ''}
                    ${showPrice ? `<div style="font-size: 8.5pt; font-weight: 900; color: #000; border-top: 1px dashed #000; width: 100%; padding-top: 1px; line-height: 1.1;">السعر: ${Number(item.sell_price).toFixed(2)} ج.م</div>` : ''}
                </div>
            `;
        }
    });

    const fullHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <title>طباعة باركود الأصناف - Cotton Club</title>
        <style>
            ${pageCss}
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body {
                width: 100%;
                background: #ffffff;
                color: #000000;
                font-family: system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif;
            }
            ${isA4 ? `
            body {
                display: flex;
                flex-wrap: wrap;
                justify-content: flex-start;
                align-content: flex-start;
            }
            ` : `
            body {
                margin: 0;
                padding: 0;
            }
            `}
        </style>
    </head>
    <body>
        ${stickersHtml}
    </body>
    </html>
    `;

    printHtmlViaIframe(fullHtml);
}

function printHtmlViaIframe(htmlContent) {
    let iframe = document.getElementById('printBarcodeIframe');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'printBarcodeIframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
        try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } catch (e) {
            console.error('Iframe print error:', e);
            window.print();
        }
    }, 350);
}

/* -------------------------------------------------------------
 * 10.C PURCHASE INVOICE RETURN TO SUPPLIER (إرجاع للمورد)
 * ------------------------------------------------------------- */
let currentReturnInvoice = null;
let currentReturnInvoiceItems = [];
let returnSelectedMethods = new Set(['cash']);

function bindPurchaseReturnsEvents() {
    const btnSubmit = document.getElementById('btnSubmitPurchaseReturn');
    if (btnSubmit) {
        btnSubmit.addEventListener('click', submitPurchaseReturn);
    }

    const btnOpenFromView = document.getElementById('btnOpenReturnFromViewModal');
    if (btnOpenFromView) {
        btnOpenFromView.addEventListener('click', () => {
            if (currentViewedPurchaseInvoice) {
                const invId = currentViewedPurchaseInvoice.id;
                const viewModal = document.getElementById('modalViewPurchaseInvoice');
                if (viewModal) viewModal.classList.remove('active');
                openReturnPurchaseModal(invId);
            }
        });
    }

    // Tender Method Toggle Buttons
    const btnCash = document.getElementById('returnTenderBtnCash');
    const btnBank = document.getElementById('returnTenderBtnBank');
    const btnWallet = document.getElementById('returnTenderBtnWallet');
    const btnDebt = document.getElementById('returnTenderBtnDebt');

    if (btnCash) btnCash.addEventListener('click', () => toggleReturnTenderMethod('cash'));
    if (btnBank) btnBank.addEventListener('click', () => toggleReturnTenderMethod('bankTransfer'));
    if (btnWallet) btnWallet.addEventListener('click', () => toggleReturnTenderMethod('eWallet'));
    if (btnDebt) btnDebt.addEventListener('click', () => toggleReturnTenderMethod('debtReduction'));

    // Amount Input Listeners
    const inputCash = document.getElementById('returnAmountCash');
    const inputBank = document.getElementById('returnAmountBank');
    const inputWallet = document.getElementById('returnAmountWallet');
    const inputDebt = document.getElementById('returnAmountDebt');

    if (inputCash) inputCash.addEventListener('input', () => recalculateReturnTenderTotals('cash'));
    if (inputBank) inputBank.addEventListener('input', () => recalculateReturnTenderTotals('bank'));
    if (inputWallet) inputWallet.addEventListener('input', () => recalculateReturnTenderTotals('wallet'));
    if (inputDebt) inputDebt.addEventListener('input', () => recalculateReturnTenderTotals('debt'));

    // Quick fill remaining
    const btnQuickFill = document.getElementById('btnQuickFillReturnRemaining');
    if (btnQuickFill) btnQuickFill.addEventListener('click', quickFillReturnTenderRemaining);
}

function toggleReturnTenderMethod(method) {
    if (returnSelectedMethods.has(method)) {
        if (returnSelectedMethods.size === 1) {
            showCustomAlert('يجب اختيار وسيلة استرداد واحدة على الأقل', 'تنبيه');
            return;
        }
        returnSelectedMethods.delete(method);
    } else {
        returnSelectedMethods.add(method);
    }

    updateReturnTenderUI();
    quickFillReturnTenderRemaining();
}

function updateReturnTenderUI() {
    const config = [
        { id: 'cash', btn: 'returnTenderBtnCash', row: 'returnTenderRowCash', input: 'returnAmountCash' },
        { id: 'bankTransfer', btn: 'returnTenderBtnBank', row: 'returnTenderRowBank', input: 'returnAmountBank' },
        { id: 'eWallet', btn: 'returnTenderBtnWallet', row: 'returnTenderRowWallet', input: 'returnAmountWallet' },
        { id: 'debtReduction', btn: 'returnTenderBtnDebt', row: 'returnTenderRowDebt', input: 'returnAmountDebt' }
    ];

    config.forEach(cfg => {
        const btn = document.getElementById(cfg.btn);
        const row = document.getElementById(cfg.row);
        const input = document.getElementById(cfg.input);
        const isActive = returnSelectedMethods.has(cfg.id);

        if (btn) {
            if (isActive) {
                btn.classList.add('active');
                btn.style.borderColor = 'var(--primary)';
                btn.style.background = '#eff6ff';
            } else {
                btn.classList.remove('active');
                btn.style.borderColor = 'var(--border-color)';
                btn.style.background = '#fff';
            }
        }

        if (row) {
            row.style.display = isActive ? 'flex' : 'none';
        }

        if (!isActive && input) {
            input.value = 0;
        }
    });

    recalculateReturnTenderTotals();
}

function getReturnItemsTotalValue() {
    return currentReturnInvoiceItems.reduce((sum, item) => sum + (item.return_qty * item.unit_cost), 0);
}

function quickFillReturnTenderRemaining() {
    const totalRequired = getReturnItemsTotalValue();

    let currentAllocated = 0;
    const inputs = {
        cash: document.getElementById('returnAmountCash'),
        bankTransfer: document.getElementById('returnAmountBank'),
        eWallet: document.getElementById('returnAmountWallet'),
        debtReduction: document.getElementById('returnAmountDebt')
    };

    // If debt reduction is active and invoice has unpaid debt, prefer allocating debt reduction first
    if (returnSelectedMethods.has('debtReduction') && currentReturnInvoice) {
        const maxDebt = Math.min(Number(currentReturnInvoice.remaining_amount || 0), totalRequired);
        if (inputs.debtReduction) {
            inputs.debtReduction.value = maxDebt;
            currentAllocated += maxDebt;
        }
    }

    const remainingToAllocate = Math.max(0, totalRequired - currentAllocated);

    // Give remaining to cash if selected, otherwise first available selected method
    if (returnSelectedMethods.has('cash')) {
        if (inputs.cash) inputs.cash.value = remainingToAllocate;
    } else {
        const otherMethods = Array.from(returnSelectedMethods).filter(m => m !== 'debtReduction');
        if (otherMethods.length > 0 && inputs[otherMethods[0]]) {
            inputs[otherMethods[0]].value = remainingToAllocate;
        }
    }

    recalculateReturnTenderTotals();
}

function recalculateReturnTenderTotals(triggerSource = '') {
    const cash = Number(document.getElementById('returnAmountCash')?.value) || 0;
    const bank = Number(document.getElementById('returnAmountBank')?.value) || 0;
    const wallet = Number(document.getElementById('returnAmountWallet')?.value) || 0;
    const debt = Number(document.getElementById('returnAmountDebt')?.value) || 0;

    const totalRequired = getReturnItemsTotalValue();
    const allocated = Math.round((cash + bank + wallet + debt) * 100) / 100;
    const diff = Math.round((totalRequired - allocated) * 100) / 100;

    // Update treasury callout badge
    const badge = document.getElementById('returnTreasuryDepositBadge');
    if (badge) badge.innerText = `+${cash.toFixed(2)} ج.م`;

    // Update allocated display
    const allocatedEl = document.getElementById('returnTenderAllocatedDisplay');
    if (allocatedEl) allocatedEl.innerText = `${allocated.toFixed(2)} ج.م`;

    // Update diff display
    const diffEl = document.getElementById('returnTenderDiffDisplay');
    if (diffEl) {
        if (Math.abs(diff) < 0.01) {
            diffEl.innerHTML = '<span style="color: #15803d; font-weight: 800;">0.00 ج.م (مطابق تماماً ✓)</span>';
        } else if (diff > 0) {
            diffEl.innerHTML = `<span style="color: #dc2626; font-weight: 800;">متبقي ${diff.toFixed(2)} ج.م غير موزع ⚠</span>`;
        } else {
            diffEl.innerHTML = `<span style="color: #dc2626; font-weight: 800;">زيادة ${Math.abs(diff).toFixed(2)} ج.م عن الإجمالي ⚠</span>`;
        }
    }
}

window.openReturnPurchaseModal = async function(invoiceId) {
    try {
        const res = await window.api.getPurchaseInvoice(invoiceId);
        const inv = (res && res.data) ? res.data : (res && res.invoice_number ? res : null);
        if (!inv) {
            showCustomAlert('تعذر تحميل تفاصيل الفاتورة المطلوبة للإرجاع', 'خطأ');
            return;
        }

        currentReturnInvoice = inv;

        // Fetch products to get fresh current_stock for items
        let productsMap = {};
        try {
            const pRes = await window.api.listProducts({});
            const pList = (pRes && pRes.data) ? pRes.data : (Array.isArray(pRes) ? pRes : []);
            pList.forEach(p => {
                productsMap[p.id] = p;
                if (p.barcode) productsMap[p.barcode] = p;
            });
        } catch (e) {
            console.warn('Could not fetch latest products catalog:', e);
        }

        // Fill modal headers & summary
        const badge = document.getElementById('returnInvoiceNumBadge');
        if (badge) badge.innerText = inv.invoice_number || `PUR-${inv.id}`;

        const supEl = document.getElementById('returnModalSupplierName');
        if (supEl) supEl.innerText = inv.supplier_name || 'مورد عام';

        const totEl = document.getElementById('returnModalOriginalTotal');
        if (totEl) totEl.innerText = `${Number(inv.total_amount || 0).toFixed(2)} ج.م`;

        const paidEl = document.getElementById('returnModalPaidAmount');
        if (paidEl) paidEl.innerText = `${Number(inv.paid_amount || 0).toFixed(2)} ج.م`;

        const remEl = document.getElementById('returnModalRemainingAmount');
        if (remEl) remEl.innerText = `${Number(inv.remaining_amount || 0).toFixed(2)} ج.م`;

        // Initialize multi-tender methods
        if (Number(inv.remaining_amount || 0) > 0) {
            returnSelectedMethods = new Set(['cash', 'debtReduction']);
        } else {
            returnSelectedMethods = new Set(['cash']);
        }
        updateReturnTenderUI();

        // Reset notes input
        const notesInput = document.getElementById('returnPurchaseNotesInput');
        if (notesInput) notesInput.value = '';

        // Prepare items array
        currentReturnInvoiceItems = (inv.items || []).map(item => {
            const prod = productsMap[item.product_id] || (item.barcode ? productsMap[item.barcode] : null);
            const currentStock = prod ? Number(prod.current_stock || 0) : Number(item.quantity || 0);
            const maxReturn = Math.max(0, Math.min(Number(item.quantity || 0), currentStock));
            return {
                id: item.id,
                product_id: item.product_id,
                item_name: item.item_name || (prod ? prod.name : 'صنف'),
                product_code: item.product_code || item.barcode || (prod ? prod.barcode : '-'),
                quantity: Number(item.quantity || 0),
                unit_cost: Number(item.unit_cost || 0),
                current_stock: currentStock,
                max_returnable: maxReturn,
                return_qty: 0
            };
        });

        // Render items table
        renderReturnInvoiceItemsTable();

        // Update totals
        updateReturnModalTotals();

        // Open modal
        const modal = document.getElementById('modalReturnPurchaseInvoice');
        if (modal) {
            modal.classList.add('active');
            refreshIcons(modal);
        }
    } catch (err) {
        console.error('Error opening return modal:', err);
        showCustomAlert('حدث خطأ أثناء فتح شاشة الإرجاع للمورد: ' + (err.message || ''), 'خطأ');
    }
};

function renderReturnInvoiceItemsTable() {
    const tbody = document.getElementById('returnPurchaseItemsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (currentReturnInvoiceItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 18px;">لا توجد أصناف مسجلة في هذه الفاتورة</td></tr>';
        return;
    }

    currentReturnInvoiceItems.forEach(item => {
        const tr = document.createElement('tr');
        const isOutOfStock = item.current_stock <= 0;
        const stockStyle = isOutOfStock ? 'color: #b91c1c; font-weight: 800;' : 'color: #15803d; font-weight: 800;';
        
        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 700;">${item.product_code}</td>
            <td style="font-weight: 700;">${item.item_name}</td>
            <td style="text-align: center; font-weight: 800;">${item.quantity}</td>
            <td style="text-align: center; ${stockStyle}">${item.current_stock}</td>
            <td style="text-align: left; font-weight: 700;">${item.unit_cost.toFixed(2)} ج.م</td>
            <td style="text-align: center;">
                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                    <button type="button" class="btn-secondary" onclick="stepReturnQty(${item.product_id}, -1)" style="padding: 2px 8px; font-weight: 800; font-size: 13px;" ${item.max_returnable === 0 ? 'disabled' : ''}>-</button>
                    <input type="number" id="returnQtyInput_${item.product_id}" value="${item.return_qty}" min="0" max="${item.max_returnable}" step="1" 
                        style="width: 55px; text-align: center; font-weight: 800; font-size: 13px; border: 1.5px solid var(--border-color); border-radius: 4px; padding: 3px;"
                        ${item.max_returnable === 0 ? 'disabled' : ''}
                        oninput="onReturnQtyChanged(${item.product_id}, this.value)">
                    <button type="button" class="btn-secondary" onclick="stepReturnQty(${item.product_id}, 1)" style="padding: 2px 8px; font-weight: 800; font-size: 13px;" ${item.max_returnable === 0 ? 'disabled' : ''}>+</button>
                </div>
            </td>
            <td style="text-align: left; font-weight: 800; color: #dc2626;" id="returnLineTotal_${item.product_id}">
                ${(item.return_qty * item.unit_cost).toFixed(2)} ج.م
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.stepReturnQty = function(productId, delta) {
    const item = currentReturnInvoiceItems.find(i => i.product_id === productId);
    if (!item) return;

    let newQty = item.return_qty + delta;
    if (newQty < 0) newQty = 0;
    if (newQty > item.max_returnable) {
        newQty = item.max_returnable;
        showCustomAlert(`الحد الأقصى للإرجاع لهذا الصنف هو ${item.max_returnable} قطعة نظراً لقيود المخزون أو كمية الفاتورة`, 'تنبيه');
    }

    item.return_qty = newQty;
    const input = document.getElementById(`returnQtyInput_${productId}`);
    if (input) input.value = newQty;

    const lineTotalEl = document.getElementById(`returnLineTotal_${productId}`);
    if (lineTotalEl) lineTotalEl.innerText = `${(newQty * item.unit_cost).toFixed(2)} ج.م`;

    updateReturnModalTotals();
};

window.onReturnQtyChanged = function(productId, rawValue) {
    const item = currentReturnInvoiceItems.find(i => i.product_id === productId);
    if (!item) return;

    let val = parseInt(rawValue, 10);
    if (isNaN(val) || val < 0) val = 0;
    if (val > item.max_returnable) {
        val = item.max_returnable;
        const input = document.getElementById(`returnQtyInput_${productId}`);
        if (input) input.value = val;
        showCustomAlert(`الحد الأقصى للإرجاع لهذا الصنف هو ${item.max_returnable} قطعة`, 'تنبيه');
    }

    item.return_qty = val;
    const lineTotalEl = document.getElementById(`returnLineTotal_${productId}`);
    if (lineTotalEl) lineTotalEl.innerText = `${(val * item.unit_cost).toFixed(2)} ج.م`;

    updateReturnModalTotals();
};

function updateReturnModalTotals() {
    let totalPieces = 0;
    let totalAmount = 0;

    currentReturnInvoiceItems.forEach(item => {
        totalPieces += item.return_qty;
        totalAmount += item.return_qty * item.unit_cost;
    });

    const piecesEl = document.getElementById('returnTotalPiecesDisplay');
    if (piecesEl) piecesEl.innerText = `${totalPieces} قطعة`;

    const amountEl = document.getElementById('returnTotalAmountDisplay');
    if (amountEl) amountEl.innerText = `${totalAmount.toFixed(2)} ج.م`;

    quickFillReturnTenderRemaining();
}

window.submitPurchaseReturn = async function() {
    if (!currentReturnInvoice) return;

    const returnItems = currentReturnInvoiceItems
        .filter(item => item.return_qty > 0)
        .map(item => ({
            product_id: item.product_id,
            quantity: item.return_qty,
            unit_cost: item.unit_cost
        }));

    if (returnItems.length === 0) {
        showCustomAlert('يرجى تحديد كمية إرجاع (قطعة واحدة على الأقل) لأحد الأصناف', 'تنبيه', 'warning');
        return;
    }

    const totalAmount = getReturnItemsTotalValue();
    const cash = Number(document.getElementById('returnAmountCash')?.value) || 0;
    const bank = Number(document.getElementById('returnAmountBank')?.value) || 0;
    const wallet = Number(document.getElementById('returnAmountWallet')?.value) || 0;
    const debt = Number(document.getElementById('returnAmountDebt')?.value) || 0;

    const allocated = Math.round((cash + bank + wallet + debt) * 100) / 100;
    if (Math.abs(allocated - totalAmount) > 0.01) {
        showCustomAlert(
            `مجموع مبالغ الاسترداد (${allocated.toFixed(2)} ج.م) لا يتطابق مع إجمالي قيمة البضاعة المرتجعة (${totalAmount.toFixed(2)} ج.م).\nيرجى تعديل المبالغ أو الضغط على "توزيع المتبقي تلقائياً".`,
            'تنبيه',
            'warning'
        );
        return;
    }

    const reasonSelect = document.getElementById('returnPurchaseReasonSelect');
    const notesInput = document.getElementById('returnPurchaseNotesInput');

    const payload = {
        purchase_invoice_id: currentReturnInvoice.id,
        supplier_id: currentReturnInvoice.supplier_id,
        reason: reasonSelect ? reasonSelect.value : '',
        refund_breakdown: {
            cash,
            bankTransfer: bank,
            eWallet: wallet,
            debtReduction: debt
        },
        notes: notesInput ? notesInput.value.trim() : '',
        items: returnItems
    };

    try {
        const btnSubmit = document.getElementById('btnSubmitPurchaseReturn');
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span>جاري تنفيذ الإرجاع وتحديث المخزون...</span>';
        }

        const res = await window.api.createPurchaseReturn(payload, state.currentUser?.id);

        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i data-lucide="check-circle" class="icon-sm"></i><span>تأكيد الإرجاع للمورد وتحديث المخزون</span>';
        }

        if (res && res.success) {
            // Close modal
            const modal = document.getElementById('modalReturnPurchaseInvoice');
            if (modal) modal.classList.remove('active');

            // Also close view invoice modal if open
            const viewModal = document.getElementById('modalViewPurchaseInvoice');
            if (viewModal) viewModal.classList.remove('active');

            // Refresh invoices list
            await loadPurchaseInvoicesList();

            let successMsg = `تم إرجاع البضاعة للمورد بنجاح!\nرقم سند المرتجع: ${res.data.return_number}\nالإجمالي: ${totalAmount.toFixed(2)} ج.م`;
            if (cash > 0) {
                successMsg += `\n💰 تم توريد وإيداع ${cash.toFixed(2)} ج.م في الخزنة المركزية مباشرة.`;
            }
            if (debt > 0) {
                successMsg += `\n⏳ تم خصم ${debt.toFixed(2)} ج.م من مديونية الفاتورة والمورد.`;
            }

            showCustomAlert(successMsg, 'تم الإرجاع والتسوية بنجاح', 'success');
        } else {
            showCustomAlert(res?.error || res?.message || 'تعذر إتمام عملية الإرجاع للمورد', 'خطأ');
        }
    } catch (err) {
        console.error('Error submitting purchase return:', err);
        showCustomAlert('حدث خطأ غير متوقع أثناء إتمام الإرجاع: ' + (err.message || ''), 'خطأ');
        const btnSubmit = document.getElementById('btnSubmitPurchaseReturn');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i data-lucide="check-circle" class="icon-sm"></i><span>تأكيد الإرجاع للمورد وتحديث المخزون</span>';
        }
    }
};

/* -------------------------------------------------------------
 * 11. CENTRAL TREASURY (HQ TREASURY MULTI-CHANNEL ARCHITECTURE)
 * ------------------------------------------------------------- */
let activeTreasuryMainTab = 'audit';
let cachedTreasuryBalances = { balance: 0, cashBalance: 0, cardBalance: 0, transferBalance: 0, ownerBalance: 0 };
let cachedTreasuryEmployees = [];
let selectedPayrollEmployee = null;
let activeBranchTransfersFilter = 'all';

// Arabic text normalizer helper (أ/إ/آ -> ا, ة -> ه, ى -> ي, tashkeel removed)
function normalizeArabic(text) {
    if (!text) return '';
    return text
        .toString()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u065F]/g, '')
        .trim()
        .toLowerCase();
}
window.normalizeArabic = normalizeArabic;

// Main Tab Switcher
window.switchTreasuryMainTab = function(tabKey) {
    activeTreasuryMainTab = tabKey || 'audit';

    // Highlight active button in tabs bar
    document.querySelectorAll('#treasuryMainTabsContainer .treasury-subtab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === activeTreasuryMainTab);
    });

    // Toggle panes
    const paneMap = {
        'audit': 'treasuryViewAudit',
        'owner': 'treasuryViewOwner',
        'analytics': 'treasuryViewAnalytics'
    };

    Object.keys(paneMap).forEach(key => {
        const el = document.getElementById(paneMap[key]);
        if (el) el.style.display = (key === activeTreasuryMainTab) ? 'block' : 'none';
    });

    // Refresh icons
    refreshIcons();

    // Load data for active tab
    if (activeTreasuryMainTab === 'audit') loadTreasuryAuditLog();
    else if (activeTreasuryMainTab === 'owner') loadOwnerLedger();
    else if (activeTreasuryMainTab === 'analytics') loadTreasuryAnalytics();
};

// Legacy compatibility
window.switchTreasurySubTab = function(subTab) {
    const map = {
        'owner': 'owner',
        'audit': 'audit',
        'payroll': 'audit',
        'shifts': 'audit',
        'transfers': 'audit'
    };
    window.switchTreasuryMainTab(map[subTab] || 'audit');
};

function getChannelBadge(method) {
    if (method === 'split') {
        return '<span class="badge" style="background: #FAF5FF; color: #7E22CE; border: 1px solid #E9D5FF; font-weight: 700; padding: 4px 10px; border-radius: 20px;">🔀 قنوات متعددة (شامل)</span>';
    } else if (method === 'card') {
        return '<span class="badge" style="background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; font-weight: 700; padding: 4px 10px; border-radius: 20px;">💳 فيزا / بنك</span>';
    } else if (method === 'transfer') {
        return '<span class="badge" style="background: #F5F3FF; color: #6D28D9; border: 1px solid #DDD6FE; font-weight: 700; padding: 4px 10px; border-radius: 20px;">📱 تحويل / محفظة</span>';
    }
    return '<span class="badge" style="background: #F0FDF4; color: #166534; border: 1px solid #BBF7D0; font-weight: 700; padding: 4px 10px; border-radius: 20px;">💵 كاش (نقدي)</span>';
}
window.getChannelBadge = getChannelBadge;

// Modal Close / Open Helpers
function closeTreasuryModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}
window.closeTreasuryModal = closeTreasuryModal;

function openTreasuryDepositModal() {
    const modal = document.getElementById('modalTreasuryDeposit');
    if (!modal) return;
    const amountInp = document.getElementById('treasuryDepositAmount');
    const notesInp = document.getElementById('treasuryDepositNotes');
    if (amountInp) amountInp.value = '';
    if (notesInp) notesInp.value = '';
    selectTreasuryDepositChannel('cash');
    modal.classList.add('active');
    modal.style.display = 'flex';
    refreshIcons(modal);
    setTimeout(() => amountInp?.focus(), 50);
}
window.openTreasuryDepositModal = openTreasuryDepositModal;

async function openTreasuryWithdrawModal() {
    const modal = document.getElementById('modalTreasuryWithdraw');
    if (!modal) return;
    const amountInp = document.getElementById('treasuryWithdrawAmount');
    const notesInp = document.getElementById('treasuryWithdrawNotes');
    if (amountInp) amountInp.value = '';
    if (notesInp) notesInp.value = '';
    selectTreasuryWithdrawChannel('cash');
    modal.classList.add('active');
    modal.style.display = 'flex';
    refreshIcons(modal);
    setTimeout(() => amountInp?.focus(), 50);
    updateWithdrawModalBalance().catch(console.warn);
}
window.openTreasuryWithdrawModal = openTreasuryWithdrawModal;

async function openChannelTransferModal() {
    const modal = document.getElementById('modalChannelTransfer');
    if (!modal) return;
    const amountInp = document.getElementById('channelTransferAmount');
    const notesInp = document.getElementById('channelTransferNotes');
    if (amountInp) amountInp.value = '';
    if (notesInp) notesInp.value = '';
    modal.classList.add('active');
    modal.style.display = 'flex';
    refreshIcons(modal);
    setTimeout(() => amountInp?.focus(), 50);
    updateTransferModalBalances().catch(console.warn);
}
window.openChannelTransferModal = openChannelTransferModal;

function selectTreasuryDepositChannel(channel) {
    const pills = document.querySelectorAll('#treasuryDepositChannelPills .channel-pill-btn');
    pills.forEach(p => {
        const isMatch = p.dataset.channel === channel;
        p.classList.toggle('active', isMatch);
        p.style.borderColor = isMatch ? '#F59E0B' : '#E2E8F0';
        p.style.background = '#FFFFFF';
        p.style.color = isMatch ? '#92400E' : '#475569';
    });
    const inp = document.getElementById('treasuryDepositSelectedChannel');
    if (inp) inp.value = channel;
}
window.selectTreasuryDepositChannel = selectTreasuryDepositChannel;

function selectTreasuryWithdrawChannel(channel) {
    const pills = document.querySelectorAll('#treasuryWithdrawChannelPills .channel-pill-btn');
    pills.forEach(p => {
        const isMatch = p.dataset.channel === channel;
        p.classList.toggle('active', isMatch);
        p.style.borderColor = isMatch ? '#F59E0B' : '#E2E8F0';
        p.style.background = '#FFFFFF';
        p.style.color = isMatch ? '#92400E' : '#475569';
    });
    const inp = document.getElementById('treasuryWithdrawSelectedChannel');
    if (inp) inp.value = channel;
    updateWithdrawModalBalance().catch(console.warn);
}
window.selectTreasuryWithdrawChannel = selectTreasuryWithdrawChannel;

async function updateWithdrawModalBalance() {
    try {
        const balRes = await window.api.getTreasuryBalance();
        const d = balRes?.data || balRes || {};
        const selectedChannel = document.getElementById('treasuryWithdrawSelectedChannel')?.value || 'cash';
        let curBal = 0;
        if (selectedChannel === 'cash') curBal = d.cashBalance || 0;
        else if (selectedChannel === 'card') curBal = d.cardBalance || 0;
        else if (selectedChannel === 'transfer') curBal = d.transferBalance || 0;

        const el = document.getElementById('treasuryWithdrawAvailableBal');
        if (el) {
            el.innerText = `${curBal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
            el.dataset.available = curBal;
        }
    } catch (e) {
        console.warn('updateWithdrawModalBalance error:', e);
    }
}
window.updateWithdrawModalBalance = updateWithdrawModalBalance;

async function updateTransferModalBalances() {
    try {
        const balRes = await window.api.getTreasuryBalance();
        const d = balRes?.data || balRes || {};
        const fromSel = document.getElementById('channelTransferFromSelect');
        const availEl = document.getElementById('channelTransferAvailableBal');
        if (fromSel && fromSel.options.length >= 3) {
            fromSel.options[0].text = `كاش (${(d.cashBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م)`;
            fromSel.options[1].text = `حساب بنكي / فيزا (${(d.cardBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م)`;
            fromSel.options[2].text = `محفظة / إنستاباي (${(d.transferBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م)`;
            
            let curBal = 0;
            if (fromSel.value === 'cash') curBal = d.cashBalance || 0;
            else if (fromSel.value === 'card') curBal = d.cardBalance || 0;
            else if (fromSel.value === 'transfer') curBal = d.transferBalance || 0;
            if (availEl) {
                availEl.innerText = `${curBal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
                availEl.dataset.available = curBal;
            }
        }
    } catch (e) {
        console.warn('updateTransferModalBalances error:', e);
    }
}
window.updateTransferModalBalances = updateTransferModalBalances;

async function submitTreasuryDeposit() {
    const amountInp = document.getElementById('treasuryDepositAmount');
    const amount = Number(amountInp?.value);
    if (!amount || amount <= 0) {
        alert('يرجى إدخال مبلغ إيداع صحيح');
        return;
    }

    const paymentMethod = document.getElementById('treasuryDepositSelectedChannel')?.value || 'cash';
    const notes = document.getElementById('treasuryDepositNotes')?.value.trim() || '';

    const res = await window.api.treasuryDeposit({
        amount,
        paidBy: 'صاحب المنشأة (Owner)',
        paymentMethod,
        notes
    }, state.currentUser?.id);

    if (!res || !res.success) {
        alert(`خطأ في الإيداع: ${res?.error || 'فشلت العملية'}`);
        return;
    }

    alert(`تم تسجيل حركة إيداع رأس مال / تمويل بنجاح بمبلغ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    closeTreasuryModal('modalTreasuryDeposit');
    window.switchTreasuryMainTab('owner');
    loadTreasuryView();
}
window.submitTreasuryDeposit = submitTreasuryDeposit;

async function submitTreasuryWithdraw() {
    const amountInp = document.getElementById('treasuryWithdrawAmount');
    const amount = Number(amountInp?.value);
    if (!amount || amount <= 0) {
        alert('يرجى إدخال مبلغ سحب صحيح');
        return;
    }

    const availBal = Number(document.getElementById('treasuryWithdrawAvailableBal')?.dataset?.available || 0);
    if (amount > availBal + 0.01) {
        alert(`لا يمكن سحب أكثر من الرصيد المتوفر في القناة المختارة (${availBal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م)`);
        return;
    }

    const paymentMethod = document.getElementById('treasuryWithdrawSelectedChannel')?.value || 'cash';
    const notes = document.getElementById('treasuryWithdrawNotes')?.value.trim() || '';

    const res = await window.api.treasuryWithdraw({
        amount,
        recipient: 'صاحب المنشأة (Owner)',
        paymentMethod,
        notes
    }, state.currentUser?.id);

    if (!res || !res.success) {
        alert(`خطأ في السحب: ${res?.error || 'فشلت العملية'}`);
        return;
    }

    alert(`تم تسجيل حركة مسحوبات صاحب الحساب بنجاح بمبلغ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    closeTreasuryModal('modalTreasuryWithdraw');
    window.switchTreasuryMainTab('owner');
    loadTreasuryView();
}
window.submitTreasuryWithdraw = submitTreasuryWithdraw;

async function submitChannelTransfer() {
    const fromMethod = document.getElementById('channelTransferFromSelect')?.value;
    const toMethod = document.getElementById('channelTransferToSelect')?.value;
    if (fromMethod === toMethod) {
        alert('لا يمكن التحويل إلى نفس القناة المختارة كمصدر. يرجى اختيار قناتين مختلفتين.');
        return;
    }

    const amountInp = document.getElementById('channelTransferAmount');
    const amount = Number(amountInp?.value);
    if (!amount || amount <= 0) {
        alert('يرجى إدخال مبلغ تحويل صحيح');
        return;
    }

    const availBal = Number(document.getElementById('channelTransferAvailableBal')?.dataset?.available || 0);
    if (amount > availBal + 0.01) {
        alert(`لا يمكن تحويل أكثر من الرصيد المتوفر في القناة المحول منها (${availBal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م)`);
        return;
    }

    const notes = document.getElementById('channelTransferNotes')?.value.trim() || '';

    const res = await window.api.treasuryTransferChannel({
        fromMethod,
        toMethod,
        amount,
        notes
    }, state.currentUser?.id);

    if (!res || !res.success) {
        alert(`خطأ في التحويل: ${res?.error || 'فشلت العملية'}`);
        return;
    }

    alert(`تم تنفيذ تحويل الأموال بنجاح بمبلغ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    closeTreasuryModal('modalChannelTransfer');
    window.switchTreasuryMainTab('audit');
    loadTreasuryView();
}
window.submitChannelTransfer = submitChannelTransfer;

// ==============================================================
// OPERATIONS ROW: QUICK DISBURSAL CONTROLLER
// ==============================================================
function selectTreasuryTag(tagName, tagColor) {
    const catSel = document.getElementById('quickDisburseCategory');
    if (catSel) {
        let found = false;
        for (let i = 0; i < catSel.options.length; i++) {
            if (catSel.options[i].value === tagName) {
                catSel.selectedIndex = i;
                found = true;
                break;
            }
        }
        if (!found) {
            const opt = new Option(tagName, tagName, true, true);
            catSel.add(opt);
        }
    }
    const notesInp = document.getElementById('quickDisburseNotes');
    if (notesInp && !notesInp.value) {
        notesInp.value = `صرف ${tagName}`;
    }
    const amtInp = document.getElementById('quickDisburseAmount');
    if (amtInp) {
        amtInp.focus();
    }
}
window.selectTreasuryTag = selectTreasuryTag;

function openAddExpenseTagModal() {
    const modal = document.getElementById('modalAddExpenseTag');
    if (!modal) return;
    const nameInp = document.getElementById('newExpenseTagName');
    if (nameInp) nameInp.value = '';
    modal.classList.add('active');
    modal.style.display = 'flex';
    refreshIcons(modal);
    setTimeout(() => nameInp?.focus(), 50);
}
window.openAddExpenseTagModal = openAddExpenseTagModal;

function submitAddNewExpenseTag() {
    const name = document.getElementById('newExpenseTagName')?.value.trim();
    const color = document.getElementById('newExpenseTagColor')?.value || '#3B82F6';
    if (!name) {
        alert('يرجى إدخال اسم البند');
        return;
    }
    const cloud = document.getElementById('treasuryTagsCloud');
    if (cloud) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tag-pill-btn';
        btn.onclick = () => selectTreasuryTag(name, color);
        btn.style.cssText = `padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 6px; border: 1px solid ${color}40; background: ${color}15; color: ${color}; cursor: pointer; transition: all 0.15s;`;
        btn.innerText = `🏷️ ${name}`;
        cloud.appendChild(btn);
    }
    const catSel = document.getElementById('quickDisburseCategory');
    if (catSel) {
        const opt = new Option(`🏷️ ${name}`, name, true, true);
        catSel.add(opt);
    }
    closeTreasuryModal('modalAddExpenseTag');
    selectTreasuryTag(name, color);
}
window.submitAddNewExpenseTag = submitAddNewExpenseTag;

function checkQuickDisburseSolvency() {
    const channel = document.getElementById('quickDisburseChannel')?.value || 'cash';
    let avail = 0;
    if (channel === 'cash') avail = cachedTreasuryBalances.cashBalance || 0;
    else if (channel === 'card') avail = cachedTreasuryBalances.cardBalance || 0;
    else if (channel === 'transfer') avail = cachedTreasuryBalances.transferBalance || 0;

    const badge = document.getElementById('quickDisburseChannelBalBadge');
    if (badge) {
        badge.innerText = `متاح: ${avail.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
    }

    const amount = Number(document.getElementById('quickDisburseAmount')?.value) || 0;
    const warningEl = document.getElementById('quickDisburseSolvencyWarning');
    const submitBtn = document.getElementById('btnSubmitQuickDisburse');

    if (amount > 0 && amount > avail + 0.01) {
        if (warningEl) {
            warningEl.style.display = 'flex';
            const warnText = document.getElementById('quickDisburseSolvencyWarningText');
            if (warnText) {
                warnText.innerText = `الرصيد المتاح بالقناة (${avail.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م) غير كافٍ لصرف (${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م)!`;
            }
        }
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
        }
        return false;
    } else {
        if (warningEl) warningEl.style.display = 'none';
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
        return true;
    }
}
window.checkQuickDisburseSolvency = checkQuickDisburseSolvency;

async function submitQuickDisburse() {
    const amount = Number(document.getElementById('quickDisburseAmount')?.value);
    if (!amount || amount <= 0) {
        alert('يرجى إدخال مبلغ صحيح للصرف');
        return;
    }

    if (!checkQuickDisburseSolvency()) {
        alert('لا يمكن إتمام الصرف نظراً لعدم توفر الرصيد الكافي في القناة المالية المختارة (مبدأ الملاءة الصارمة).');
        return;
    }

    const category = document.getElementById('quickDisburseCategory')?.value || 'تشغيلي ونثريات';
    const recipient = document.getElementById('quickDisburseRecipient')?.value.trim() || 'مصروف إداري';
    const channel = document.getElementById('quickDisburseChannel')?.value || 'cash';
    const notes = document.getElementById('quickDisburseNotes')?.value.trim() || '';

    const btn = document.getElementById('btnSubmitQuickDisburse');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader" class="icon-xs"></i><span>جاري الصرف...</span>';
    }

    try {
        const res = await window.api.treasuryQuickDisburse({
            amount,
            category,
            recipient,
            channel,
            notes
        }, state.currentUser?.id);

        if (!res || !res.success) {
            alert(`فشل الصرف: ${res?.error || 'خطأ غير متوقع'}`);
            return;
        }

        alert(`✅ تم اعتماد وصرف المصروف بنجاح وقيده باليومية الإدارية.\nالمبلغ: ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م\nالتصنيف: ${category}`);
        
        // Reset inputs
        const amtInp = document.getElementById('quickDisburseAmount');
        if (amtInp) amtInp.value = '';
        const recInp = document.getElementById('quickDisburseRecipient');
        if (recInp) recInp.value = '';
        const notInp = document.getElementById('quickDisburseNotes');
        if (notInp) notInp.value = '';

        loadTreasuryView();
    } catch (err) {
        console.error('submitQuickDisburse error:', err);
        alert(`حدث خطأ أثناء الصرف: ${err.message}`);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="send" class="icon-xs"></i><span>صرف فوري واعتماد المصروف</span>';
            refreshIcons(btn);
        }
    }
}
window.submitQuickDisburse = submitQuickDisburse;

// ==============================================================
// OPERATIONS ROW: INTERACTIVE PAYROLL CONTROLLER
// ==============================================================
async function initTreasuryPayrollController() {
    const monthPicker = document.getElementById('payrollMonthPicker');
    if (monthPicker && !monthPicker.value) {
        const now = new Date();
        monthPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const bulkMonth = document.getElementById('bulkPayrollMonth');
    if (bulkMonth && !bulkMonth.value && monthPicker) {
        bulkMonth.value = monthPicker.value;
    }

    // Load active employees & track paid status for current month
    try {
        const [res, payRes] = await Promise.all([
            window.api.listEmployees(),
            window.api.listSalaryPayments(100, { month: monthPicker ? monthPicker.value : new Date().toISOString().slice(0, 7) })
        ]);
        if (res && res.success && Array.isArray(res.data)) {
            cachedTreasuryEmployees = res.data.filter(e => e.status !== 'inactive');
        }
        cachedPayrollPaidEmployees = new Map();
        if (payRes && payRes.success && Array.isArray(payRes.data)) {
            payRes.data.forEach(p => {
                if (p.payment_type === 'salary' || !p.payment_type) {
                    cachedPayrollPaidEmployees.set(Number(p.employee_id), p);
                }
            });
        }
    } catch (err) {
        console.warn('Could not load employees for payroll:', err);
    }
}

let cachedPayrollPaidEmployees = new Map();

function onPayrollEmployeeSearchInput() {
    const query = document.getElementById('payrollEmployeeSearch')?.value || '';
    const normQ = normalizeArabic(query);
    const dropdown = document.getElementById('payrollEmployeeDropdown');
    if (!dropdown) return;

    if (!normQ) {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
        return;
    }

    const matches = cachedTreasuryEmployees.filter(emp => {
        const nameNorm = normalizeArabic(emp.name);
        const jobNorm = normalizeArabic(emp.job_title);
        return nameNorm.includes(normQ) || jobNorm.includes(normQ);
    });

    if (matches.length === 0) {
        dropdown.innerHTML = '<div style="padding: 10px 14px; font-size: 12px; color: var(--text-muted); text-align: center;">لا يوجد موظف مطابق</div>';
        dropdown.style.display = 'block';
        return;
    }

    dropdown.innerHTML = '';
    matches.forEach(emp => {
        const isPaid = cachedPayrollPaidEmployees && cachedPayrollPaidEmployees.has(Number(emp.id));
        const badgeHtml = isPaid
            ? `<span style="font-size: 10px; font-weight: 800; background: #DCFCE7; color: #15803D; padding: 2px 7px; border-radius: 6px; border: 1px solid #BBF7D0;">✅ قبض الشهر ده</span>`
            : `<span style="font-size: 10px; font-weight: 700; background: #FEF3C7; color: #92400E; padding: 2px 7px; border-radius: 6px; border: 1px solid #FDE68A;">⏳ مستحق الصرف</span>`;

        const item = document.createElement('div');
        item.style.cssText = 'padding: 8px 12px; border-bottom: 1px solid #F1F5F9; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.15s;' + (isPaid ? ' background: #F0FDF4;' : '');
        item.onmouseenter = () => item.style.background = isPaid ? '#DCFCE7' : '#F8FAFC';
        item.onmouseleave = () => item.style.background = isPaid ? '#F0FDF4' : '#FFFFFF';
        item.innerHTML = `
            <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 12.5px; font-weight: 800; color: #0F172A;">${emp.name}</span>
                    ${badgeHtml}
                </div>
                <span style="font-size: 10.5px; color: #64748B;">${emp.job_title || 'موظف'}</span>
            </div>
            <div style="font-size: 12px; font-weight: 800; color: #059669; font-family: monospace;">
                ${(emp.base_salary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </div>
        `;
        item.onclick = () => selectPayrollEmployee(emp);
        dropdown.appendChild(item);
    });
    dropdown.style.display = 'block';
}
window.onPayrollEmployeeSearchInput = onPayrollEmployeeSearchInput;

async function selectPayrollEmployee(emp) {
    selectedPayrollEmployee = emp;
    const searchInp = document.getElementById('payrollEmployeeSearch');
    if (searchInp) searchInp.value = emp.name;
    const idInp = document.getElementById('payrollSelectedEmployeeId');
    if (idInp) idInp.value = emp.id;

    const dropdown = document.getElementById('payrollEmployeeDropdown');
    if (dropdown) dropdown.style.display = 'none';

    // Show employee info badge
    const badge = document.getElementById('payrollEmployeeInfoBadge');
    if (badge) {
        badge.style.display = 'flex';
        const infoText = document.getElementById('payrollEmployeeInfoText');
        if (infoText) {
            infoText.innerText = `الموظف: ${emp.name} | الراتب الأساسي: ${(emp.base_salary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
        }
        const jobBadge = document.getElementById('payrollEmployeeJobBadge');
        if (jobBadge) jobBadge.innerText = emp.job_title || 'موظف';
    }

    await onPayrollPeriodOrEmployeeChange();
}
window.selectPayrollEmployee = selectPayrollEmployee;

async function onPayrollPeriodOrEmployeeChange() {
    if (!selectedPayrollEmployee) return;

    const month = document.getElementById('payrollMonthPicker')?.value || '2026-10';
    const base = Number(selectedPayrollEmployee.base_salary || 0);

    // Set Base salary display
    const baseEl = document.getElementById('payrollBaseSalaryVal');
    if (baseEl) baseEl.innerText = base.toLocaleString('en-US', { minimumFractionDigits: 2 });

    // 1. Check prior payout status
    try {
        const statusRes = await window.api.payrollCheckPayoutStatus(selectedPayrollEmployee.id, month);
        const priorAlert = document.getElementById('payrollPriorPayoutAlert');
        const priorText = document.getElementById('payrollPriorPayoutText');
        if (statusRes && statusRes.success && statusRes.data && statusRes.data.is_paid) {
            if (priorAlert) priorAlert.style.display = 'flex';
            if (priorText) priorText.innerText = `⚠️ تنبيه: تم صرف راتب شهر ${month} لهذا الموظف مسبقاً بالسند رقم (${statusRes.data.voucher_number || 'PAY'}) بمبلغ ${(statusRes.data.paid_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
        } else {
            if (priorAlert) priorAlert.style.display = 'none';
        }
    } catch (e) {
        console.warn('checkPayoutStatus error:', e);
    }

    // 2. Fetch monthly advances
    try {
        const advRes = await window.api.payrollMonthlyAdvances(selectedPayrollEmployee.id, month);
        const advances = (advRes && advRes.success && advRes.data) ? Number(advRes.data.total_advances || 0) : 0;
        const advEl = document.getElementById('payrollAdvancesVal');
        if (advEl) {
            advEl.innerText = advances.toLocaleString('en-US', { minimumFractionDigits: 2 });
            advEl.dataset.advances = advances;
        }
        const linkBtn = document.getElementById('btnViewEmployeeAdvancesLink');
        if (linkBtn) {
            linkBtn.style.display = advances > 0 ? 'inline' : 'none';
        }
    } catch (e) {
        console.warn('monthlyAdvances error:', e);
    }

    calculatePayrollNet();
}
window.onPayrollPeriodOrEmployeeChange = onPayrollPeriodOrEmployeeChange;

function calculatePayrollNet() {
    if (!selectedPayrollEmployee) return;

    const base = Number(selectedPayrollEmployee.base_salary || 0);
    const advances = Number(document.getElementById('payrollAdvancesVal')?.dataset?.advances || 0);
    const deductions = Number(document.getElementById('payrollDeductionsInput')?.value || 0);
    const bonuses = Number(document.getElementById('payrollBonusesInput')?.value || 0);

    const net = Math.max(0, base - advances - deductions + bonuses);

    // Formula text
    const formulaEl = document.getElementById('payrollNetFormulaText');
    if (formulaEl) {
        formulaEl.innerText = `[ ${base.toFixed(2)} - ${advances.toFixed(2)} - ${deductions.toFixed(2)} + ${bonuses.toFixed(2)} ]`;
    }

    // Net value
    const netEl = document.getElementById('payrollNetSalaryVal');
    if (netEl) {
        netEl.innerText = `${net.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
        netEl.dataset.net = net;
    }

    // Solvency check against selected channel
    const channel = document.getElementById('payrollChannelSelect')?.value || 'cash';
    let avail = 0;
    if (channel === 'cash') avail = cachedTreasuryBalances.cashBalance || 0;
    else if (channel === 'card') avail = cachedTreasuryBalances.cardBalance || 0;
    else if (channel === 'transfer') avail = cachedTreasuryBalances.transferBalance || 0;

    const badge = document.getElementById('payrollChannelBalBadge');
    if (badge) {
        badge.innerText = `متاح: ${avail.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
    }

    const alertEl = document.getElementById('payrollSolvencyAlert');
    const submitBtn = document.getElementById('btnDisburseEmployeeSalary');

    if (net > avail + 0.01) {
        if (alertEl) alertEl.style.display = 'flex';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
        }
    } else {
        if (alertEl) alertEl.style.display = 'none';
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
    }
}
window.calculatePayrollNet = calculatePayrollNet;

async function submitEmployeePayrollPayout() {
    if (!selectedPayrollEmployee) {
        alert('يرجى اختيار الموظف أولاً');
        return;
    }

    const net = Number(document.getElementById('payrollNetSalaryVal')?.dataset?.net || 0);
    const channel = document.getElementById('payrollChannelSelect')?.value || 'cash';
    const month = document.getElementById('payrollMonthPicker')?.value || '2026-10';
    const deductions = Number(document.getElementById('payrollDeductionsInput')?.value || 0);
    const deductionsReason = document.getElementById('payrollDeductionsReason')?.value.trim() || '';
    const bonuses = Number(document.getElementById('payrollBonusesInput')?.value || 0);
    const bonusesReason = document.getElementById('payrollBonusesReason')?.value.trim() || '';

    let avail = 0;
    if (channel === 'cash') avail = cachedTreasuryBalances.cashBalance || 0;
    else if (channel === 'card') avail = cachedTreasuryBalances.cardBalance || 0;
    else if (channel === 'transfer') avail = cachedTreasuryBalances.transferBalance || 0;

    if (net > avail + 0.01) {
        alert('لا يمكن إتمام صرف الراتب نظراً لعدم توفر رصيد كافٍ بالقناة المختارة (الملاءة الصارمة).');
        return;
    }

    const btn = document.getElementById('btnDisburseEmployeeSalary');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader" class="icon-xs"></i><span>جاري الاعتماد والصرف...</span>';
    }

    try {
        const notes = `راتب شهر ${month} | أساسي: ${selectedPayrollEmployee.base_salary} ج.م${deductions ? ` - خصومات: ${deductions}` : ''}${bonuses ? ` + مكافآت: ${bonuses}` : ''}`;
        const res = await window.api.disburseSalary({
            employeeId: selectedPayrollEmployee.id,
            amount: net,
            type: 'salary',
            source: 'treasury',
            paymentMethod: channel,
            notes,
            monthPeriod: month,
            deductions,
            deductionsReason,
            bonuses,
            bonusesReason
        }, state.currentUser?.id);

        if (!res || !res.success) {
            alert(`فشل صرف الراتب: ${res?.error || 'خطأ غير متوقع'}`);
            return;
        }

        const voucher = res.data?.voucher_number || `PAY-${String(res.data?.id || '').padStart(5, '0')}`;
        alert(`✅ تم اعتماد وصرف راتب الموظف (${selectedPayrollEmployee.name}) بنجاح!\nرقم السند: ${voucher}\nالصافي المصروف: ${net.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م\nعن شهر: ${month}`);

        // Reset inputs
        const searchInp = document.getElementById('payrollEmployeeSearch');
        if (searchInp) searchInp.value = '';
        selectedPayrollEmployee = null;
        const badge = document.getElementById('payrollEmployeeInfoBadge');
        if (badge) badge.style.display = 'none';
        const priorAlert = document.getElementById('payrollPriorPayoutAlert');
        if (priorAlert) priorAlert.style.display = 'none';

        loadTreasuryView();
    } catch (err) {
        console.error('submitEmployeePayrollPayout error:', err);
        alert(`حدث خطأ أثناء صرف الراتب: ${err.message}`);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="check-circle" class="icon-xs"></i><span>صرف الراتب واعتماد السند الفوري</span>';
            refreshIcons(btn);
        }
    }
}
window.submitEmployeePayrollPayout = submitEmployeePayrollPayout;

// Advances details modal
async function openEmployeeAdvancesModal() {
    if (!selectedPayrollEmployee) return;
    const modal = document.getElementById('modalEmployeeAdvances');
    if (!modal) return;
    const month = document.getElementById('payrollMonthPicker')?.value || '2026-10';

    const titleEl = document.getElementById('employeeAdvancesModalTitle');
    if (titleEl) titleEl.innerText = `سلف الموظف: ${selectedPayrollEmployee.name} (عن شهر ${month})`;

    const tbody = document.getElementById('employeeAdvancesTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">جاري تحميل السلف...</td></tr>';

    modal.classList.add('active');
    modal.style.display = 'flex';
    refreshIcons(modal);

    try {
        const res = await window.api.payrollMonthlyAdvances(selectedPayrollEmployee.id, month);
        const list = (res && res.success && res.data && res.data.advances_list) ? res.data.advances_list : [];
        const total = (res && res.success && res.data) ? Number(res.data.total_advances || 0) : 0;

        const totalEl = document.getElementById('employeeAdvancesTotalModalVal');
        if (totalEl) totalEl.innerText = `${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;

        if (!tbody) return;
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">لا توجد سلف مسجلة لهذا الشهر</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        list.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 8px 12px; font-family: monospace; font-size: 11.5px;">${a.date || '-'}</td>
                <td style="padding: 8px 12px; font-size: 11.5px;">${a.source === 'pos_session' ? 'درج اليومية 💵' : 'الخزنة المركزية 🏦'}</td>
                <td style="padding: 8px 12px; text-align: right; font-weight: 800; font-family: monospace; color: #DC2626;">${Number(a.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</td>
                <td style="padding: 8px 12px; font-size: 11.5px; color: #475569;">${a.notes || a.description || 'سلفة موظف'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('openEmployeeAdvancesModal error:', err);
    }
}
window.openEmployeeAdvancesModal = openEmployeeAdvancesModal;

// Bulk Payroll Modal
async function openBulkPayrollModal() {
    const modal = document.getElementById('modalBulkPayroll');
    if (!modal) return;
    const curMonth = document.getElementById('payrollMonthPicker')?.value || '2026-10';
    const bulkMonth = document.getElementById('bulkPayrollMonth');
    if (bulkMonth) bulkMonth.value = curMonth;

    modal.classList.add('active');
    modal.style.display = 'flex';
    refreshIcons(modal);

    loadBulkPayrollTable();
}
window.openBulkPayrollModal = openBulkPayrollModal;

async function loadBulkPayrollTable() {
    const tbody = document.getElementById('bulkPayrollTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 24px;">جاري إعداد بيانات مسيّر الرواتب...</td></tr>';

    const month = document.getElementById('bulkPayrollMonth')?.value || '2026-10';

    try {
        if (!cachedTreasuryEmployees || cachedTreasuryEmployees.length === 0) {
            const empRes = await window.api.listEmployees();
            if (empRes && empRes.success) cachedTreasuryEmployees = empRes.data.filter(e => e.status !== 'inactive');
        }

        tbody.innerHTML = '';
        for (const emp of cachedTreasuryEmployees) {
            const base = Number(emp.base_salary || 0);
            
            // Monthly advances
            let advances = 0;
            try {
                const advRes = await window.api.payrollMonthlyAdvances(emp.id, month);
                if (advRes && advRes.success && advRes.data) advances = Number(advRes.data.total_advances || 0);
            } catch (e) {}

            // Prior payout check
            let isPaid = false;
            let paidVoucher = '';
            try {
                const statRes = await window.api.payrollCheckPayoutStatus(emp.id, month);
                if (statRes && statRes.success && statRes.data && statRes.data.is_paid) {
                    isPaid = true;
                    paidVoucher = statRes.data.voucher_number || 'PAY';
                }
            } catch (e) {}

            const net = Math.max(0, base - advances);
            const tr = document.createElement('tr');
            tr.dataset.empId = emp.id;
            tr.dataset.base = base;
            tr.dataset.advances = advances;

            tr.innerHTML = `
                <td style="padding: 8px 10px; text-align: center;">
                    <input type="checkbox" class="bulk-row-check" ${isPaid ? 'disabled' : 'checked'} onchange="calculateBulkPayrollTotal()">
                </td>
                <td style="padding: 8px 10px;">
                    <div style="font-weight: 800; color: #0F172A; font-size: 12px;">${emp.name}</div>
                    <div style="font-size: 10px; color: #64748B;">${emp.job_title || 'موظف'}</div>
                </td>
                <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 700;">${base.toFixed(2)}</td>
                <td style="padding: 8px 10px; text-align: right; font-family: monospace; color: #DC2626; font-weight: 700;">${advances.toFixed(2)}</td>
                <td style="padding: 8px 10px; text-align: right;">
                    <input type="number" class="bulk-ded-input form-control" min="0" step="1" value="0" style="width: 70px; height: 26px; font-size: 11px; padding: 2px 4px; text-align: center;" oninput="updateBulkRowNet(this)">
                </td>
                <td style="padding: 8px 10px; text-align: right;">
                    <input type="number" class="bulk-bon-input form-control" min="0" step="1" value="0" style="width: 70px; height: 26px; font-size: 11px; padding: 2px 4px; text-align: center;" oninput="updateBulkRowNet(this)">
                </td>
                <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 900; color: #059669; font-size: 12.5px;" class="bulk-net-display">
                    ${net.toFixed(2)}
                </td>
                <td style="padding: 8px 10px; text-align: center;">
                    ${isPaid ? `<span class="badge" style="background: #FEF3C7; color: #B45309; font-size: 10px; font-weight: 700;">صُرف مسبقاً (${paidVoucher})</span>` : '<span class="badge" style="background: #ECFDF5; color: #047857; font-size: 10px; font-weight: 700;">جاهز للصرف</span>'}
                </td>
            `;
            tbody.appendChild(tr);
        }

        calculateBulkPayrollTotal();
    } catch (err) {
        console.error('loadBulkPayrollTable error:', err);
    }
}
window.loadBulkPayrollTable = loadBulkPayrollTable;

function updateBulkRowNet(inp) {
    const tr = inp.closest('tr');
    if (!tr) return;
    const base = Number(tr.dataset.base || 0);
    const advances = Number(tr.dataset.advances || 0);
    const ded = Number(tr.querySelector('.bulk-ded-input')?.value || 0);
    const bon = Number(tr.querySelector('.bulk-bon-input')?.value || 0);
    const net = Math.max(0, base - advances - ded + bon);
    const display = tr.querySelector('.bulk-net-display');
    if (display) display.innerText = net.toFixed(2);
    calculateBulkPayrollTotal();
}
window.updateBulkRowNet = updateBulkRowNet;

function toggleSelectAllBulkPayroll(checked) {
    document.querySelectorAll('#bulkPayrollTableBody .bulk-row-check:not(:disabled)').forEach(cb => {
        cb.checked = checked;
    });
    calculateBulkPayrollTotal();
}
window.toggleSelectAllBulkPayroll = toggleSelectAllBulkPayroll;

function calculateBulkPayrollTotal() {
    let total = 0;
    document.querySelectorAll('#bulkPayrollTableBody tr').forEach(tr => {
        const cb = tr.querySelector('.bulk-row-check');
        if (cb && cb.checked && !cb.disabled) {
            const netVal = Number(tr.querySelector('.bulk-net-display')?.innerText || 0);
            total += netVal;
        }
    });

    const totalEl = document.getElementById('bulkPayrollTotalRequiredVal');
    if (totalEl) {
        totalEl.innerText = `${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
        totalEl.dataset.total = total;
    }

    checkBulkPayrollSolvency();
}
window.calculateBulkPayrollTotal = calculateBulkPayrollTotal;

function checkBulkPayrollSolvency() {
    const channel = document.getElementById('bulkPayrollChannel')?.value || 'cash';
    let avail = 0;
    if (channel === 'cash') avail = cachedTreasuryBalances.cashBalance || 0;
    else if (channel === 'card') avail = cachedTreasuryBalances.cardBalance || 0;
    else if (channel === 'transfer') avail = cachedTreasuryBalances.transferBalance || 0;

    const badge = document.getElementById('bulkPayrollChannelBalBadge');
    if (badge) badge.innerText = `متاح: ${avail.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;

    const total = Number(document.getElementById('bulkPayrollTotalRequiredVal')?.dataset?.total || 0);
    const warn = document.getElementById('bulkPayrollSolvencyWarning');
    const submitBtn = document.getElementById('btnSubmitBulkPayroll');

    if (total > avail + 0.01) {
        if (warn) {
            warn.style.display = 'flex';
            const warnText = document.getElementById('bulkPayrollSolvencyWarningText');
            if (warnText) warnText.innerText = `إجمالي المطلوب صرفه (${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م) أكبر من رصيد القناة المختارة (${avail.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م)!`;
        }
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
        }
    } else {
        if (warn) warn.style.display = 'none';
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
    }
}
window.checkBulkPayrollSolvency = checkBulkPayrollSolvency;

async function submitBulkPayroll() {
    const channel = document.getElementById('bulkPayrollChannel')?.value || 'cash';
    const month = document.getElementById('bulkPayrollMonth')?.value || '2026-10';

    const payoutsList = [];
    document.querySelectorAll('#bulkPayrollTableBody tr').forEach(tr => {
        const cb = tr.querySelector('.bulk-row-check');
        if (cb && cb.checked && !cb.disabled) {
            const empId = Number(tr.dataset.empId);
            const net = Number(tr.querySelector('.bulk-net-display')?.innerText || 0);
            const ded = Number(tr.querySelector('.bulk-ded-input')?.value || 0);
            const bon = Number(tr.querySelector('.bulk-bon-input')?.value || 0);
            payoutsList.push({
                employeeId: empId,
                netSalary: net,
                deductions: ded,
                bonuses: bon,
                monthPeriod: month,
                notes: `صرف مسيّر جماعي عن شهر ${month}`
            });
        }
    });

    if (payoutsList.length === 0) {
        alert('لم يتم تحديد أي موظفين مؤهلين للصرف');
        return;
    }

    if (!confirm(`هل أنت متأكد من رغبتك في اعتماد وصرف رواتب (${payoutsList.length}) موظف بإجمالي ${Number(document.getElementById('bulkPayrollTotalRequiredVal')?.dataset?.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م من قناة [${channel}]؟`)) {
        return;
    }

    const btn = document.getElementById('btnSubmitBulkPayroll');
    if (btn) {
        btn.disabled = true;
        btn.innerText = 'جاري تنفيذ المسير الجماعي...';
    }

    try {
        const res = await window.api.payrollDisburseBulk(payoutsList, channel, state.currentUser?.id);
        if (!res || !res.success) {
            alert(`فشل تنفيذ المسير الجماعي: ${res?.error || 'خطأ غير متوقع'}`);
            return;
        }

        alert(`✅ تم اعتماد وصرف المسير الجماعي بنجاح!\nعدد الموظفين: ${res.data?.disbursedCount || payoutsList.length}\nإجمالي المصروف: ${(res.data?.totalDisbursed || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
        closeTreasuryModal('modalBulkPayroll');
        loadTreasuryView();
    } catch (err) {
        console.error('submitBulkPayroll error:', err);
        alert(`حدث خطأ أثناء تنفيذ المسير: ${err.message}`);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'اعتماد وصرف المسير الجماعي';
        }
    }
}
window.submitBulkPayroll = submitBulkPayroll;

// ==============================================================
// THE 6 MAIN TABBED VIEWS CONTROLLER
// ==============================================================

// 1. Analytics & Charts View
async function loadTreasuryAnalytics() {
    try {
        const fetchFn = window.api?.getTreasuryAnalytics || window.api?.treasuryAnalytics;
        let d = null;
        if (typeof fetchFn === 'function') {
            try {
                const res = await fetchFn();
                if (res && res.success && res.data) d = res.data;
            } catch (errApi) {
                console.warn('window.api analytics error, trying fallback:', errApi);
            }
        }

        // Direct HTTP fetch fallback (for browser preview mode)
        if (!d && typeof fetch === 'function') {
            try {
                const httpRes = await fetch('/api/treasury/analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{}'
                });
                const json = await httpRes.json();
                if (json && json.success && json.data) d = json.data;
            } catch (httpErr) {
                console.warn('HTTP fallback analytics error:', httpErr);
            }
        }

        if (!d) {
            console.error('loadTreasuryAnalytics: Could not load analytics data');
            return;
        }

        // 1. Executive KPIs Summary
        const chData = d.channelBreakdown || d.channelRatios || {};
        const totalLive = chData.totalBalance ?? (cachedTreasuryBalances.balance || 0);
        const cashBal = chData.cashBalance ?? (cachedTreasuryBalances.cashBalance || 0);
        const cardBal = chData.cardBalance ?? (cachedTreasuryBalances.cardBalance || 0);
        const transBal = chData.transferBalance ?? (cachedTreasuryBalances.transferBalance || 0);

        const trendList = d.dailyCashflow || d.dailyTrend || [];
        const sumInflows14 = trendList.reduce((acc, curr) => acc + Number(curr.inflows ?? curr.inflow ?? 0), 0);
        const sumOutflows14 = trendList.reduce((acc, curr) => acc + Number(curr.outflows ?? curr.outflow ?? 0), 0);
        const netCashflow14 = sumInflows14 - sumOutflows14;

        const elTrTot = document.getElementById('trKpiTotalBalance');
        if (elTrTot) elTrTot.innerText = `${totalLive.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;

        const elTrInf = document.getElementById('trKpiTotalInflows');
        if (elTrInf) elTrInf.innerText = `+ ${sumInflows14.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;

        const elTrOut = document.getElementById('trKpiTotalOutflows');
        if (elTrOut) elTrOut.innerText = `- ${sumOutflows14.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;

        const elTrNet = document.getElementById('trKpiNetCashflow');
        const elTrStat = document.getElementById('trKpiNetStatus');
        if (elTrNet) {
            elTrNet.innerText = `${netCashflow14 >= 0 ? '+ ' : ''}${netCashflow14.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
            elTrNet.style.color = netCashflow14 >= 0 ? '#15803D' : '#B91C1C';
        }
        if (elTrStat) {
            elTrStat.innerText = netCashflow14 >= 0 ? 'فائض سيولة إيجابي (آخر 14 يوماً)' : 'عجز سيولة مرحلي (آخر 14 يوماً)';
            elTrStat.style.color = netCashflow14 >= 0 ? '#166534' : '#991B1B';
        }

        // 2. Dual Cashflow 14-Day Trend Chart
        const trendContainer = document.getElementById('treasuryTrendChartContainer');
        if (trendContainer) {
            if (trendList.length === 0) {
                trendContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; width: 100%; padding: 30px; font-weight: 700;">لا توجد تدفقات نقدية مسجلة خلال الـ 14 يوماً الماضية</div>';
            } else {
                trendContainer.innerHTML = '';
                let maxVal = 0;
                trendList.forEach(item => {
                    const inf = Number(item.inflows ?? item.inflow ?? 0);
                    const out = Number(item.outflows ?? item.outflow ?? 0);
                    if (inf > maxVal) maxVal = inf;
                    if (out > maxVal) maxVal = out;
                });

                const effectiveMax = maxVal > 0 ? maxVal : 1;

                trendList.forEach(item => {
                    const inf = Number(item.inflows ?? item.inflow ?? 0);
                    const out = Number(item.outflows ?? item.outflow ?? 0);
                    const infH = inf > 0 ? Math.max(8, Math.round((inf / effectiveMax) * 115)) : 0;
                    const outH = out > 0 ? Math.max(8, Math.round((out / effectiveMax) * 115)) : 0;

                    let dateLbl = '';
                    if (item.day) {
                        const parts = item.day.split('-');
                        dateLbl = parts.length === 3 ? `${parts[2]}/${parts[1]}` : item.day.substring(5);
                    }

                    const colWrap = document.createElement('div');
                    colWrap.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; flex: 1; min-width: 22px; padding: 0 2px; cursor: pointer; position: relative;';
                    colWrap.title = `تاريخ: ${item.day}\n🟢 إيداعات: ${inf.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م\n🔴 منصرفات: ${out.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م\n📊 صافي اليوم: ${(inf - out).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;

                    const barsHtml = (inf === 0 && out === 0)
                        ? `<div style="width: 100%; height: 3px; background: #E2E8F0; border-radius: 2px; margin-bottom: 2px;" title="لا توجد حركات"></div>`
                        : `
                            <div style="display: flex; gap: 4px; align-items: flex-end; width: 100%; justify-content: center; height: 125px;">
                                <div style="width: 48%; height: ${infH}px; background: linear-gradient(180deg, #10B981 0%, #059669 100%); border-radius: 4px 4px 0 0; box-shadow: 0 1px 3px rgba(16,185,129,0.3);" title="إيداعات: ${inf.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م"></div>
                                <div style="width: 48%; height: ${outH}px; background: linear-gradient(180deg, #EF4444 0%, #DC2626 100%); border-radius: 4px 4px 0 0; box-shadow: 0 1px 3px rgba(239,68,68,0.3);" title="منصرفات: ${out.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م"></div>
                            </div>
                        `;

                    colWrap.innerHTML = `
                        ${barsHtml}
                        <span style="font-size: 9.5px; font-weight: 700; color: #64748B; margin-top: 5px; font-family: monospace; white-space: nowrap;">${dateLbl}</span>
                    `;
                    trendContainer.appendChild(colWrap);
                });
            }
        }

        // 3. Channel Liquidity Donut & Percentage Badges
        const cashPct = totalLive > 0 ? Math.max(0, Math.round((cashBal / totalLive) * 100)) : 0;
        const cardPct = totalLive > 0 ? Math.max(0, Math.round((cardBal / totalLive) * 100)) : 0;
        const transPct = totalLive > 0 ? Math.max(0, Math.round((transBal / totalLive) * 100)) : 0;

        const pCash = document.getElementById('analyticsCashPct');
        if (pCash) pCash.innerText = `${cashPct}%`;
        const pCard = document.getElementById('analyticsCardPct');
        if (pCard) pCard.innerText = `${cardPct}%`;
        const pTrans = document.getElementById('analyticsTransferPct');
        if (pTrans) pTrans.innerText = `${transPct}%`;

        const trChannelDonut = document.getElementById('treasuryChannelDonutContainer');
        if (trChannelDonut) {
            const chItems = [
                { label: 'كاش الخزينة', value: cashBal, color: '#16A34A' },
                { label: 'فيزا وبنك', value: cardBal, color: '#0284C7' },
                { label: 'محافظ وإنستاباي', value: transBal, color: '#8B5CF6' }
            ];
            const radius = 46;
            const strokeWidth = 16;
            const circ = 2 * Math.PI * radius; // ~289.02
            let offset = 0;
            const segs = chItems.map(item => {
                const pct = totalLive > 0 ? (item.value / totalLive) : 0;
                const dLen = pct * circ;
                const sLen = circ - dLen;
                const segOffset = -offset;
                offset += dLen;
                return `<circle cx="65" cy="65" r="${radius}" fill="none" stroke="${item.color}" stroke-width="${strokeWidth}" stroke-dasharray="${dLen.toFixed(2)} ${sLen.toFixed(2)}" stroke-dashoffset="${segOffset.toFixed(2)}" style="transition: all 0.5s ease; cursor: pointer;"><title>${item.label}: ${item.value.toFixed(2)} ج.م (${Math.round(pct * 100)}%)</title></circle>`;
            }).join('');

            const formattedTotal = totalLive >= 1000 ? `${(totalLive / 1000).toFixed(1)}k` : totalLive.toFixed(0);
            trChannelDonut.innerHTML = `
                <svg class="donut-svg" width="130" height="130" viewBox="0 0 130 130">
                    <circle cx="65" cy="65" r="${radius}" fill="none" stroke="#F1F5F9" stroke-width="${strokeWidth}"></circle>
                    ${segs}
                </svg>
                <div class="donut-center-label">
                    <span class="donut-center-val" style="font-size: 14px;">${formattedTotal}</span>
                    <span class="donut-center-sub" style="font-size: 9px;">سيولة ج.م</span>
                </div>
            `;
        }

        // 4. 30-Day Expense Categories Chart
        const totalExp = d.categoriesBreakdown?.reduce((s, c) => s + Number(c.total_amount || 0), 0) || 0;
        const totalExpEl = document.getElementById('analyticsTotalExpense30');
        if (totalExpEl) {
            totalExpEl.innerText = `${totalExp.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
        }

        const catContainer = document.getElementById('analyticsCategoriesBarContainer');
        if (catContainer) {
            if (!d.categoriesBreakdown || d.categoriesBreakdown.length === 0) {
                catContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 24px; font-weight: 700; font-size: 12px;">لا توجد مصروفات مسجلة خلال آخر 30 يوماً</div>';
            } else {
                catContainer.innerHTML = '';
                const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#64748B'];
                d.categoriesBreakdown.forEach((cat, idx) => {
                    const cAmt = Number(cat.total_amount || 0);
                    const pct = totalExp > 0 ? ((cAmt / totalExp) * 100).toFixed(1) : 0;
                    const col = colors[idx % colors.length];

                    const item = document.createElement('div');
                    item.innerHTML = `
                        <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 700; margin-bottom: 3px;">
                            <span style="color: #334155; display: flex; align-items: center; gap: 6px;">
                                <span style="width: 7px; height: 7px; border-radius: 50%; background: ${col}; display: inline-block;"></span>
                                <span>${escapeHtml(cat.category || 'عام')} (${cat.count || 0} سند)</span>
                            </span>
                            <span style="font-family: monospace; color: #0F172A; font-weight: 800;">${cAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م (${pct}%)</span>
                        </div>
                        <div style="height: 7px; border-radius: 4px; background: #F1F5F9; overflow: hidden;">
                            <div style="height: 100%; width: ${pct}%; background: ${col}; border-radius: 4px; transition: width 0.4s ease;"></div>
                        </div>
                    `;
                    catContainer.appendChild(item);
                });
            }
        }

        // 5. Flow Sources Breakdown (Where money entered vs where it exited)
        const flowContainer = document.getElementById('treasuryFlowSourcesContainer');
        if (flowContainer) {
            flowContainer.innerHTML = '';
            const typeLabels = {
                shift_transfer: { label: '🏪 توريد مبيعات الورديات والدرج', color: '#16A34A', isOut: false },
                deposit: { label: '👑 تمويل ورأس مال صاحب المنشأة', color: '#D97706', isOut: false },
                channel_transfer_in: { label: '🔄 تحويلات بنكية/قنوات واردة', color: '#2563EB', isOut: false },
                withdraw: { label: '💼 مسحوبات المالك والصرف الشخصي', color: '#DC2626', isOut: true },
                supplier_payment: { label: '🚚 دفعات وسداد حسابات الموردين', color: '#B91C1C', isOut: true },
                salary_payment: { label: '👥 صرف رواتب وسلف الموظفين', color: '#7C3AED', isOut: true },
                channel_transfer_out: { label: '🔄 تحويلات بنكية/قنوات صادرة', color: '#475569', isOut: true }
            };

            const allFlows = [
                ...(d.inflowBreakdown || []),
                ...(d.outflowBreakdown || [])
            ];

            if (allFlows.length === 0) {
                flowContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 24px; font-size: 12px; font-weight: 700;">لا توجد حركات تفصيلية مسجلة</div>';
            } else {
                allFlows.slice(0, 5).forEach(f => {
                    const meta = typeLabels[f.transaction_type] || { label: f.transaction_type, color: '#64748B', isOut: false };
                    const sign = meta.isOut ? '-' : '+';
                    const signColor = meta.isOut ? '#DC2626' : '#16A34A';

                    const row = document.createElement('div');
                    row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; font-weight: 700;';
                    row.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${meta.color};"></span>
                            <span style="color: #1E293B;">${meta.label}</span>
                            <span style="font-size: 10px; color: #64748B; font-weight: normal;">(${f.count} عملية)</span>
                        </div>
                        <span style="font-family: monospace; font-size: 13.5px; font-weight: 900; color: ${signColor};">${sign} ${(f.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</span>
                    `;
                    flowContainer.appendChild(row);
                });
            }
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }
    } catch (err) {
        console.error('loadTreasuryAnalytics error:', err);
    }
}
window.loadTreasuryAnalytics = loadTreasuryAnalytics;

// 2. Branch Transfers View
function filterBranchTransfers(status) {
    activeBranchTransfersFilter = status || 'all';
    document.querySelectorAll('.branch-transfer-status-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === activeBranchTransfersFilter);
    });
    loadBranchTransfers(activeBranchTransfersFilter);
}
window.filterBranchTransfers = filterBranchTransfers;

async function loadBranchTransfers(status = 'all') {
    const tbody = document.getElementById('branchTransfersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 24px;">جاري تحميل تحويلات الفروع والورديات...</td></tr>';

    try {
        const res = await window.api.treasuryBranchTransfers(status);
        const list = (res && res.success && Array.isArray(res.data)) ? res.data : [];

        // Count pending badge
        const pendingCount = list.filter(t => t.status === 'pending').length;
        const badge = document.getElementById('badgePendingBranchTransfers');
        if (badge) {
            badge.innerText = String(pendingCount);
            badge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
        }
        const countBadge = document.getElementById('branchTransfersCountBadge');
        if (countBadge) countBadge.innerText = `${list.length} تحويلة`;

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 32px; font-weight: 600;">لا توجد تحويلات فروع مسجلة بهذه الحالة</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        list.forEach(item => {
            const tr = document.createElement('tr');
            let statusBadge = '<span class="badge" style="background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; font-weight: 700;">⏳ بانتظار التأكيد</span>';
            if (item.status === 'confirmed') {
                statusBadge = '<span class="badge" style="background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; font-weight: 700;">✅ معتمدة ومستلمة</span>';
            } else if (item.status === 'rejected') {
                statusBadge = '<span class="badge" style="background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; font-weight: 700;">❌ مرفوضة</span>';
            }

            const pmBadge = getChannelBadge(item.payment_method || 'cash');

            let actionBtns = '';
            if (item.status === 'pending') {
                actionBtns = `
                    <button type="button" class="btn-primary" onclick="confirmBranchTransferReceive(${item.id}, ${item.amount}, '${item.payment_method || 'cash'}')" style="background: #059669; border: none; font-size: 11px; padding: 4px 10px; border-radius: 6px; font-weight: 700; cursor: pointer;">
                        تأكيد واستلام
                    </button>
                `;
            } else {
                actionBtns = '<span style="font-size: 11px; color: var(--text-muted);">تم الاعتماد</span>';
            }

            tr.innerHTML = `
                <td style="padding: 10px 14px; font-weight: 800; font-family: monospace; color: #475569;">#TF-${item.id}</td>
                <td style="padding: 10px 14px; font-size: 12px; font-family: monospace; white-space: nowrap;">${item.created_at || '-'}</td>
                <td style="padding: 10px 14px;">
                    <span style="font-weight: 800; color: #0F172A;">${item.session_code || (item.session_id ? `وردية #${item.session_id}` : 'الفرع الرئيسي')}</span>
                </td>
                <td style="padding: 10px 14px; text-align: center;">${pmBadge}</td>
                <td style="padding: 10px 14px; text-align: right; font-weight: 900; color: #059669; font-family: monospace; font-size: 13.5px;">+ ${(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</td>
                <td style="padding: 10px 14px; text-align: center;">${statusBadge}</td>
                <td style="padding: 10px 14px; font-size: 11.5px; color: #475569;">${item.notes || 'توريد نقدية إلى الخزينة المركزية'}</td>
                <td style="padding: 10px 14px; text-align: center;">${actionBtns}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('loadBranchTransfers error:', err);
    }
}
window.loadBranchTransfers = loadBranchTransfers;

async function confirmBranchTransferReceive(txId, amount, method) {
    if (!confirm(`هل أنت متأكد من استلام وتأكيد توريدة بمبلغ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م في الخزينة المركزية؟`)) {
        return;
    }

    try {
        const res = await window.api.treasuryDeposit({
            amount,
            paidBy: `توريدة وردية #${txId}`,
            paymentMethod: method,
            notes: `استلام واعتماد توريدة نقدية من الفرع #${txId}`
        }, state.currentUser?.id);

        if (res && res.success) {
            alert('✅ تم تأكيد استلام التوريدة وإضافتها لرصيد الخزينة بنجاح!');
            loadTreasuryView();
        } else {
            alert(`خطأ في التأكيد: ${res?.error || 'فشلت العملية'}`);
        }
    } catch (err) {
        console.error('confirmBranchTransferReceive error:', err);
    }
}
window.confirmBranchTransferReceive = confirmBranchTransferReceive;

// 3. Owner Ledger View
async function loadOwnerLedger() {
    const tbody = document.getElementById('ownerLedgerTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px;">جاري تحميل كشف حساب المالك...</td></tr>';

    try {
        const txRes = await window.api.listTreasuryTransactions({
            type: 'owner',
            limit: 200
        });
        const list = (txRes && txRes.success && Array.isArray(txRes.data)) ? txRes.data : [];

        const countBadge = document.getElementById('ownerLedgerCountBadge');
        if (countBadge) countBadge.innerText = `${list.length} حركة`;

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px; font-weight: 600;">لا توجد حركات مسجلة لحساب صاحب المنشأة حتى الآن</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        list.forEach(t => {
            const isOwnerDep = t.transaction_type === 'deposit';
            const typeBadge = isOwnerDep
                ? '<span style="background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; border-radius: 20px; padding: 4px 12px; font-size: 11.5px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">إيداع تمويل رأس مال ↓</span>'
                : '<span style="background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; border-radius: 20px; padding: 4px 12px; font-size: 11.5px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">مسحوبات شخصية / أرباح ↑</span>';
            const amtColor = isOwnerDep ? '#059669' : '#DC2626';
            const amtSign = isOwnerDep ? '+' : '-';
            const pmBadge = getChannelBadge(t.payment_method);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 11px 14px; font-size: 12px; color: #334155; font-family: monospace; white-space: nowrap;">${t.created_at || '-'}</td>
                <td style="padding: 11px 14px; text-align: center;">${typeBadge}</td>
                <td style="padding: 11px 14px; text-align: right; color: ${amtColor}; font-weight: 900; font-family: monospace; font-size: 13.5px;">${amtSign} ${(t.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</td>
                <td style="padding: 11px 14px; text-align: center;">${pmBadge}</td>
                <td style="padding: 11px 14px; font-size: 12px; color: #475569;">${t.notes || t.description || '—'}</td>
                <td style="padding: 11px 14px; font-size: 12px; font-weight: 700; color: #0F172A;">${t.performed_by_name || t.created_by_name || 'صاحب المنشأة'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('loadOwnerLedger error:', err);
    }
}
window.loadOwnerLedger = loadOwnerLedger;

// 4. Audit Log View
let cachedAuditTransactions = [];

function getTreasuryTxTypeBadge(t) {
    const desc = (t.source_destination || '') + ' ' + (t.notes || '') + ' ' + (t.reference_id || '');
    const norm = normalizeArabic(desc);
    const type = t.transaction_type;

    // 1. سداد لمورد
    if (type === 'supplier_payment' || norm.includes('مورد') || norm.includes('سداد مورد') || norm.includes('دفعه مورد') || norm.includes('فاتوره شراء')) {
        return '<span class="badge" style="background: #FFFBEB; color: #B45309; font-weight: 800; border: 1.5px solid #F59E0B; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">🚚 سداد لمورد</span>';
    }

    // 2. سحب من المالك
    if ((type === 'withdraw' && (norm.includes('صاحب') || norm.includes('مالك') || norm.includes('مسحوبات'))) || norm.includes('سحب مالك') || norm.includes('مسحوبات شخصيه')) {
        return '<span class="badge" style="background: #FFF1F2; color: #BE123C; font-weight: 800; border: 1.5px solid #F43F5E; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">👑 سحب من المالك</span>';
    }

    // 3. إيداع من المالك
    if ((type === 'deposit' && (norm.includes('صاحب') || norm.includes('مالك') || norm.includes('راس مال') || norm.includes('تمويل'))) || norm.includes('ايداع مالك') || norm.includes('تمويل مالك')) {
        return '<span class="badge" style="background: #FEF3C7; color: #92400E; font-weight: 800; border: 1.5px solid #F59E0B; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">👑 إيداع من المالك</span>';
    }

    // 4. قبض وتحصيل (سند قبض)
    if (norm.includes('قبض') || norm.includes('تحصيل') || norm.includes('سند قبض') || norm.includes('عميل') || (type === 'deposit' && !norm.includes('ورديه') && !norm.includes('مرتجع') && !norm.includes('راس مال') && !norm.includes('تمويل'))) {
        return '<span class="badge" style="background: #ECFDF5; color: #047857; font-weight: 800; border: 1.5px solid #10B981; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">📥 قبض وتحصيل</span>';
    }

    // 5. توريد مبيعات وردية (يشمل كاش / فيزا / تحويلات)
    if (type === 'shift_transfer' || norm.includes('ورديه') || norm.includes('يوميه') || t.session_id) {
        const pm = (t.payment_method || '').toLowerCase();
        if (pm === 'split' || (t.cash_amount > 0 && (t.card_amount > 0 || t.transfer_amount > 0)) || (t.card_amount > 0 && t.transfer_amount > 0)) {
            return '<span class="badge" style="background: #FAF5FF; color: #7E22CE; font-weight: 800; border: 1.5px solid #A855F7; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">🏪 توريد وردية (شامل)</span>';
        }
        if (pm === 'card' || norm.includes('فيزا') || norm.includes('بنك') || norm.includes('بطاق')) {
            return '<span class="badge" style="background: #F0F9FF; color: #0369A1; font-weight: 800; border: 1.5px solid #0284C7; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">💳 توريد وردية (فيزا)</span>';
        }
        if (pm === 'transfer' || norm.includes('تحويل') || norm.includes('محفظ') || norm.includes('انستاباي') || norm.includes('فودافون')) {
            return '<span class="badge" style="background: #F5F3FF; color: #6D28D9; font-weight: 800; border: 1.5px solid #8B5CF6; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">📱 توريد وردية (تحويل)</span>';
        }
        return '<span class="badge" style="background: #F0FDF4; color: #15803D; font-weight: 800; border: 1.5px solid #22C55E; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">💵 توريد وردية (كاش)</span>';
    }

    // 6. استرداد مرتجع
    if (norm.includes('مرتجع') || norm.includes('استرداد')) {
        return '<span class="badge" style="background: #F0FDF4; color: #059669; font-weight: 800; border: 1.5px solid #10B981; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">🔄 استرداد مرتجع</span>';
    }

    // 7. صرف مرتبات وسلف
    if (type === 'salary_payout' || norm.includes('راتب') || norm.includes('مرتب') || norm.includes('سلفه') || norm.includes('سلف')) {
        return '<span class="badge" style="background: #EEF2FF; color: #4338CA; font-weight: 800; border: 1.5px solid #6366F1; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">👥 صرف راتب / سلفة</span>';
    }

    // 8. شراء بضاعة
    if (type === 'purchase_payment' || norm.includes('شراء بضاعه') || norm.includes('مشتريات')) {
        return '<span class="badge" style="background: #FFF7ED; color: #C2410C; font-weight: 800; border: 1.5px solid #F97316; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">📦 شراء بضاعة</span>';
    }

    // 9. تحويل بين القنوات
    if (type === 'channel_transfer_in' || type === 'channel_transfer_out' || norm.includes('تحويل داخلي') || norm.includes('تحويل قنوات')) {
        const dir = type === 'channel_transfer_out' ? '(صادر)' : '(وارد)';
        return `<span class="badge" style="background: #F5F3FF; color: #6D28D9; font-weight: 800; border: 1.5px solid #8B5CF6; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">⇄ تحويل قنوات ${dir}</span>`;
    }

    // 10. سحب ومصروفات
    if (type === 'withdraw') {
        return '<span class="badge" style="background: #FEF2F2; color: #DC2626; font-weight: 800; border: 1.5px solid #EF4444; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">🔴 سحب ومصروفات</span>';
    }

    // 11. إيداع عام
    if (type === 'deposit') {
        return '<span class="badge" style="background: #ECFDF5; color: #047857; font-weight: 800; border: 1.5px solid #10B981; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px;">🟢 إيداع بالخزينة</span>';
    }

    return `<span class="badge" style="background: #F1F5F9; color: #475569; font-weight: 800; border: 1.5px solid #CBD5E1; padding: 4px 10px; border-radius: 20px; font-size: 11.5px;">${type}</span>`;
}
window.getTreasuryTxTypeBadge = getTreasuryTxTypeBadge;

async function loadTreasuryAuditLog() {
    const tbody = document.getElementById('auditLogTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 24px; color: #64748B;">جاري تحميل سجل الرقابة والتدقيق...</td></tr>';

    const search = document.getElementById('auditFilterSearch')?.value?.trim() || null;
    const paymentMethod = document.getElementById('auditFilterMethod')?.value || 'all';
    const type = document.getElementById('auditFilterType')?.value || 'all';
    const startDate = document.getElementById('auditFilterStartDate')?.value || null;
    const endDate = document.getElementById('auditFilterEndDate')?.value || null;

    try {
        const res = await window.api.listTreasuryTransactions({
            type,
            paymentMethod,
            startDate,
            endDate,
            search,
            limit: 500
        });

        const list = (res && res.success && Array.isArray(res.data)) ? res.data : [];
        cachedAuditTransactions = list;

        const countBadge = document.getElementById('auditLogCountBadge');
        if (countBadge) countBadge.innerText = `${list.length} حركة`;

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 32px; font-weight: 600;">لا توجد حركات مسجلة بالخزينة مطابقة للفلاتر والبحث</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        list.forEach(t => {
            const isDep = t.transaction_type === 'deposit' || t.transaction_type === 'shift_transfer' || t.transaction_type === 'channel_transfer_in';
            const voucherCode = t.reference_id || (t.session_code ? `TRF-${t.session_code}` : (isDep ? `INFLOW-${t.id}` : `OUTFLOW-${t.id}`));
            const dateTimeStr = t.created_at ? t.created_at.substring(0, 16) : '-';

            // Movement type badge: وارد (+) / منصرف (-) مع شارة القناة التفصيلية
            const movementTypeBadge = isDep
                ? `<span class="badge" style="background: #ECFDF5; color: #047857; border: 1.5px solid #A7F3D0; font-weight: 800; border-radius: 16px; padding: 3px 10px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">↓ وارد (+)</span>`
                : `<span class="badge" style="background: #FFF1F2; color: #BE123C; border: 1.5px solid #FECDD3; font-weight: 800; border-radius: 16px; padding: 3px 10px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">↑ منصرف (-)</span>`;
            const specificTypeBadge = getTreasuryTxTypeBadge(t);
            const movementColumnHtml = `<div style="display: flex; flex-direction: column; gap: 4px; align-items: center;">${movementTypeBadge}${specificTypeBadge}</div>`;

            // Statement title + channel breakdown sub-line
            let statementTitle = t.source_destination || '';
            let notesText = t.notes || '';
            if (notesText.includes('[كاش:')) {
                const parts = notesText.split('[كاش:');
                notesText = parts[0].trim();
                if (notesText.endsWith('|') || notesText.endsWith('-')) {
                    notesText = notesText.slice(0, -1).trim();
                }
            }
            if (notesText && !statementTitle.includes(notesText)) {
                statementTitle += (statementTitle ? ' - ' : '') + notesText;
            }
            if (!statementTitle) {
                statementTitle = isDep ? 'إيداع نقدي بالخزينة' : 'صرف من الخزينة';
            }

            const amt = Number(t.amount || 0);
            const amtStr = amt.toLocaleString('en-US', { minimumFractionDigits: 2 });
            const pm = (t.payment_method || 'cash').toLowerCase();

            let cashVal = Number(t.cash_amount != null ? t.cash_amount : (pm === 'cash' ? amt : 0));
            let cardVal = Number(t.card_amount != null ? t.card_amount : (pm === 'card' ? amt : 0));
            let transferVal = Number(t.transfer_amount != null ? t.transfer_amount : (pm === 'transfer' ? amt : 0));

            if (cashVal === 0 && cardVal === 0 && transferVal === 0 && amt > 0) {
                if (pm === 'card') cardVal = amt;
                else if (pm === 'transfer') transferVal = amt;
                else cashVal = amt;
            }

            const cashStr = cashVal.toLocaleString('en-US', { minimumFractionDigits: 2 });
            const cardStr = cardVal.toLocaleString('en-US', { minimumFractionDigits: 2 });
            const transferStr = transferVal.toLocaleString('en-US', { minimumFractionDigits: 2 });
            const channelBreakdown = `[كاش: ${cashStr} ج.م | بنكي/فيزا: ${cardStr} ج.م | تحويلات: ${transferStr} ج.م]`;

            const balBefore = Number(t.balance_before || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
            const balAfter = Number(t.balance_after || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.style.transition = 'background 0.15s ease';
            tr.onmouseenter = () => tr.style.background = '#F8FAFC';
            tr.onmouseleave = () => tr.style.background = '#FFFFFF';
            tr.onclick = () => openTreasuryTxDetails(t.id);

            tr.innerHTML = `
                <td style="padding: 11px 12px; font-weight: 700; font-family: monospace; font-size: 11px; color: #64748B; text-align: center; white-space: nowrap;">${escapeHtml(voucherCode)}</td>
                <td style="padding: 11px 14px; font-size: 11.5px; font-family: monospace; color: #1E293B; text-align: center; white-space: nowrap;">${dateTimeStr}</td>
                <td style="padding: 11px 14px; text-align: center; white-space: nowrap;">${movementColumnHtml}</td>
                <td style="padding: 11px 18px; font-size: 12px; line-height: 1.5; color: #1E293B;">
                    <div style="font-weight: 700; color: #0F172A;">${escapeHtml(statementTitle)}</div>
                    <div style="color: #64748B; font-size: 11px; margin-top: 3px; font-family: monospace;">${channelBreakdown}</div>
                </td>
                <td style="padding: 11px 14px; text-align: left; direction: ltr; font-weight: 900; font-family: monospace; font-size: 13.5px; white-space: nowrap; color: ${isDep ? '#059669' : '#DC2626'};">
                    ${isDep ? '+' : '-'} ${amtStr} ج.م
                </td>
                <td style="padding: 11px 14px; text-align: left; direction: ltr; font-family: monospace; font-weight: 700; font-size: 12.5px; color: #475569; white-space: nowrap;">
                    ${balBefore} ج.م
                </td>
                <td style="padding: 11px 14px; text-align: left; direction: ltr; font-family: monospace; font-weight: 900; font-size: 13px; color: #7C3AED; white-space: nowrap;">
                    ${balAfter} ج.م
                </td>
                <td style="padding: 11px 14px; text-align: center; font-size: 12px; font-weight: 700; color: #334155; white-space: nowrap;">
                    ${escapeHtml(t.performed_by_name || t.created_by_name || 'مدير النظام')}
                </td>
            `;
            tbody.appendChild(tr);
        });
        refreshIcons(tbody);
    } catch (err) {
        console.error('loadTreasuryAuditLog error:', err);
    }
}
window.loadTreasuryAuditLog = loadTreasuryAuditLog;

function openTreasuryTxDetails(txId) {
    const tx = (cachedAuditTransactions || []).find(x => x.id === txId || String(x.id) === String(txId));
    if (!tx) {
        showCustomAlert('تعذر العثور على بيانات الحركة المحددة', 'تنبيه', 'warning');
        return;
    }

    const modal = document.getElementById('modalTreasuryTxDetails');
    if (!modal) return;

    const isDep = tx.transaction_type === 'deposit' || tx.transaction_type === 'shift_transfer' || tx.transaction_type === 'channel_transfer_in';
    const isTransfer = tx.transaction_type?.startsWith('channel_transfer');
    const color = isTransfer ? '#7C3AED' : (isDep ? '#059669' : '#DC2626');
    const sign = isDep ? '+' : '-';

    // Populate Modal
    const badgeId = document.getElementById('txDetailBadgeId');
    if (badgeId) badgeId.innerText = `#TX-${tx.id}`;

    const amtEl = document.getElementById('txDetailAmount');
    if (amtEl) {
        amtEl.innerText = `${sign} ${(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
        amtEl.style.color = color;
    }

    const typeBadgeEl = document.getElementById('txDetailTypeBadge');
    if (typeBadgeEl) typeBadgeEl.innerHTML = getTreasuryTxTypeBadge(tx);

    const chBadgeEl = document.getElementById('txDetailChannelBadge');
    if (chBadgeEl) chBadgeEl.innerHTML = getChannelBadge(tx.payment_method);

    const balBefore = (typeof tx.balance_before === 'number' && !isNaN(tx.balance_before)) ? `${tx.balance_before.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م` : '—';
    const balAfter = (typeof tx.balance_after === 'number' && !isNaN(tx.balance_after)) ? `${tx.balance_after.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م` : ((typeof tx.running_balance === 'number') ? `${tx.running_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م` : '—');

    const chBefore = (typeof tx.channel_balance_before === 'number' && !isNaN(tx.channel_balance_before)) ? `${tx.channel_balance_before.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م` : '0.00 ج.م';
    const chAfter = (typeof tx.channel_balance_after === 'number' && !isNaN(tx.channel_balance_after)) ? `${tx.channel_balance_after.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م` : '0.00 ج.م';

    const balBeforeEl = document.getElementById('txDetailBalBefore');
    if (balBeforeEl) balBeforeEl.innerText = balBefore;

    const chBalBeforeEl = document.getElementById('txDetailChannelBalBefore');
    if (chBalBeforeEl) chBalBeforeEl.innerText = `(رصيد القناة قبل: ${chBefore})`;

    const balAfterEl = document.getElementById('txDetailBalAfter');
    if (balAfterEl) balAfterEl.innerText = balAfter;

    const chBalAfterEl = document.getElementById('txDetailChannelBalAfter');
    if (chBalAfterEl) chBalAfterEl.innerText = `(رصيد القناة بعد: ${chAfter})`;

    const dtEl = document.getElementById('txDetailDateTime');
    if (dtEl) dtEl.innerText = tx.created_at || '-';

    const srcEl = document.getElementById('txDetailSourceDest');
    if (srcEl) srcEl.innerText = tx.source_destination || '-';

    const notesEl = document.getElementById('txDetailNotes');
    if (notesEl) notesEl.innerText = tx.notes || 'لا توجد ملاحظات إضافية مسجلة لهذه الحركة';

    const refEl = document.getElementById('txDetailReference');
    if (refEl) {
        let refText = tx.reference_id || '';
        if (tx.session_id) refText += (refText ? ' | ' : '') + `كود الوردية: SES-#${tx.session_id} (${tx.session_code || ''})`;
        refEl.innerText = refText || '—';
    }

    const userEl = document.getElementById('txDetailUser');
    if (userEl) userEl.innerText = tx.performed_by_name || tx.created_by_name || 'مسؤول النظام الرئيسي';

    modal.classList.add('active');
    modal.style.display = 'flex';
    refreshIcons(modal);
}
window.openTreasuryTxDetails = openTreasuryTxDetails;

// Export to Excel with UTF-8 BOM CSV
function exportTreasuryAuditToExcel() {
    if (!cachedAuditTransactions || cachedAuditTransactions.length === 0) {
        alert('لا توجد بيانات متاحة للتصدير حالياً');
        return;
    }

    const headers = [
        'رقم القيد',
        'التاريخ والوقت',
        'نوع الحركة',
        'الحركة والبيان',
        'المبلغ (ج.م)',
        'الرصيد السابق (ج.م)',
        'الرصيد بعد الحركة (ج.م)',
        'القناة المالية',
        'بواسطة'
    ];

    const rows = cachedAuditTransactions.map(t => {
        const isDep = t.transaction_type === 'deposit' || t.transaction_type === 'shift_transfer' || t.transaction_type === 'channel_transfer_in';
        const sign = isDep ? '+' : '-';
        const voucherCode = t.reference_id || (t.session_code ? `TRF-${t.session_code}` : (isDep ? `INFLOW-${t.id}` : `OUTFLOW-${t.id}`));
        const typeLabel = isDep ? 'وارد (+)' : 'منصرف (-)';
        const cleanSource = (t.source_destination || '').replace(/[\r\n,"]/g, ' ');
        const cleanNotes = (t.notes || '').replace(/[\r\n,"]/g, ' ');
        const statement = cleanNotes ? `${cleanSource} - ${cleanNotes}` : cleanSource;
        const cleanUser = (t.performed_by_name || t.created_by_name || 'مدير النظام').replace(/[\r\n,"]/g, ' ');

        return [
            voucherCode,
            t.created_at || '',
            typeLabel,
            `"${statement}"`,
            `${sign}${(t.amount || 0).toFixed(2)}`,
            (t.balance_before || 0).toFixed(2),
            (t.balance_after || t.running_balance || 0).toFixed(2),
            t.payment_method || 'cash',
            `"${cleanUser}"`
        ];
    });

    // Add UTF-8 BOM (\uFEFF)
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    link.setAttribute('href', url);
    link.setAttribute('download', `سجل_الخزينة_المركزية_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
window.exportTreasuryAuditToExcel = exportTreasuryAuditToExcel;

// 5. Payroll History View
async function loadPayrollArchive() {
    const tbody = document.getElementById('payrollHistoryTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 24px;">جاري تحميل أرشيف سندات الرواتب...</td></tr>';

    try {
        const res = await window.api.listSalaryPayments(150);
        const list = (res && res.success && Array.isArray(res.data)) ? res.data : [];

        const countBadge = document.getElementById('payrollHistoryCountBadge');
        if (countBadge) countBadge.innerText = `${list.length} سند`;

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 32px; font-weight: 600;">لا توجد سندات صرف رواتب مسجلة حتى الآن</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        list.forEach(p => {
            const tr = document.createElement('tr');
            const salaryMonth = p.notes?.match(/20\d{2}-\d{2}/)?.[0] || (p.paid_at ? p.paid_at.substring(0, 7) : '-');
            const pmLabel = p.payment_method === 'card' ? 'فيزا / بنك 💳' : (p.payment_method === 'transfer' ? 'محفظة / إنستاباي 📱' : 'كاش 💵');

            const baseVal = Number(p.base_salary || p.amount || 0);
            const advVal = Number(p.advances_deducted || 0);
            const dedVal = Number(p.deductions || 0);
            const bonVal = Number(p.bonuses || 0);
            const netVal = Number(p.amount || 0);

            tr.innerHTML = `
                <td style="font-weight: 800; font-family: monospace; color: #475569; padding: 10px 14px;">${p.voucher_number || `PAY-${String(p.id).padStart(5, '0')}`}</td>
                <td style="padding: 10px 14px;">
                    <div style="font-weight: 800; color: #0F172A;">${p.employee_name || 'موظف'}</div>
                    <div style="font-size: 10px; color: #0284C7;">${p.job_title || 'موظف'}</div>
                </td>
                <td style="text-align: center; padding: 10px 14px;">
                    <span style="background: #EFF6FF; color: #2563EB; border: 1px solid #DBEAFE; border-radius: 6px; padding: 2px 8px; font-size: 11.5px; font-weight: 700; font-family: monospace;">${salaryMonth}</span>
                </td>
                <td style="text-align: right; font-family: monospace; font-weight: 600; padding: 10px 14px;">${baseVal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</td>
                <td style="text-align: right; font-family: monospace; color: #DC2626; font-weight: 700; padding: 10px 14px;">${advVal ? `- ${advVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                <td style="text-align: right; font-family: monospace; color: #C2410C; font-weight: 700; padding: 10px 14px;">${dedVal ? `- ${dedVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                <td style="text-align: right; font-family: monospace; color: #16A34A; font-weight: 700; padding: 10px 14px;">${bonVal ? `+ ${bonVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                <td style="text-align: right; font-family: monospace; font-weight: 900; color: #059669; font-size: 13.5px; padding: 10px 14px;">${netVal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</td>
                <td style="text-align: center; padding: 10px 14px;">
                    <span class="badge" style="background: #F0FDF4; color: #166534; border: 1px solid #BBF7D0; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 700;">${pmLabel}</span>
                </td>
                <td style="padding: 10px 14px; font-weight: 600; color: #334155; font-size: 11.5px;">${p.paid_by_name || 'المدير المسؤول'}</td>
                <td style="padding: 10px 14px; font-size: 11.5px; color: var(--text-muted); font-family: monospace; white-space: nowrap;">${p.paid_at || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('loadPayrollArchive error:', err);
    }
}
window.loadPayrollArchive = loadPayrollArchive;

// 6. Branch Safes Summary View
async function loadBranchSafesSummary() {
    const grid = document.getElementById('branchSafesCardsGrid');
    if (!grid) return;
    grid.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 30px; grid-column: 1/-1;">جاري فحص أرصدة وحالة خزائن الفروع والورديات...</div>';

    try {
        const res = await window.api.treasuryBranchSafes();
        const safes = (res && res.success && Array.isArray(res.data)) ? res.data : [];

        if (safes.length === 0) {
            grid.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 30px; grid-column: 1/-1;">لا توجد فروع أو جلسات مسجلة</div>';
            return;
        }

        grid.innerHTML = '';
        safes.forEach(s => {
            const isOpen = s.status === 'open';
            const statusBadge = isOpen
                ? '<span class="badge" style="background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; font-weight: 800;">🟢 وردية نشطة ومفتوحة</span>'
                : '<span class="badge" style="background: #F1F5F9; color: #64748B; border: 1px solid #CBD5E1; font-weight: 800;">⚪ وردية مغلقة ومرحّلة</span>';

            const card = document.createElement('div');
            card.style.cssText = 'background: #FFFFFF; border: 1.5px solid var(--border-color); border-radius: 12px; padding: 16px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 10px;';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4 style="font-size: 14px; font-weight: 800; color: #0F172A; margin: 0;">${s.branch_name || 'الفرع الرئيسي'}</h4>
                        <span style="font-size: 11px; color: #64748B; font-family: monospace;">${s.session_code || `جلسة #${s.id || '-'}`}</span>
                    </div>
                    ${statusBadge}
                </div>

                <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div>
                        <span style="font-size: 10.5px; color: #64748B; font-weight: 700; display: block;">رصيد الدرج الحي:</span>
                        <span style="font-size: 16px; font-weight: 900; color: #16A34A; font-family: monospace;">${(s.current_cash || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</span>
                    </div>
                    <div>
                        <span style="font-size: 10.5px; color: #64748B; font-weight: 700; display: block;">إجمالي المبيعات:</span>
                        <span style="font-size: 16px; font-weight: 800; color: #0284C7; font-family: monospace;">${(s.total_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</span>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: #475569; padding-top: 4px; border-top: 1px dashed #E2E8F0;">
                    <span>المحول للخزينة: <strong>${(s.transferred_to_treasury || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</strong></span>
                    <span>الكاشير: <strong>${s.cashier_name || 'كاشير الفرع'}</strong></span>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('loadBranchSafesSummary error:', err);
    }
}
window.loadBranchSafesSummary = loadBranchSafesSummary;

// ==============================================================
// MASTER TREASURY VIEW LOADER & EVENT BINDINGS
// ==============================================================
async function loadTreasuryView() {
    // 1. Fetch live balances & update cards & owner banner
    try {
        const balRes = await window.api.getTreasuryBalance();
        if (balRes && balRes.success) {
            const d = balRes.data || {};
            cachedTreasuryBalances = d;

            if (document.getElementById('treasuryBalanceVal')) {
                document.getElementById('treasuryBalanceVal').innerText = `${(d.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
            }
            if (document.getElementById('treasuryCashBalanceVal')) {
                document.getElementById('treasuryCashBalanceVal').innerText = `${(d.cashBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
            }
            if (document.getElementById('treasuryCardBalanceVal')) {
                document.getElementById('treasuryCardBalanceVal').innerText = `${(d.cardBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
            }
            if (document.getElementById('treasuryTransferBalanceVal')) {
                document.getElementById('treasuryTransferBalanceVal').innerText = `${(d.transferBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
            }

            // Owner Account Banner
            const ownerBal = d.ownerBalance || 0;
            const ownerNetEl = document.getElementById('ownerNetBalanceVal');
            if (ownerNetEl) {
                ownerNetEl.innerText = `${ownerBal >= 0 ? '+ ' : ''}${ownerBal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
            }
            if (document.getElementById('ownerDepositsVal')) {
                document.getElementById('ownerDepositsVal').innerText = `+ ${(d.ownerDepositsTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
            }
            if (document.getElementById('ownerDepositsCount')) {
                document.getElementById('ownerDepositsCount').innerText = `${d.ownerDepositsCount || 0} حركة إيداع`;
            }
            if (document.getElementById('ownerWithdrawalsVal')) {
                document.getElementById('ownerWithdrawalsVal').innerText = `- ${(d.ownerWithdrawalsTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`;
            }
            if (document.getElementById('ownerWithdrawalsCount')) {
                document.getElementById('ownerWithdrawalsCount').innerText = `${d.ownerWithdrawalsCount || 0} حركة سحب`;
            }

            // Also refresh solvency live badges on the Operations Row
            checkQuickDisburseSolvency();
            calculatePayrollNet();
        }
    } catch (e) {
        console.warn('loadTreasuryView balance error:', e);
    }

    // 2. Initialize payroll controller if not initialized
    initTreasuryPayrollController().catch(console.warn);

    // 3. Load active main tab & preload analytics
    window.switchTreasuryMainTab(activeTreasuryMainTab);
    loadTreasuryAnalytics().catch(console.warn);
}
window.loadTreasuryView = loadTreasuryView;

function bindTreasuryEvents() {
    // Refresh button
    const refreshBtn = document.getElementById('btnRefreshTreasury');
    if (refreshBtn && !refreshBtn._bound) {
        refreshBtn._bound = true;
        refreshBtn.addEventListener('click', () => loadTreasuryView());
    }

    // Modal openers
    const openDepBtn = document.getElementById('btnOpenTreasuryDepositModal');
    if (openDepBtn && !openDepBtn._bound) {
        openDepBtn._bound = true;
        openDepBtn.addEventListener('click', openTreasuryDepositModal);
    }

    const openWithBtn = document.getElementById('btnOpenTreasuryWithdrawModal');
    if (openWithBtn && !openWithBtn._bound) {
        openWithBtn._bound = true;
        openWithBtn.addEventListener('click', openTreasuryWithdrawModal);
    }

    const openTransferBtn = document.getElementById('btnOpenChannelTransferModal');
    if (openTransferBtn && !openTransferBtn._bound) {
        openTransferBtn._bound = true;
        openTransferBtn.addEventListener('click', openChannelTransferModal);
    }

    // Date range pills
    document.querySelectorAll('.treasury-period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.treasury-period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const period = btn.dataset.period;
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const fStart = document.getElementById('auditFilterStartDate');
            const fEnd = document.getElementById('auditFilterEndDate');

            if (period === 'today') {
                if (fStart) fStart.value = todayStr;
                if (fEnd) fEnd.value = todayStr;
            } else if (period === 'week') {
                const weekAgo = new Date(now.getTime() - 6 * 24 * 3600 * 1000);
                const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;
                if (fStart) fStart.value = weekAgoStr;
                if (fEnd) fEnd.value = todayStr;
            } else if (period === 'month') {
                const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                if (fStart) fStart.value = monthStart;
                if (fEnd) fEnd.value = todayStr;
            } else {
                if (fStart) fStart.value = '';
                if (fEnd) fEnd.value = '';
            }
            if (activeTreasuryMainTab === 'audit') loadTreasuryAuditLog();
        });
    });

    // Close autocomplete on click outside
    document.addEventListener('click', (e) => {
        const searchInp = document.getElementById('payrollEmployeeSearch');
        const dropdown = document.getElementById('payrollEmployeeDropdown');
        if (dropdown && dropdown.style.display !== 'none') {
            if (e.target !== searchInp && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        }
    });
}
window.bindTreasuryEvents = bindTreasuryEvents;

/* -------------------------------------------------------------
 * 12. STAFF & PAYROLL (الموظفين وصرف المرتبات)
 * ------------------------------------------------------------- */
function bindStaffEvents() {
    // Segmented tab switching
    const tabBtnEmp = document.getElementById('tabBtnEmployees');
    const tabBtnSal = document.getElementById('tabBtnSalaries');
    if (tabBtnEmp && tabBtnSal) {
        tabBtnEmp.addEventListener('click', () => switchStaffTab('employees'));
        tabBtnSal.addEventListener('click', () => switchStaffTab('salaries'));
    }

    // Add / Edit Employee modal openers
    const openAddEmpDedicated = document.getElementById('btnOpenAddEmployeeDedicated');
    if (openAddEmpDedicated) {
        openAddEmpDedicated.addEventListener('click', () => openEmployeeModal());
    }

    const openNewEmpBtn = document.getElementById('btnOpenNewEmployeeModal');
    if (openNewEmpBtn) {
        openNewEmpBtn.addEventListener('click', () => openEmployeeModal());
    }

    // Modal submit handler
    const submitNewEmpBtn = document.getElementById('btnSubmitNewEmployee');
    if (submitNewEmpBtn) {
        submitNewEmpBtn.addEventListener('click', handleEmployeeSubmit);
    }

    // Dedicated staff search & filters
    const staffSearchInput = document.getElementById('staffSearchInput');
    if (staffSearchInput) {
        staffSearchInput.addEventListener('input', () => renderFilteredStaffTable());
    }

    const staffFilterRole = document.getElementById('staffFilterRole');
    if (staffFilterRole) {
        staffFilterRole.addEventListener('change', () => renderFilteredStaffTable());
    }

    const btnResetStaffFilter = document.getElementById('btnResetStaffFilter');
    if (btnResetStaffFilter) {
        btnResetStaffFilter.addEventListener('click', () => {
            if (staffSearchInput) staffSearchInput.value = '';
            if (staffFilterRole) staffFilterRole.value = 'all';
            currentStaffStatusFilter = 'all';
            document.querySelectorAll('.staff-status-pill').forEach(p => {
                p.classList.toggle('active', p.dataset.status === 'all');
            });
            renderFilteredStaffTable();
        });
    }

    // Disburse salary modal
    const openDisburseBtn = document.getElementById('btnOpenDisburseSalaryModal');
    if (openDisburseBtn) {
        openDisburseBtn.addEventListener('click', async () => {
            const currentMonthCode = new Date().toISOString().slice(0, 7);
            const [empRes, paymentsRes] = await Promise.all([
                window.api.listEmployees(true),
                window.api.listSalaryPayments(100, { month: currentMonthCode })
            ]);

            const paidMap = new Map();
            if (paymentsRes && paymentsRes.success && Array.isArray(paymentsRes.data)) {
                paymentsRes.data.forEach(p => {
                    if (p.payment_type === 'salary' || !p.payment_type) {
                        paidMap.set(Number(p.employee_id), p);
                    }
                });
            }

            const sel = document.getElementById('salaryEmployeeSelect');
            sel.innerHTML = '<option value="">اختر الموظف المستحق...</option>';

            const pendingList = [];
            const paidList = [];

            empRes.data?.forEach(e => {
                if (paidMap.has(Number(e.id))) paidList.push(e);
                else pendingList.push(e);
            });

            if (pendingList.length > 0) {
                const grp = document.createElement('optgroup');
                grp.label = `⏳ بانتظار صرف الراتب (${pendingList.length} عامل)`;
                pendingList.forEach(e => {
                    const opt = document.createElement('option');
                    opt.value = e.id;
                    opt.dataset.salary = e.base_salary;
                    opt.dataset.isPaid = '0';
                    opt.innerText = `⏳ [مستحق] ${e.full_name} (${e.role_title || e.job_title} - راتب: ${e.base_salary} ج.م)`;
                    grp.appendChild(opt);
                });
                sel.appendChild(grp);
            }

            if (paidList.length > 0) {
                const grp = document.createElement('optgroup');
                grp.label = `✅ تم صرف الراتب لهذا الشهر (قبض الشهر ده - ${paidList.length} عامل)`;
                paidList.forEach(e => {
                    const pay = paidMap.get(Number(e.id));
                    const vCode = pay?.voucher_code || `#PAY-${pay?.id || ''}`;
                    const opt = document.createElement('option');
                    opt.value = e.id;
                    opt.dataset.salary = e.base_salary;
                    opt.dataset.isPaid = '1';
                    opt.innerText = `✅ [قبض الشهر ده] ${e.full_name} (${e.role_title || e.job_title} - راتب: ${e.base_salary} ج.م) [سند ${vCode}]`;
                    opt.style.color = '#15803D';
                    opt.style.fontWeight = 'bold';
                    grp.appendChild(opt);
                });
                sel.appendChild(grp);
            }

            document.getElementById('salaryAmount').value = '';
            const currentMonth = new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
            document.getElementById('salaryMonthPeriod').value = currentMonth;
            document.getElementById('salaryNotes').value = '';

            // Fetch live treasury cash balance and display hint
            try {
                const tRes = await window.api.getTreasuryBalance();
                const cashBal = Number(tRes?.data?.cashBalance ?? tRes?.data?.balance ?? 0);
                const hintEl = document.getElementById('salaryTreasuryBalanceHint');
                if (hintEl) {
                    hintEl.innerText = `رصيد الكاش بالخزنة: ${cashBal.toFixed(2)} ج.م`;
                    hintEl.dataset.cashBalance = cashBal;
                }
            } catch (e) {
                // Ignore fallback
            }

            document.getElementById('modalDisburseSalary').classList.add('active');
        });
    }

    const submitDisburseBtn = document.getElementById('btnSubmitSalaryDisbursement');
    if (submitDisburseBtn) {
        submitDisburseBtn.addEventListener('click', async () => {
            const selEl = document.getElementById('salaryEmployeeSelect');
            const employeeId = selEl?.value;
            if (!employeeId) {
                alert('يرجى اختيار الموظف المستحق أولاً');
                return;
            }

            const paymentType = document.getElementById('salaryPaymentType').value;
            const selectedOpt = selEl.selectedOptions[0];
            if (paymentType === 'salary' && selectedOpt?.dataset?.isPaid === '1') {
                alert('⚠️ تنبيه أمني لمنع التكرار: لقد تم صرف راتب هذا الشهر لهذا العامل مسبقاً!\nلا يمكن صرف المرتب مرتين لنفس الشهر منعاً للازدواجية المالية.');
                return;
            }
            const paymentSource = document.getElementById('salarySource').value;
            const monthPeriod = document.getElementById('salaryMonthPeriod').value.trim();
            const notes = document.getElementById('salaryNotes').value.trim();

            // Strict solvency validation on client side
            if (paymentSource === 'treasury') {
                const hintEl = document.getElementById('salaryTreasuryBalanceHint');
                const cashBal = Number(hintEl?.dataset?.cashBalance || 0);
                if (amount > cashBal) {
                    alert(`رصيد الكاش المتاح بالخزنة المركزية (${cashBal.toFixed(2)} ج.م) لا يكفي لصرف هذا المبلغ (${amount.toFixed(2)} ج.م).`);
                    return;
                }
            }

            const res = await window.api.disburseSalary({
                employeeId: Number(employeeId),
                paymentType,
                amount,
                paymentSource,
                monthPeriod,
                notes,
                sessionId: state.activeSession?.id
            }, state.currentUser.id);

            if (!res.success) {
                alert(`خطأ في صرف السند: ${res.error}`);
                return;
            }

            alert(`تم صرف المبلغ (${amount.toFixed(2)} ج.م) بنجاح وتوثيقه في كشف الرواتب`);
            document.getElementById('modalDisburseSalary').classList.remove('active');
            switchStaffTab('salaries');
            await loadStaffView();
        });
    }
}

async function loadStaffView() {
    // 1. Employees table
    const empRes = await window.api.listEmployees();
    const empTbody = document.getElementById('employeesTableBody');
    if (empTbody) {
        empTbody.innerHTML = '';
        if (!empRes.success || !empRes.data || empRes.data.length === 0) {
            empTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">لا يوجد موظفين مسجلين</td></tr>';
        } else {
            empRes.data.forEach(e => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight: 700;">${e.full_name}</td>
                    <td><span class="badge" style="background: var(--bg-card-hover);">${e.job_title || e.role_title || 'موظف'}</span></td>
                    <td style="font-family: monospace;">${e.phone || '-'}</td>
                    <td style="color: var(--accent-emerald); font-weight: bold;">${(Number(e.basic_salary ?? e.base_salary ?? 0)).toFixed(2)} ج.م</td>
                    <td style="font-size: 12px; color: var(--text-muted);">${e.hire_date || '-'}</td>
                    <td><span class="badge ${e.is_active ? 'badge-ok' : 'badge-low-stock'}">${e.is_active ? 'نشط بالخدمة' : 'متوقف'}</span></td>
                `;
                empTbody.appendChild(tr);
            });
        }
    }

    // 2. Salaries table
    const salRes = await window.api.listSalaryPayments(50);
    const salTbody = document.getElementById('salariesTableBody');
    if (salTbody) {
        salTbody.innerHTML = '';
        if (!salRes.success || !salRes.data || salRes.data.length === 0) {
            salTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">لا توجد سندات صرف رواتب أو سلف سابقة</td></tr>';
        } else {
            salRes.data.forEach(s => {
                const tr = document.createElement('tr');
                const typeLabel = s.payment_type === 'salary' ? 'راتب شهري' : s.payment_type === 'advance' ? 'سلفة مؤقتة' : 'مكافأة / حافز';
                const sourceLabel = s.payment_source === 'treasury' ? 'الخزنة المركزية' : 'درج الكاشير';

                tr.innerHTML = `
                    <td style="font-weight: bold; font-family: monospace;">#SAL-${s.id}</td>
                    <td style="font-weight: 600;">${s.employee_name}</td>
                    <td><span class="badge" style="background: var(--bg-card-hover);">${typeLabel}</span></td>
                    <td style="color: var(--accent-rose); font-weight: bold;">-${s.amount.toFixed(2)} ج.م</td>
                    <td>${sourceLabel}</td>
                    <td>${s.month_period || '-'}</td>
                    <td>${s.created_by_name || '-'}</td>
                    <td style="font-size: 12px; color: var(--text-muted);">${s.created_at}</td>
                `;
                salTbody.appendChild(tr);
            });
        }
    }
}

/* ==============================================================
 * DEDICATED EMPLOYEES DASHBOARD & DIRECTORY MODULE
 * ============================================================== */
let currentStaffStatusFilter = 'all';
let cachedEmployeesList = [];

async function openEmployeeModal(employee = null) {
    const modal = document.getElementById('modalNewEmployee');
    if (!modal) return;

    const modalTitle = document.getElementById('empModalTitle');
    const modalId = document.getElementById('empModalId');
    const fullNameInp = document.getElementById('empFullName');
    const roleSel = document.getElementById('empRoleTitle');
    const phoneInp = document.getElementById('empPhone');
    const salaryInp = document.getElementById('empBaseSalary');
    const hireDateInp = document.getElementById('empHireDate');
    const isActiveSel = document.getElementById('empIsActive');
    const notesInp = document.getElementById('empNotes');
    const submitBtn = document.getElementById('btnSubmitNewEmployee');

    if (employee) {
        if (modalId) modalId.value = employee.id;
        if (modalTitle) {
            modalTitle.innerHTML = `
                <i data-lucide="edit-3" class="icon-sm" style="color: #4F46E5;"></i>
                <span>تعديل بيانات الموظف (#EMP-0${employee.id})</span>
            `;
        }
        if (fullNameInp) fullNameInp.value = employee.full_name || '';
        if (roleSel) roleSel.value = employee.job_title || employee.role_title || 'كاشير';
        if (phoneInp) phoneInp.value = employee.phone || '';
        if (salaryInp) salaryInp.value = employee.basic_salary ?? employee.base_salary ?? 3000;
        if (hireDateInp) hireDateInp.value = employee.hire_date || '';
        if (isActiveSel) isActiveSel.value = employee.is_active ? '1' : '0';
        if (notesInp) notesInp.value = employee.notes || '';
        if (submitBtn) submitBtn.textContent = 'حفظ التعديلات';

        const delBtn = document.getElementById('btnDeleteEmployeeModal');
        if (delBtn) {
            delBtn.style.display = 'inline-flex';
            delBtn.onclick = () => handleDeleteEmployee(employee.id, employee.full_name);
        }
    } else {
        if (modalId) modalId.value = '';
        if (modalTitle) {
            modalTitle.innerHTML = `
                <i data-lucide="user-plus" class="icon-sm" style="color: #4F46E5;"></i>
                <span>إضافة موظف جديد إلى السجل</span>
            `;
        }
        if (fullNameInp) fullNameInp.value = '';
        if (roleSel) roleSel.value = 'كاشير';
        if (phoneInp) phoneInp.value = '';
        if (salaryInp) salaryInp.value = '3000';
        if (hireDateInp) hireDateInp.value = new Date().toISOString().slice(0, 10);
        if (isActiveSel) isActiveSel.value = '1';
        if (notesInp) notesInp.value = '';
        if (submitBtn) submitBtn.textContent = 'حفظ الموظف';

        const delBtn = document.getElementById('btnDeleteEmployeeModal');
        if (delBtn) delBtn.style.display = 'none';
    }

    modal.classList.add('active');
    refreshIcons(modal);
}
window.openEmployeeModal = openEmployeeModal;

async function handleEmployeeSubmit() {
    const fullNameInp = document.getElementById('empFullName');
    const fullName = fullNameInp ? fullNameInp.value.trim() : '';
    if (!fullName) {
        alert('يرجى إدخال اسم الموظف بالكامل');
        if (fullNameInp) fullNameInp.focus();
        return;
    }

    const modalId = document.getElementById('empModalId')?.value;
    const roleTitle = document.getElementById('empRoleTitle')?.value || 'كاشير';
    const phone = document.getElementById('empPhone')?.value.trim() || '';
    const baseSalary = Number(document.getElementById('empBaseSalary')?.value) || 0;
    const hireDate = document.getElementById('empHireDate')?.value || null;
    const isActive = document.getElementById('empIsActive')?.value === '1' ? 1 : 0;
    const notes = document.getElementById('empNotes')?.value.trim() || '';

    const payload = {
        fullName,
        jobTitle: roleTitle,
        phone,
        basicSalary: baseSalary,
        hireDate,
        isActive,
        notes
    };

    if (modalId) {
        const res = await window.api.updateEmployee(Number(modalId), payload, state.currentUser?.id);
        if (!res.success) {
            alert(`تعذر تحديث بيانات الموظف: ${res.error}`);
            return;
        }
        alert(`تم تحديث بيانات الموظف "${fullName}" بنجاح.`);
    } else {
        const res = await window.api.createEmployee(payload, state.currentUser?.id);
        if (!res.success) {
            alert(`خطأ في إضافة الموظف: ${res.error}`);
            return;
        }
        alert(`تم تسجيل الموظف "${fullName}" بنجاح في سجل العاملين.`);
    }

    document.getElementById('modalNewEmployee')?.classList.remove('active');
    await loadEmployeesDashboard();
    await loadStaffView();
}

async function loadEmployeesDashboard() {
    try {
        // 1. Fetch all employees
        const empRes = await window.api.listEmployees();
        if (empRes?.success && Array.isArray(empRes.data)) {
            cachedEmployeesList = empRes.data;
        } else {
            cachedEmployeesList = [];
        }

        // 2. Compute Staff KPIs directly from the active dataset for real-time accuracy
        let total = cachedEmployeesList.length;
        let activeList = cachedEmployeesList.filter(e => e.is_active === 1 || e.is_active === true || String(e.is_active) === '1');
        let activeCount = activeList.length;
        let salesCount = activeList.filter(e => {
            const role = (e.job_title || e.role_title || '').toLowerCase();
            return role.includes('كاشير') || role.includes('مبيعات') || role.includes('صالة');
        }).length;
        let totalPayroll = activeList.reduce((sum, e) => sum + Number(e.basic_salary ?? e.base_salary ?? 0), 0);
        let avgSalary = activeCount > 0 ? (totalPayroll / activeCount) : 0;

        // Sync from server KPIs endpoint if available
        try {
            const kpiRes = await window.api.getStaffKpis();
            if (kpiRes?.success && kpiRes.data) {
                total = kpiRes.data.totalEmployees ?? total;
                activeCount = kpiRes.data.activeEmployees ?? activeCount;
                salesCount = kpiRes.data.salesCashierCount ?? salesCount;
                totalPayroll = kpiRes.data.totalBasicPayroll ?? totalPayroll;
                avgSalary = kpiRes.data.avgBasicSalary ?? avgSalary;
            }
        } catch (kpiErr) {
            console.warn('Fallback to client-computed KPIs:', kpiErr);
        }

        const totalEl = document.getElementById('kpiStaffTotal');
        const activeEl = document.getElementById('kpiStaffActive');
        const activePercentEl = document.getElementById('kpiStaffActivePercent');
        const salesEl = document.getElementById('kpiStaffSales');
        const payrollEl = document.getElementById('kpiStaffPayroll');
        const avgEl = document.getElementById('kpiStaffAvgSalary');

        if (totalEl) totalEl.textContent = total;
        if (activeEl) activeEl.textContent = activeCount;
        if (activePercentEl) {
            const pct = total > 0 ? Math.round((activeCount / total) * 100) : 100;
            activePercentEl.textContent = `${pct}% نسبة التشغيل`;
        }
        if (salesEl) salesEl.textContent = salesCount;
        if (payrollEl) payrollEl.textContent = `${Number(totalPayroll).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
        if (avgEl) avgEl.textContent = `${Number(avgSalary).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;

        renderFilteredStaffTable();
    } catch (err) {
        console.error('Error loading employees dashboard:', err);
    }
}
window.loadEmployeesDashboard = loadEmployeesDashboard;

function renderFilteredStaffTable() {
    const tbody = document.getElementById('dedicatedEmployeesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const searchQuery = (document.getElementById('staffSearchInput')?.value || '').trim().toLowerCase();
    const roleFilter = document.getElementById('staffFilterRole')?.value || 'all';

    const filtered = cachedEmployeesList.filter(e => {
        // Search text
        if (searchQuery) {
            const nameMatch = (e.full_name || '').toLowerCase().includes(searchQuery);
            const phoneMatch = (e.phone || '').toLowerCase().includes(searchQuery);
            const titleMatch = (e.job_title || e.role_title || '').toLowerCase().includes(searchQuery);
            const idMatch = String(e.id).includes(searchQuery);
            if (!nameMatch && !phoneMatch && !titleMatch && !idMatch) return false;
        }

        // Role filter
        if (roleFilter !== 'all') {
            const roleStr = (e.job_title || e.role_title || '').toLowerCase();
            if (!roleStr.includes(roleFilter.toLowerCase())) return false;
        }

        // Status filter
        if (currentStaffStatusFilter === 'active' && !e.is_active) return false;
        if (currentStaffStatusFilter === 'inactive' && e.is_active) return false;

        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 48px 20px; color: #94A3B8;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <i data-lucide="user-x" style="width: 44px; height: 44px; opacity: 0.5;"></i>
                        <span style="font-size: 14px; font-weight: 700; color: #64748B;">لا يوجد موظفين يطابقون شروط البحث الحالية</span>
                        <span style="font-size: 12px;">جرب تغيير كلمة البحث أو إعادة تعيين الفلاتر</span>
                    </div>
                </td>
            </tr>
        `;
        refreshIcons(tbody);
        return;
    }

    filtered.forEach(e => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #F1F5F9';
        tr.style.transition = 'background 0.15s ease';

        const role = e.job_title || e.role_title || 'موظف';
        let avatarClass = 'avatar-sales';
        if (role.includes('كاشير')) avatarClass = 'avatar-cashier';
        else if (role.includes('مدير') || role.includes('إدارة')) avatarClass = 'avatar-manager';
        else if (role.includes('مخزن')) avatarClass = 'avatar-inventory';
        else if (role.includes('عامل')) avatarClass = 'avatar-worker';

        const initial = (e.full_name || 'م').trim().charAt(0);
        const salary = Number(e.basic_salary ?? e.base_salary ?? 0);

        tr.innerHTML = `
            <td style="padding: 12px 18px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="staff-avatar ${avatarClass}">${initial}</div>
                    <div>
                        <div style="font-weight: 800; font-size: 13.5px; color: #0F172A;">${e.full_name}</div>
                        <div style="font-size: 11px; color: #94A3B8; font-family: monospace;">#EMP-0${e.id}</div>
                    </div>
                </div>
            </td>
            <td style="padding: 12px 16px; text-align: center;">
                <span class="badge" style="background: #F1F5F9; color: #334155; font-weight: 700; padding: 4px 10px; border-radius: 9999px; border: 1px solid #E2E8F0;">${role}</span>
            </td>
            <td style="padding: 12px 16px; text-align: center;">
                <span style="font-family: monospace; font-size: 12px; font-weight: 600; color: #475569;">${e.phone || '-'}</span>
            </td>
            <td style="padding: 12px 16px; text-align: left; font-weight: 800; color: #059669; font-size: 13.5px;">
                ${salary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
            </td>
            <td style="padding: 12px 16px; text-align: center; font-size: 12px; color: #64748B; font-weight: 600;">
                ${e.hire_date || '-'}
            </td>
            <td style="padding: 12px 16px; text-align: center;">
                <span class="badge ${e.is_active ? 'badge-ok' : 'badge-low-stock'}" style="font-size: 11px; padding: 4px 10px; border-radius: 9999px;">
                    ${e.is_active ? 'نشط بالخدمة' : 'متوقف'}
                </span>
            </td>
            <td style="padding: 12px 18px; text-align: center;">
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                    <button class="staff-action-btn edit-btn" onclick="openEmployeeModalById(${e.id})" title="تعديل بيانات الموظف">
                        <i data-lucide="edit-2" class="icon-xs"></i>
                        <span>تعديل</span>
                    </button>
                    <button class="staff-action-btn toggle-btn ${e.is_active ? 'deactivate' : 'activate'}" onclick="handleToggleEmployeeStatus(${e.id}, '${e.full_name}', ${e.is_active})" title="${e.is_active ? 'إيقاف الموظف' : 'تفعيل الموظف'}">
                        <i data-lucide="${e.is_active ? 'user-x' : 'user-check'}" class="icon-xs"></i>
                        <span>${e.is_active ? 'إيقاف' : 'تفعيل'}</span>
                    </button>
                    <button class="staff-action-btn delete-btn" onclick="handleDeleteEmployee(${e.id}, '${e.full_name}')" title="حذف الموظف نهائياً">
                        <i data-lucide="trash-2" class="icon-xs"></i>
                        <span>حذف</span>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });

    refreshIcons(tbody);
}

window.openEmployeeModalById = (id) => {
    const emp = cachedEmployeesList.find(e => e.id === Number(id));
    if (emp) openEmployeeModal(emp);
};

window.handleDeleteEmployee = async (id, fullName) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف الموظف "${fullName}" نهائياً من سجلات المنظومة؟\n\nتنبيه: لا يمكن التراجع عن هذا الإجراء.`)) {
        return;
    }

    try {
        const res = await window.api.deleteEmployee(Number(id), state.currentUser?.id);
        if (!res.success) {
            alert(`تعذر حذف الموظف:\n${res.error}`);
            return;
        }
        alert(`تم حذف الموظف "${fullName}" بنجاح.`);
        document.getElementById('modalNewEmployee')?.classList.remove('active');
        await loadEmployeesDashboard();
        await loadStaffView();
    } catch (err) {
        console.error('Error deleting employee:', err);
        alert(`حدث خطأ أثناء محاولة حذف الموظف: ${err.message}`);
    }
};

window.handleToggleEmployeeStatus = async (id, fullName, currentStatus) => {
    const actionText = currentStatus ? 'إيقاف الموظف مؤقتاً' : 'إعادة تفعيل الموظف';
    if (!confirm(`هل أنت متأكد من رغبتك في ${actionText} "${fullName}"؟`)) {
        return;
    }

    try {
        const res = await window.api.toggleEmployeeStatus(Number(id), state.currentUser?.id);
        if (!res.success) {
            alert(`تعذر تغيير حالة الموظف: ${res.error}`);
            return;
        }
        await loadEmployeesDashboard();
        await loadStaffView();
    } catch (err) {
        console.error('Error toggling employee status:', err);
    }
};

window.applyStaffStatusFilter = (status) => {
    currentStaffStatusFilter = status;
    document.querySelectorAll('.staff-status-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.status === status);
    });
    renderFilteredStaffTable();
};

/* ==============================================================
 * DEDICATED SYSTEM USERS & LOGINS MODULE (المستخدمين وتسجيل الدخول)
 * ============================================================== */
let cachedUsersList = [];

async function loadUsersDashboard() {
    try {
        const res = await window.api.listUsers();
        if (res?.success && Array.isArray(res.data)) {
            // Keep strictly ma and co
            cachedUsersList = res.data.filter(u => ['ma', 'co'].includes((u.username || '').toLowerCase()));
        } else {
            cachedUsersList = [];
        }

        const maUser = cachedUsersList.find(u => (u.username || '').toLowerCase() === 'ma');
        const coUser = cachedUsersList.find(u => (u.username || '').toLowerCase() === 'co');

        // Populate Card 1: ma (Admin)
        if (maUser) {
            const nameEl = document.getElementById('userMaName');
            const userEl = document.getElementById('userMaUsername');
            const badgeCurr = document.getElementById('badgeCurrentMa');
            const btnEdit = document.getElementById('btnEditUserMa');
            const btnPass = document.getElementById('btnPassUserMa');

            if (nameEl) nameEl.textContent = maUser.display_name;
            if (userEl) userEl.textContent = `@${maUser.username}`;
            if (badgeCurr) {
                const isCurrent = state.currentUser?.id === maUser.id || (state.currentUser?.username || '').toLowerCase() === 'ma';
                badgeCurr.style.display = isCurrent ? 'inline-block' : 'none';
            }
            if (btnEdit) {
                btnEdit.onclick = () => openUserModal(maUser);
            }
            if (btnPass) {
                btnPass.onclick = () => openChangePasswordModal(maUser.id, maUser.username);
            }
        }

        // Populate Card 2: co (Cashier)
        if (coUser) {
            const nameEl = document.getElementById('userCoName');
            const userEl = document.getElementById('userCoUsername');
            const badgeCurr = document.getElementById('badgeCurrentCo');
            const btnEdit = document.getElementById('btnEditUserCo');
            const btnPass = document.getElementById('btnPassUserCo');

            if (nameEl) nameEl.textContent = coUser.display_name;
            if (userEl) userEl.textContent = `@${coUser.username}`;
            if (badgeCurr) {
                const isCurrent = state.currentUser?.id === coUser.id || (state.currentUser?.username || '').toLowerCase() === 'co';
                badgeCurr.style.display = isCurrent ? 'inline-block' : 'none';
            }
            if (btnEdit) {
                btnEdit.onclick = () => openUserModal(coUser);
            }
            if (btnPass) {
                btnPass.onclick = () => openChangePasswordModal(coUser.id, coUser.username);
            }
        }

        const viewUsers = document.getElementById('view-users');
        if (viewUsers) refreshIcons(viewUsers);
    } catch (err) {
        console.error('Error loading users dashboard:', err);
    }
}
window.loadUsersDashboard = loadUsersDashboard;

function openUserModal(user = null) {
    const modal = document.getElementById('modalUser');
    if (!modal) return;

    const modalTitle = document.getElementById('userModalTitle');
    const modalId = document.getElementById('userModalId');
    const usernameInp = document.getElementById('userModalUsername');
    const displayInp = document.getElementById('userModalDisplayName');
    const roleSel = document.getElementById('userModalRole');
    const statusSel = document.getElementById('userModalIsActive');
    const passInp = document.getElementById('userModalPassword');
    const passReq = document.getElementById('userModalPassRequired');
    const passHint = document.getElementById('userModalPassHint');

    if (user) {
        if (modalId) modalId.value = user.id;
        if (modalTitle) {
            modalTitle.innerHTML = `
                <i data-lucide="edit-3" class="icon-sm" style="color: #2563EB;"></i>
                <span>تعديل بيانات الحساب (@${user.username})</span>
            `;
        }
        if (usernameInp) usernameInp.value = user.username;
        if (displayInp) displayInp.value = user.display_name;
        if (roleSel) roleSel.value = user.role;
        if (statusSel) statusSel.value = user.is_active ? '1' : '0';
        if (passInp) passInp.value = '';
        if (passReq) passReq.style.display = 'none';
        if (passHint) passHint.style.display = 'block';
    } else {
        if (modalId) modalId.value = '';
        if (modalTitle) {
            modalTitle.innerHTML = `
                <i data-lucide="user-plus" class="icon-sm" style="color: #2563EB;"></i>
                <span>إضافة مستخدم جديد للنظام</span>
            `;
        }
        if (usernameInp) usernameInp.value = '';
        if (displayInp) displayInp.value = '';
        if (roleSel) roleSel.value = 'cashier';
        if (statusSel) statusSel.value = '1';
        if (passInp) passInp.value = '';
        if (passReq) passReq.style.display = 'inline';
        if (passHint) passHint.style.display = 'none';
    }

    modal.classList.add('active');
    refreshIcons(modal);
}
window.openUserModal = openUserModal;

window.openUserModalById = (id) => {
    const user = cachedUsersList.find(u => u.id === Number(id));
    if (user) openUserModal(user);
};

async function handleUserSubmit() {
    const modalId = document.getElementById('userModalId')?.value;
    const username = (document.getElementById('userModalUsername')?.value || '').trim();
    const displayName = (document.getElementById('userModalDisplayName')?.value || '').trim();
    const role = document.getElementById('userModalRole')?.value || 'cashier';
    const isActive = document.getElementById('userModalIsActive')?.value === '1' ? 1 : 0;
    const password = document.getElementById('userModalPassword')?.value || '';

    if (!username) {
        alert('يرجى إدخال اسم المستخدم لتسجيل الدخول');
        document.getElementById('userModalUsername')?.focus();
        return;
    }
    if (!displayName) {
        alert('يرجى إدخال الاسم الظاهر للمستخدم');
        document.getElementById('userModalDisplayName')?.focus();
        return;
    }
    if (!modalId && !password) {
        alert('يرجى إدخال كلمة المرور للمستخدم');
        document.getElementById('userModalPassword')?.focus();
        return;
    }

    try {
        if (modalId) {
            const payload = { username, displayName, role, isActive };
            if (password) payload.password = password;
            const res = await window.api.updateUser(Number(modalId), payload, state.currentUser?.id);
            if (!res.success) {
                alert(`تعذر تحديث بيانات المستخدم: ${res.error}`);
                return;
            }
            alert(`تم حفظ وتحديث بيانات المستخدم "${username}" بنجاح.`);

            if (state.currentUser && Number(state.currentUser.id) === Number(modalId)) {
                state.currentUser.username = username;
                state.currentUser.display_name = displayName;
                state.currentUser.role = role;
                const headerUser = document.getElementById('headerUsername');
                if (headerUser) headerUser.textContent = displayName;
            }
        } else {
            const payload = { username, displayName, role, isActive, password };
            const res = await window.api.createUser(payload, state.currentUser?.id);
            if (!res.success) {
                alert(`تعذر إضافة المستخدم: ${res.error}`);
                return;
            }
            alert(`تم إنشاء حساب المستخدم "${username}" بنجاح.`);
        }

        document.getElementById('modalUser')?.classList.remove('active');
        await loadUsersDashboard();
    } catch (err) {
        console.error('Error saving user:', err);
        alert(`حدث خطأ أثناء حفظ المستخدم: ${err.message}`);
    }
}

function openChangePasswordModal(userId, username) {
    const modal = document.getElementById('modalChangeUserPassword');
    if (!modal) return;

    document.getElementById('changePassUserId').value = userId;
    document.getElementById('changePassTargetUsername').textContent = `@${username}`;
    document.getElementById('changePassNewInput').value = '';
    document.getElementById('changePassConfirmInput').value = '';

    modal.classList.add('active');
    refreshIcons(modal);
}
window.openChangePasswordModal = openChangePasswordModal;

async function handleSubmitChangePassword() {
    const userId = document.getElementById('changePassUserId')?.value;
    const newPass = document.getElementById('changePassNewInput')?.value;
    const confirmPass = document.getElementById('changePassConfirmInput')?.value;

    if (!newPass || newPass.length < 3) {
        alert('يرجى إدخال كلمة مرور جديدة لا تقل عن 3 أحرف');
        return;
    }
    if (newPass !== confirmPass) {
        alert('كلمتا المرور غير متطابقتين، يرجى التأكد وإعادة المحاولة');
        return;
    }

    try {
        const res = await window.api.changePassword(Number(userId), newPass, state.currentUser?.id);
        if (!res.success) {
            alert(`تعذر تغيير كلمة المرور: ${res.error}`);
            return;
        }
        alert('تم تغيير كلمة المرور بنجاح.');
        document.getElementById('modalChangeUserPassword')?.classList.remove('active');
    } catch (err) {
        console.error('Error changing password:', err);
        alert(`حدث خطأ: ${err.message}`);
    }
}

function bindUsersEvents() {
    const submitUserBtn = document.getElementById('btnSubmitUserModal');
    if (submitUserBtn) {
        submitUserBtn.onclick = handleUserSubmit;
    }

    const submitChangePassBtn = document.getElementById('btnSubmitChangePassword');
    if (submitChangePassBtn) {
        submitChangePassBtn.onclick = handleSubmitChangePassword;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindUsersEvents);
} else {
    bindUsersEvents();
}

/* ==========================================================================
 * SALARIES, PAYROLL DISBURSAL & EXPENSE CATEGORIES MODULE (مسير صرف الرواتب)
 * ========================================================================== */

function normalizeArabic(text) {
    if (!text) return '';
    return String(text)
        .trim()
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي');
}
window.normalizeArabic = normalizeArabic;

function formatPayrollCurrency(val) {
    return Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ج.م';
}
window.formatPayrollCurrency = formatPayrollCurrency;

function renderPayrollEmployeeOptions(selectEl, employees, paidSalariesMap, selectedId = null, filterQuery = '') {
    const query = normalizeArabic(filterQuery || '');
    selectEl.innerHTML = '<option value="">-- اختر الموظف للتسوية والصرف --</option>';

    const pendingList = [];
    const paidList = [];

    (employees || []).forEach(e => {
        const textToMatch = normalizeArabic(`${e.full_name} ${e.phone || ''} ${e.job_title || ''} ${e.branch || ''}`);
        if (!query || textToMatch.includes(query)) {
            if (paidSalariesMap && paidSalariesMap.has(Number(e.id))) {
                paidList.push(e);
            } else {
                pendingList.push(e);
            }
        }
    });

    if (pendingList.length > 0) {
        const pendingGroup = document.createElement('optgroup');
        pendingGroup.label = `⏳ عمال بانتظار صرف الراتب (${pendingList.length} عامل)`;
        pendingList.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e.id;
            const salary = Number(e.basic_salary ?? e.base_salary ?? 0).toLocaleString('en-US');
            opt.textContent = `⏳ [مستحق] ${e.full_name} (${e.job_title || e.role_title || 'موظف'}) - [${e.branch || 'المقر الرئيسي'}] - راتب: ${salary} ج.م`;
            if (selectedId && Number(selectedId) === Number(e.id)) opt.selected = true;
            pendingGroup.appendChild(opt);
        });
        selectEl.appendChild(pendingGroup);
    }

    if (paidList.length > 0) {
        const paidGroup = document.createElement('optgroup');
        paidGroup.label = `✅ عمال تم صرف الراتب لهم هذا الشهر (قبض الشهر ده - ${paidList.length} عامل)`;
        paidList.forEach(e => {
            const payment = paidSalariesMap.get(Number(e.id));
            const opt = document.createElement('option');
            opt.value = e.id;
            const vCode = payment?.voucher_code || `#PAY-${payment?.id || ''}`;
            const netPaid = Number(payment?.net_amount || payment?.amount || 0).toLocaleString('en-US');
            opt.textContent = `✅ [قبض الشهر ده] ${e.full_name} (${e.job_title || 'موظف'}) - تم صرف: ${netPaid} ج.م (${vCode})`;
            opt.style.color = '#15803D';
            opt.style.fontWeight = 'bold';
            opt.style.background = '#F0FDF4';
            if (selectedId && Number(selectedId) === Number(e.id)) opt.selected = true;
            paidGroup.appendChild(opt);
        });
        selectEl.appendChild(paidGroup);
    }

    if (pendingList.length === 0 && paidList.length === 0) {
        const emptyOpt = document.createElement('option');
        emptyOpt.disabled = true;
        emptyOpt.textContent = 'لا يوجد موظف مطابق للبحث';
        selectEl.appendChild(emptyOpt);
    }
}
window.renderPayrollEmployeeOptions = renderPayrollEmployeeOptions;

const salariesState = {
    periodMode: 'month',
    currentMonth: new Date().toISOString().slice(0, 7),
    startDate: '',
    endDate: '',
    employees: [],
    selectedEmployee: null,
    periodAdvances: { totalAdvances: 0, advancesList: [], count: 0 },
    currentSafeCash: 0,
    paymentsHistory: [],
    paidSalariesMap: new Map(),
    categories: [],
    activeTab: 'disburse'
};

function initSalariesDates() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    if (!salariesState.currentMonth) salariesState.currentMonth = `${y}-${m}`;
    if (!salariesState.startDate) salariesState.startDate = `${y}-${m}-01`;
    if (!salariesState.endDate) salariesState.endDate = `${y}-${m}-${d}`;
}

function switchSalariesTab(tab) {
    salariesState.activeTab = tab;
    const btnDisburse = document.getElementById('tabBtnPayrollDisburse');
    const btnCategories = document.getElementById('tabBtnPayrollCategories');
    const panelDisburse = document.getElementById('salariesTabPanelDisburse');
    const panelCategories = document.getElementById('salariesTabPanelCategories');

    if (btnDisburse && btnCategories && panelDisburse && panelCategories) {
        if (tab === 'disburse') {
            btnDisburse.classList.add('active');
            btnDisburse.style.borderBottom = '3px solid #10B981';
            btnDisburse.style.color = '#0F172A';
            btnCategories.classList.remove('active');
            btnCategories.style.borderBottom = '3px solid transparent';
            btnCategories.style.color = '#64748B';
            panelDisburse.style.display = 'flex';
            panelCategories.style.display = 'none';
        } else {
            btnCategories.classList.add('active');
            btnCategories.style.borderBottom = '3px solid #EA580C';
            btnCategories.style.color = '#0F172A';
            btnDisburse.classList.remove('active');
            btnDisburse.style.borderBottom = '3px solid transparent';
            btnDisburse.style.color = '#64748B';
            panelCategories.style.display = 'flex';
            panelDisburse.style.display = 'none';
            loadExpenseCategoriesAdmin();
        }
    }
}
window.switchSalariesTab = switchSalariesTab;

function setPayrollPeriodMode(mode) {
    salariesState.periodMode = mode;
    const btnMonth = document.getElementById('btnPeriodModeMonth');
    const btnRange = document.getElementById('btnPeriodModeRange');
    const monthWrap = document.getElementById('salariesMonthPickerWrap');
    const rangeWrap = document.getElementById('salariesRangePickerWrap');

    if (mode === 'month') {
        if (btnMonth) {
            btnMonth.classList.add('active');
            btnMonth.style.background = '#FFFFFF';
            btnMonth.style.color = '#0F172A';
            btnMonth.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
        }
        if (btnRange) {
            btnRange.classList.remove('active');
            btnRange.style.background = 'transparent';
            btnRange.style.color = '#64748B';
            btnRange.style.boxShadow = 'none';
        }
        if (monthWrap) monthWrap.style.display = 'flex';
        if (rangeWrap) rangeWrap.style.display = 'none';
    } else {
        if (btnRange) {
            btnRange.classList.add('active');
            btnRange.style.background = '#FFFFFF';
            btnRange.style.color = '#0F172A';
            btnRange.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
        }
        if (btnMonth) {
            btnMonth.classList.remove('active');
            btnMonth.style.background = 'transparent';
            btnMonth.style.color = '#64748B';
            btnMonth.style.boxShadow = 'none';
        }
        if (monthWrap) monthWrap.style.display = 'none';
        if (rangeWrap) rangeWrap.style.display = 'flex';
    }
    refreshSalariesView();
}
window.setPayrollPeriodMode = setPayrollPeriodMode;

function onPayrollMonthChange() {
    const val = document.getElementById('salariesMonthPicker')?.value;
    if (val) {
        salariesState.currentMonth = val;
        refreshSalariesView();
    }
}
window.onPayrollMonthChange = onPayrollMonthChange;

function onPayrollRangeChange() {
    const s = document.getElementById('salariesStartDate')?.value;
    const e = document.getElementById('salariesEndDate')?.value;
    if (s) salariesState.startDate = s;
    if (e) salariesState.endDate = e;
    if (s && e) {
        refreshSalariesView();
    }
}
window.onPayrollRangeChange = onPayrollRangeChange;

async function updateSalariesSafeBalance() {
    try {
        const res = await window.api.getTreasuryBalance();
        if (res && res.success && res.data) {
            salariesState.currentSafeCash = Number(res.data.current_balance ?? res.data.balance ?? 0);
        }
    } catch (e) {
        console.error('Error fetching safe balance for salaries:', e);
    }
}

async function loadSalariesView() {
    initSalariesDates();

    const monthPicker = document.getElementById('salariesMonthPicker');
    if (monthPicker) monthPicker.value = salariesState.currentMonth;

    const startPicker = document.getElementById('salariesStartDate');
    if (startPicker) startPicker.value = salariesState.startDate;

    const endPicker = document.getElementById('salariesEndDate');
    if (endPicker) endPicker.value = salariesState.endDate;

    await updateSalariesSafeBalance();
    await refreshSalariesView();
}
window.loadSalariesView = loadSalariesView;

async function refreshSalariesView() {
    initSalariesDates();
    await updateSalariesSafeBalance();

    const period = salariesState.periodMode === 'month'
        ? { type: 'month', month: salariesState.currentMonth }
        : { type: 'range', startDate: salariesState.startDate, endDate: salariesState.endDate };

    try {
        const [empRes, summaryRes, paymentsRes] = await Promise.all([
            window.api.listEmployees(),
            window.api.getPayrollSummary(period),
            window.api.listSalaryPayments(100, period, null)
        ]);

        // 1. Employees & Dropdown
        salariesState.employees = (empRes && empRes.success && Array.isArray(empRes.data))
            ? empRes.data.filter(e => e.is_active)
            : [];

        // Track who is paid in this period
        salariesState.paymentsHistory = (paymentsRes && paymentsRes.success && Array.isArray(paymentsRes.data))
            ? paymentsRes.data
            : [];

        // Build Map of paid employees for current period (payment_type === 'salary')
        salariesState.paidSalariesMap = new Map();
        salariesState.paymentsHistory.forEach(p => {
            if (p.payment_type === 'salary' || !p.payment_type) {
                const empId = Number(p.employee_id);
                if (!salariesState.paidSalariesMap.has(empId)) {
                    salariesState.paidSalariesMap.set(empId, p);
                }
            }
        });

        const paidEmpIds = new Set(salariesState.paidSalariesMap.keys());

        // Populate Dropdown with Distinct Badges & Optgroups
        const empSelect = document.getElementById('salariesEmployeeSelect');
        if (empSelect) {
            const currentSelected = salariesState.selectedEmployee?.id;
            const filterQuery = document.getElementById('salariesEmployeeSearchFilter')?.value || '';
            renderPayrollEmployeeOptions(empSelect, salariesState.employees, salariesState.paidSalariesMap, currentSelected, filterQuery);
        }

        // Quick Action Chips for Pending Employees
        const quickChipsWrap = document.getElementById('salariesQuickChips');
        if (quickChipsWrap) {
            const pending = salariesState.employees.filter(e => !paidEmpIds.has(Number(e.id)));
            if (pending.length === 0) {
                quickChipsWrap.innerHTML = '<span style="font-size: 11px; color: #10B981; font-weight: 700;">✓ تم صرف رواتب كافة الموظفين لهذه الفترة بالكامل</span>';
            } else {
                quickChipsWrap.innerHTML = pending.map(e => `
                    <button type="button" class="quick-action-chip" onclick="quickSelectPayrollEmployee(${e.id})" title="صرف راتب ${e.full_name}">
                        <span>${e.full_name}</span>
                        <span class="chip-val">${Number(e.basic_salary ?? e.base_salary ?? 0).toFixed(0)} ج.م</span>
                    </button>
                `).join('');
            }
        }

        // 2. Monthly KPIs
        const summary = (summaryRes && summaryRes.success && summaryRes.data) ? summaryRes.data : {
            totalBasic: 0,
            totalDisbursedNet: 0,
            totalAdvancesDeducted: 0,
            totalPenaltiesDeducted: 0,
            totalBonusesAdded: 0,
            disbursedEmployeesCount: 0
        };

        const kpiBasic = document.getElementById('salariesKpiBasicTotal');
        if (kpiBasic) kpiBasic.textContent = formatPayrollCurrency(summary.totalBasic);

        const kpiDisbursed = document.getElementById('salariesKpiDisbursedTotal');
        if (kpiDisbursed) kpiDisbursed.textContent = formatPayrollCurrency(summary.totalDisbursedNet);

        const kpiDeductions = document.getElementById('salariesKpiDeductionsTotal');
        if (kpiDeductions) kpiDeductions.textContent = formatPayrollCurrency(Number(summary.totalAdvancesDeducted || 0) + Number(summary.totalPenaltiesDeducted || 0));

        const kpiProgressText = document.getElementById('salariesKpiProgressText');
        const kpiStatusBadge = document.getElementById('salariesKpiStatusBadge');
        const totalEmpCount = salariesState.employees.length;
        const paidCount = paidEmpIds.size;

        if (kpiProgressText) kpiProgressText.textContent = `${paidCount} / ${totalEmpCount} موظف`;
        if (kpiStatusBadge) {
            if (paidCount === 0) {
                kpiStatusBadge.textContent = 'بانتظار البدء';
                kpiStatusBadge.style.background = '#F1F5F9';
                kpiStatusBadge.style.color = '#64748B';
            } else if (paidCount >= totalEmpCount && totalEmpCount > 0) {
                kpiStatusBadge.textContent = 'مكتمل بالكامل 100%';
                kpiStatusBadge.style.background = '#DCFCE7';
                kpiStatusBadge.style.color = '#15803D';
            } else {
                const pct = Math.round((paidCount / (totalEmpCount || 1)) * 100);
                kpiStatusBadge.textContent = `${pct}% قيد الصرف`;
                kpiStatusBadge.style.background = '#FEF3C7';
                kpiStatusBadge.style.color = '#92400E';
            }
        }

        // 3. History Table
        renderSalariesHistoryTable();

        // 4. Update selected employee advances if an employee is selected
        if (salariesState.selectedEmployee) {
            await onSelectPayrollEmployee(true);
        } else {
            recalcPayrollNet();
        }

        const panel = document.getElementById('view-salaries');
        if (panel) refreshIcons(panel);
    } catch (err) {
        console.error('Error refreshing salaries view:', err);
    }
}
window.refreshSalariesView = refreshSalariesView;

function renderSalariesHistoryTable() {
    const tbody = document.getElementById('salariesHistoryTableBody');
    if (!tbody) return;

    if (!salariesState.paymentsHistory || salariesState.paymentsHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 24px;">لا توجد سندات صرف رواتب مسجلة للفترة المحددة</td></tr>';
        return;
    }

    tbody.innerHTML = salariesState.paymentsHistory.map(p => {
        const vCode = p.voucher_code || `#PAY-${p.id}`;
        const channelLabel = p.payment_method === 'card' ? 'بطاقة فيزا' : p.payment_method === 'transfer' ? 'تحويل' : 'كاش نقدي';
        const deductSourceLabel = p.deduct_source === 'branch_safe' ? 'خزينة الفرع' : 'الخزينة الرئيسية';
        const totalDeductions = Number(p.advances_deducted || 0) + Number(p.penalties_deducted || 0);

        return `
            <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 10px 12px; font-family: monospace; font-weight: 800; color: #0F172A;">${vCode}</td>
                <td style="padding: 10px 12px;">
                    <div style="font-weight: 800; color: #1E293B;">${p.employee_name}</div>
                    <span style="font-size: 11px; color: #64748B;">${p.branch || 'المقر الرئيسي'}</span>
                </td>
                <td style="padding: 10px 12px; font-family: monospace; font-weight: 700; color: #475569;">${Number(p.basic_salary || p.amount).toFixed(2)} ج.م</td>
                <td style="padding: 10px 12px; font-family: monospace; font-weight: 700; color: #DC2626;">-${totalDeductions.toFixed(2)} ج.م</td>
                <td style="padding: 10px 12px; font-family: monospace; font-weight: 700; color: #0E7490;">+${Number(p.bonuses_added || 0).toFixed(2)} ج.م</td>
                <td style="padding: 10px 12px; font-family: monospace; font-weight: 900; color: #10B981; font-size: 13.5px;">${Number(p.amount || p.net_amount).toFixed(2)} ج.م</td>
                <td style="padding: 10px 12px;"><span style="font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: #F1F5F9; color: #334155;">${channelLabel}</span></td>
                <td style="padding: 10px 12px;"><span style="font-size: 11.5px; font-weight: 700; color: #0369A1;">${deductSourceLabel}</span></td>
                <td style="padding: 10px 12px; font-size: 12px; color: #475569;">${p.created_by_name || 'المدير'}</td>
                <td style="padding: 10px 12px; font-size: 11px; color: #64748B; font-family: monospace;">${(p.created_at || '').slice(0, 16)}</td>
                <td style="padding: 10px 12px; text-align: center;">
                    <button type="button" class="btn-payslip-gold" onclick="openOfficialPayslipModal(${p.id})" title="عرض وطباعة سند الصرف الرسمي">
                        <i data-lucide="receipt" class="icon-xs"></i>
                        <span>سند الصرف</span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    refreshIcons(tbody);
}

function quickSelectPayrollEmployee(empId) {
    const select = document.getElementById('salariesEmployeeSelect');
    if (select) {
        select.value = empId;
        onSelectPayrollEmployee();
    }
}
window.quickSelectPayrollEmployee = quickSelectPayrollEmployee;

function filterPayrollEmployeesDropdown() {
    const query = document.getElementById('salariesEmployeeSearchFilter')?.value || '';
    const select = document.getElementById('salariesEmployeeSelect');
    if (!select) return;
    renderPayrollEmployeeOptions(select, salariesState.employees, salariesState.paidSalariesMap, salariesState.selectedEmployee?.id, query);
}
window.filterPayrollEmployeesDropdown = filterPayrollEmployeesDropdown;

async function onSelectPayrollEmployee(preserveInputs = false) {
    const empId = Number(document.getElementById('salariesEmployeeSelect')?.value);
    const priorAlert = document.getElementById('salariesPriorPayoutAlert');

    if (!empId) {
        salariesState.selectedEmployee = null;
        salariesState.periodAdvances = { totalAdvances: 0, advancesList: [], count: 0 };
        if (priorAlert) priorAlert.style.display = 'none';
        document.getElementById('salariesCardBasicVal').textContent = '0.00 ج.م';
        document.getElementById('salariesCardAdvancesVal').textContent = '- 0.00 ج.م';
        document.getElementById('btnOpenAdvancesModal').textContent = '(0 حركة - عرض)';
        recalcPayrollNet();
        return;
    }

    const emp = salariesState.employees.find(e => Number(e.id) === empId);
    if (!emp) return;
    salariesState.selectedEmployee = emp;

    // Check if this employee already received salary this month/period
    const priorPayment = salariesState.paidSalariesMap ? salariesState.paidSalariesMap.get(empId) : null;
    if (priorAlert) {
        if (priorPayment) {
            priorAlert.style.display = 'flex';
            const titleEl = document.getElementById('salariesPriorPayoutAlertTitle');
            const detailsEl = document.getElementById('salariesPriorPayoutAlertDetails');
            const vCode = priorPayment.voucher_code || `#PAY-${priorPayment.id}`;
            const netPaid = Number(priorPayment.net_amount || priorPayment.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
            const paidDate = priorPayment.paid_at || priorPayment.created_at || '';
            const periodLabel = salariesState.periodMode === 'month' ? `شهر ${salariesState.currentMonth}` : `فترة ${salariesState.startDate} إلى ${salariesState.endDate}`;
            if (titleEl) {
                titleEl.innerHTML = `⚠️ تنبيه أمني لمنع الازدواجية: العامل (<b>${emp.full_name}</b>) استلم راتب ${periodLabel} بالفعل!`;
            }
            if (detailsEl) {
                detailsEl.innerHTML = `سند الصرف المعتمد: <b>${vCode}</b> | الصافي المصروف: <b>${netPaid} ج.م</b> | تاريخ وساعة الصرف: <b>${paidDate}</b> | (تم إيقاف زر الصرف منعاً لازدواجية الراتب).`;
            }
            refreshIcons(priorAlert);
        } else {
            priorAlert.style.display = 'none';
        }
    }

    // Fetch advances for the chosen period
    const period = salariesState.periodMode === 'month'
        ? { type: 'month', month: salariesState.currentMonth }
        : { type: 'range', startDate: salariesState.startDate, endDate: salariesState.endDate };

    try {
        const advRes = await window.api.getEmployeePeriodAdvances(emp.id, period);
        salariesState.periodAdvances = (advRes && advRes.success && advRes.data)
            ? advRes.data
            : { totalAdvances: 0, advancesList: [], count: 0 };
    } catch (e) {
        console.error('Error fetching period advances:', e);
        salariesState.periodAdvances = { totalAdvances: 0, advancesList: [], count: 0 };
    }

    // Update Basic
    const basic = Number(emp.basic_salary ?? emp.base_salary ?? 0);
    const basicEl = document.getElementById('salariesCardBasicVal');
    if (basicEl) basicEl.textContent = formatPayrollCurrency(basic);

    // Update Advances
    const advVal = Number(salariesState.periodAdvances.totalAdvances || 0);
    const advEl = document.getElementById('salariesCardAdvancesVal');
    if (advEl) advEl.textContent = '- ' + formatPayrollCurrency(advVal);

    const btnOpenAdv = document.getElementById('btnOpenAdvancesModal');
    if (btnOpenAdv) btnOpenAdv.textContent = `(${salariesState.periodAdvances.count || 0} حركة - عرض)`;

    // Reset inputs if not preserving
    if (!preserveInputs) {
        const penInp = document.getElementById('salariesInputPenalties');
        if (penInp) penInp.value = '0';
        const penRsn = document.getElementById('salariesInputPenaltyReason');
        if (penRsn) penRsn.value = '';

        const bonInp = document.getElementById('salariesInputBonuses');
        if (bonInp) bonInp.value = '0';
        const bonRsn = document.getElementById('salariesInputBonusReason');
        if (bonRsn) bonRsn.value = '';

        const notesInp = document.getElementById('salariesNotesInput');
        if (notesInp) notesInp.value = '';
    }

    // Branch radio label
    const branchLabel = document.getElementById('labelDeductBranchSafe');
    if (branchLabel) {
        branchLabel.textContent = emp.branch && emp.branch !== 'المقر الرئيسي'
            ? `خزينة فرع ${emp.branch}`
            : 'خزينة الفرع';
    }

    recalcPayrollNet();
}
window.onSelectPayrollEmployee = onSelectPayrollEmployee;

function recalcPayrollNet() {
    const emp = salariesState.selectedEmployee;
    const executeBtn = document.getElementById('btnExecuteSalaryPayout');
    const indicator = document.getElementById('salariesChannelSolvencyIndicator');
    const netEl = document.getElementById('salariesNetPayoutVal');
    const formulaEl = document.getElementById('salariesNetMathFormula');

    if (!emp) {
        if (netEl) netEl.textContent = '0.00 ج.م';
        if (formulaEl) formulaEl.textContent = 'الصافي = الأساسي (0.00) - السلف (0.00) - الخصم (0.00) + المكافأة (0.00)';
        if (indicator) {
            indicator.style.color = '#64748B';
            indicator.innerHTML = '<i data-lucide="info" class="icon-xs"></i><span>يرجى اختيار الموظف أولاً لعرض الحسابات والسيولة</span>';
            refreshIcons(indicator);
        }
        if (executeBtn) {
            executeBtn.disabled = true;
            executeBtn.style.opacity = '0.5';
            executeBtn.style.cursor = 'not-allowed';
            executeBtn.style.background = '#94A3B8';
            executeBtn.innerHTML = '<i data-lucide="check" class="icon-sm"></i><span>صرف الراتب وخصم من الخزينة</span>';
            refreshIcons(executeBtn);
        }
        return;
    }

    // Guard against duplicate payout
    const isAlreadyPaid = salariesState.paidSalariesMap && salariesState.paidSalariesMap.has(Number(emp.id));
    if (isAlreadyPaid) {
        if (indicator) {
            indicator.style.color = '#DC2626';
            indicator.innerHTML = `<i data-lucide="shield-alert" class="icon-xs" style="color: #DC2626;"></i><span>ممنوع الصرف: هذا العامل قبض راتب هذا الشهر مسبقاً لمنع التكرار</span>`;
            refreshIcons(indicator);
        }
        if (executeBtn) {
            executeBtn.disabled = true;
            executeBtn.style.opacity = '0.6';
            executeBtn.style.cursor = 'not-allowed';
            executeBtn.style.background = '#64748B';
            executeBtn.innerHTML = `<i data-lucide="shield-alert" class="icon-sm"></i><span>تم صرف راتب الشهر مسبقاً (ممنوع التكرار)</span>`;
            refreshIcons(executeBtn);
        }
        return;
    }

    if (executeBtn) {
        executeBtn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
        executeBtn.innerHTML = `<i data-lucide="check" class="icon-sm"></i><span>صرف الراتب وخصم من الخزينة</span>`;
    }

    const basic = Number(emp.basic_salary ?? emp.base_salary ?? 0);
    const advances = Number(salariesState.periodAdvances?.totalAdvances || 0);
    const penalties = Math.max(0, Number(document.getElementById('salariesInputPenalties')?.value || 0));
    const bonuses = Math.max(0, Number(document.getElementById('salariesInputBonuses')?.value || 0));

    const net = Math.max(0, basic - advances - penalties + bonuses);

    if (netEl) netEl.textContent = formatPayrollCurrency(net);
    if (formulaEl) {
        formulaEl.textContent = `الصافي = الأساسي (${basic.toFixed(2)}) - السلف (${advances.toFixed(2)}) - الخصم (${penalties.toFixed(2)}) + المكافأة (${bonuses.toFixed(2)}) = ${net.toFixed(2)} ج.م`;
    }

    const deductSource = document.querySelector('input[name="salariesDeductSource"]:checked')?.value || 'main_safe';
    const channel = document.querySelector('input[name="salariesChannel"]:checked')?.value || 'cash';
    const safeCash = Number(salariesState.currentSafeCash || 0);

    if (deductSource === 'main_safe' && channel === 'cash') {
        if (safeCash < net) {
            if (indicator) {
                indicator.style.color = '#DC2626';
                indicator.innerHTML = `<i data-lucide="alert-triangle" class="icon-xs" style="color: #DC2626;"></i><span>تنبيه: السيولة النقدية بالخزينة غير كافية لتغطية هذا الصافي</span>`;
                refreshIcons(indicator);
            }
            if (executeBtn) executeBtn.disabled = true;
        } else {
            if (indicator) {
                indicator.style.color = '#16A34A';
                indicator.innerHTML = `<i data-lucide="check-circle" class="icon-xs" style="color: #16A34A;"></i><span>حالة السيولة: جاهز للاعتماد والصرف من الخزينة</span>`;
                refreshIcons(indicator);
            }
            if (executeBtn) executeBtn.disabled = false;
        }
    } else if (deductSource === 'main_safe') {
        const channelName = channel === 'card' ? 'بطاقة فيزا' : 'تحويل بنكي / محفظة';
        if (indicator) {
            indicator.style.color = '#2563EB';
            indicator.innerHTML = `<i data-lucide="check-circle" class="icon-xs" style="color: #2563EB;"></i><span>قناة الصرف: ${channelName} من الحساب البنكي / الخزينة</span>`;
            refreshIcons(indicator);
        }
        if (executeBtn) executeBtn.disabled = false;
    } else {
        if (indicator) {
            indicator.style.color = '#0D9488';
            indicator.innerHTML = `<i data-lucide="building-2" class="icon-xs" style="color: #0D9488;"></i><span>جهة الخصم: خزينة فرع ${emp.branch || 'الفرع'}</span>`;
            refreshIcons(indicator);
        }
        if (executeBtn) executeBtn.disabled = false;
    }
}
window.recalcPayrollNet = recalcPayrollNet;

function onPayrollDeductSourceChange() {
    recalcPayrollNet();
}
window.onPayrollDeductSourceChange = onPayrollDeductSourceChange;

function onPayrollChannelChange() {
    recalcPayrollNet();
}
window.onPayrollChannelChange = onPayrollChannelChange;

function resetSalariesDisburseForm() {
    salariesState.selectedEmployee = null;
    salariesState.periodAdvances = { totalAdvances: 0, advancesList: [], count: 0 };

    const priorAlert = document.getElementById('salariesPriorPayoutAlert');
    if (priorAlert) priorAlert.style.display = 'none';

    const select = document.getElementById('salariesEmployeeSelect');
    if (select) select.value = '';

    const searchInp = document.getElementById('salariesEmployeeSearchFilter');
    if (searchInp) {
        searchInp.value = '';
        filterPayrollEmployeesDropdown();
    }

    const basicEl = document.getElementById('salariesCardBasicVal');
    if (basicEl) basicEl.textContent = '0.00 ج.م';

    const advEl = document.getElementById('salariesCardAdvancesVal');
    if (advEl) advEl.textContent = '- 0.00 ج.م';

    const btnOpenAdv = document.getElementById('btnOpenAdvancesModal');
    if (btnOpenAdv) btnOpenAdv.textContent = '(0 حركة - عرض)';

    const penInp = document.getElementById('salariesInputPenalties');
    if (penInp) penInp.value = '0';
    const penRsn = document.getElementById('salariesInputPenaltyReason');
    if (penRsn) penRsn.value = '';

    const bonInp = document.getElementById('salariesInputBonuses');
    if (bonInp) bonInp.value = '0';
    const bonRsn = document.getElementById('salariesInputBonusReason');
    if (bonRsn) bonRsn.value = '';

    const notesInp = document.getElementById('salariesNotesInput');
    if (notesInp) notesInp.value = '';

    const radioMainSafe = document.querySelector('input[name="salariesDeductSource"][value="main_safe"]');
    if (radioMainSafe) radioMainSafe.checked = true;

    const radioCash = document.querySelector('input[name="salariesChannel"][value="cash"]');
    if (radioCash) radioCash.checked = true;

    const branchLabel = document.getElementById('labelDeductBranchSafe');
    if (branchLabel) branchLabel.textContent = 'خزينة الفرع';

    recalcPayrollNet();
}
window.resetSalariesDisburseForm = resetSalariesDisburseForm;

async function confirmExecuteSalaryPayout() {
    const emp = salariesState.selectedEmployee;
    if (!emp) {
        alert('يرجى اختيار الموظف أولاً');
        return;
    }

    const isAlreadyPaid = salariesState.paidSalariesMap && salariesState.paidSalariesMap.has(Number(emp.id));
    if (isAlreadyPaid) {
        const prior = salariesState.paidSalariesMap.get(Number(emp.id));
        const vCode = prior?.voucher_code || `#PAY-${prior?.id}`;
        alert(`⚠️ تنبيه حرج لمنع التكرار: العامل (${emp.full_name}) استلم راتب هذا الشهر بالفعل بالسند (${vCode})!\nلا يمكن صرف الراتب مرتين لنفس الشهر منعاً للازدواجية المالية.`);
        return;
    }

    const basic = Number(emp.basic_salary ?? emp.base_salary ?? 0);
    const advances = Number(salariesState.periodAdvances?.totalAdvances || 0);
    const penalties = Math.max(0, Number(document.getElementById('salariesInputPenalties')?.value || 0));
    const penaltyReason = document.getElementById('salariesInputPenaltyReason')?.value?.trim() || '';
    const bonuses = Math.max(0, Number(document.getElementById('salariesInputBonuses')?.value || 0));
    const bonusReason = document.getElementById('salariesInputBonusReason')?.value?.trim() || '';
    const net = Math.max(0, basic - advances - penalties + bonuses);

    const deductSource = document.querySelector('input[name="salariesDeductSource"]:checked')?.value || 'main_safe';
    const channel = document.querySelector('input[name="salariesChannel"]:checked')?.value || 'cash';
    const notes = document.getElementById('salariesNotesInput')?.value?.trim() || '';

    const channelArabic = channel === 'card' ? 'فيزا (بطاقة)' : channel === 'transfer' ? 'تحويل بنكي / محفظة' : 'كاش نقدية';
    const sourceArabic = deductSource === 'branch_safe' ? `خزينة فرع ${emp.branch || 'الفرع'}` : 'الخزينة الرئيسية للمقر';

    const confirmMsg = `تأكيد صرف راتب وتسوية مستحقات:\n\n` +
        `• الموظف: ${emp.full_name} (${emp.branch || 'المقر الرئيسي'})\n` +
        `• الراتب الأساسي: ${basic.toFixed(2)} ج.م\n` +
        `• مسحوبات وسلف الـ POS المستقطعة: -${advances.toFixed(2)} ج.م\n` +
        `• الجزاءات والخصومات: -${penalties.toFixed(2)} ج.م ${penaltyReason ? `(${penaltyReason})` : ''}\n` +
        `• المكافآت والحوافز: +${bonuses.toFixed(2)} ج.م ${bonusReason ? `(${bonusReason})` : ''}\n` +
        `─────────────────────\n` +
        `• صافي المنصرف: ${net.toFixed(2)} ج.م\n` +
        `• قناة الصرف: ${channelArabic}\n` +
        `• جهة الخصم: ${sourceArabic}\n\n` +
        `هل تود المتابعة واعتماد سند الصرف وتوثيقه محاسبياً؟`;

    if (!confirm(confirmMsg)) return;

    const payload = {
        employeeId: emp.id,
        employee_id: emp.id,
        periodType: salariesState.periodMode,
        period_type: salariesState.periodMode,
        periodMonth: salariesState.currentMonth,
        period_month: salariesState.currentMonth,
        periodStart: salariesState.startDate,
        period_start: salariesState.startDate,
        periodEnd: salariesState.endDate,
        period_end: salariesState.endDate,
        basicSalary: basic,
        basic_salary: basic,
        advancesDeducted: advances,
        advances_deducted: advances,
        penaltiesDeducted: penalties,
        penalties_deducted: penalties,
        penaltyReason: penaltyReason,
        penalty_reason: penaltyReason,
        bonusesAdded: bonuses,
        bonuses_added: bonuses,
        bonusReason: bonusReason,
        bonus_reason: bonusReason,
        amount: net,
        netAmount: net,
        net_amount: net,
        paymentMethod: channel,
        payment_method: channel,
        channel: channel,
        deductSource: deductSource,
        deduct_source: deductSource,
        notes: notes,
        userId: state.currentUser?.id,
        created_by: state.currentUser?.id
    };

    try {
        const res = await window.api.disburseSalary(payload);
        if (!res.success) {
            alert(`تعذر صرف الراتب: ${res.error}`);
            return;
        }

        const empName = emp.full_name;
        const vCode = res.data?.voucher_code || `#PAY-${res.data?.id}`;
        const netFormatted = formatPayrollCurrency(net);
        const payoutId = res.data?.id;

        // 1. Reset the form back to initial fresh state
        resetSalariesDisburseForm();
        // 2. Refresh the view (removes paid employee from pending chips, updates history & KPIs)
        await refreshSalariesView();

        // 3. User feedback: confirmation with "تمام" and optional receipt view
        const openPayslip = confirm(`تمام! تم صرف راتب (${empName}) بنجاح.\n\n• رقم سند الصرف الرسمي: ${vCode}\n• صافي المبلغ المصروف: ${netFormatted}\n\nهل تريد فتح وطباعة سند القبض الرسمي الآن؟`);
        if (openPayslip && payoutId) {
            openOfficialPayslipModal(payoutId);
        }
    } catch (err) {
        console.error('Error executing salary payout:', err);
        alert(`حدث خطأ أثناء تنفيذ الصرف: ${err.message}`);
    }
}
window.confirmExecuteSalaryPayout = confirmExecuteSalaryPayout;

function openPayrollAdvancesModal() {
    const modal = document.getElementById('modalPayrollAdvances');
    if (!modal) return;

    const emp = salariesState.selectedEmployee;
    const sub = document.getElementById('advancesModalSubtitle');
    if (sub) {
        sub.textContent = emp
            ? `المسحوبات المسجلة للموظف: ${emp.full_name} (${salariesState.periodAdvances.count || 0} حركة)`
            : 'سحب ونثريات المسجلة من نقاط البيع';
    }

    const totalEl = document.getElementById('advancesModalTotalVal');
    if (totalEl) totalEl.textContent = formatPayrollCurrency(salariesState.periodAdvances.totalAdvances || 0);

    const tbody = document.getElementById('advancesModalTableBody');
    if (tbody) {
        const list = salariesState.periodAdvances.advancesList || [];
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748B; padding: 18px;">لا توجد سلف أو مسحوبات مسجلة خلال الفترة</td></tr>';
        } else {
            tbody.innerHTML = list.map(item => `
                <tr style="border-bottom: 1px solid #F1F5F9;">
                    <td style="padding: 8px 10px; font-family: monospace;">${(item.created_at || '').slice(0, 16)}</td>
                    <td style="padding: 8px 10px; font-family: monospace; font-weight: 700; color: #0F172A;">${item.voucher_code || ('#EXP-' + item.id)}</td>
                    <td style="padding: 8px 10px; font-weight: 700; color: #64748B;">${item.subcategory || item.category || 'سلفة بائع'}</td>
                    <td style="padding: 8px 10px;">${item.description || '-'}</td>
                    <td style="padding: 8px 10px; text-align: left; font-family: monospace; font-weight: 800; color: #DC2626;">-${Number(item.amount).toFixed(2)} ج.م</td>
                </tr>
            `).join('');
        }
    }

    modal.style.display = 'flex';
    refreshIcons(modal);
}
window.openPayrollAdvancesModal = openPayrollAdvancesModal;

function closePayrollAdvancesModal() {
    const modal = document.getElementById('modalPayrollAdvances');
    if (modal) modal.style.display = 'none';
}
window.closePayrollAdvancesModal = closePayrollAdvancesModal;

function openOfficialPayslipModal(paymentId) {
    const modal = document.getElementById('modalOfficialPayslip');
    if (!modal) return;

    const payment = (salariesState.paymentsHistory || []).find(p => Number(p.id) === Number(paymentId));
    if (!payment) {
        alert('تعذر العثور على بيانات سند الصرف المحدد');
        return;
    }

    const vCode = payment.voucher_code || `#PAY-${payment.id}`;
    document.getElementById('payslipModalVoucherCode').textContent = vCode;
    document.getElementById('payslipPrintDocDate').textContent = `التاريخ: ${(payment.created_at || '').slice(0, 16)}`;
    document.getElementById('payslipPrintDocMonth').textContent = `عن فترة: ${payment.period_month || payment.month_period || (payment.period_start + ' إلى ' + payment.period_end) || '-'}`;

    document.getElementById('payslipEmpName').textContent = payment.employee_name;
    document.getElementById('payslipEmpTitle').textContent = payment.job_title || payment.role_title || 'موظف مبيعات';
    document.getElementById('payslipEmpBranch').textContent = payment.branch || 'المقر الرئيسي';

    const chText = payment.payment_method === 'card' ? 'فيزا (بطاقة إلكترونية)' : payment.payment_method === 'transfer' ? 'تحويل بنكي / محفظة' : 'كاش نقدي';
    document.getElementById('payslipChannel').textContent = chText;

    const srcText = payment.deduct_source === 'branch_safe' ? `خزينة فرع ${payment.branch || 'الفرع'}` : 'الخزينة المركزية للمقر';
    document.getElementById('payslipDeductSource').textContent = srcText;
    document.getElementById('payslipApprover').textContent = payment.created_by_name || 'المدير العام';

    const basicVal = Number(payment.basic_salary || payment.amount || 0);
    document.getElementById('payslipRowBasic').textContent = formatPayrollCurrency(basicVal);

    const bonusVal = Number(payment.bonuses_added || 0);
    document.getElementById('payslipRowBonusVal').textContent = '+ ' + formatPayrollCurrency(bonusVal);
    document.getElementById('payslipRowBonusReason').textContent = payment.bonus_reason || (bonusVal > 0 ? 'مكافأة تميز' : 'لا يوجد');

    const advVal = Number(payment.advances_deducted || 0);
    document.getElementById('payslipRowAdvancesVal').textContent = '- ' + formatPayrollCurrency(advVal);

    const penVal = Number(payment.penalties_deducted || 0);
    document.getElementById('payslipRowPenaltyVal').textContent = '- ' + formatPayrollCurrency(penVal);
    document.getElementById('payslipRowPenaltyReason').textContent = payment.penalty_reason || (penVal > 0 ? 'خصم إداري' : 'لا يوجد');

    const netVal = Number(payment.amount || payment.net_amount || 0);
    document.getElementById('payslipNetTotalBox').textContent = formatPayrollCurrency(netVal);

    modal.style.display = 'flex';
    refreshIcons(modal);
}
window.openOfficialPayslipModal = openOfficialPayslipModal;

function closeOfficialPayslipModal() {
    const modal = document.getElementById('modalOfficialPayslip');
    if (modal) modal.style.display = 'none';
}
window.closeOfficialPayslipModal = closeOfficialPayslipModal;

function printOfficialPayslipDocument() {
    const container = document.getElementById('printablePayslipDocument');
    if (!container) return;

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>سند صرف راتب رسمي</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
            <style>
                * { box-sizing: border-box; }
                body {
                    margin: 0;
                    padding: 24px;
                    font-family: 'Cairo', 'Tajawal', sans-serif;
                    background: #FFFFFF;
                    color: #0F172A;
                    direction: rtl;
                }
                @media print {
                    @page { margin: 1cm; size: A5 landscape; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            ${container.outerHTML}
        </body>
        </html>
    `;

    printHtmlViaIframe(htmlContent);
}
window.printOfficialPayslipDocument = printOfficialPayslipDocument;

function exportPayrollToExcel() {
    if (!salariesState.paymentsHistory || salariesState.paymentsHistory.length === 0) {
        alert('لا توجد بيانات مسجلة للتصدير في الفترة المحددة');
        return;
    }

    const headers = [
        'كود السند',
        'اسم الموظف',
        'المسمى الوظيفي',
        'الفرع',
        'الراتب الأساسي',
        'السلف المستقطعة',
        'الخصومات والجزاءات',
        'سبب الخصم',
        'المكافآت والحوافز',
        'سبب المكافأة',
        'صافي المبلغ المنصرف',
        'طريقة وقناة الصرف',
        'جهة الخصم المالي',
        'معتمد الصرف',
        'تاريخ ووقت الصرف',
        'الملاحظات'
    ];

    const escapeCsv = (val) => {
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
    };

    const rows = salariesState.paymentsHistory.map(p => {
        const vCode = p.voucher_code || `#PAY-${p.id}`;
        const ch = p.payment_method === 'card' ? 'فيزا' : p.payment_method === 'transfer' ? 'تحويل' : 'كاش';
        const src = p.deduct_source === 'branch_safe' ? 'خزينة الفرع' : 'الخزينة الرئيسية';

        return [
            escapeCsv(vCode),
            escapeCsv(p.employee_name),
            escapeCsv(p.job_title || p.role_title || 'موظف'),
            escapeCsv(p.branch || 'المقر الرئيسي'),
            escapeCsv(Number(p.basic_salary || p.amount).toFixed(2)),
            escapeCsv(Number(p.advances_deducted || 0).toFixed(2)),
            escapeCsv(Number(p.penalties_deducted || 0).toFixed(2)),
            escapeCsv(p.penalty_reason || ''),
            escapeCsv(Number(p.bonuses_added || 0).toFixed(2)),
            escapeCsv(p.bonus_reason || ''),
            escapeCsv(Number(p.amount || p.net_amount).toFixed(2)),
            escapeCsv(ch),
            escapeCsv(src),
            escapeCsv(p.created_by_name || ''),
            escapeCsv(p.created_at || ''),
            escapeCsv(p.notes || '')
        ].join(',');
    });

    const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const periodLabel = salariesState.periodMode === 'month' ? salariesState.currentMonth : `${salariesState.startDate}_${salariesState.endDate}`;
    link.download = `كشف_مسير_الرواتب_${periodLabel}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
window.exportPayrollToExcel = exportPayrollToExcel;

const COMMON_EXPENSE_PRESETS = [
    'ضيافة وبوفيه',
    'أدوات نظافة',
    'صيانة دورية',
    'فواتير ومرافق (كهرباء/مياه)',
    'نثريات ومهمات مكتبية',
    'إكراميات ونقل'
];

async function loadExpenseCategoriesAdmin() {
    try {
        const res = await window.api.getExpenseCategories();
        salariesState.categories = (res && res.success && Array.isArray(res.data)) ? res.data : [];

        // Count badge
        const badge = document.getElementById('activeCatsCountBadge');
        if (badge) badge.textContent = `${salariesState.categories.length} بنود`;

        // Render Presets
        const presetsWrap = document.getElementById('expenseCatPresetsWrap');
        if (presetsWrap) {
            presetsWrap.innerHTML = COMMON_EXPENSE_PRESETS.map(preset => {
                const exists = salariesState.categories.some(c => c.name.trim().toLowerCase() === preset.trim().toLowerCase());
                if (exists) {
                    return `
                        <div class="expense-preset-chip" style="background: #ECFDF5; border: 1.5px solid #A7F3D0; color: #047857; cursor: default;">
                            <i data-lucide="check" class="icon-xs" style="color: #10B981;"></i>
                            <span>${preset} (مضاف)</span>
                        </div>
                    `;
                } else {
                    return `
                        <button type="button" class="expense-preset-chip" onclick="submitAddNewExpenseCategory('${preset}')" title="إضافة سريعة لبند ${preset}">
                            <i data-lucide="plus" class="icon-xs" style="color: #EA580C;"></i>
                            <span>+ ${preset}</span>
                        </button>
                    `;
                }
            }).join('');
        }

        // Render Tags Cloud
        renderExpenseCategoriesTagsCloud();
        refreshIcons(document.getElementById('salariesTabPanelCategories'));
    } catch (e) {
        console.error('Error loading expense categories admin:', e);
    }
}
window.loadExpenseCategoriesAdmin = loadExpenseCategoriesAdmin;

function renderExpenseCategoriesTagsCloud() {
    const cloud = document.getElementById('expenseCatsTagsCloud');
    if (!cloud) return;

    const query = normalizeArabic(document.getElementById('inputSearchExpenseCats')?.value || '');
    const filtered = salariesState.categories.filter(c => {
        if (!query) return true;
        return normalizeArabic(c.name).includes(query);
    });

    if (filtered.length === 0) {
        cloud.innerHTML = '<div style="color: #94A3B8; font-size: 13px; padding: 10px;">لا توجد بنود مصروفات تطابق البحث</div>';
        return;
    }

    cloud.innerHTML = filtered.map(c => `
        <div class="expense-cat-tag">
            <span class="cat-name">${c.name}</span>
            <button type="button" class="cat-del-btn" onclick="handleDeleteExpenseCategory('${c.id || c.name}', '${c.name}')" title="حذف بند المصروف">
                <i data-lucide="x" class="icon-xs"></i>
            </button>
        </div>
    `).join('');

    refreshIcons(cloud);
}

function filterExpenseCategoriesTags() {
    renderExpenseCategoriesTagsCloud();
}
window.filterExpenseCategoriesTags = filterExpenseCategoriesTags;

async function submitAddNewExpenseCategory(presetName = null) {
    let name = presetName;
    if (!name) {
        const input = document.getElementById('inputNewExpenseCatName');
        name = input ? input.value.trim() : '';
    }

    if (!name) {
        alert('يرجى كتابة اسم بند المصروف المراد إضافته');
        return;
    }

    try {
        const res = await window.api.addExpenseCategory(name);
        if (!res.success) {
            alert(`تعذر إضافة البند: ${res.error}`);
            return;
        }

        const input = document.getElementById('inputNewExpenseCatName');
        if (input) input.value = '';

        await loadExpenseCategoriesAdmin();
        if (typeof populateExpenseCategories === 'function') {
            await populateExpenseCategories();
        }
    } catch (e) {
        console.error('Error adding expense category:', e);
        alert(`حدث خطأ: ${e.message}`);
    }
}
window.submitAddNewExpenseCategory = submitAddNewExpenseCategory;

async function handleDeleteExpenseCategory(catIdOrName, catDisplayName) {
    if (!confirm(`هل أنت متأكد من حذف بند المصروف "${catDisplayName || catIdOrName}" من المنظومة؟`)) {
        return;
    }

    try {
        const res = await window.api.deleteExpenseCategory(catIdOrName);
        if (!res.success) {
            alert(`تعذر حذف البند: ${res.error}`);
            return;
        }

        await loadExpenseCategoriesAdmin();
        if (typeof populateExpenseCategories === 'function') {
            await populateExpenseCategories();
        }
    } catch (e) {
        console.error('Error deleting expense category:', e);
        alert(`حدث خطأ أثناء الحذف: ${e.message}`);
    }
}
window.handleDeleteExpenseCategory = handleDeleteExpenseCategory;



