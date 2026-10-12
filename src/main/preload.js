/**
 * Cotton Club POS - Electron Preload Script
 * Exposes secure API methods to the renderer via contextBridge
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Auth
    login: (username, password) => ipcRenderer.invoke('auth:login', { username, password }),
    verifyManager: (username, password) => ipcRenderer.invoke('auth:verify-manager', { username, password }),
    listUsers: () => ipcRenderer.invoke('auth:list-users'),

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

    // Inventory
    listProducts: (filters) => ipcRenderer.invoke('inventory:list-products', filters),
    createProduct: (data, userId) => ipcRenderer.invoke('inventory:create-product', { data, userId }),
    updateProduct: (id, data, userId) => ipcRenderer.invoke('inventory:update-product', { id, data, userId }),
    adjustStock: (data, userId, sessionId) => ipcRenderer.invoke('inventory:adjust-stock', { data, userId, sessionId }),
    getInventoryValuation: () => ipcRenderer.invoke('inventory:valuation'),
    listCategories: () => ipcRenderer.invoke('inventory:list-categories'),
    createCategory: (name, desc) => ipcRenderer.invoke('inventory:create-category', { name, desc }),

    // Purchases & Suppliers
    listSuppliers: () => ipcRenderer.invoke('purchases:list-suppliers'),
    createSupplier: (data) => ipcRenderer.invoke('purchases:create-supplier', data),
    createPurchaseInvoice: (data, userId) => ipcRenderer.invoke('purchases:create-invoice', { data, userId }),
    recordSupplierPayment: (data, userId) => ipcRenderer.invoke('purchases:record-payment', { data, userId }),
    listPurchaseInvoices: (limit) => ipcRenderer.invoke('purchases:list-invoices', { limit }),

    // Expenses
    addExpense: (data, userId) => ipcRenderer.invoke('expenses:add', { data, userId }),
    listSessionExpenses: (sessionId) => ipcRenderer.invoke('expenses:list-session', { sessionId }),
    listAllExpenses: (limit) => ipcRenderer.invoke('expenses:list-all', { limit }),

    // Reports
    getSalesSummary: (startDate, endDate) => ipcRenderer.invoke('reports:sales-summary', { startDate, endDate }),
    getTopSelling: (limit, startDate, endDate) => ipcRenderer.invoke('reports:top-selling', { limit, startDate, endDate }),
    getCategorySales: (startDate, endDate) => ipcRenderer.invoke('reports:category-sales', { startDate, endDate }),
    getDashboardOverview: () => ipcRenderer.invoke('reports:dashboard-overview'),

    // Printing
    printInvoiceReceipt: (invoiceId) => ipcRenderer.invoke('printer:print-invoice', { invoiceId }),
    printZReport: (sessionId) => ipcRenderer.invoke('printer:print-z-report', { sessionId }),
    previewReceiptHtml: (invoiceId) => ipcRenderer.invoke('printer:preview-invoice', { invoiceId }),

    // Settings
    getSettings: () => ipcRenderer.invoke('settings:get-all'),
    updateSettings: (settingsMap, userId) => ipcRenderer.invoke('settings:update', { settingsMap, userId })
});
