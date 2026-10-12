/**
 * Cotton Club POS - Reporting & Analytics Service
 * Provides business intelligence, X/Z reports, sales summaries, and profit analytics.
 */

class ReportService {
    constructor(dbManager) {
        this.db = dbManager;
    }

    /**
     * Get comprehensive Sales Summary for a given date range
     */
    getSalesSummary(startDate, endDate) {
        let dateCondition = '';
        const params = [];

        if (startDate && endDate) {
            dateCondition = 'AND date(created_at) BETWEEN date(?) AND date(?)';
            params.push(startDate, endDate);
        } else if (startDate) {
            dateCondition = 'AND date(created_at) = date(?)';
            params.push(startDate);
        }

        const totals = this.db.get(
            `SELECT 
                COUNT(*) as total_invoices,
                COALESCE(SUM(subtotal), 0) as subtotal,
                COALESCE(SUM(discount_amount), 0) as total_discounts,
                COALESCE(SUM(final_total), 0) as net_sales,
                COALESCE(SUM(total_cost), 0) as total_cost,
                COALESCE(SUM(final_total - total_cost), 0) as gross_profit,
                COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN final_total ELSE 0 END), 0) as cash_sales,
                COALESCE(SUM(CASE WHEN payment_method = 'card' THEN final_total ELSE 0 END), 0) as card_sales,
                COALESCE(SUM(CASE WHEN payment_method = 'split' THEN final_total ELSE 0 END), 0) as split_sales
             FROM sales_invoices
             WHERE status = 'completed' ${dateCondition}`,
            params
        );

        // Daily breakdown
        const dailyBreakdown = this.db.all(
            `SELECT 
                date(created_at) as sale_date,
                COUNT(*) as invoices_count,
                COALESCE(SUM(final_total), 0) as day_total,
                COALESCE(SUM(final_total - total_cost), 0) as day_profit
             FROM sales_invoices
             WHERE status = 'completed' ${dateCondition}
             GROUP BY date(created_at)
             ORDER BY sale_date DESC LIMIT 30`,
            params
        );

        return {
            totals: {
                ...totals,
                profitMarginPercent: totals.net_sales > 0
                    ? Math.round((totals.gross_profit / totals.net_sales) * 1000) / 10
                    : 0
            },
            dailyBreakdown
        };
    }

    /**
     * Top selling products by quantity or revenue
     */
    getTopSellingProducts(limit = 10, startDate = null, endDate = null) {
        let dateCondition = '';
        const params = [];

        if (startDate && endDate) {
            dateCondition = 'AND date(si.created_at) BETWEEN date(?) AND date(?)';
            params.push(startDate, endDate);
        }

        params.push(limit);

        return this.db.all(
            `SELECT 
                sli.product_id,
                sli.item_name,
                sli.barcode,
                COALESCE(SUM(sli.quantity), 0) as total_quantity_sold,
                COALESCE(SUM(sli.line_total), 0) as total_revenue,
                COALESCE(SUM(sli.line_profit), 0) as total_profit
             FROM sale_line_items sli
             JOIN sales_invoices si ON sli.invoice_id = si.id
             WHERE si.status = 'completed' ${dateCondition}
             GROUP BY sli.product_id
             ORDER BY total_quantity_sold DESC
             LIMIT ?`,
            params
        );
    }

    /**
     * Category sales distribution
     */
    getCategorySales(startDate = null, endDate = null) {
        let dateCondition = '';
        const params = [];

        if (startDate && endDate) {
            dateCondition = 'AND date(si.created_at) BETWEEN date(?) AND date(?)';
            params.push(startDate, endDate);
        }

        return this.db.all(
            `SELECT 
                COALESCE(c.name, 'بدون قسم') as category_name,
                COALESCE(SUM(sli.quantity), 0) as total_units_sold,
                COALESCE(SUM(sli.line_total), 0) as total_revenue
             FROM sale_line_items sli
             JOIN sales_invoices si ON sli.invoice_id = si.id
             JOIN products p ON sli.product_id = p.id
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE si.status = 'completed' ${dateCondition}
             GROUP BY c.id
             ORDER BY total_revenue DESC`,
            params
        );
    }

    /**
     * Dashboard Overview KPIs
     */
    getDashboardOverview() {
        const today = new Date().toISOString().slice(0, 10);

        // Today sales
        const todayStats = this.db.get(
            `SELECT 
                COUNT(*) as today_invoices,
                COALESCE(SUM(final_total), 0) as today_sales,
                COALESCE(SUM(final_total - total_cost), 0) as today_profit
             FROM sales_invoices
             WHERE status = 'completed' AND date(created_at) = date(?)`,
            [today]
        );

        // Low stock count
        const lowStock = this.db.get(
            'SELECT COUNT(*) as low_count FROM products WHERE is_active = 1 AND current_stock <= min_stock_alert'
        );

        // Active session
        const activeSession = this.db.get(
            "SELECT id, session_code, opened_at, opening_cash FROM daily_sessions WHERE status = 'open' LIMIT 1"
        );

        // Today expenses
        const todayExpenses = this.db.get(
            `SELECT COALESCE(SUM(amount), 0) as total_expenses
             FROM petty_expenses
             WHERE date(created_at) = date(?)`,
            [today]
        );

        return {
            todaySales: todayStats?.today_sales || 0,
            todayInvoices: todayStats?.today_invoices || 0,
            todayProfit: todayStats?.today_profit || 0,
            todayExpenses: todayExpenses?.total_expenses || 0,
            lowStockCount: lowStock?.low_count || 0,
            hasActiveSession: !!activeSession,
            activeSessionCode: activeSession?.session_code || null
        };
    }
}

module.exports = { ReportService };
