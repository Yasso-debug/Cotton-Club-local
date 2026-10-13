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
        listSessions: (filters) => rpc('session/list', typeof filters === 'number' ? { limit: filters } : (filters || {})),
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
        listStockAdjustments: (limit) => rpc('inventory/list-adjustments', { limit }),
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
        updateSettings: (settingsMap, userId) => rpc('settings/update', { settingsMap, userId }),
        // Treasury (الخزنة المركزية)
        getTreasuryBalance: () => rpc('treasury/balance'),
        treasuryDeposit: (data, userId) => rpc('treasury/deposit', { data, userId }),
        treasuryWithdraw: (data, userId) => rpc('treasury/withdraw', { data, userId }),
        transferShiftToTreasury: (sessionId, amount, userId) => rpc('treasury/transfer-shift', { sessionId, amount, userId }),
        listTreasuryTransactions: (limit) => rpc('treasury/list-transactions', { limit }),
        // Payroll & Staff (الموظفين والمرتبات)
        listEmployees: (activeOnly) => rpc('payroll/list-employees', { activeOnly }),
        createEmployee: (data) => rpc('payroll/create-employee', data),
        updateEmployee: (id, data) => rpc('payroll/update-employee', { id, data }),
        disburseSalary: (data, userId) => rpc('payroll/disburse-salary', { data, userId }),
        listSalaryPayments: (limit) => rpc('payroll/list-salary-payments', { limit })
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
    bindExpenseEvents();
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
        infoText.innerHTML = 'دخول نقطة البيع المباشرة (POS)<br>مسح الباركود، إصدار الفواتير الفورية، وتسليم عهدة الوردية.';
        usernameInput.value = 'co';
        passwordInput.value = 'co';
        loginBtnText.innerText = 'دخول نقطة البيع والوردية';
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
        document.getElementById('headerUserName').innerText = state.currentUser.displayName;
        document.getElementById('headerUserRole').innerText = isAdmin ? 'مدير عام' : 'كاشير (Chair)';

        // Role-based sidebar menu isolation (Cashier sees only POS, Session, Expenses, and Hub)
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? 'flex' : 'none';
        });

        // Hide Dedicated Login Screen
        document.getElementById('loginScreen').style.display = 'none';

        await loadSettings();
        await refreshSessionState();
        await loadPosProducts();

        // Switch to Hub landing page with role-tailored hover cards
        await renderRoleHub();
        switchView('hub');
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

async function renderRoleHub() {
    if (!state.currentUser) return;
    const isCashier = state.currentUser.role === 'cashier';
    const grid = document.getElementById('hubCardsGrid');
    if (!grid) return;

    const titleEl = document.getElementById('hubWelcomeTitle');
    const subtitleEl = document.getElementById('hubWelcomeSubtitle');
    const roleBadgeEl = document.getElementById('hubRoleBadge');

    grid.innerHTML = '';

    if (isCashier) {
        // Chair / Cashier: Exactly 3 Hover Cards
        if (titleEl) titleEl.innerText = `مرحباً بك، ${state.currentUser.displayName} — وردية المبيعات`;
        if (subtitleEl) subtitleEl.innerText = 'لوحة الوصول السريع المخصصة لإنجاز عمليات البيع والوردية اليومية';
        if (roleBadgeEl) {
            roleBadgeEl.innerText = 'كاشير مبيعات (Chair)';
            roleBadgeEl.className = 'user-role-tag';
        }

        const sessionStatePill = state.activeSession 
            ? '<span class="card-kpi-pill" style="color: #059669; background: #ECFDF5; border-color: #A7F3D0;">الوردية مفتوحة</span>'
            : '<span class="card-kpi-pill" style="color: #E11D48; background: #FFF1F2; border-color: #FECDD3;">الوردية مغلقة</span>';

        const cashierCards = [
            {
                view: 'pos',
                theme: 'theme-pos',
                icon: 'shopping-cart',
                tag: 'نقطة البيع (F1)',
                title: 'شاشة البيع المباشر (POS)',
                desc: 'مسح باركود الملابس، إصدار فواتير نقدية وشبكة، إدارة السلة، وتطبيق الخصومات وطباعة الإيصالات.',
                kpi: '<span class="card-kpi-pill">F1 - بدء البيع</span>'
            },
            {
                view: 'session',
                theme: 'theme-session',
                icon: 'calendar-check',
                tag: 'حسابات الوردية',
                title: 'الوردية اليومية (Daily Session)',
                desc: 'استلام عهدة بداية اليوم، متابعة النقدية بالدرج، إغلاق الوردية، وطباعة التقرير الختامي Z-Report.',
                kpi: sessionStatePill
            },
            {
                view: 'expenses',
                theme: 'theme-expenses',
                icon: 'receipt',
                tag: 'المصروفات النثرية',
                title: 'المصروفات النثرية من الدرج',
                desc: 'تسجيل سندات الصرف النثرية المستعجلة (ضيافة، نظافة، نثريات) المخصومة مباشرة من درج الكاشير.',
                kpi: '<span class="card-kpi-pill">سندات الدرج</span>'
            }
        ];

        cashierCards.forEach(card => {
            const el = document.createElement('div');
            el.className = `hover-hub-card ${card.theme}`;
            el.dataset.view = card.view;
            el.setAttribute('tabindex', '0');
            el.setAttribute('role', 'button');
            el.innerHTML = `
                <div class="card-header-flex">
                    <div class="card-icon-box">
                        <i data-lucide="${card.icon}"></i>
                    </div>
                    <span class="card-category-tag">${card.tag}</span>
                </div>
                <div class="card-body-content">
                    <div class="card-title">${card.title}</div>
                    <div class="card-desc">${card.desc}</div>
                </div>
                <div class="card-footer-action">
                    ${card.kpi}
                    <span class="card-arrow-link">
                        <span>دخول</span>
                        <i data-lucide="arrow-left" class="icon-xs"></i>
                    </span>
                </div>
            `;
            const activate = () => switchView(card.view);
            el.addEventListener('click', activate);
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activate();
                }
            });
            grid.appendChild(el);
        });
    } else {
        // Admin: Exactly 9 Hover Cards
        if (titleEl) titleEl.innerText = `مرحباً بك، ${state.currentUser.displayName} — لوحة الإدارة العامة`;
        if (subtitleEl) subtitleEl.innerText = 'المركز القيادي الشامل لمتجر Cotton Club Store (المخازن، الخزنة، والمبيعات)';
        if (roleBadgeEl) {
            roleBadgeEl.innerText = 'مدير عام (Admin)';
            roleBadgeEl.className = 'user-role-tag';
        }

        // Live KPI fetches
        let treasuryBal = '15,000.00';
        let prodCount = '0';
        let empCount = '2';

        try {
            const [tRes, valRes, empRes] = await Promise.all([
                window.api.getTreasuryBalance(),
                window.api.getInventoryValuation(),
                window.api.listEmployees()
            ]);
            if (tRes?.success) treasuryBal = Number(tRes.data.balance).toFixed(2);
            if (valRes?.success) prodCount = String(valRes.data.totalItems);
            if (empRes?.success) empCount = String(empRes.data.length);
        } catch (e) {
            console.warn('Hub metrics load error:', e);
        }

        const adminCards = [
            {
                view: 'session',
                theme: 'theme-session',
                icon: 'calendar-days',
                tag: 'ورديات وتدقيق',
                title: 'اليومية بفلتر فترات',
                desc: 'مراجعة وتدقيق سجل الورديات اليومية السابقة والحالية، مع فلترة مخصصة بالتواريخ ومتابعة العجز والزيادة.',
                kpi: '<span class="card-kpi-pill">فلتر فترات متقدم</span>'
            },
            {
                view: 'inventory',
                theme: 'theme-inventory',
                icon: 'package',
                tag: 'المخزون والمنتجات',
                title: 'المجموعات والأصناف',
                desc: 'إدارة كتالوج الملابس، الأقسام، أسعار البيع والتكلفة، حساب هوامش الأرباح، وحدود طلب النواقص.',
                kpi: `<span class="card-kpi-pill" style="color: #4F46E5; font-weight: bold;">${prodCount} صنف مسجل</span>`
            },
            {
                view: 'stock-audit',
                theme: 'theme-audit',
                icon: 'clipboard-check',
                tag: 'رقابة المستودع',
                title: 'جرد المخزون بسند تسوية',
                desc: 'المطابقة الدفترية والفعلية لأرصدة الرفوف وإصدار سندات تسوية فورية معتمدة لعلاج أي عجز أو فائض.',
                kpi: '<span class="card-kpi-pill">تسوية جرد فورية</span>'
            },
            {
                view: 'purchases',
                theme: 'theme-purchases',
                subTab: 'suppliers',
                icon: 'users',
                tag: 'المديونيات والشركاء',
                title: 'حسابات موردين',
                desc: 'كشوفات حسابات الموردين، متابعة الدفعات النقدية المسددة، وأرصدة المديونيات المستحقة للمحل.',
                kpi: '<span class="card-kpi-pill">متابعة الذمم الدائنة</span>'
            },
            {
                view: 'purchases',
                theme: 'theme-purchases',
                subTab: 'invoices',
                icon: 'truck',
                tag: 'وارد المستودع',
                title: 'فواتير شراء بضاعة',
                desc: 'تسجيل شحنات وفواتير شراء البضاعة الجديدة مع تحديث تكلفة الأصناف وتغذية أرصدة المخازن آلياً.',
                kpi: '<span class="card-kpi-pill">شراء وتغذية المخزن</span>'
            },
            {
                view: 'treasury',
                theme: 'theme-treasury',
                icon: 'landmark',
                tag: 'الخزينة المستقلة',
                title: 'خزنة مركزية (Safe)',
                desc: 'حساب الخزنة الرئيسي المنفصل تماماً عن درج بيع الكاشير، لإيداعات رأس المال والمسحوبات وتوريدات الورديات.',
                kpi: `<span class="card-kpi-pill" style="color: #0D9488; font-weight: 800;">${treasuryBal} ج.م</span>`
            },
            {
                view: 'staff',
                theme: 'theme-salaries',
                subTab: 'salaries',
                icon: 'banknote',
                tag: 'الأجور والرواتب',
                title: 'صرف مرتبات وسلف',
                desc: 'إصدار سندات صرف رواتب العاملين، السلف المؤقتة، والحوافز مع التخصيم من الخزنة المركزية أو الدرج.',
                kpi: '<span class="card-kpi-pill">مسيرات وسلف دورية</span>'
            },
            {
                view: 'staff',
                theme: 'theme-staff',
                subTab: 'employees',
                icon: 'contact',
                tag: 'شؤون العاملين',
                title: 'دليل الموظفين',
                desc: 'سجل شؤون العاملين، بيانات الاتصال، الوظائف والصلاحيات، والرواتب الأساسية المعتمدة.',
                kpi: `<span class="card-kpi-pill">${empCount} موظف مسجل</span>`
            },
            {
                view: 'reports',
                theme: 'theme-reports',
                icon: 'bar-chart-3',
                tag: 'مؤشرات الأداء',
                title: 'تحليلات المبيعات',
                desc: 'تقارير ذكية عن الإيرادات، مجمل الأرباح، الأصناف الأعلى مبيعاً، ومبيعات الأقسام بالفترات.',
                kpi: '<span class="card-kpi-pill">مؤشرات الأرباح والنمو</span>'
            }
        ];

        adminCards.forEach(card => {
            const el = document.createElement('div');
            el.className = `hover-hub-card ${card.theme}`;
            el.dataset.view = card.view;
            el.setAttribute('tabindex', '0');
            el.setAttribute('role', 'button');
            el.innerHTML = `
                <div class="card-header-flex">
                    <div class="card-icon-box">
                        <i data-lucide="${card.icon}"></i>
                    </div>
                    <span class="card-category-tag">${card.tag}</span>
                </div>
                <div class="card-body-content">
                    <div class="card-title">${card.title}</div>
                    <div class="card-desc">${card.desc}</div>
                </div>
                <div class="card-footer-action">
                    ${card.kpi}
                    <span class="card-arrow-link">
                        <span>دخول</span>
                        <i data-lucide="arrow-left" class="icon-xs"></i>
                    </span>
                </div>
            `;
            const activate = () => {
                switchView(card.view);
                if (card.subTab && card.view === 'staff') {
                    switchStaffTab(card.subTab);
                }
            };
            el.addEventListener('click', activate);
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activate();
                }
            });
            grid.appendChild(el);
        });
    }

    refreshIcons(grid);
}

function switchStaffTab(tabName) {
    const isEmployees = tabName === 'employees';
    const tabBtnEmp = document.getElementById('tabBtnEmployees');
    const tabBtnSal = document.getElementById('tabBtnSalaries');
    const panelEmp = document.getElementById('staffTabEmployees');
    const panelSal = document.getElementById('staffTabSalaries');

    if (tabBtnEmp && tabBtnSal && panelEmp && panelSal) {
        tabBtnEmp.classList.toggle('active', isEmployees);
        tabBtnSal.classList.toggle('active', !isEmployees);
        panelEmp.style.display = isEmployees ? 'flex' : 'none';
        panelSal.style.display = !isEmployees ? 'flex' : 'none';
    }
}

function switchView(viewName) {
    // Restrict cashier to allowed views
    const cashierAllowed = ['hub', 'pos', 'session', 'expenses'];
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
        document.getElementById('posBarcodeInput').focus();
        loadPosProducts();
    } else if (viewName === 'session') {
        loadSessionDashboard();
    } else if (viewName === 'inventory') {
        loadInventoryView();
    } else if (viewName === 'stock-audit') {
        loadStockAuditView();
    } else if (viewName === 'purchases') {
        loadPurchasesView();
    } else if (viewName === 'treasury') {
        loadTreasuryView();
    } else if (viewName === 'staff') {
        loadStaffView();
    } else if (viewName === 'expenses') {
        loadExpensesView();
    } else if (viewName === 'reports') {
        loadReportsView();
    } else if (viewName === 'settings') {
        populateSettingsForm();
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
                <button class="btn-primary" style="padding: 4px 10px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;" onclick="addProdById(${prod.id})">
                    <i data-lucide="plus" class="icon-xs"></i>
                    <span>إضافة</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    refreshIcons(tbody);
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
                <button class="btn-qty" onclick="changeQty(${index}, -1)" title="تقليل الكمية">
                    <i data-lucide="minus"></i>
                </button>
                <span style="font-weight: bold; width: 22px; text-align: center;">${item.quantity}</span>
                <button class="btn-qty" onclick="changeQty(${index}, 1)" title="زيادة الكمية">
                    <i data-lucide="plus"></i>
                </button>
                <button class="btn-del" onclick="removeCartItem(${index})" title="حذف الصنف">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
    refreshIcons(container);

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

    // Date range & status filters
    const filterBtn = document.getElementById('btnFilterSessions');
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            const startDate = document.getElementById('sessionFilterStartDate')?.value || null;
            const endDate = document.getElementById('sessionFilterEndDate')?.value || null;
            const status = document.getElementById('sessionFilterStatus')?.value || null;
            loadSessionDashboard({ startDate, endDate, status, limit: 50 });
        });
    }

    const resetBtn = document.getElementById('btnResetSessionFilters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (document.getElementById('sessionFilterStartDate')) document.getElementById('sessionFilterStartDate').value = '';
            if (document.getElementById('sessionFilterEndDate')) document.getElementById('sessionFilterEndDate').value = '';
            if (document.getElementById('sessionFilterStatus')) document.getElementById('sessionFilterStatus').value = '';
            loadSessionDashboard();
        });
    }
}

async function loadSessionDashboard(filters = null) {
    if (state.activeSession) {
        const summaryRes = await window.api.getSessionSummary(state.activeSession.id);
        if (summaryRes.success) {
            const s = summaryRes.data;
            document.getElementById('sessionCardOpening').innerText = `${s.openingCash.toFixed(2)} ج.م`;
            document.getElementById('sessionCardSales').innerText = `${s.totalSales.toFixed(2)} ج.م`;
            document.getElementById('sessionCardExpenses').innerText = `${s.totalExpenses.toFixed(2)} ج.م`;
            document.getElementById('sessionCardSuppliers').innerText = `${s.totalSupplierPayments.toFixed(2)} ج.م`;
            document.getElementById('sessionCardExpected').innerText = `${s.expectedCash.toFixed(2)} ج.م`;
        }
    } else {
        document.getElementById('sessionCardOpening').innerText = `0.00 ج.م`;
        document.getElementById('sessionCardSales').innerText = `0.00 ج.م`;
        document.getElementById('sessionCardExpenses').innerText = `0.00 ج.م`;
        document.getElementById('sessionCardSuppliers').innerText = `0.00 ج.م`;
        document.getElementById('sessionCardExpected').innerText = `0.00 ج.م`;
    }

    const queryFilters = filters || { limit: 20 };
    const histRes = await window.api.listSessions(queryFilters);
    if (histRes.success) {
        const tbody = document.getElementById('sessionHistoryTableBody');
        tbody.innerHTML = '';
        if (!histRes.data || histRes.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 18px;">لا توجد ورديات تطابق معايير البحث المحددة</td></tr>';
            return;
        }
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

/* -------------------------------------------------------------
 * 10. STOCK AUDIT & PHYSICAL ADJUSTMENT VOUCHERS
 * ------------------------------------------------------------- */
function bindStockAuditEvents() {
    const openRecountBtn = document.getElementById('btnOpenStockRecountModal');
    if (openRecountBtn) {
        openRecountBtn.addEventListener('click', async () => {
            const pRes = await window.api.listProducts({});
            const sel = document.getElementById('recountProductSelect');
            sel.innerHTML = '<option value="">اختر الصنف المراد جرده وتسويته...</option>';
            
            pRes.data?.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.dataset.stock = p.current_stock;
                opt.dataset.barcode = p.barcode;
                opt.dataset.name = p.item_name;
                opt.innerText = `${p.barcode} - ${p.item_name} (الرصيد الدفتري: ${p.current_stock})`;
                sel.appendChild(opt);
            });

            document.getElementById('recountCurrentStock').value = '';
            document.getElementById('recountActualStock').value = '';
            document.getElementById('recountNotes').value = '';
            document.getElementById('recountDiffBanner').style.display = 'none';

            document.getElementById('modalStockRecount').classList.add('active');
        });
    }

    const recountSel = document.getElementById('recountProductSelect');
    if (recountSel) {
        recountSel.addEventListener('change', () => {
            const opt = recountSel.options[recountSel.selectedIndex];
            if (opt && opt.value) {
                document.getElementById('recountCurrentStock').value = opt.dataset.stock || 0;
            } else {
                document.getElementById('recountCurrentStock').value = '';
            }
            updateStockRecountDiffBanner();
        });
    }

    const actualInput = document.getElementById('recountActualStock');
    if (actualInput) {
        actualInput.addEventListener('input', updateStockRecountDiffBanner);
    }

    const submitRecountBtn = document.getElementById('btnSubmitStockRecount');
    if (submitRecountBtn) {
        submitRecountBtn.addEventListener('click', async () => {
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
            const notes = document.getElementById('recountNotes').value.trim();

            const res = await window.api.adjustStock({
                productId: Number(productId),
                quantityDiff: diff,
                reason,
                notes
            }, state.currentUser.id, state.activeSession?.id);

            if (!res.success) {
                alert(`خطأ في تطبيق سند التسوية: ${res.error}`);
                return;
            }

            alert(`تم تطبيق سند التسوية المخزنية بنجاح!\nالرصيد السابق: ${bookStock} | الرصيد الفعلي الجديد: ${actualStock} (${diff >= 0 ? '+' + diff : diff})`);
            document.getElementById('modalStockRecount').classList.remove('active');
            await loadStockAuditView();
        });
    }
}

function updateStockRecountDiffBanner() {
    const bookVal = document.getElementById('recountCurrentStock').value;
    const actualVal = document.getElementById('recountActualStock').value;
    const banner = document.getElementById('recountDiffBanner');
    if (!banner) return;

    if (bookVal === '' || actualVal === '') {
        banner.style.display = 'none';
        return;
    }

    const book = Number(bookVal);
    const actual = Number(actualVal);
    const diff = actual - book;

    banner.style.display = 'block';
    if (diff === 0) {
        banner.style.background = '#ECFDF5';
        banner.style.color = '#065F46';
        banner.style.border = '1px solid #A7F3D0';
        banner.innerText = 'الكمية الفعلية المحصية مطابقة تماماً للرصيد الدفتري (فارق 0)';
    } else if (diff < 0) {
        banner.style.background = '#FEF2F2';
        banner.style.color = '#991B1B';
        banner.style.border = '1px solid #FECACA';
        banner.innerText = `عجز مخزني قدره: ${diff} قطعة (سيتم تخفيض رصيد الصنف وتوثيق السند)`;
    } else {
        banner.style.background = '#EFF6FF';
        banner.style.color = '#1E40AF';
        banner.style.border = '1px solid #BFDBFE';
        banner.innerText = `فائض مخزني قدره: +${diff} قطعة (سيتم زيادة رصيد الصنف وتوثيق السند)`;
    }
}

async function loadStockAuditView() {
    const res = await window.api.listStockAdjustments(50);
    const tbody = document.getElementById('stockAdjustmentsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!res.success || !res.data || res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 20px;">لا توجد سندات تسوية مخزنية مسجلة</td></tr>';
        return;
    }

    res.data.forEach(a => {
        const tr = document.createElement('tr');
        const diffColor = a.quantity_diff < 0 ? 'var(--accent-rose)' : a.quantity_diff > 0 ? 'var(--accent-emerald)' : 'inherit';
        const diffSign = a.quantity_diff > 0 ? '+' : '';
        tr.innerHTML = `
            <td style="font-weight: bold; font-family: monospace;">#ADJ-${a.id}</td>
            <td style="font-family: monospace;">${a.barcode}</td>
            <td style="font-weight: 600;">${a.item_name}</td>
            <td>${a.current_stock_before}</td>
            <td style="font-weight: bold;">${a.new_stock_after}</td>
            <td style="color: ${diffColor}; font-weight: bold;">${diffSign}${a.quantity_diff}</td>
            <td><span class="badge" style="background: var(--bg-card-hover);">${a.adjustment_type}</span></td>
            <td>${a.reason || '-'}</td>
            <td>${a.user_name || '-'}</td>
            <td style="font-size: 12px; color: var(--text-muted);">${a.created_at}</td>
        `;
        tbody.appendChild(tr);
    });
}

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

    // New employee modal
    const openNewEmpBtn = document.getElementById('btnOpenNewEmployeeModal');
    if (openNewEmpBtn) {
        openNewEmpBtn.addEventListener('click', () => {
            document.getElementById('empFullName').value = '';
            document.getElementById('empPhone').value = '';
            document.getElementById('empBaseSalary').value = '3000';
            document.getElementById('empNotes').value = '';
            document.getElementById('modalNewEmployee').classList.add('active');
        });
    }

    const submitNewEmpBtn = document.getElementById('btnSubmitNewEmployee');
    if (submitNewEmpBtn) {
        submitNewEmpBtn.addEventListener('click', async () => {
            const fullName = document.getElementById('empFullName').value.trim();
            if (!fullName) {
                alert('يرجى إدخال اسم الموظف');
                return;
            }

            const roleTitle = document.getElementById('empRoleTitle').value;
            const phone = document.getElementById('empPhone').value.trim();
            const baseSalary = Number(document.getElementById('empBaseSalary').value) || 0;
            const notes = document.getElementById('empNotes').value.trim();

            const res = await window.api.createEmployee({
                fullName,
                roleTitle,
                phone,
                baseSalary,
                notes
            });

            if (!res.success) {
                alert(`خطأ في إضافة الموظف: ${res.error}`);
                return;
            }

            alert(`تم تسجيل الموظف "${fullName}" بنجاح في سجل العاملين`);
            document.getElementById('modalNewEmployee').classList.remove('active');
            await loadStaffView();
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
                    <td><span class="badge" style="background: var(--bg-card-hover);">${e.role_title}</span></td>
                    <td style="font-family: monospace;">${e.phone || '-'}</td>
                    <td style="color: var(--accent-emerald); font-weight: bold;">${e.base_salary.toFixed(2)} ج.م</td>
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

