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

const PORT = process.env.PORT || 3000;
const db = getDatabase();
seedDatabase(db);

const services = {
    auth: new AuthService(db),
    session: new SessionService(db),
    pos: new PosService(db),
    inventory: new InventoryService(db),
    purchases: new PurchaseService(db),
    expenses: new ExpenseService(db),
    reports: new ReportService(db),
    printer: new PrinterService(db),
    settings: new SettingsService(db)
};

// RPC Map
const rpcHandlers = {
    'auth/login': ({ username, password }) => services.auth.login(username, password),
    'auth/verify-manager': ({ username, password }) => services.auth.verifyManagerOverride(username, password),
    'auth/list-users': () => services.auth.listUsers(),
    'session/get-active': () => services.session.getActiveSession(),
    'session/open': ({ userId, openingCash, notes }) => services.session.openSession(userId, openingCash, notes),
    'session/get-summary': ({ sessionId }) => services.session.getSessionSummary(sessionId),
    'session/close': ({ sessionId, userId, actualCash, notes }) => services.session.closeSession(sessionId, userId, actualCash, notes),
    'session/list': ({ limit }) => services.session.listSessions(limit),
    'pos/search-products': ({ query, limit }) => services.pos.searchProducts(query, limit),
    'pos/find-barcode': ({ barcode }) => services.pos.findProductByBarcode(barcode),
    'pos/checkout': (data) => services.pos.checkout(data),
    'pos/get-invoice': ({ id }) => services.pos.getInvoiceById(id),
    'pos/void-invoice': ({ invoiceId, managerUserId, reason }) => services.pos.voidInvoice(invoiceId, managerUserId, reason),
    'pos/list-recent': ({ limit }) => services.pos.listRecentInvoices(limit),
    'inventory/list-products': (filters) => services.inventory.listProducts(filters),
    'inventory/create-product': ({ data, userId }) => services.inventory.createProduct(data, userId),
    'inventory/update-product': ({ id, data, userId }) => services.inventory.updateProduct(id, data, userId),
    'inventory/adjust-stock': ({ data, userId, sessionId }) => services.inventory.adjustStock(data, userId, sessionId),
    'inventory/valuation': () => services.inventory.getInventoryValuation(),
    'inventory/list-categories': () => services.inventory.listCategories(),
    'inventory/create-category': ({ name, desc }) => services.inventory.createCategory(name, desc),
    'purchases/list-suppliers': () => services.purchases.listSuppliers(),
    'purchases/create-supplier': (data) => services.purchases.createSupplier(data),
    'purchases/create-invoice': ({ data, userId }) => services.purchases.createPurchaseInvoice(data, userId),
    'purchases/record-payment': ({ data, userId }) => services.purchases.recordSupplierPayment(data, userId),
    'purchases/list-invoices': ({ limit }) => services.purchases.listPurchaseInvoices(limit),
    'expenses/add': ({ data, userId }) => services.expenses.addExpense(data, userId),
    'expenses/list-session': ({ sessionId }) => services.expenses.listSessionExpenses(sessionId),
    'expenses/list-all': ({ limit }) => services.expenses.listAllExpenses(limit),
    'reports/sales-summary': ({ startDate, endDate }) => services.reports.getSalesSummary(startDate, endDate),
    'reports/top-selling': ({ limit, startDate, endDate }) => services.reports.getTopSellingProducts(limit, startDate, endDate),
    'reports/category-sales': ({ startDate, endDate }) => services.reports.getCategorySales(startDate, endDate),
    'reports/dashboard-overview': () => services.reports.getDashboardOverview(),
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

    // Static File Serving
    let reqPath = req.url === '/' ? '/index.html' : req.url;
    // Strip query string
    reqPath = reqPath.split('?')[0];

    const filePath = path.join(__dirname, 'renderer', reqPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.end('404 Not Found');
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', contentType);
        res.end(content);
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Cotton Club POS Server running at http://127.0.0.1:${PORT}`);
});
