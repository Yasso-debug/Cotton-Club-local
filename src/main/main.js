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
const { TreasuryService } = require('../services/treasuryService');
const { PayrollService } = require('../services/payrollService');

let mainWindow = null;
let db = null;
let services = {};

function initAppServices() {
    // Connect to SQLite database with WAL mode and pragmas
    db = getDatabase();
    seedDatabase(db);

    const treasuryService = new TreasuryService(db);
    const payrollService = new PayrollService(db, treasuryService);

    const sessionService = new SessionService(db, treasuryService);
    const posService = new PosService(db, sessionService);

    services = {
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
    handle('auth:create-user', ({ data, userId }) => services.auth.createUser(data, userId));
    handle('auth:update-user', ({ id, data, userId }) => services.auth.updateUser(id, data, userId));
    handle('auth:change-password', ({ id, password, userId }) => services.auth.changePassword(id, password, userId));
    handle('auth:toggle-status', ({ id, userId }) => services.auth.toggleUserStatus(id, userId));
    handle('auth:delete-user', ({ id, userId }) => services.auth.deleteUser(id, userId));
    handle('auth:users-kpis', () => services.auth.getUsersKpis());

    // Session
    handle('session:get-active', () => services.session.getActiveSession());
    handle('session:open', ({ userId, openingCash, notes }) => services.session.openSession(userId, openingCash, notes));
    handle('session:get-summary', ({ sessionId }) => services.session.getSessionSummary(sessionId));
    handle('session:close', ({ sessionId, userId, actualCash, notes }) => services.session.closeSession(sessionId, userId, actualCash, notes));
    handle('session:list', ({ limit }) => services.session.listSessions(limit));

    handle('session:check-auto-close', (userId) => services.session.checkAndRolloverShift(userId));
    handle('session:ensure-active', (userId) => services.session.ensureActiveSession(userId));
    handle('session:rollover', (userId) => services.session.checkAndRolloverShift(userId));
    handle('session:shift-summary', (params) => services.session.getDailyShiftSummary(params));

    // POS
    handle('pos:search-products', ({ query, limit, categoryId }) => services.pos.searchProducts(query, limit, categoryId));
    handle('pos:search-by-category', ({ categoryId, keyword, limit }) => services.pos.searchProductsByCategory(categoryId, keyword, limit));
    handle('pos:find-barcode', ({ barcode }) => services.pos.findProductByBarcode(barcode));
    handle('pos:search-customers', ({ query, limit }) => services.pos.searchCustomers(query, limit));
    handle('pos:quick-create-customer', (params) => services.pos.quickCreateCustomer(params?.data || params));
    handle('customers:list', (params) => services.pos.listCustomers(params || {}));
    handle('customers:stats', () => services.pos.getCustomerStats());
    handle('customers:create', (params) => services.pos.createCustomer(params?.data || params));
    handle('customers:update', ({ id, data }) => services.pos.updateCustomer(id, data));
    handle('customers:delete', ({ id }) => services.pos.deleteCustomer(id));
    handle('customers:invoices', ({ customerId, limit }) => services.pos.getCustomerInvoices(customerId, limit));
    handle('pos:get-drawer-cash', ({ sessionId }) => services.pos.getDrawerCash(sessionId));
    handle('pos:checkout', (saleData) => services.pos.checkout(saleData));
    handle('pos:next-invoice-number', (params) => services.pos.getNextInvoiceNumber(params?.type || 'sale'));
    handle('pos:get-invoice', ({ id }) => services.pos.getInvoiceById(id));
    handle('pos:void-invoice', ({ invoiceId, managerUserId, reason }) => services.pos.voidInvoice(invoiceId, managerUserId, reason));
    handle('pos:list-recent', ({ limit }) => services.pos.listRecentInvoices(limit));
    handle('pos:invoices-dashboard', (filters) => services.pos.getInvoicesLogDashboard(filters));
    handle('pos:list-inventory-movements', ({ productId, limit }) => services.pos.listInventoryMovements(productId, limit));

    // Inventory
    handle('inventory:overview', () => services.inventory.getCatalogOverview());
    handle('inventory:list-products', (filters) => services.inventory.listProducts(filters));
    handle('inventory:create-product', ({ data, userId }) => services.inventory.createProduct(data, userId));
    handle('inventory:update-product', ({ id, data, userId }) => services.inventory.updateProduct(id, data, userId));
    handle('inventory:delete-product', ({ id, userId }) => services.inventory.deleteProduct(id, userId));
    handle('inventory:adjust-stock', ({ data, userId, sessionId }) => services.inventory.adjustStock(data, userId, sessionId));
    handle('inventory:valuation', () => services.inventory.getInventoryValuation());
    handle('inventory:list-categories', (filters) => services.inventory.listCategories(filters));
    handle('inventory:create-category', (params) => services.inventory.createCategory(params.data || params));
    handle('inventory:update-category', ({ id, data }) => services.inventory.updateCategory(id, data));
    handle('inventory:delete-category', ({ id }) => services.inventory.deleteCategory(id));

    // Purchases & Suppliers Dual-View
    handle('purchases:get-suppliers-overview', () => services.purchases.getSuppliersOverview());
    handle('purchases:list-suppliers', (filters) => services.purchases.listSuppliers(filters));
    handle('purchases:create-supplier', ({ data, userId }) => services.purchases.createSupplier(data, userId));
    handle('purchases:update-supplier', ({ id, data, userId }) => services.purchases.updateSupplier(id, data, userId));
    handle('purchases:get-supplier-ledger', ({ supplierId, filters }) => services.purchases.getSupplierLedger(supplierId, filters));
    handle('purchases:record-split-payment', ({ data, userId }) => services.purchases.recordSupplierSplitPayment(data, userId));
    handle('purchases:create-invoice', ({ data, userId }) => services.purchases.createPurchaseInvoice(data, userId));
    handle('purchases:get-invoice', (params) => {
        const id = (params && typeof params === 'object') ? (params.id || params.invoiceId) : params;
        return services.purchases.getPurchaseInvoiceById(id);
    });
    handle('purchases:record-payment', ({ data, userId }) => services.purchases.recordSupplierPayment(data, userId));
    handle('purchases:list-invoices', ({ limit }) => services.purchases.listPurchaseInvoices(limit));
    handle('purchases:create-return', ({ data, userId }) => services.purchases.createPurchaseReturn(data, userId));
    handle('purchases:list-returns', (params) => {
        const id = (params && typeof params === 'object') ? (params.invoiceId || params.id) : params;
        return services.purchases.getPurchaseReturnsByInvoice(id);
    });

    // Expenses
    handle('expenses:add', ({ data, userId }) => services.expenses.addExpense(data, userId));
    handle('expenses:list-session', ({ sessionId }) => services.expenses.listSessionExpenses(sessionId));
    handle('expenses:list-all', ({ limit }) => services.expenses.listAllExpenses(limit));
    handle('expenses:categories', () => services.expenses.getCategories());
    handle('expenses:summary', (params) => services.expenses.getExpensesSummary(params || {}));
    handle('expenses:analytics', (params) => services.expenses.getExpensesAnalytics(params?.period || 30));

    // Reports
    handle('reports:sales-summary', ({ startDate, endDate }) => services.reports.getSalesSummary(startDate, endDate));
    handle('reports:top-selling', ({ limit, startDate, endDate }) => services.reports.getTopSellingProducts(limit, startDate, endDate));
    handle('reports:category-sales', ({ startDate, endDate }) => services.reports.getCategorySales(startDate, endDate));
    handle('reports:dashboard-overview', () => services.reports.getDashboardOverview());
    handle('reports:comprehensive-analytics', (filters) => services.reports.getComprehensiveAnalytics(filters));

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

    // Treasury & Central Safe
    handle('treasury:get-balance', () => services.treasury.getBalance());
    handle('treasury:deposit', ({ amount, sourceDestination, notes, userId, paymentMethod }) => services.treasury.deposit(amount, sourceDestination, notes, userId, paymentMethod || 'cash'));
    handle('treasury:withdraw', ({ amount, destination, notes, userId, paymentMethod }) => services.treasury.withdraw(amount, destination, notes, userId, paymentMethod || 'cash'));
    handle('treasury:transfer-shift', ({ sessionId, amount, notes, userId }) => services.treasury.transferFromSession(sessionId, amount, notes, userId));
    handle('treasury:transfer-channel', ({ fromChannel, toChannel, amount, notes, userId }) => services.treasury.transferBetweenChannels(fromChannel, toChannel, amount, notes, userId));
    handle('treasury:list-transactions', (params) => services.treasury.listTransactions(params));
    handle('treasury:quick-disburse', ({ amount, paymentMethod, recipient, category, notes, userId }) => services.treasury.quickDisburse(amount, paymentMethod, recipient, category, notes, userId));
    handle('treasury:get-analytics', () => services.treasury.getAnalyticsData());
    handle('treasury:get-branch-transfers', ({ status }) => services.treasury.getBranchTransfers(status));
    handle('treasury:get-branch-safes', () => services.treasury.getBranchSafesSummary());

    // Payroll & Staff
    handle('payroll:list-employees', ({ onlyActive }) => services.payroll.listEmployees(onlyActive));
    handle('payroll:staff-kpis', () => services.payroll.getStaffKpis());
    handle('payroll:toggle-employee-status', ({ id, userId }) => services.payroll.toggleEmployeeStatus(id, userId));
    handle('payroll:create-employee', ({ data, userId }) => services.payroll.createEmployee(data, userId));
    handle('payroll:update-employee', ({ id, data, userId }) => services.payroll.updateEmployee(id, data, userId));
    handle('payroll:delete-employee', ({ id, userId }) => services.payroll.deleteEmployee(id, userId));
    handle('payroll:disburse-salary', ({ data, userId }) => services.payroll.disburseSalary(data, userId || data?.userId || data?.created_by));
    handle('payroll:get-monthly-advances', (params) => services.payroll.getEmployeeMonthlyAdvances(params.employeeId || params.employee_id, params.month || params.period_month));
    handle('payroll:get-period-advances', (params) => services.payroll.getEmployeePeriodAdvances(params.employeeId || params.employee_id, params.period || params));
    handle('payroll:get-summary', ({ period }) => services.payroll.getPayrollSummary(period));
    handle('payroll:check-payout-status', (params) => services.payroll.checkEmployeePayoutStatus(params.employeeId || params.employee_id, params.period || params.month || params.period_month));
    handle('payroll:disburse-bulk', ({ payoutsList, channel, userId }) => services.payroll.disburseBulkPayroll(payoutsList, channel, userId));
    handle('payroll:list-payments', (params) => services.payroll.listSalaryPayments(params));
    handle('expenses:add-category', ({ name, subcategories }) => services.expenses.addCategory(name, subcategories));
    handle('expenses:delete-category', ({ id }) => services.expenses.deleteCategory(id));
    handle('inventory:list-adjustments', ({ limit }) => services.inventory.listStockAdjustments(limit));

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

    mainWindow.setMenu(null);

    // Forward renderer console messages to main process stdout
    mainWindow.webContents.on('console-message', (_event, _level, message) => {
        console.log('[Renderer Console]', message);
    });

    // Global accelerator capture for F1 (Categories & Products lookup), F10 (Checkout & New Invoice), and F11 (Add Row)
    let lastF1Time = 0;
    let lastF10Time = 0;
    let lastF11Time = 0;
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' || input.type === 'rawKeyDown') {
            const k = (input.key || '').toLowerCase();
            const c = (input.code || '').toLowerCase();
            const now = Date.now();
            if (k === 'f1' || c === 'f1' || k === 'help') {
                event.preventDefault();
                if (now - lastF1Time > 200) {
                    lastF1Time = now;
                    mainWindow.webContents.send('app:f1-pressed');
                }
            } else if (k === 'f10' || c === 'f10') {
                event.preventDefault();
                if (now - lastF10Time > 200) {
                    lastF10Time = now;
                    mainWindow.webContents.send('app:f10-pressed');
                }
            } else if (k === 'f11' || c === 'f11') {
                event.preventDefault();
                if (now - lastF11Time > 200) {
                    lastF11Time = now;
                    mainWindow.webContents.send('app:f11-pressed');
                }
            }
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
