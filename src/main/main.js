/**
 * Cotton Club POS - Electron Main Process
 * Manages native lifecycle, IPC router, database connection, and thermal printing.
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { getDatabase } = require('../database/db');
const { seedDatabase } = require('../database/seed');
const { AuthService } = require('../services/authService');
const { SessionService } = require('../services/sessionService');
const { PosService } = require('../services/posService');
const { InventoryService } = require('../services/inventoryService');
const { PurchaseService } = require('../services/purchaseService');
const { ExpenseService } = require('../services/expenseService');
const { ReportService } = require('../services/reportService');
const { PrinterService } = require('../services/printerService');
const { SettingsService } = require('../services/settingsService');

let mainWindow = null;
let db = null;
let services = {};

function initAppServices() {
    // Connect to SQLite database with WAL mode and pragmas
    db = getDatabase();
    seedDatabase(db);

    services = {
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
}

function registerIpcHandlers() {
    // Helper to safely wrap async/sync service invocations
    const handle = (channel, fn) => {
        ipcMain.handle(channel, async (_event, ...args) => {
            try {
                return { success: true, data: await fn(...args) };
            } catch (err) {
                console.error(`[IPC Error] ${channel}:`, err.message);
                return { success: false, error: err.message };
            }
        });
    };

    // Auth
    handle('auth:login', ({ username, password }) => services.auth.login(username, password));
    handle('auth:verify-manager', ({ username, password }) => services.auth.verifyManagerOverride(username, password));
    handle('auth:list-users', () => services.auth.listUsers());

    // Session
    handle('session:get-active', () => services.session.getActiveSession());
    handle('session:open', ({ userId, openingCash, notes }) => services.session.openSession(userId, openingCash, notes));
    handle('session:get-summary', ({ sessionId }) => services.session.getSessionSummary(sessionId));
    handle('session:close', ({ sessionId, userId, actualCash, notes }) => services.session.closeSession(sessionId, userId, actualCash, notes));
    handle('session:list', ({ limit }) => services.session.listSessions(limit));

    // POS
    handle('pos:search-products', ({ query, limit }) => services.pos.searchProducts(query, limit));
    handle('pos:find-barcode', ({ barcode }) => services.pos.findProductByBarcode(barcode));
    handle('pos:checkout', (saleData) => services.pos.checkout(saleData));
    handle('pos:get-invoice', ({ id }) => services.pos.getInvoiceById(id));
    handle('pos:void-invoice', ({ invoiceId, managerUserId, reason }) => services.pos.voidInvoice(invoiceId, managerUserId, reason));
    handle('pos:list-recent', ({ limit }) => services.pos.listRecentInvoices(limit));

    // Inventory
    handle('inventory:list-products', (filters) => services.inventory.listProducts(filters));
    handle('inventory:create-product', ({ data, userId }) => services.inventory.createProduct(data, userId));
    handle('inventory:update-product', ({ id, data, userId }) => services.inventory.updateProduct(id, data, userId));
    handle('inventory:adjust-stock', ({ data, userId, sessionId }) => services.inventory.adjustStock(data, userId, sessionId));
    handle('inventory:valuation', () => services.inventory.getInventoryValuation());
    handle('inventory:list-categories', () => services.inventory.listCategories());
    handle('inventory:create-category', ({ name, desc }) => services.inventory.createCategory(name, desc));

    // Purchases
    handle('purchases:list-suppliers', () => services.purchases.listSuppliers());
    handle('purchases:create-supplier', (data) => services.purchases.createSupplier(data));
    handle('purchases:create-invoice', ({ data, userId }) => services.purchases.createPurchaseInvoice(data, userId));
    handle('purchases:record-payment', ({ data, userId }) => services.purchases.recordSupplierPayment(data, userId));
    handle('purchases:list-invoices', ({ limit }) => services.purchases.listPurchaseInvoices(limit));

    // Expenses
    handle('expenses:add', ({ data, userId }) => services.expenses.addExpense(data, userId));
    handle('expenses:list-session', ({ sessionId }) => services.expenses.listSessionExpenses(sessionId));
    handle('expenses:list-all', ({ limit }) => services.expenses.listAllExpenses(limit));

    // Reports
    handle('reports:sales-summary', ({ startDate, endDate }) => services.reports.getSalesSummary(startDate, endDate));
    handle('reports:top-selling', ({ limit, startDate, endDate }) => services.reports.getTopSellingProducts(limit, startDate, endDate));
    handle('reports:category-sales', ({ startDate, endDate }) => services.reports.getCategorySales(startDate, endDate));
    handle('reports:dashboard-overview', () => services.reports.getDashboardOverview());

    // Printing
    handle('printer:preview-invoice', ({ invoiceId }) => {
        const inv = services.pos.getInvoiceById(invoiceId);
        if (!inv) throw new Error('الفاتورة غير موجودة');
        return services.printer.generateReceiptHtml(inv);
    });

    handle('printer:print-invoice', async ({ invoiceId }) => {
        const inv = services.pos.getInvoiceById(invoiceId);
        if (!inv) throw new Error('الفاتورة غير موجودة');
        const html = services.printer.generateReceiptHtml(inv);
        await printHtmlSilent(html);
        return true;
    });

    handle('printer:print-z-report', async ({ sessionId }) => {
        const summary = services.session.getSessionSummary(sessionId);
        const html = services.printer.generateZReportHtml(summary);
        await printHtmlSilent(html);
        return true;
    });

    // Settings
    handle('settings:get-all', () => services.settings.getAllSettings());
    handle('settings:update', ({ settingsMap, userId }) => services.settings.updateSettings(settingsMap, userId));
}

/**
 * Print thermal receipt silently or via virtual thermal print preview window
 */
async function printHtmlSilent(htmlContent) {
    const printWin = new BrowserWindow({
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    try {
        await printWin.webContents.print({
            silent: true,
            printBackground: true,
            margins: { marginType: 'none' }
        });
    } catch (err) {
        // Fallback: if no physical thermal printer connected, show receipt preview window
        console.warn('Physical printer not connected, opening visual preview:', err.message);
        printWin.setSize(450, 700);
        printWin.center();
        printWin.show();
        return;
    }

    printWin.close();
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1366,
        height: 768,
        minWidth: 1024,
        minHeight: 650,
        title: 'Cotton Club Store | نظام المبيعات والمخزون',
        icon: path.join(__dirname, '../renderer/assets/icon.png'),
        backgroundColor: '#0f172a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    initAppServices();
    registerIpcHandlers();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (db) {
        db.close();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
