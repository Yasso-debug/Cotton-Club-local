/**
 * Cotton Club POS - Local HTTP Server (Dual Runtime Support)
 * Serves the full POS web application and REST/RPC API.
 * Uses zero external dependencies (pure node:http).
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { getDatabase } = require('./database/db');
const { seedDatabase } = require('./database/seed');
const { AuthService } = require('./services/authService');
const { SessionService } = require('./services/sessionService');
const { PosService } = require('./services/posService');
const { InventoryService } = require('./services/inventoryService');
const { PurchaseService } = require('./services/purchaseService');
const { ExpenseService } = require('./services/expenseService');
const { ReportService } = require('./services/reportService');
const { PrinterService } = require('./services/printerService');
const { SettingsService } = require('./services/settingsService');
const { TreasuryService } = require('./services/treasuryService');
const { PayrollService } = require('./services/payrollService');

const PORT = process.env.PORT || 3000;
const db = getDatabase();
seedDatabase(db);

const treasuryService = new TreasuryService(db);
const payrollService = new PayrollService(db, treasuryService);

const sessionService = new SessionService(db, treasuryService);
const posService = new PosService(db, sessionService);

const services = {
    auth: new AuthService(db),
    session: sessionService,
    pos: posService,
    inventory: new InventoryService(db),
    purchases: new PurchaseService(db, treasuryService),
    expenses: new ExpenseService(db),
    reports: new ReportService(db),
    printer: new PrinterService(db),
    settings: new SettingsService(db),
    treasury: treasuryService,
    payroll: payrollService
};

// RPC Map
const rpcHandlers = {
    'auth/login': ({ username, password }) => services.auth.login(username, password),
    'auth/verify-manager': ({ username, password }) => services.auth.verifyManagerOverride(username, password),
    'auth/list-users': () => services.auth.listUsers(),
    'auth/create-user': ({ data, userId }) => services.auth.createUser(data, userId),
    'auth/update-user': ({ id, data, userId }) => services.auth.updateUser(id, data, userId),
    'auth/change-password': ({ id, password, userId }) => services.auth.changePassword(id, password, userId),
    'auth/toggle-status': ({ id, userId }) => services.auth.toggleUserStatus(id, userId),
    'auth/delete-user': ({ id, userId }) => services.auth.deleteUser(id, userId),
    'auth/users-kpis': () => services.auth.getUsersKpis(),
    'session/get-active': () => services.session.getActiveSession(),
    'session/ensure-active': ({ userId } = {}) => services.session.ensureActiveSession(userId),
    'session/open': ({ userId, openingCash, notes }) => services.session.openSession(userId, openingCash, notes),
    'session/get-summary': ({ sessionId }) => services.session.getSessionSummary(sessionId),
    'session/close': ({ sessionId, userId, actualCash, notes }) => services.session.closeSession(sessionId, userId, actualCash, notes),
    'session/list': (filters) => services.session.listSessions(filters),
    'session/check-auto-close': ({ userId } = {}) => services.session.checkAndRolloverShift(userId),
    'session/rollover': ({ userId } = {}) => services.session.checkAndRolloverShift(userId),
    'session/shift-summary': (params) => services.session.getDailyShiftSummary(params),
    'pos/search-products': ({ query, limit, categoryId }) => services.pos.searchProducts(query, limit, categoryId),
    'pos/search-by-category': ({ categoryId, keyword, limit }) => services.pos.searchProductsByCategory(categoryId, keyword, limit),
    'pos/find-barcode': ({ barcode }) => services.pos.findProductByBarcode(barcode),
    'pos/search-customers': ({ query, limit }) => services.pos.searchCustomers(query, limit),
    'pos/quick-create-customer': (params) => services.pos.quickCreateCustomer(params?.data || params),
    'customers/list': (params) => services.pos.listCustomers(params || {}),
    'customers/stats': () => services.pos.getCustomerStats(),
    'customers/create': (params) => services.pos.createCustomer(params?.data || params),
    'customers/update': ({ id, data }) => services.pos.updateCustomer(id, data),
    'customers/delete': ({ id }) => services.pos.deleteCustomer(id),
    'customers/invoices': ({ customerId, limit }) => services.pos.getCustomerInvoices(customerId, limit),
    'pos/get-drawer-cash': ({ sessionId }) => services.pos.getDrawerCash(sessionId),
    'pos/checkout': (data) => services.pos.checkout(data),
    'pos/next-invoice-number': (params) => services.pos.getNextInvoiceNumber(params?.type || 'sale'),
    'pos/get-invoice': ({ id }) => services.pos.getInvoiceById(id),
    'pos/void-invoice': ({ invoiceId, managerUserId, reason }) => services.pos.voidInvoice(invoiceId, managerUserId, reason),
    'pos/list-recent': ({ limit }) => services.pos.listRecentInvoices(limit),
    'pos/invoices-dashboard': (filters) => services.pos.getInvoicesLogDashboard(filters || {}),
    'pos/list-inventory-movements': ({ productId, limit }) => services.pos.listInventoryMovements(productId, limit),
    'inventory/overview': () => services.inventory.getCatalogOverview(),
    'inventory/list-products': (filters) => services.inventory.listProducts(filters || {}),
    'inventory/create-product': ({ data, userId }) => services.inventory.createProduct(data, userId),
    'inventory/update-product': ({ id, data, userId }) => services.inventory.updateProduct(id, data, userId),
    'inventory/delete-product': ({ id, userId }) => services.inventory.deleteProduct(id, userId),
    'inventory/adjust-stock': ({ data, userId, sessionId }) => services.inventory.adjustStock(data, userId, sessionId),
    'inventory/list-adjustments': ({ limit }) => services.inventory.listStockAdjustments(limit),
    'inventory/valuation': () => services.inventory.getInventoryValuation(),
    'inventory/list-categories': (filters) => services.inventory.listCategories(filters || {}),
    'inventory/create-category': (params) => services.inventory.createCategory(params.data || params),
    'inventory/update-category': ({ id, data }) => services.inventory.updateCategory(id, data),
    'inventory/delete-category': ({ id }) => services.inventory.deleteCategory(id),
    'purchases/overview': () => services.purchases.getSuppliersOverview(),
    'purchases/get-suppliers-overview': () => services.purchases.getSuppliersOverview(),
    'purchases/list-suppliers': (params) => services.purchases.listSuppliers(params || {}),
    'purchases/create-supplier': (params) => services.purchases.createSupplier(params.data || params, params.userId),
    'purchases/update-supplier': ({ id, data, userId }) => services.purchases.updateSupplier(id, data, userId),
    'purchases/get-supplier-ledger': ({ supplierId, filters }) => services.purchases.getSupplierLedger(supplierId, filters),
    'purchases/record-split-payment': ({ data, userId }) => services.purchases.recordSupplierSplitPayment(data, userId),
    'purchases/create-invoice': ({ data, userId }) => services.purchases.createPurchaseInvoice(data, userId),
    'purchases/get-invoice': (params) => {
        const id = (params && typeof params === 'object') ? (params.id || params.invoiceId) : params;
        return services.purchases.getPurchaseInvoiceById(id);
    },
    'purchases/record-payment': ({ data, userId }) => services.purchases.recordSupplierPayment(data, userId),
    'purchases/list-invoices': ({ limit }) => services.purchases.listPurchaseInvoices(limit),
    'purchases/create-return': (params) => {
        const data = params.data || params;
        return services.purchases.createPurchaseReturn(data, params.userId || data.userId);
    },
    'purchases/list-returns': (params) => {
        const id = (params && typeof params === 'object') ? (params.invoiceId || params.id) : params;
        return services.purchases.getPurchaseReturnsByInvoice(id);
    },
    'expenses/add': (params) => {
        const d = params.data || params;
        return services.expenses.addExpense(d, params.userId || d.userId || d.user_id);
    },
    'expenses/summary': (params) => services.expenses.getExpensesSummary(params || {}),
    'expenses/analytics': (params) => services.expenses.getExpensesAnalytics(params?.period || 30),
    'expenses/categories': () => services.expenses.getCategories(),
    'expenses/add-category': (params) => services.expenses.addCategory(params?.name || params?.categoryName || params, params?.subcategories),
    'expenses/delete-category': (params) => services.expenses.deleteCategory(params?.id || params?.name || params),
    'expenses/list-session': ({ sessionId }) => services.expenses.listSessionExpenses(sessionId),
    'expenses/list-all': (params) => services.expenses.listAllExpenses(params || {}),
    'expenses/get': (params) => services.expenses.getExpenseById(params?.id || params),
    'reports/sales-summary': ({ startDate, endDate }) => services.reports.getSalesSummary(startDate, endDate),
    'reports/top-selling': ({ limit, startDate, endDate }) => services.reports.getTopSellingProducts(limit, startDate, endDate),
    'reports/category-sales': ({ startDate, endDate }) => services.reports.getCategorySales(startDate, endDate),
    'reports/dashboard-overview': () => services.reports.getDashboardOverview(),
    'reports/comprehensive-analytics': (filters) => services.reports.getComprehensiveAnalytics(filters || {}),
    'treasury/balance': () => services.treasury.getBalance(),
    'treasury/get-balance': () => services.treasury.getBalance(),
    'treasury/deposit': (params) => {
        const d = params.data || params;
        return services.treasury.deposit(d.amount, d.paidBy || d.sourceDestination, d.notes, params.userId || d.userId, d.paymentMethod || d.channel || 'cash');
    },
    'treasury/withdraw': (params) => {
        const d = params.data || params;
        return services.treasury.withdraw(d.amount, d.recipient || d.destination, d.notes, params.userId || d.userId, d.paymentMethod || d.channel || 'cash');
    },
    'treasury/transfer-shift': (params) => {
        const d = params.data || params;
        return services.treasury.transferFromSession(d.sessionId, d.amount, d.notes, params.userId || d.userId);
    },
    'treasury/transfer-channel': (params) => {
        const d = params.data || params;
        return services.treasury.transferBetweenChannels(d.fromChannel || d.fromMethod, d.toChannel || d.toMethod, d.amount, d.notes, params.userId || d.userId);
    },
    'treasury/list-transactions': (params) => services.treasury.listTransactions(params),
    'treasury/quick-disburse': (params) => {
        const d = params.data || params;
        return services.treasury.quickDisburse(d.amount, d.paymentMethod || d.channel, d.recipient, d.category, d.notes, params.userId || d.userId);
    },
    'treasury/analytics': () => services.treasury.getAnalyticsData(),
    'treasury/branch-transfers': (params) => services.treasury.getBranchTransfers(params?.status),
    'treasury/branch-safes': () => services.treasury.getBranchSafesSummary(),
    'payroll/list-employees': (params) => services.payroll.listEmployees(params?.onlyActive ?? params?.activeOnly),
    'payroll/staff-kpis': () => services.payroll.getStaffKpis(),
    'payroll/toggle-employee-status': ({ id, userId }) => services.payroll.toggleEmployeeStatus(id, userId),
    'payroll/create-employee': (params) => {
        const d = params.data || params;
        return services.payroll.createEmployee(d, params.userId || d.userId);
    },
    'payroll/update-employee': ({ id, data, userId }) => services.payroll.updateEmployee(id, data, userId),
    'payroll/delete-employee': ({ id, userId }) => services.payroll.deleteEmployee(id, userId),
    'payroll/disburse-salary': (params) => {
        const d = params.data || params;
        if (d.preventDuplicate === undefined) d.preventDuplicate = true;
        return services.payroll.disburseSalary(d, params.userId || d.userId || d.created_by);
    },
    'payroll/monthly-advances': (params) => {
        const d = params.data || params;
        return services.payroll.getEmployeeMonthlyAdvances(d.employeeId || d.employee_id, d.month || d.period_month);
    },
    'payroll/period-advances': (params) => {
        const d = params.data || params;
        return services.payroll.getEmployeePeriodAdvances(d.employeeId || d.employee_id, d.period || d);
    },
    'payroll/summary': (params) => {
        const d = params.data || params;
        return services.payroll.getPayrollSummary(d.period || d);
    },
    'payroll/check-payout-status': (params) => {
        const d = params.data || params;
        return services.payroll.checkEmployeePayoutStatus(d.employeeId || d.employee_id, d.period || d.month || d.period_month);
    },
    'payroll/disburse-bulk': (params) => {
        const d = params.data || params;
        return services.payroll.disburseBulkPayroll(d.payoutsList, d.channel || d.paymentMethod, params.userId || d.userId);
    },
    'payroll/list-payments': (params) => services.payroll.listSalaryPayments(params || {}),
    'payroll/list-salary-payments': (params) => services.payroll.listSalaryPayments(params || {}),
    'printer/preview-invoice': ({ invoiceId }) => {
        const inv = services.pos.getInvoiceById(invoiceId);
        if (!inv) throw new Error('الفاتورة غير موجودة');
        return services.printer.generateReceiptHtml(inv);
    },
    'printer/print-invoice': ({ invoiceId }) => {
        const inv = services.pos.getInvoiceById(invoiceId);
        if (!inv) throw new Error('الفاتورة غير موجودة');
        return true;
    },
    'printer/print-z-report': ({ sessionId }) => {
        const summary = services.session.getSessionSummary(sessionId);
        return services.printer.generateZReportHtml(summary);
    },
    'settings/get-all': () => services.settings.getAllSettings(),
    'settings/update': ({ settingsMap, userId }) => services.settings.updateSettings(settingsMap, userId)
};

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function getCachedFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return fs.readFileSync(filePath);
}

const server = http.createServer((req, res) => {
    // REST GET endpoints for SWM POS
    if (req.method === 'GET' && req.url.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        try {
            const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
            const pathname = parsedUrl.pathname;

            if (pathname === '/api/swm/pos/shift/summary' || pathname === '/api/session/shift-summary') {
                const date = parsedUrl.searchParams.get('date');
                const branchId = parsedUrl.searchParams.get('branch_id');
                const salespersonId = parsedUrl.searchParams.get('salesperson_id') || parsedUrl.searchParams.get('user_id');
                const data = services.session.getDailyShiftSummary({
                    date,
                    branchId: branchId === 'all' ? null : branchId,
                    userId: salespersonId ? Number(salespersonId) : null
                });
                res.statusCode = 200;
                return res.end(JSON.stringify({ success: true, data }));
            }

            if (pathname.startsWith('/api/swm/pos/invoices/')) {
                const id = pathname.replace('/api/swm/pos/invoices/', '');
                const data = services.pos.getInvoiceById(id);
                res.statusCode = 200;
                return res.end(JSON.stringify({ success: true, data }));
            }

            if (pathname === '/api/swm/expenses/analytics') {
                const period = parsedUrl.searchParams.get('period') || 30;
                const data = services.expenses.getExpensesAnalytics(period);
                res.statusCode = 200;
                return res.end(JSON.stringify({ success: true, data }));
            }

            if (pathname === '/api/swm/expenses/categories') {
                const data = services.expenses.getCategories();
                res.statusCode = 200;
                return res.end(JSON.stringify({ success: true, data }));
            }

            if (pathname === '/api/swm/expenses') {
                const date = parsedUrl.searchParams.get('date');
                const sessionId = parsedUrl.searchParams.get('session_id');
                const data = services.expenses.getExpensesSummary({ date, sessionId });
                res.statusCode = 200;
                return res.end(JSON.stringify({ success: true, data }));
            }

            if (pathname === '/api/treasury/analytics') {
                const data = services.treasury.getAnalyticsData();
                res.statusCode = 200;
                return res.end(JSON.stringify({ success: true, data }));
            }

            res.statusCode = 404;
            return res.end(JSON.stringify({ success: false, error: `Endpoint not found: ${pathname}` }));
        } catch (err) {
            res.statusCode = 200;
            return res.end(JSON.stringify({ success: false, error: err.message }));
        }
    }

    // API Router (POST)
    if (req.url.startsWith('/api/') && req.method === 'POST') {
        const endpoint = req.url.slice(5).split('?')[0]; // Remove '/api/' and query params
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            let handler = rpcHandlers[endpoint];
            if (!handler && endpoint === 'swm/pos/shift/summary') {
                handler = (p) => services.session.getDailyShiftSummary(p);
            }
            if (!handler && endpoint === 'swm/expenses') {
                handler = (p) => services.expenses.addExpense(p, p.userId || p.user_id || 1);
            }
            res.setHeader('Content-Type', 'application/json; charset=utf-8');

            if (!handler) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ success: false, error: `Endpoint not found: ${endpoint}` }));
            }

            try {
                const params = body ? JSON.parse(body) : {};
                const data = handler(params);
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, data }));
            } catch (err) {
                res.statusCode = 200;
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // Static File Serving
    let reqPath = req.url === '/' ? '/index.html' : req.url;
    // Strip query string
    reqPath = reqPath.split('?')[0];

    // Handle favicon.ico gracefully by redirecting to logo.png
    let filePath;
    let contentType;
    if (reqPath === '/favicon.ico') {
        filePath = path.join(__dirname, 'renderer', 'assets', 'logo.png');
        contentType = 'image/png';
    } else {
        filePath = path.join(__dirname, 'renderer', reqPath);
        const ext = path.extname(filePath).toLowerCase();
        contentType = mimeTypes[ext] || 'application/octet-stream';
    }

    const content = getCachedFile(filePath);
    if (!content) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.end('404 Not Found');
    }

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.end(content);
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Cotton Club POS Server running at http://127.0.0.1:${PORT}`);

    // Continuous Shift Auto-Ensure & Periodic Rollover Guard
    try {
        const initialSession = services.session.ensureActiveSession(1);
        console.log(`[Shift Guard] Active continuous session ready: ${initialSession.session_code}`);
    } catch (e) {
        console.error('[Shift Guard] Startup session error:', e.message);
    }

    setInterval(() => {
        try {
            const res = services.session.checkAndRolloverShift(1);
            if (res && res.rolledOver) {
                console.log(`[Shift Guard] Daily shift rolled over! Old: ${res.closedSessionCode}, New: ${res.newSession.session_code}, Cash sent to safe: ${res.transferredAmount} EGP`);
            }
        } catch (err) {
            console.error('[Shift Guard] Rollover interval error:', err.message);
        }
    }, 60000);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
