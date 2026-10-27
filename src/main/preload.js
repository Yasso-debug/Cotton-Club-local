/**
 * Cotton Club POS - Electron Preload Script
 * Exposes secure API methods to the renderer via contextBridge
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Auth & User Management
    login: (username, password) => ipcRenderer.invoke('auth:login', { username, password }),
    verifyManager: (username, password) => ipcRenderer.invoke('auth:verify-manager', { username, password }),
    listUsers: () => ipcRenderer.invoke('auth:list-users'),
    createUser: (data, userId) => ipcRenderer.invoke('auth:create-user', { data, userId }),
    updateUser: (id, data, userId) => ipcRenderer.invoke('auth:update-user', { id, data, userId }),
    changePassword: (id, password, userId) => ipcRenderer.invoke('auth:change-password', { id, password, userId }),
    toggleUserStatus: (id, userId) => ipcRenderer.invoke('auth:toggle-status', { id, userId }),
    deleteUser: (id, userId) => ipcRenderer.invoke('auth:delete-user', { id, userId }),
    getUsersKpis: () => ipcRenderer.invoke('auth:users-kpis'),

    // Session
    getActiveSession: () => ipcRenderer.invoke('session:get-active'),
    openSession: (userId, openingCash, notes) => ipcRenderer.invoke('session:open', { userId, openingCash, notes }),
    getSessionSummary: (sessionId) => ipcRenderer.invoke('session:get-summary', { sessionId }),
    closeSession: (sessionId, userId, actualCash, notes) => ipcRenderer.invoke('session:close', { sessionId, userId, actualCash, notes }),
    listSessions: (limit) => ipcRenderer.invoke('session:list', { limit }),

    // POS
    searchProducts: (query, limit, categoryId) => ipcRenderer.invoke('pos:search-products', { query, limit, categoryId }),
    findProductByBarcode: (barcode) => ipcRenderer.invoke('pos:find-barcode', { barcode }),
    searchProductsByCategory: (categoryId, keyword, limit) => ipcRenderer.invoke('pos:search-by-category', { categoryId, keyword, limit }),
    searchCustomers: (query, limit) => ipcRenderer.invoke('pos:search-customers', { query, limit }),
    quickCreateCustomer: (data) => ipcRenderer.invoke('pos:quick-create-customer', { data }),
    listCustomers: (params) => ipcRenderer.invoke('customers:list', params),
    getCustomerStats: () => ipcRenderer.invoke('customers:stats'),
    createCustomer: (data) => ipcRenderer.invoke('customers:create', { data }),
    updateCustomer: (id, data) => ipcRenderer.invoke('customers:update', { id, data }),
    deleteCustomer: (id) => ipcRenderer.invoke('customers:delete', { id }),
    getCustomerInvoices: (customerId, limit) => ipcRenderer.invoke('customers:invoices', { customerId, limit }),
    getDrawerCash: (sessionId) => ipcRenderer.invoke('pos:get-drawer-cash', { sessionId }),
    checkout: (saleData) => ipcRenderer.invoke('pos:checkout', saleData),
    getNextInvoiceNumber: (type) => ipcRenderer.invoke('pos:next-invoice-number', { type }),
    getInvoice: (id) => ipcRenderer.invoke('pos:get-invoice', { id }),
    voidInvoice: (invoiceId, managerUserId, reason) => ipcRenderer.invoke('pos:void-invoice', { invoiceId, managerUserId, reason }),
    listRecentInvoices: (limit) => ipcRenderer.invoke('pos:list-recent', { limit }),
    getInvoicesDashboard: (filters) => ipcRenderer.invoke('pos:invoices-dashboard', filters),
    listInventoryMovements: (productId, limit) => ipcRenderer.invoke('pos:list-inventory-movements', { productId, limit }),
    checkAutoCloseShift: (userId) => ipcRenderer.invoke('session:check-auto-close', userId),
    ensureActiveSession: (userId) => ipcRenderer.invoke('session:ensure-active', userId),
    rolloverShift: (userId) => ipcRenderer.invoke('session:rollover', userId),
    getDailyShiftSummary: (params) => ipcRenderer.invoke('session:shift-summary', params),

    // Inventory
    getCatalogOverview: () => ipcRenderer.invoke('inventory:overview'),
    listProducts: (filters) => ipcRenderer.invoke('inventory:list-products', filters),
    createProduct: (data, userId) => ipcRenderer.invoke('inventory:create-product', { data, userId }),
    updateProduct: (id, data, userId) => ipcRenderer.invoke('inventory:update-product', { id, data, userId }),
    deleteProduct: (id, userId) => ipcRenderer.invoke('inventory:delete-product', { id, userId }),
    adjustStock: (data, userId, sessionId) => ipcRenderer.invoke('inventory:adjust-stock', { data, userId, sessionId }),
    getInventoryValuation: () => ipcRenderer.invoke('inventory:valuation'),
    listCategories: (filters) => ipcRenderer.invoke('inventory:list-categories', filters),
    createCategory: (data) => ipcRenderer.invoke('inventory:create-category', { data }),
    updateCategory: (id, data) => ipcRenderer.invoke('inventory:update-category', { id, data }),
    deleteCategory: (id) => ipcRenderer.invoke('inventory:delete-category', { id }),

    // Purchases & Suppliers Dual-View
    getSuppliersOverview: () => ipcRenderer.invoke('purchases:get-suppliers-overview'),
    listSuppliers: (filters) => ipcRenderer.invoke('purchases:list-suppliers', filters),
    createSupplier: (data, userId) => ipcRenderer.invoke('purchases:create-supplier', { data, userId }),
    updateSupplier: (id, data, userId) => ipcRenderer.invoke('purchases:update-supplier', { id, data, userId }),
    getSupplierLedger: (supplierId, filters) => ipcRenderer.invoke('purchases:get-supplier-ledger', { supplierId, filters }),
    recordSupplierSplitPayment: (data, userId) => ipcRenderer.invoke('purchases:record-split-payment', { data, userId }),
    createPurchaseInvoice: (data, userId) => ipcRenderer.invoke('purchases:create-invoice', { data, userId }),
    getPurchaseInvoice: (id) => ipcRenderer.invoke('purchases:get-invoice', { id }),
    recordSupplierPayment: (data, userId) => ipcRenderer.invoke('purchases:record-payment', { data, userId }),
    listPurchaseInvoices: (limit) => ipcRenderer.invoke('purchases:list-invoices', { limit }),
    createPurchaseReturn: (data, userId) => ipcRenderer.invoke('purchases:create-return', { data, userId }),
    listPurchaseReturns: (invoiceId) => ipcRenderer.invoke('purchases:list-returns', { invoiceId }),

    // Expenses
    addExpense: (data, userId) => ipcRenderer.invoke('expenses:add', { data, userId }),
    listSessionExpenses: (sessionId) => ipcRenderer.invoke('expenses:list-session', { sessionId }),
    listAllExpenses: (limit) => ipcRenderer.invoke('expenses:list-all', { limit }),
    getExpenseCategories: () => ipcRenderer.invoke('expenses:categories'),
    getExpensesSummary: (params) => ipcRenderer.invoke('expenses:summary', params),
    getExpensesAnalytics: (params) => ipcRenderer.invoke('expenses:analytics', params),

    // Reports
    getSalesSummary: (startDate, endDate) => ipcRenderer.invoke('reports:sales-summary', { startDate, endDate }),
    getTopSelling: (limit, startDate, endDate) => ipcRenderer.invoke('reports:top-selling', { limit, startDate, endDate }),
    getCategorySales: (startDate, endDate) => ipcRenderer.invoke('reports:category-sales', { startDate, endDate }),
    getDashboardOverview: () => ipcRenderer.invoke('reports:dashboard-overview'),
    getComprehensiveAnalytics: (filters) => ipcRenderer.invoke('reports:comprehensive-analytics', filters),

    // Printing
    printInvoiceReceipt: (invoiceId) => ipcRenderer.invoke('printer:print-invoice', { invoiceId }),
    printZReport: (sessionId) => ipcRenderer.invoke('printer:print-z-report', { sessionId }),
    previewReceiptHtml: (invoiceId) => ipcRenderer.invoke('printer:preview-invoice', { invoiceId }),

    // Treasury & Central Safe
    getTreasuryBalance: () => ipcRenderer.invoke('treasury:get-balance'),
    treasuryDeposit: (data, userId) => {
        if (typeof data === 'object') {
            return ipcRenderer.invoke('treasury:deposit', { amount: data.amount, sourceDestination: data.paidBy || data.sourceDestination, notes: data.notes, userId: userId || data.userId, paymentMethod: data.paymentMethod || data.channel });
        }
        return ipcRenderer.invoke('treasury:deposit', { amount: arguments[0], sourceDestination: arguments[1], notes: arguments[2], userId: arguments[3] });
    },
    treasuryWithdraw: (data, userId) => {
        if (typeof data === 'object') {
            return ipcRenderer.invoke('treasury:withdraw', { amount: data.amount, destination: data.recipient || data.destination, notes: data.notes, userId: userId || data.userId, paymentMethod: data.paymentMethod || data.channel });
        }
        return ipcRenderer.invoke('treasury:withdraw', { amount: arguments[0], destination: arguments[1], notes: arguments[2], userId: arguments[3] });
    },
    treasuryTransferChannel: (data, userId) => ipcRenderer.invoke('treasury:transfer-channel', { fromChannel: data.fromChannel || data.fromMethod, toChannel: data.toChannel || data.toMethod, amount: data.amount, notes: data.notes, userId: userId || data.userId }),
    transferShiftToTreasury: (sessionId, amount, notes, userId) => ipcRenderer.invoke('treasury:transfer-shift', { sessionId, amount, notes, userId }),
    listTreasuryTransactions: (params) => ipcRenderer.invoke('treasury:list-transactions', params),
    quickDisburseTreasury: (data, userId) => ipcRenderer.invoke('treasury:quick-disburse', { ...data, userId: userId || data.userId }),
    getTreasuryAnalytics: () => ipcRenderer.invoke('treasury:get-analytics'),
    treasuryAnalytics: () => ipcRenderer.invoke('treasury:get-analytics'),
    getBranchTransfers: (params) => ipcRenderer.invoke('treasury:get-branch-transfers', params || {}),
    getBranchSafes: () => ipcRenderer.invoke('treasury:get-branch-safes'),

    // Payroll & Employees
    listEmployees: (onlyActive) => ipcRenderer.invoke('payroll:list-employees', { onlyActive }),
    getStaffKpis: () => ipcRenderer.invoke('payroll:staff-kpis'),
    toggleEmployeeStatus: (id, userId) => ipcRenderer.invoke('payroll:toggle-employee-status', { id, userId }),
    createEmployee: (data, userId) => ipcRenderer.invoke('payroll:create-employee', { data, userId }),
    updateEmployee: (id, data, userId) => ipcRenderer.invoke('payroll:update-employee', { id, data, userId }),
    deleteEmployee: (id, userId) => ipcRenderer.invoke('payroll:delete-employee', { id, userId }),
    disburseSalary: (data, userId) => ipcRenderer.invoke('payroll:disburse-salary', { data, userId }),
    getEmployeeMonthlyAdvances: (employeeId, month) => ipcRenderer.invoke('payroll:get-monthly-advances', { employeeId, month }),
    getEmployeePeriodAdvances: (employeeId, period) => ipcRenderer.invoke('payroll:get-period-advances', { employeeId, period }),
    getPayrollSummary: (period) => ipcRenderer.invoke('payroll:get-summary', { period }),
    checkEmployeePayoutStatus: (employeeId, month, period) => ipcRenderer.invoke('payroll:check-payout-status', { employeeId, month, period }),
    disburseBulkPayroll: (payoutsList, channel, userId) => ipcRenderer.invoke('payroll:disburse-bulk', { payoutsList, channel, userId }),
    listSalaryPayments: (params) => ipcRenderer.invoke('payroll:list-payments', params),
    addExpenseCategory: (name, subcategories) => ipcRenderer.invoke('expenses:add-category', { name, subcategories }),
    deleteExpenseCategory: (id) => ipcRenderer.invoke('expenses:delete-category', { id }),
    listStockAdjustments: (limit) => ipcRenderer.invoke('inventory:list-adjustments', { limit }),

    // Settings
    getSettings: () => ipcRenderer.invoke('settings:get-all'),
    updateSettings: (settingsMap, userId) => ipcRenderer.invoke('settings:update', { settingsMap, userId }),

    // OS Global Shortcut Hooks
    onF1Pressed: (callback) => ipcRenderer.on('app:f1-pressed', () => callback()),
    onF10Pressed: (callback) => ipcRenderer.on('app:f10-pressed', () => callback()),
    onF11Pressed: (callback) => ipcRenderer.on('app:f11-pressed', () => callback())
});
