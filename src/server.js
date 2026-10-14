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

const services = {
    auth: new AuthService(db),
    session: new SessionService(db),
    pos: new PosService(db),
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
    'session/open': ({ userId, openingCash, notes }) => services.session.openSession(userId, openingCash, notes),
    'session/get-summary': ({ sessionId }) => services.session.getSessionSummary(sessionId),
    'session/close': ({ sessionId, userId, actualCash, notes }) => services.session.closeSession(sessionId, userId, actualCash, notes),
    'session/list': (filters) => services.session.listSessions(filters),
    'pos/search-products': ({ query, limit }) => services.pos.searchProducts(query, limit),
    'pos/find-barcode': ({ barcode }) => services.pos.findProductByBarcode(barcode),
    'pos/search-customers': ({ query, limit }) => services.pos.searchCustomers(query, limit),
    'pos/quick-create-customer': (params) => services.pos.quickCreateCustomer(params?.data || params),
    'pos/get-drawer-cash': ({ sessionId }) => services.pos.getDrawerCash(sessionId),
    'pos/checkout': (data) => services.pos.checkout(data),
    'pos/get-invoice': ({ id }) => services.pos.getInvoiceById(id),
    'pos/void-invoice': ({ invoiceId, managerUserId, reason }) => services.pos.voidInvoice(invoiceId, managerUserId, reason),
    'pos/list-recent': ({ limit }) => services.pos.listRecentInvoices(limit),
    'pos/invoices-dashboard': (filters) => services.pos.getInvoicesLogDashboard(filters || {}),
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
    'expenses/add': ({ data, userId }) => services.expenses.addExpense(data, userId),
    'expenses/list-session': ({ sessionId }) => services.expenses.listSessionExpenses(sessionId),
    'expenses/list-all': ({ limit }) => services.expenses.listAllExpenses(limit),
    'reports/sales-summary': ({ startDate, endDate }) => services.reports.getSalesSummary(startDate, endDate),
    'reports/top-selling': ({ limit, startDate, endDate }) => services.reports.getTopSellingProducts(limit, startDate, endDate),
    'reports/category-sales': ({ startDate, endDate }) => services.reports.getCategorySales(startDate, endDate),
    'reports/dashboard-overview': () => services.reports.getDashboardOverview(),
    'treasury/balance': () => services.treasury.getBalance(),
    'treasury/get-balance': () => services.treasury.getBalance(),
    'treasury/deposit': (params) => {
        const d = params.data || params;
        return services.treasury.deposit(d.amount, d.paidBy || d.sourceDestination, d.notes, params.userId || d.userId);
    },
    'treasury/withdraw': (params) => {
        const d = params.data || params;
        return services.treasury.withdraw(d.amount, d.recipient || d.destination, d.notes, params.userId || d.userId);
    },
    'treasury/transfer-shift': (params) => {
        const d = params.data || params;
        return services.treasury.transferFromSession(d.sessionId, d.amount, d.notes, params.userId || d.userId);
    },
    'treasury/list-transactions': ({ limit }) => services.treasury.listTransactions(limit),
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
        return services.payroll.disburseSalary(d, params.userId || d.userId);
    },
    'payroll/list-payments': ({ limit }) => services.payroll.listSalaryPayments(limit),
    'payroll/list-salary-payments': ({ limit }) => services.payroll.listSalaryPayments(limit),
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
    '.svg': 'image/svg+xml'
};

function getCachedFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return fs.readFileSync(filePath);
}

const server = http.createServer((req, res) => {
    // API Router
    if (req.url.startsWith('/api/') && req.method === 'POST') {
        const endpoint = req.url.slice(5); // Remove '/api/'
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const handler = rpcHandlers[endpoint];
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

    // Static File Serving with in-memory caching
    let reqPath = req.url === '/' ? '/index.html' : req.url;
    // Strip query string
    reqPath = reqPath.split('?')[0];

    const filePath = path.join(__dirname, 'renderer', reqPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

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
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
