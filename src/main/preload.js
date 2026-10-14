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
    searchProducts: (query, limit) => ipcRenderer.invoke('pos:search-products', { query, limit }),
    findProductByBarcode: (barcode) => ipcRenderer.invoke('pos:find-barcode', { barcode }),
    checkout: (saleData) => ipcRenderer.invoke('pos:checkout', saleData),
    getInvoice: (id) => ipcRenderer.invoke('pos:get-invoice', { id }),
    voidInvoice: (invoiceId, managerUserId, reason) => ipcRenderer.invoke('pos:void-invoice', { invoiceId, managerUserId, reason }),
    listRecentInvoices: (limit) => ipcRenderer.invoke('pos:list-recent', { limit }),
    getInvoicesDashboard: (filters) => ipcRenderer.invoke('pos:invoices-dashboard', filters),

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
    treasuryDeposit: (amount, sourceDestination, notes, userId) => ipcRenderer.invoke('treasury:deposit', { amount, sourceDestination, notes, userId }),
    treasuryWithdraw: (amount, destination, notes, userId) => ipcRenderer.invoke('treasury:withdraw', { amount, destination, notes, userId }),
    transferShiftToTreasury: (sessionId, amount, notes, userId) => ipcRenderer.invoke('treasury:transfer-shift', { sessionId, amount, notes, userId }),
    listTreasuryTransactions: (limit) => ipcRenderer.invoke('treasury:list-transactions', { limit }),

    // Payroll & Employees
    listEmployees: (onlyActive) => ipcRenderer.invoke('payroll:list-employees', { onlyActive }),
    getStaffKpis: () => ipcRenderer.invoke('payroll:staff-kpis'),
    toggleEmployeeStatus: (id, userId) => ipcRenderer.invoke('payroll:toggle-employee-status', { id, userId }),
    createEmployee: (data, userId) => ipcRenderer.invoke('payroll:create-employee', { data, userId }),
    updateEmployee: (id, data, userId) => ipcRenderer.invoke('payroll:update-employee', { id, data, userId }),
    deleteEmployee: (id, userId) => ipcRenderer.invoke('payroll:delete-employee', { id, userId }),
    disburseSalary: (data, userId) => ipcRenderer.invoke('payroll:disburse-salary', { data, userId }),
    listSalaryPayments: (limit) => ipcRenderer.invoke('payroll:list-payments', { limit }),
    listStockAdjustments: (limit) => ipcRenderer.invoke('inventory:list-adjustments', { limit }),

    // Settings
    getSettings: () => ipcRenderer.invoke('settings:get-all'),
    updateSettings: (settingsMap, userId) => ipcRenderer.invoke('settings:update', { settingsMap, userId })
});
