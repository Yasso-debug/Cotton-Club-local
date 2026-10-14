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
        searchProducts: (query, limit) => rpc('pos/search-products', { query, limit }),
        findProductByBarcode: (barcode) => rpc('pos/find-barcode', { barcode }),
        searchCustomers: (query, limit) => rpc('pos/search-customers', { query, limit }),
        quickCreateCustomer: (data) => rpc('pos/quick-create-customer', data),
        getDrawerCash: (sessionId) => rpc('pos/get-drawer-cash', { sessionId }),
        checkout: (saleData) => rpc('pos/checkout', saleData),
        getInvoice: (id) => rpc('pos/get-invoice', { id }),
        voidInvoice: (invoiceId, managerUserId, reason) => rpc('pos/void-invoice', { invoiceId, managerUserId, reason }),
        listRecentInvoices: (limit) => rpc('pos/list-recent', { limit }),
        getInvoicesDashboard: (filters) => rpc('pos/invoices-dashboard', filters || {}),
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
        updateSettings: (settingsMap, userId) => rpc('settings/update', { settingsMap, userId }),
        // Treasury (الخزنة المركزية)
        getTreasuryBalance: () => rpc('treasury/balance'),
        treasuryDeposit: (data, userId) => rpc('treasury/deposit', { data, userId }),
        treasuryWithdraw: (data, userId) => rpc('treasury/withdraw', { data, userId }),
        transferShiftToTreasury: (sessionId, amount, userId) => rpc('treasury/transfer-shift', { sessionId, amount, userId }),
        listTreasuryTransactions: (limit) => rpc('treasury/list-transactions', { limit }),
        // Payroll & Staff (الموظفين والمرتبات)
        listEmployees: (activeOnly) => rpc('payroll/list-employees', { activeOnly }),
        getStaffKpis: () => rpc('payroll/staff-kpis'),
        toggleEmployeeStatus: (id, userId) => rpc('payroll/toggle-employee-status', { id, userId }),
        createEmployee: (data, userId) => rpc('payroll/create-employee', { data, userId }),
        updateEmployee: (id, data, userId) => rpc('payroll/update-employee', { id, data, userId }),
        deleteEmployee: (id, userId) => rpc('payroll/delete-employee', { id, userId }),
        disburseSalary: (data, userId) => rpc('payroll/disburse-salary', { data, userId }),
        listSalaryPayments: (limit) => rpc('payroll/list-salary-payments', { limit })
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
    bindLoginPageEvents();
    bindNavigation();
    bindKeyboardShortcuts();
    bindModals();
    bindPosEvents();
    bindSessionEvents();
    bindInventoryEvents();
    bindStockAuditEvents();
    bindTreasuryEvents();
    bindStaffEvents();
    bindUsersEvents();
    bindExpenseEvents();
    bindPurchasesEvents();
    bindPurchaseInvoicesEvents();
    bindBarcodePrintEvents();
    bindPurchaseReturnsEvents();
    bindSettingsEvents();
    bindReportEvents();

    // Initial Lucide Icon Rendering
    refreshIcons();
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
        const userNameEl = document.getElementById('headerUserName');
        if (userNameEl) userNameEl.innerText = state.currentUser.displayName;
        const userRoleEl = document.getElementById('headerUserRole');
        if (userRoleEl) userRoleEl.innerText = isAdmin ? 'مدير عام' : 'مسؤول مبيعات (Sales)';

        // Role-based sidebar menu isolation (Cashier sees only POS, Session, Expenses, and Hub)
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? 'flex' : 'none';
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

        await loadSettings();
        await refreshSessionState();
        await loadPosProducts();

        // Switch to Hub landing page with role-tailored hover cards
        switchView('hub');
    } catch (err) {
        errorEl.innerText = err.message;
        errorEl.style.display = 'block';
    }
}

document.getElementById('btnLogout').addEventListener('click', () => {
    state.currentUser = null;
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

async function refreshSessionState() {
    try {
        const res = await window.api.getActiveSession();
        state.activeSession = res.data;

        const indicator = document.getElementById('sessionIndicator');
        const text = document.getElementById('sessionStatusText');
        const openPrompt = document.getElementById('btnOpenSessionPrompt');
        const closePrompt = document.getElementById('btnCloseSessionPrompt');

        if (state.activeSession) {
            if (indicator) indicator.className = 'session-indicator open';
            if (text) text.innerText = `وردية مفتوحة (${state.activeSession.session_code})`;
            if (openPrompt) openPrompt.style.display = 'none';
            if (closePrompt) closePrompt.style.display = 'inline-block';
            await loadSessionDashboard();
        } else {
            if (indicator) indicator.className = 'session-indicator closed';
            if (text) text.innerText = 'الوردية مغلقة (يجب فتح وردية للبيع)';
            if (openPrompt) openPrompt.style.display = 'inline-block';
            if (closePrompt) closePrompt.style.display = 'none';
        }
    } catch (err) {
        console.error('Session check failed:', err);
    }
}

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
                <div class="sales-card-badge">F1: اختصار سريع</div>
                <div class="sales-card-icon-wrap">
                    <i data-lucide="shopping-cart"></i>
                </div>
                <h3 class="sales-card-title">نقطة البيع المباشر</h3>
                <p class="sales-card-desc">مسح باركود الملابس، إصدار فواتير نقدية وشبكة، وتطبيق الخصومات الفورية</p>
                <div class="sales-card-btn">
                    <span>دخول شاشة البيع (F1)</span>
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
                countBadge: '3 أقسام',
                actions: [
                    {
                        view: 'sales-hub',
                        subTab: 'session',
                        theme: 'theme-session',
                        icon: 'calendar-check',
                        title: 'اليومية',
                        desc: 'متابعة نقدية الدرج، تقفيل الوردية، وتصفية السجلات السابقة'
                    },
                    {
                        view: 'sales-analytics',
                        theme: 'theme-reports',
                        icon: 'trending-up',
                        title: 'تحليلات المبيعات',
                        desc: 'مؤشرات الأداء، الأرباح التقديرية، وأداء مسؤولي المبيعات'
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
                        view: 'financial-hub',
                        subTab: 'salaries',
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
function switchSalesTab(tabName) {
    const isSession = tabName === 'session';
    const isAnalytics = tabName === 'analytics';
    const isSettings = tabName === 'settings';

    const tabBtnSes = document.getElementById('tabBtnSalesSession');
    const tabBtnAna = document.getElementById('tabBtnSalesAnalytics');
    const tabBtnSet = document.getElementById('tabBtnSalesSettings');

    const panelSes = document.getElementById('panel-sales-session');
    const panelAna = document.getElementById('panel-sales-analytics');
    const panelSet = document.getElementById('panel-sales-settings');

    const anaControls = document.getElementById('salesAnalyticsHeaderControls');

    if (tabBtnSes) tabBtnSes.classList.toggle('active', isSession);
    if (tabBtnAna) tabBtnAna.classList.toggle('active', isAnalytics);
    if (tabBtnSet) tabBtnSet.classList.toggle('active', isSettings);

    if (panelSes) panelSes.classList.toggle('active', isSession);
    if (panelAna) panelAna.classList.toggle('active', isAnalytics);
    if (panelSet) panelSet.classList.toggle('active', isSettings);

    if (anaControls) anaControls.style.display = isAnalytics ? 'flex' : 'none';

    if (isSession) {
        loadSessionDashboard();
    } else if (isAnalytics) {
        switchView('sales-analytics');
    } else if (isSettings) {
        switchView('sales-settings');
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
    // Map legacy alias views to unified workspace hubs
    if (viewName === 'session') {
        viewName = 'sales-hub';
        subTab = subTab || 'session';
    } else if (viewName === 'reports' || viewName === 'sales-analytics') {
        viewName = 'sales-analytics';
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
        loadExpensesView();
    } else if (viewName === 'employees') {
        loadEmployeesDashboard();
    } else if (viewName === 'users') {
        loadUsersDashboard();
    }

    const activePanel = document.getElementById(`view-${viewName}`);
    if (activePanel) refreshIcons(activePanel);
}

// Expose switchView globally for inline event handlers and external hooks
window.switchView = switchView;

function bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
        // Modal active - allow ESC to close
        const activeModal = document.querySelector('.modal-overlay.active:not(#modalLogin)');
        if (e.key === 'Escape') {
            if (activeModal) {
                activeModal.classList.remove('active');
                return;
            }
            // If in dedicated new purchase invoice view, return to purchase invoices list
            const isNewPurchaseActive = document.getElementById('view-new-purchase-invoice')?.classList.contains('active');
            if (isNewPurchaseActive) {
                e.preventDefault();
                switchView('purchases-invoices');
                return;
            }
            // If in dedicated new product view, return to inventory catalog items list
            const isNewProductActive = document.getElementById('view-new-product')?.classList.contains('active');
            if (isNewProductActive) {
                e.preventDefault();
                switchView('inventory-hub', 'items');
                return;
            }
            // If logged in and on any view other than hub, return to Hub
            const loginScreen = document.getElementById('loginScreen');
            const isLoginVisible = loginScreen && loginScreen.style.display !== 'none';
            if (state.currentUser && !isLoginVisible) {
                const activeView = document.querySelector('.view-panel.active');
                if (activeView && activeView.id !== 'view-hub') {
                    e.preventDefault();
                    switchView('hub');
                    return;
                }
            }
        }

        // F11: Add line item in new purchase invoice, or open new purchase invoice if in invoices list
        if (e.key === 'F11' || e.code === 'F11') {
            e.preventDefault();
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
        }

        // F1: Focus Search (Purchase Quick Search in new purchase, List Search in purchases list, or Barcode in POS)
        if (e.key === 'F1' || e.code === 'F1') {
            e.preventDefault();
            const isNewPurchaseActive = document.getElementById('view-new-purchase-invoice')?.classList.contains('active');
            const isInvoicesListActive = document.getElementById('view-purchases-invoices')?.classList.contains('active');
            const isPosActive = document.getElementById('view-pos')?.classList.contains('active');

            if (isNewPurchaseActive) {
                const quickSearch = document.getElementById('newPurchaseQuickSearchInput');
                if (quickSearch) {
                    quickSearch.focus();
                    quickSearch.select();
                } else {
                    const lastIdx = Math.max(0, (newPurchaseViewCart || []).length - 1);
                    const barInp = document.getElementById(`rowBarcode_${lastIdx}`);
                    if (barInp) {
                        barInp.focus();
                        barInp.select();
                    }
                }
                return;
            }

            if (isInvoicesListActive) {
                const searchInp = document.getElementById('purchaseInvoiceSearchInput');
                if (searchInp) {
                    searchInp.focus();
                    searchInp.select();
                }
                return;
            }

            if (isPosActive) {
                openCategoryProductLookup();
                return;
            }
        }

        // F4 / F10: Confirm purchase invoice if new purchase invoice view is active
        const isNewPurchaseActive = document.getElementById('view-new-purchase-invoice')?.classList.contains('active');
        if (isNewPurchaseActive && (e.key === 'F4' || e.code === 'F4' || e.key === 'F10' || e.code === 'F10')) {
            e.preventDefault();
            submitNewPurchaseInvoiceView();
            return;
        }

        // F4: Save product if new product view is active
        const isNewProductActive = document.getElementById('view-new-product')?.classList.contains('active');
        if (isNewProductActive && e.key === 'F4') {
            e.preventDefault();
            saveProductFormView(false);
            return;
        }

        // Strict Keyboard Workflow for POS View
        const isPosActive = document.getElementById('view-pos')?.classList.contains('active');
        if (isPosActive) {
            if (e.key === 'F11' || e.code === 'F11') {
                e.preventDefault();
                addBlankPosRow();
                return;
            }
            if (e.key === 'F1' || e.code === 'F1') {
                e.preventDefault();
                openCategoryProductLookup();
                return;
            }
            if (e.key === 'F2' || e.code === 'F2') {
                e.preventDefault();
                setPosMode(state.posMode === 'sale' ? 'return' : 'sale');
                return;
            }
            if (e.key === 'F4' || e.code === 'F4') {
                e.preventDefault();
                executePosCheckout();
                return;
            }
            if (e.key === 'F12' || e.code === 'F12') {
                e.preventDefault();
                clearCart();
                return;
            }
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
 * 3. MASTER POS & SALES ARCHITECTURE (STRICT KEYBOARD & MULTI-TENDER)
 * ------------------------------------------------------------- */
let posRowCounter = 0;
let posCustomerDebounceTimer = null;
let posLookupAllProducts = [];

function bindPosEvents() {
    // 1. Initial blank row
    if (state.posRows.length === 0) {
        addBlankPosRow();
    }

    // 2. Discount inputs sync
    const discountPercentInput = document.getElementById('posDiscountPercent');
    const discountAmountInput = document.getElementById('posDiscountAmount');

    if (discountPercentInput && discountAmountInput) {
        discountPercentInput.addEventListener('input', () => {
            let percent = Number(discountPercentInput.value) || 0;
            if (percent < 0) percent = 0;
            if (percent > 100) percent = 100;
            discountPercentInput.value = percent;
            state.discountPercent = percent;

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

        discountAmountInput.addEventListener('input', () => {
            const subtotal = getPosSubtotal();
            const amount = Number(discountAmountInput.value) || 0;
            if (subtotal > 0) {
                const percent = Math.min(100, Math.max(0, Math.round((amount / subtotal) * 100)));
                discountPercentInput.value = percent;
                state.discountPercent = percent;
            }
            updatePosTotals();
        });
    }

    // 3. Multi-tender inputs sync
    ['posTenderCash', 'posTenderCard', 'posTenderTransfer'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => {
                document.querySelectorAll('.btn-quick-fill').forEach(b => b.classList.remove('active'));
                updatePosTotals();
            });
        }
    });

    // 4. Customer fast lookup input
    const customerInput = document.getElementById('posCustomerInput');
    const customerDropdown = document.getElementById('posCustomerDropdown');

    if (customerInput && customerDropdown) {
        customerInput.addEventListener('input', () => {
            const query = customerInput.value.trim();
            clearTimeout(posCustomerDebounceTimer);
            if (!query) {
                customerDropdown.style.display = 'none';
                return;
            }
            posCustomerDebounceTimer = setTimeout(async () => {
                const res = await window.api.searchCustomers(query, 8);
                if (res.success && res.data && res.data.length > 0) {
                    customerDropdown.innerHTML = res.data.map(c => `
                        <div class="pos-customer-dropdown-item" onclick="selectPosCustomer(${c.id}, '${escapeHtml(c.name)}', '${c.phone || ''}', ${c.points || 0})">
                            <div>
                                <div class="cust-name">${c.name}</div>
                                <div class="cust-phone">${c.phone || 'بدون هاتف'}</div>
                            </div>
                            <div class="cust-pts">${c.points || 0} نقطة</div>
                        </div>
                    `).join('');
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

    // 5. Lookup products modal search
    const lookupSearch = document.getElementById('lookupProductSearchInput');
    if (lookupSearch) {
        lookupSearch.addEventListener('input', () => {
            filterLookupProducts();
        });
    }

    // 6. Global Strict Keyboard Shortcuts (F11, F1, F2, F4, F12, Escape)
    window.addEventListener('keydown', (e) => {
        const isPosActive = document.getElementById('view-pos')?.classList.contains('active');

        if (e.key === 'F11') {
            e.preventDefault();
            if (isPosActive) addBlankPosRow();
        } else if (e.key === 'F1') {
            e.preventDefault();
            if (isPosActive) openCategoryProductLookup();
        } else if (e.key === 'F2') {
            e.preventDefault();
            if (isPosActive) setPosMode(state.posMode === 'sale' ? 'return' : 'sale');
        } else if (e.key === 'F4') {
            e.preventDefault();
            if (isPosActive) executePosCheckout();
        } else if (e.key === 'F12') {
            e.preventDefault();
            if (isPosActive) clearCart();
        } else if (e.key === 'Escape') {
            // Close any open backdrop modal first
            const openModals = document.querySelectorAll('.modal-backdrop');
            let closedAny = false;
            openModals.forEach(m => {
                if (m.style.display !== 'none' && m.style.display !== '') {
                    m.style.display = 'none';
                    closedAny = true;
                }
            });
            if (!closedAny && isPosActive) {
                e.preventDefault();
                switchView('hub');
            }
        }
    });
}

/**
 * Add a new blank row to POS table and focus its barcode cell (F11)
 */
function addBlankPosRow() {
    const tbody = document.getElementById('posGridBody');
    if (!tbody) return;

    // If there is already an unfilled blank row, focus it instead of duplicating
    const existingBlank = state.posRows.find(r => !r.product);
    if (existingBlank) {
        const input = document.getElementById(`posBarcode_${existingBlank.id}`);
        if (input) {
            input.focus();
            input.select();
            return;
        }
    }

    posRowCounter++;
    const rowId = posRowCounter;
    const rowObj = {
        id: rowId,
        barcode: '',
        product: null,
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0
    };
    state.posRows.push(rowObj);

    const tr = document.createElement('tr');
    tr.id = `posRow_${rowId}`;
    tr.innerHTML = `
        <td style="text-align: center; color: var(--text-muted); font-weight: 700;" class="row-seq-col">${state.posRows.length}</td>
        <td>
            <input type="text" id="posBarcode_${rowId}" class="pos-row-barcode-input" 
                   placeholder="امسح الباركود..." autocomplete="off">
        </td>
        <td id="posName_${rowId}" style="font-weight: 600; color: var(--text-secondary);">
            - سطر جديد -
        </td>
        <td id="posStock_${rowId}" style="text-align: center;">-</td>
        <td style="text-align: center;">
            <input type="number" id="posQty_${rowId}" class="pos-row-qty-input" min="1" step="1" value="1" disabled>
        </td>
        <td id="posPrice_${rowId}" style="text-align: left; font-family: monospace;">0.00 ج.م</td>
        <td id="posTotal_${rowId}" style="text-align: left; font-weight: 800; font-family: monospace;">0.00 ج.م</td>
        <td style="text-align: center;">
            <button type="button" class="btn-remove-row" onclick="removePosRow(${rowId})" title="حذف السطر">
                <i data-lucide="trash-2" class="icon-xs"></i>
            </button>
        </td>
    `;

    tbody.appendChild(tr);
    refreshIcons(tr);

    const barcodeInput = document.getElementById(`posBarcode_${rowId}`);
    const qtyInput = document.getElementById(`posQty_${rowId}`);

    barcodeInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            await handlePosBarcodeScan(rowId, barcodeInput.value.trim());
        }
    });

    qtyInput.addEventListener('input', () => {
        handlePosQtyChange(rowId, qtyInput.value);
    });

    // Auto-focus barcode input
    setTimeout(() => {
        barcodeInput.focus();
    }, 20);

    updatePosStatsPills();
}

/**
 * Handle scan or barcode entry on a specific row
 */
async function handlePosBarcodeScan(rowId, code) {
    if (!code) return;

    const row = state.posRows.find(r => r.id === rowId);
    if (!row) return;

    try {
        const res = await window.api.findProductByBarcode(code);
        if (res.success && res.data) {
            applyProductToRow(row, res.data);
            // Instant continuous scan: add next blank row & focus it!
            addBlankPosRow();
        } else {
            // Search if there is partial match
            const searchRes = await window.api.searchProducts(code, 5);
            if (searchRes.success && searchRes.data && searchRes.data.length === 1) {
                applyProductToRow(row, searchRes.data[0]);
                addBlankPosRow();
            } else if (searchRes.success && searchRes.data && searchRes.data.length > 1) {
                // Open lookup modal with query
                openCategoryProductLookup(code);
            } else {
                alert(`الباركود (${code}) غير مسجل في النظام.`);
                const barcodeInput = document.getElementById(`posBarcode_${rowId}`);
                if (barcodeInput) {
                    barcodeInput.select();
                }
            }
        }
    } catch (err) {
        alert(`خطأ في قراءة الباركود: ${err.message}`);
    }
}

/**
 * Apply product data to a POS row
 */
function applyProductToRow(row, product) {
    // Inventory safety check in Sale Mode
    if (state.posMode === 'sale') {
        if (product.current_stock <= 0) {
            alert(`تنبيه مخزني: الصنف (${product.item_name}) رصيده صفر في المخزن ولا يمكن بيعه!`);
            return;
        }
    }

    row.product = product;
    row.barcode = product.barcode || product.product_code || String(product.id);
    row.unitPrice = Number(product.sell_price);
    row.quantity = 1;
    row.lineTotal = row.unitPrice;

    // Update row DOM
    const tr = document.getElementById(`posRow_${row.id}`);
    if (tr) {
        tr.classList.add('active-row');
        const barcodeInput = document.getElementById(`posBarcode_${row.id}`);
        if (barcodeInput) barcodeInput.value = row.barcode;

        const nameCell = document.getElementById(`posName_${row.id}`);
        if (nameCell) {
            nameCell.innerHTML = `
                <div style="font-weight: 700; color: #0F172A;">${escapeHtml(product.item_name)}</div>
                <div style="font-size: 11px; color: #64748B;">${escapeHtml(product.category_name || '-')}</div>
            `;
        }

        const stockCell = document.getElementById(`posStock_${row.id}`);
        if (stockCell) {
            let stockClass = 'stock-ok';
            if (product.current_stock <= 0) stockClass = 'stock-zero';
            else if (product.current_stock <= 5) stockClass = 'stock-low';
            stockCell.innerHTML = `<span class="stock-tag ${stockClass}">${product.current_stock}</span>`;
        }

        const qtyInput = document.getElementById(`posQty_${row.id}`);
        if (qtyInput) {
            qtyInput.disabled = false;
            qtyInput.value = row.quantity;
            qtyInput.max = state.posMode === 'sale' ? product.current_stock : 9999;
        }

        const priceCell = document.getElementById(`posPrice_${row.id}`);
        if (priceCell) priceCell.innerText = `${row.unitPrice.toFixed(2)} ج.م`;

        const totalCell = document.getElementById(`posTotal_${row.id}`);
        if (totalCell) totalCell.innerText = `${row.lineTotal.toFixed(2)} ج.م`;
    }

    updatePosTotals();
}

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
 * Remove a row from the POS table
 */
function removePosRow(rowId) {
    const idx = state.posRows.findIndex(r => r.id === rowId);
    if (idx !== -1) {
        state.posRows.splice(idx, 1);
        const tr = document.getElementById(`posRow_${rowId}`);
        if (tr) tr.remove();
    }

    // Re-index row numbers
    const rows = document.querySelectorAll('#posGridBody tr');
    rows.forEach((r, i) => {
        const seqCell = r.querySelector('.row-seq-col');
        if (seqCell) seqCell.innerText = i + 1;
    });

    if (state.posRows.length === 0) {
        addBlankPosRow();
    }

    updatePosTotals();
}

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

    const percent = Number(document.getElementById('posDiscountPercent')?.value) || 0;
    const computedDiscount = Math.round((subtotal * (percent / 100)) * 100) / 100;
    const finalTotal = Math.max(0, Math.round((subtotal - computedDiscount) * 100) / 100);

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
        if (badge) badge.className = 'status-badge-match match-perfect';
        if (badgeText) badgeText.innerText = 'مطابق 100% (جاهز للاعتماد)';
        if (checkoutBtn) checkoutBtn.disabled = false;
    } else if (hasActiveProducts && diff < 0) {
        if (badge) badge.className = 'status-badge-match match-under';
        if (badgeText) badgeText.innerText = `متبقي: ${Math.abs(diff).toFixed(2)} ج.م`;
        if (checkoutBtn) checkoutBtn.disabled = true;
    } else if (hasActiveProducts && diff > 0) {
        if (badge) badge.className = 'status-badge-match match-over';
        if (badgeText) badgeText.innerText = `مبلغ زائد: ${diff.toFixed(2)} ج.م`;
        if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
        if (badge) badge.className = 'status-badge-match match-under';
        if (badgeText) badgeText.innerText = 'السلة فارغة';
        if (checkoutBtn) checkoutBtn.disabled = true;
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
    const percent = Number(document.getElementById('posDiscountPercent')?.value) || 0;
    const computedDiscount = Math.round((subtotal * (percent / 100)) * 100) / 100;
    const finalTotal = Math.max(0, Math.round((subtotal - computedDiscount) * 100) / 100);

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

    document.querySelectorAll('.btn-quick-fill').forEach(b => b.classList.remove('active'));
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
    const percent = Number(document.getElementById('posDiscountPercent')?.value) || 0;
    const computedDiscount = Math.round((subtotal * (percent / 100)) * 100) / 100;
    const finalTotal = Math.max(0, Math.round((subtotal - computedDiscount) * 100) / 100);

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

    const btnSale = document.getElementById('btnPosModeSale');
    const btnReturn = document.getElementById('btnPosModeReturn');
    const badge = document.getElementById('posModeBadge');
    const posView = document.getElementById('view-pos');
    const grandLabel = document.getElementById('posGrandTotalLabel');
    const checkoutBtnText = document.getElementById('posCheckoutBtnText');

    if (mode === 'return') {
        btnReturn?.classList.add('active');
        btnSale?.classList.remove('active');
        if (badge) badge.style.display = 'inline-flex';
        posView?.classList.add('pos-return-mode');
        if (grandLabel) grandLabel.innerText = 'المبلغ المرتجع للمشتري:';
        if (checkoutBtnText) checkoutBtnText.innerText = 'صرف المرتجع وطباعة الإشعار (F4)';
    } else {
        btnSale?.classList.add('active');
        btnReturn?.classList.remove('active');
        if (badge) badge.style.display = 'none';
        posView?.classList.remove('pos-return-mode');
        if (grandLabel) grandLabel.innerText = 'الصافي المطلوب سداده:';
        if (checkoutBtnText) checkoutBtnText.innerText = 'اعتماد الفاتورة والطباعة الفورية (F4)';
    }

    updatePosTotals();
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

    const card = document.getElementById('posSelectedCustomerCard');
    if (card) {
        document.getElementById('posCustomerDisplayName').innerText = name;
        document.getElementById('posCustomerDisplayPhone').innerText = phone || '';
        document.getElementById('posCustomerDisplayPoints').innerText = `${points || 0} نقطة`;
        card.style.display = 'inline-flex';
    }
}

function clearSelectedCustomer() {
    state.selectedCustomer = null;
    const card = document.getElementById('posSelectedCustomerCard');
    if (card) card.style.display = 'none';
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
 * F1 Categories & Product Lookup Modal
 */
async function openCategoryProductLookup(searchQuery = '') {
    const modal = document.getElementById('modalCategoryProductLookup');
    if (!modal) return;

    modal.style.display = 'flex';
    const searchInput = document.getElementById('lookupProductSearchInput');
    if (searchInput) {
        searchInput.value = searchQuery || '';
        setTimeout(() => searchInput.focus(), 50);
    }

    // Load categories
    const catRes = await window.api.listCategories({ activeOnly: true });
    const sidebar = document.getElementById('lookupCategoriesSidebar');
    if (catRes.success && catRes.data && sidebar) {
        const cats = catRes.data;
        sidebar.innerHTML = `
            <button type="button" class="category-nav-item active" data-cat-id="all" onclick="selectLookupCategory('all')">
                <span>كل الأقسام</span>
                <span class="cat-count" id="lookupCatAllCount">${cats.length}</span>
            </button>
            ${cats.map(c => `
                <button type="button" class="category-nav-item" data-cat-id="${c.id}" onclick="selectLookupCategory(${c.id})">
                    <span>${escapeHtml(c.name)}</span>
                </button>
            `).join('')}
        `;
    }

    // Load products
    const prodRes = await window.api.listProducts({ limit: 100 });
    if (prodRes.success && prodRes.data) {
        posLookupAllProducts = prodRes.data;
        filterLookupProducts();
    }
}

function closeCategoryProductLookup() {
    const modal = document.getElementById('modalCategoryProductLookup');
    if (modal) modal.style.display = 'none';
}

function selectLookupCategory(catId) {
    state.activeLookupCategoryId = catId;
    document.querySelectorAll('.category-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.catId == catId);
    });
    filterLookupProducts();
}

function filterLookupProducts() {
    const query = document.getElementById('lookupProductSearchInput')?.value.trim().toLowerCase() || '';
    const catId = state.activeLookupCategoryId;

    let filtered = posLookupAllProducts;
    if (catId && catId !== 'all') {
        filtered = filtered.filter(p => p.category_id == catId);
    }
    if (query) {
        filtered = filtered.filter(p =>
            (p.item_name && p.item_name.toLowerCase().includes(query)) ||
            (p.barcode && p.barcode.toLowerCase().includes(query)) ||
            (p.product_code && p.product_code.toLowerCase().includes(query))
        );
    }

    const tbody = document.getElementById('lookupProductsTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">لا توجد أصناف مطابقة للبحث</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.slice(0, 40).map(p => {
        let stockClass = 'stock-ok';
        if (p.current_stock <= 0) stockClass = 'stock-zero';
        else if (p.current_stock <= 5) stockClass = 'stock-low';

        return `
            <tr>
                <td style="font-family: monospace; font-weight: 700;">${p.barcode || p.product_code || '-'}</td>
                <td style="font-weight: 700; color: #0F172A;">${escapeHtml(p.item_name)}</td>
                <td style="color: var(--text-muted);">${escapeHtml(p.category_name || '-')}</td>
                <td style="font-weight: 800; color: #059669;">${Number(p.sell_price).toFixed(2)} ج.م</td>
                <td style="text-align: center;"><span class="stock-tag ${stockClass}">${p.current_stock}</span></td>
                <td style="text-align: center;">
                    <button type="button" class="btn-primary" style="padding: 3px 10px; font-size: 11.5px;" onclick="addLookupProductToPos(${p.id})">
                        + إضافة
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function addLookupProductToPos(productId) {
    const prod = posLookupAllProducts.find(p => p.id === productId);
    if (!prod) return;

    // Find first blank row or create one
    let targetRow = state.posRows.find(r => r.product == null);
    if (!targetRow) {
        addBlankPosRow();
        targetRow = state.posRows[state.posRows.length - 1];
    }

    applyProductToRow(targetRow, prod);
    closeCategoryProductLookup();
    addBlankPosRow();
}

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
        alert('تنبيه: يجب فتح وردية يومية أولاً لإتمام البيع أو الاسترجاع!');
        switchView('sales-hub');
        return;
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

    // Cashier discount ceiling check
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

    try {
        const payload = {
            sessionId: state.activeSession.id,
            userId: state.currentUser.id,
            userRole: state.currentUser.role,
            invoiceType: state.posMode,
            customerId: state.selectedCustomer?.id || null,
            customerName: state.selectedCustomer?.name || null,
            customerPhone: state.selectedCustomer?.phone || null,
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

        // Instant 80mm thermal receipt trigger
        const previewRes = await window.api.previewReceiptHtml(invoice.id);
        if (previewRes.success && previewRes.data) {
            // Open print window
            const printWindow = window.open('', '_blank', 'width=420,height=600');
            if (printWindow) {
                printWindow.document.write(previewRes.data);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.print();
                }, 300);
            }
        }

        // Reset for next sale
        clearCart();
        await refreshSessionState();

    } catch (err) {
        alert(`فشل إتمام العملية: ${err.message}`);
    } finally {
        if (checkoutBtn) checkoutBtn.disabled = false;
    }
}

/**
 * Clear POS Cart and start fresh (F12)
 */
function clearCart() {
    state.posRows = [];
    state.discountPercent = 0;
    state.managerOverride = null;
    clearSelectedCustomer();

    const discPercentInput = document.getElementById('posDiscountPercent');
    if (discPercentInput) discPercentInput.value = 0;

    const discAmountInput = document.getElementById('posDiscountAmount');
    if (discAmountInput) discAmountInput.value = 0;

    const cashInput = document.getElementById('posTenderCash');
    if (cashInput) cashInput.value = 0;
    const cardInput = document.getElementById('posTenderCard');
    if (cardInput) cardInput.value = 0;
    const transferInput = document.getElementById('posTenderTransfer');
    if (transferInput) transferInput.value = 0;

    const tbody = document.getElementById('posGridBody');
    if (tbody) tbody.innerHTML = '';

    addBlankPosRow();
    updatePosTotals();
}

/**
 * Refresh Active Daily Session State and POS Drawer Indicators
 */
async function refreshSessionState() {
    try {
        const res = await window.api.getActiveSession();
        if (res && res.success && res.data) {
            state.activeSession = res.data;
            const codeEl = document.getElementById('posCurrentSessionCode');
            if (codeEl) codeEl.innerText = res.data.session_code;

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
            if (codeEl) codeEl.innerText = 'لا توجد وردية مفتوحة';
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

    // ──── SMART FILTERS FOR LIVE INVOICES LOG DASHBOARD ────
    const btnFilterDates = document.getElementById('btnFilterInvoicesDates');
    if (btnFilterDates) {
        btnFilterDates.addEventListener('click', () => {
            const start = document.getElementById('invoicesStartDate')?.value || null;
            const end = document.getElementById('invoicesEndDate')?.value || null;
            currentInvoicesLogFilters.startDate = start;
            currentInvoicesLogFilters.endDate = end;
            loadSessionDashboard();
        });
    }

    const startInput = document.getElementById('invoicesStartDate');
    const endInput = document.getElementById('invoicesEndDate');
    if (startInput) {
        startInput.addEventListener('change', () => {
            currentInvoicesLogFilters.startDate = startInput.value || null;
            loadSessionDashboard();
        });
    }
    if (endInput) {
        endInput.addEventListener('change', () => {
            currentInvoicesLogFilters.endDate = endInput.value || null;
            loadSessionDashboard();
        });
    }

    const selPaymentMethod = document.getElementById('invoicesFilterPaymentMethod');
    if (selPaymentMethod) {
        selPaymentMethod.addEventListener('change', (e) => {
            currentInvoicesLogFilters.paymentMethod = e.target.value;
            loadSessionDashboard();
        });
    }

    const searchInput = document.getElementById('invoicesSearchInput');
    let searchDebounceTimer = null;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                currentInvoicesLogFilters.searchQuery = e.target.value;
                loadSessionDashboard();
            }, 260);
        });
    }

    const btnResetFilter = document.getElementById('btnResetInvoicesFilter');
    if (btnResetFilter) {
        btnResetFilter.addEventListener('click', () => {
            currentInvoicesLogFilters = {
                period: 'all',
                startDate: null,
                endDate: null,
                paymentMethod: 'all',
                searchQuery: '',
                limit: 100
            };

            // Reset UI elements
            document.querySelectorAll('.period-pill').forEach(p => p.classList.remove('active'));
            const allPill = document.querySelector('.period-pill[data-period="all"]');
            if (allPill) allPill.classList.add('active');

            const customRange = document.getElementById('invoicesCustomDateRange');
            if (customRange) customRange.style.display = 'none';

            const startEl = document.getElementById('invoicesStartDate');
            const endEl = document.getElementById('invoicesEndDate');
            if (startEl) startEl.value = '';
            if (endEl) endEl.value = '';

            const methodEl = document.getElementById('invoicesFilterPaymentMethod');
            if (methodEl) methodEl.value = 'all';

            const searchEl = document.getElementById('invoicesSearchInput');
            if (searchEl) searchEl.value = '';

            loadSessionDashboard();
        });
    }
}

/**
 * Global state for Invoices Log Dashboard Filters
 */
let currentInvoicesLogFilters = {
    period: 'all',
    startDate: null,
    endDate: null,
    paymentMethod: 'all',
    searchQuery: '',
    limit: 100
};

/**
 * Smart period filter — applies quick date presets for invoices log
 */
function applyInvoicesPeriod(period) {
    document.querySelectorAll('.period-pill').forEach(p => p.classList.remove('active'));
    const pill = document.querySelector(`.period-pill[data-period="${period}"]`);
    if (pill) pill.classList.add('active');

    const customRange = document.getElementById('invoicesCustomDateRange');
    currentInvoicesLogFilters.period = period;

    if (period === 'custom') {
        if (customRange) customRange.style.display = 'flex';
        return; // wait for manual date selection and click
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
            const dayOfWeek = w.getDay(); // 0=Sun, 6=Sat
            const diff = (dayOfWeek + 1) % 7; // Egypt/Arab week starts Saturday
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

    currentInvoicesLogFilters.startDate = startDate;
    currentInvoicesLogFilters.endDate = endDate;
    loadSessionDashboard();
}
window.applyInvoicesPeriod = applyInvoicesPeriod;

function formatDateISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Format invoice timestamp to Arabic 12-hour format (e.g. 2026-10-14 02:45 م)
 */
function formatInvoiceTimestamp(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'م' : 'ص';
        hours = hours % 12 || 12;
        return `${y}-${m}-${day} ${hours}:${minutes} ${ampm}`;
    } catch {
        return dateStr;
    }
}

/**
 * Main Loader: Fetches dashboard data and renders all 3 sections matching reference design
 */
async function loadSessionDashboard(filters = null) {
    const queryFilters = filters || currentInvoicesLogFilters;

    try {
        const res = await window.api.getInvoicesDashboard(queryFilters);
        const data = (res && res.success !== false && res.data) ? res.data : (res && res.summary ? res : null);

        if (!data) return;

        const { summary, breakdown, invoices } = data;

        // ──── 1. ROW 1: 4 EXECUTIVE METRIC CARDS ────
        const elSales = document.getElementById('kpiTotalSales');
        const elExpenses = document.getElementById('kpiTotalExpenses');
        const elExpenseSub = document.getElementById('kpiExpenseSub');
        const elNet = document.getElementById('kpiNetRemaining');
        const elInvCount = document.getElementById('kpiInvoicesCount');
        const elPiecesCount = document.getElementById('kpiPiecesCount');

        if (elSales) elSales.innerText = `${summary.totalSales.toFixed(2)} ج.م`;
        if (elExpenses) elExpenses.innerText = `${summary.totalExpenses.toFixed(2)} ج.م`;
        if (elExpenseSub) elExpenseSub.innerText = `مصروفات معتمدة (${summary.expenseCount || 0} سند)`;
        if (elNet) elNet.innerText = `${summary.netRemaining.toFixed(2)} ج.م`;
        if (elInvCount) elInvCount.innerText = `${summary.totalInvoices} فاتورة`;
        if (elPiecesCount) elPiecesCount.innerText = `القطع المباعة: ${summary.totalPieces} قطعة`;

        // ──── 2. ROW 2: PAYMENT METHODS BREAKDOWN ────
        // Cash
        const elCashAmt = document.getElementById('tenderCashAmount');
        const elCashBadge = document.getElementById('tenderCashCountBadge');
        const elCashProg = document.getElementById('tenderCashProgress');
        const elCashTxt = document.getElementById('tenderCashPercentText');

        if (elCashAmt) elCashAmt.innerText = `${Math.round(breakdown.cash.total)} ج.م`;
        if (elCashBadge) elCashBadge.innerText = `${breakdown.cash.count} عملية`;
        if (elCashProg) elCashProg.style.width = `${breakdown.cash.percent}%`;
        if (elCashTxt) elCashTxt.innerText = `يمثل ${breakdown.cash.percent}% من إجمالي المبيعات المحصلة`;

        // Card
        const elCardAmt = document.getElementById('tenderCardAmount');
        const elCardBadge = document.getElementById('tenderCardCountBadge');
        const elCardProg = document.getElementById('tenderCardProgress');
        const elCardTxt = document.getElementById('tenderCardPercentText');

        if (elCardAmt) elCardAmt.innerText = `${Math.round(breakdown.card.total)} ج.م`;
        if (elCardBadge) elCardBadge.innerText = `${breakdown.card.count} عملية`;
        if (elCardProg) elCardProg.style.width = `${breakdown.card.percent}%`;
        if (elCardTxt) elCardTxt.innerText = `يمثل ${breakdown.card.percent}% من إجمالي المبيعات المحصلة`;

        // Split / Electronic
        const elSplitAmt = document.getElementById('tenderSplitAmount');
        const elSplitBadge = document.getElementById('tenderSplitCountBadge');
        const elSplitProg = document.getElementById('tenderSplitProgress');
        const elSplitTxt = document.getElementById('tenderSplitPercentText');

        if (elSplitAmt) elSplitAmt.innerText = `${Math.round(breakdown.split.total)} ج.م`;
        if (elSplitBadge) elSplitBadge.innerText = `${breakdown.split.count} عملية`;
        if (elSplitProg) elSplitProg.style.width = `${breakdown.split.percent}%`;
        if (elSplitTxt) elSplitTxt.innerText = `يمثل ${breakdown.split.percent}% من إجمالي المبيعات المحصلة`;

        // ──── 3. ROW 3: DETAILED INVOICES LOG TABLE ────
        const elLogBadge = document.getElementById('invoicesLogBadge');
        if (elLogBadge) elLogBadge.innerText = `${summary.totalInvoices} فاتورة مسجلة`;

        const tbody = document.getElementById('invoicesLogTableBody');
        const emptyState = document.getElementById('invoicesEmptyState');

        if (tbody) {
            tbody.innerHTML = '';
            if (!invoices || invoices.length === 0) {
                if (emptyState) emptyState.style.display = 'flex';
            } else {
                if (emptyState) emptyState.style.display = 'none';

                invoices.forEach(inv => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid #F1F5F9';

                    // Payment method badge markup
                    let payBadge = '';
                    if (inv.payment_method === 'cash') {
                        payBadge = '<span class="badge" style="background: #ECFDF3; color: #027A48; border: 1px solid #A6F4C5; font-weight: 700;">نقداً</span>';
                    } else if (inv.payment_method === 'card') {
                        payBadge = '<span class="badge" style="background: #EFF8FF; color: #175CD3; border: 1px solid #B2DDFF; font-weight: 700;">بطاقات وفيزا</span>';
                    } else {
                        payBadge = '<span class="badge" style="background: #FEF0C7; color: #B54708; border: 1px solid #FEDF89; font-weight: 700;">تحويل ومقسم</span>';
                    }

                    tr.innerHTML = `
                        <td style="font-weight: 800; color: #101828;">#${inv.invoice_number}</td>
                        <td style="color: #475467;">${inv.session_code ? 'الفرع الرئيسي (' + inv.session_code + ')' : 'الفرع الرئيسي'}</td>
                        <td style="color: #475467; font-size: 11.5px;">${formatInvoiceTimestamp(inv.created_at)}</td>
                        <td style="font-weight: 600; color: #1E293B;">${inv.cashier_name || '-'}</td>
                        <td style="color: #475467;">${inv.notes ? inv.notes : 'عميل نقدي مباشر'}</td>
                        <td style="color: #475467; font-size: 11.5px;">${inv.items_count} أصناف (${inv.total_pieces} قطع)</td>
                        <td style="font-weight: 800; color: #027A48; font-size: 13.5px;">${inv.final_total.toFixed(2)} ج.م</td>
                        <td>${payBadge}</td>
                        <td style="text-align: center;">
                            <button type="button" class="btn-secondary" onclick="viewInvoiceDetails(${inv.id})" title="معاينة تفاصيل الفاتورة" style="padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                                <i data-lucide="eye" class="icon-xs"></i>
                                <span>معاينة</span>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }
    } catch (err) {
        console.error('Error loading invoices dashboard:', err);
    }

    refreshIcons();
}
window.loadSessionDashboard = loadSessionDashboard;

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
            methodEl.innerText = inv.payment_method === 'cash' ? 'نقداً (كاش)' : inv.payment_method === 'card' ? 'بطاقة / فيزا' : 'مقسم / تحويل';
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
                await window.api.printInvoiceReceipt(invoiceId);
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
    const activeFilters = filters || currentAnalyticsFilters;

    try {
        const res = await window.api.getComprehensiveAnalytics(activeFilters);
        const data = (res && res.success !== false && res.data) ? res.data : (res && res.kpis ? res : null);
        if (!data) return;

        const { kpis, timeline, categories, tenders, sellers, topProducts, allSellers } = data;

        // 1. Populate Sellers Dropdown once or update
        const selSeller = document.getElementById('analyticsFilterSeller');
        if (selSeller && allSellers && allSellers.length > 0 && !analyticsSellersDropdownLoaded) {
            const currentVal = selSeller.value;
            selSeller.innerHTML = '<option value="all">كافة البائعين والكاشير</option>';
            allSellers.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.innerText = `${u.display_name} (${u.role === 'admin' ? 'مدير' : 'بائع'})`;
                selSeller.appendChild(opt);
            });
            if (currentVal) selSeller.value = currentVal;
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

        // 4. Render Category Contribution
        const catList = document.getElementById('analyticsCategoryBarsList');
        if (catList) {
            catList.innerHTML = '';
            if (!categories || categories.length === 0) {
                catList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 14px; font-size: 12px;">لا توجد مبيعات للأقسام</div>';
            } else {
                categories.forEach(c => {
                    const row = document.createElement('div');
                    row.className = 'category-bar-row';
                    row.innerHTML = `
                        <div class="category-bar-info">
                            <span>${c.category_name} (${c.units_sold} قطعة)</span>
                            <span style="color: #0F172A; font-weight: 800;">${c.category_revenue.toFixed(2)} ج.م (${c.share_percent}%)</span>
                        </div>
                        <div class="category-track">
                            <div class="category-fill" style="width: ${Math.min(100, Math.max(4, c.share_percent))}%;"></div>
                        </div>
                    `;
                    catList.appendChild(row);
                });
            }
        }

        // 5. Render Tenders Mix
        const tendersContainer = document.getElementById('analyticsTendersMixContainer');
        if (tendersContainer) {
            tendersContainer.innerHTML = '';
            const tenderMap = { cash: { label: 'نقداً (كاش)', icon: 'banknote', color: '#059669', bg: '#ECFDF3' }, card: { label: 'بطاقات وفيزا', icon: 'credit-card', color: '#2563EB', bg: '#EFF8FF' }, split: { label: 'مقسم / إلكتروني', icon: 'split', color: '#D97706', bg: '#FEF3C7' } };
            const allTenderSum = (tenders || []).reduce((sum, t) => sum + t.total, 0);

            (tenders || []).forEach(t => {
                const meta = tenderMap[t.payment_method] || { label: t.payment_method, icon: 'dollar-sign', color: '#64748B', bg: '#F1F5F9' };
                const pct = allTenderSum > 0 ? Math.round((t.total / allTenderSum) * 100) : 0;

                const card = document.createElement('div');
                card.style.cssText = `background: ${meta.bg}; border: 1px solid ${meta.color}33; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px;`;
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; font-weight: 700; color: ${meta.color};">
                        <span style="display: flex; align-items: center; gap: 4px;"><i data-lucide="${meta.icon}" class="icon-xs"></i> ${meta.label}</span>
                        <span class="badge" style="background: #FFFFFF; color: ${meta.color}; font-weight: 800; font-size: 10.5px;">${pct}%</span>
                    </div>
                    <div style="font-size: 15px; font-weight: 900; color: #0F172A;">${t.total.toFixed(2)} ج.م</div>
                    <div style="font-size: 10.5px; color: #64748B;">${t.count} عملية مسجلة</div>
                `;
                tendersContainer.appendChild(card);
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
                            <div style="font-size: 11px; color: var(--text-muted);">@${s.username} • ${s.role === 'admin' ? 'مدير عام' : 'كاشير مبيعات'}</div>
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

        // 7. Render Top Movers Products
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
                            <div style="font-weight: 700; color: #1E293B; font-size: 12.5px;">${p.item_name}</div>
                            <div style="font-family: monospace; font-size: 11px; color: var(--text-muted);">${p.barcode}</div>
                        </td>
                        <td style="color: #475467; font-size: 12px;"><span class="badge" style="background: #F1F5F9;">${p.category_name}</span></td>
                        <td style="text-align: center; font-weight: 800; color: #0F172A;">${p.total_quantity_sold}</td>
                        <td style="font-weight: 800; color: #027A48;">${p.total_revenue.toFixed(2)} ج.م</td>
                        <td style="font-weight: 800; color: #15803D;">${p.total_profit.toFixed(2)} ج.م</td>
                    `;
                    prodTbody.appendChild(tr);
                });
            }
        }

        // 8. Render Smart Decision Insights Cards
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
                        <h5>القسم الحصان الرابح: ${topCat.category_name}</h5>
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
                        <h5>كفاءة البيع: ${topS.display_name} يقود المبيعات</h5>
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
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const settingsMap = {
                store_name: document.getElementById('setting_store_name')?.value.trim() || 'Cotton Club Store',
                store_phone: document.getElementById('setting_store_phone')?.value.trim() || '',
                store_address: document.getElementById('setting_store_address')?.value.trim() || '',
                tax_number: document.getElementById('setting_tax_number')?.value.trim() || '',
                currency_symbol: document.getElementById('setting_currency_symbol')?.value.trim() || 'ج.م',
                receipt_footer: document.getElementById('setting_receipt_footer')?.value.trim() || '',
                printer_paper_width: document.getElementById('setting_printer_paper_width')?.value || '80mm',
                cashier_max_discount_percent: document.getElementById('setting_cashier_max_discount_percent')?.value || '5',
                return_policy_days: document.getElementById('setting_return_policy_days')?.value || '14',
                allow_below_cost_sale: document.getElementById('setting_allow_below_cost_sale')?.value || 'warn',
                auto_print_receipt: document.getElementById('setting_auto_print_receipt')?.value || 'true',
                enable_barcode_on_receipt: document.getElementById('setting_enable_barcode_on_receipt')?.value || 'true'
            };

            const userId = state.currentUser?.id || 1;
            const res = await window.api.updateSettings(settingsMap, userId);
            if (res.success) {
                state.settings = res.data;
                const storeNameEl = document.getElementById('headerStoreName');
                if (storeNameEl) storeNameEl.innerText = state.settings.store_name;
                updateLiveReceiptPreview();
                alert('✅ تم حفظ وتحديث إعدادات البيع والطباعة بنجاح!');
            } else {
                alert(`خطأ في حفظ الإعدادات: ${res.error}`);
            }
        });
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
        'setting_return_policy_days',
        'setting_allow_below_cost_sale',
        'setting_auto_print_receipt',
        'setting_enable_barcode_on_receipt'
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

    setVal('setting_store_name', s.store_name || 'Cotton Club Store');
    setVal('setting_store_phone', s.store_phone || '');
    setVal('setting_store_address', s.store_address || '');
    setVal('setting_tax_number', s.tax_number || '');
    setVal('setting_currency_symbol', s.currency_symbol || 'ج.م');
    setVal('setting_receipt_footer', s.receipt_footer || 'شكراً لزيارتكم - البضاعة المباعة ترد وتستبدل خلال 14 يوماً');
    setVal('setting_printer_paper_width', s.printer_paper_width || '80mm');
    setVal('setting_cashier_max_discount_percent', s.cashier_max_discount_percent || '5');
    setVal('setting_return_policy_days', s.return_policy_days || '14');
    setVal('setting_allow_below_cost_sale', s.allow_below_cost_sale || 'warn');
    setVal('setting_auto_print_receipt', s.auto_print_receipt !== undefined ? String(s.auto_print_receipt) : 'true');
    setVal('setting_enable_barcode_on_receipt', s.enable_barcode_on_receipt !== undefined ? String(s.enable_barcode_on_receipt) : 'true');
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

    // Setup F1 quick search bar handler
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
 * 11. CENTRAL TREASURY (SAFE VAULT)
 * ------------------------------------------------------------- */
function bindTreasuryEvents() {
    const openDepBtn = document.getElementById('btnOpenTreasuryDepositModal');
    if (openDepBtn) {
        openDepBtn.addEventListener('click', () => {
            document.getElementById('treasuryDepositAmount').value = '';
            document.getElementById('treasuryDepositPaidBy').value = '';
            document.getElementById('treasuryDepositNotes').value = '';
            document.getElementById('modalTreasuryDeposit').classList.add('active');
        });
    }

    const submitDepBtn = document.getElementById('btnSubmitTreasuryDeposit');
    if (submitDepBtn) {
        submitDepBtn.addEventListener('click', async () => {
            const amount = Number(document.getElementById('treasuryDepositAmount').value);
            if (!amount || amount <= 0) {
                alert('يرجى إدخال مبلغ إيداع صحيح');
                return;
            }

            const category = document.getElementById('treasuryDepositCategory').value;
            const paidBy = document.getElementById('treasuryDepositPaidBy').value.trim();
            const notes = document.getElementById('treasuryDepositNotes').value.trim();

            const res = await window.api.treasuryDeposit({
                amount,
                category,
                paidBy,
                notes
            }, state.currentUser.id);

            if (!res.success) {
                alert(`خطأ في الإيداع: ${res.error}`);
                return;
            }

            alert(`تم تسجيل حركة إيداع في الخزنة المركزية بنجاح بمبلغ ${amount.toFixed(2)} ج.م`);
            document.getElementById('modalTreasuryDeposit').classList.remove('active');
            await loadTreasuryView();
        });
    }

    const openWithBtn = document.getElementById('btnOpenTreasuryWithdrawModal');
    if (openWithBtn) {
        openWithBtn.addEventListener('click', () => {
            document.getElementById('treasuryWithdrawAmount').value = '';
            document.getElementById('treasuryWithdrawRecipient').value = '';
            document.getElementById('treasuryWithdrawNotes').value = '';
            document.getElementById('modalTreasuryWithdraw').classList.add('active');
        });
    }

    const submitWithBtn = document.getElementById('btnSubmitTreasuryWithdraw');
    if (submitWithBtn) {
        submitWithBtn.addEventListener('click', async () => {
            const amount = Number(document.getElementById('treasuryWithdrawAmount').value);
            if (!amount || amount <= 0) {
                alert('يرجى إدخال مبلغ سحب صحيح');
                return;
            }

            const category = document.getElementById('treasuryWithdrawCategory').value;
            const recipient = document.getElementById('treasuryWithdrawRecipient').value.trim();
            const notes = document.getElementById('treasuryWithdrawNotes').value.trim();

            const res = await window.api.treasuryWithdraw({
                amount,
                category,
                recipient,
                notes
            }, state.currentUser.id);

            if (!res.success) {
                alert(`خطأ في السحب: ${res.error}`);
                return;
            }

            alert(`تم صرف وسحب مبلغ ${amount.toFixed(2)} ج.م من الخزنة المركزية`);
            document.getElementById('modalTreasuryWithdraw').classList.remove('active');
            await loadTreasuryView();
        });
    }
}

async function loadTreasuryView() {
    const balRes = await window.api.getTreasuryBalance();
    if (balRes.success) {
        const d = balRes.data;
        document.getElementById('treasuryBalanceVal').innerText = `${d.balance.toFixed(2)} ج.م`;
        document.getElementById('treasuryTodayDepositsVal').innerText = `${d.todayDeposits.toFixed(2)} ج.م`;
        document.getElementById('treasuryTodayWithdrawalsVal').innerText = `${d.todayWithdrawals.toFixed(2)} ج.م`;
        document.getElementById('treasuryShiftsTransferVal').innerText = `${d.shiftTransfersTotal.toFixed(2)} ج.م`;
    }

    const txRes = await window.api.listTreasuryTransactions(50);
    const tbody = document.getElementById('treasuryTransactionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!txRes.success || !txRes.data || txRes.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">لا توجد حركات مسجلة بالخزنة</td></tr>';
        return;
    }

    txRes.data.forEach(t => {
        const tr = document.createElement('tr');
        const isDep = t.transaction_type === 'deposit' || t.transaction_type === 'shift_transfer';
        const color = isDep ? 'var(--accent-emerald)' : 'var(--accent-rose)';
        const sign = isDep ? '+' : '-';
        const typeBadge = isDep ? '<span class="badge badge-ok">إيداع وارد</span>' : '<span class="badge badge-low-stock">سحب منصرف</span>';

        tr.innerHTML = `
            <td style="font-weight: bold; font-family: monospace;">#TX-${t.id}</td>
            <td>${typeBadge}</td>
            <td style="color: ${color}; font-weight: bold;">${sign}${t.amount.toFixed(2)} ج.م</td>
            <td style="font-weight: bold;">${t.running_balance.toFixed(2)} ج.م</td>
            <td>${t.source_destination || '-'}</td>
            <td>${t.description || '-'}</td>
            <td>${t.created_by_name || '-'}</td>
            <td style="font-size: 12px; color: var(--text-muted);">${t.created_at}</td>
        `;
        tbody.appendChild(tr);
    });
}

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
            const empRes = await window.api.listEmployees(true);
            const sel = document.getElementById('salaryEmployeeSelect');
            sel.innerHTML = '<option value="">اختر الموظف المستحق...</option>';

            empRes.data?.forEach(e => {
                const opt = document.createElement('option');
                opt.value = e.id;
                opt.dataset.salary = e.base_salary;
                opt.innerText = `${e.full_name} (${e.role_title} - راتب: ${e.base_salary} ج.م)`;
                sel.appendChild(opt);
            });

            document.getElementById('salaryAmount').value = '';
            const currentMonth = new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
            document.getElementById('salaryMonthPeriod').value = currentMonth;
            document.getElementById('salaryNotes').value = '';

            document.getElementById('modalDisburseSalary').classList.add('active');
        });
    }

    const submitDisburseBtn = document.getElementById('btnSubmitSalaryDisbursement');
    if (submitDisburseBtn) {
        submitDisburseBtn.addEventListener('click', async () => {
            const employeeId = document.getElementById('salaryEmployeeSelect').value;
            if (!employeeId) {
                alert('يرجى اختيار الموظف المستحق أولاً');
                return;
            }

            const amount = Number(document.getElementById('salaryAmount').value);
            if (!amount || amount <= 0) {
                alert('يرجى إدخال مبلغ صحيح للصرف');
                return;
            }

            const paymentType = document.getElementById('salaryPaymentType').value;
            const paymentSource = document.getElementById('salarySource').value;
            const monthPeriod = document.getElementById('salaryMonthPeriod').value.trim();
            const notes = document.getElementById('salaryNotes').value.trim();

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


