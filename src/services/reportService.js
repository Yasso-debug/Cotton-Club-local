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

        // Today expenses (net of returned expenses)
        const todayExpenses = this.db.get(
            `SELECT COALESCE(SUM(CASE WHEN operational_type = 'returned_expense' THEN -amount ELSE amount END), 0) as total_expenses
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

    /**
     * Comprehensive Analytics & BI Dashboard
     * Powers Executive KPIs, Trend Visualizations, Categories, and Sellers Performance
     */
    getComprehensiveAnalytics(filters = {}) {
        const { startDate, endDate, sellerId } = filters;

        let whereClause = "WHERE si.status = 'completed'";
        const params = [];

        let dateCond = '';
        const dateParams = [];

        if (startDate && endDate) {
            whereClause += ' AND date(si.created_at) >= date(?) AND date(si.created_at) <= date(?)';
            params.push(startDate, endDate);

            dateCond = 'AND date(si.created_at) >= date(?) AND date(si.created_at) <= date(?)';
            dateParams.push(startDate, endDate);
        } else if (startDate) {
            whereClause += ' AND date(si.created_at) >= date(?)';
            params.push(startDate);

            dateCond = 'AND date(si.created_at) >= date(?)';
            dateParams.push(startDate);
        } else if (endDate) {
            whereClause += ' AND date(si.created_at) <= date(?)';
            params.push(endDate);

            dateCond = 'AND date(si.created_at) <= date(?)';
            dateParams.push(endDate);
        }

        if (sellerId) {
            whereClause += ' AND si.user_id = ?';
            params.push(sellerId);
        }

        // 1. Overall KPIs
        const totals = this.db.get(
            `SELECT 
                COUNT(*) as total_invoices,
                COALESCE(SUM(si.subtotal), 0) as gross_subtotal,
                COALESCE(SUM(si.discount_amount), 0) as total_discounts,
                COALESCE(SUM(si.final_total), 0) as net_sales,
                COALESCE(SUM(si.total_cost), 0) as total_cost,
                COALESCE(SUM(si.final_total - si.total_cost), 0) as gross_profit
            FROM sales_invoices si
            ${whereClause}`,
            params
        );

        const piecesRow = this.db.get(
            `SELECT COALESCE(SUM(sli.quantity), 0) as total_pieces
            FROM sale_line_items sli
            JOIN sales_invoices si ON sli.invoice_id = si.id
            ${whereClause}`,
            params
        );

        const netSales = totals?.net_sales || 0;
        const grossProfit = totals?.gross_profit || 0;
        const totalInvoices = totals?.total_invoices || 0;
        const totalDiscounts = totals?.total_discounts || 0;
        const totalPieces = piecesRow?.total_pieces || 0;

        const profitMargin = netSales > 0 ? Math.round((grossProfit / netSales) * 1000) / 10 : 0;
        const avgOrderValue = totalInvoices > 0 ? Math.round((netSales / totalInvoices) * 100) / 100 : 0;
        const discountRate = (netSales + totalDiscounts) > 0 ? Math.round((totalDiscounts / (netSales + totalDiscounts)) * 1000) / 10 : 0;
        const avgBasketPieces = totalInvoices > 0 ? Math.round((totalPieces / totalInvoices) * 10) / 10 : 0;

        // 2. Timeline (Daily Trend)
        const timeline = this.db.all(
            `SELECT 
                date(si.created_at) as sale_date,
                COUNT(si.id) as invoices_count,
                COALESCE(SUM(si.final_total), 0) as day_revenue,
                COALESCE(SUM(si.final_total - si.total_cost), 0) as day_profit,
                COALESCE(SUM(sli_sum.pieces), 0) as day_pieces
            FROM sales_invoices si
            LEFT JOIN (
                SELECT invoice_id, SUM(quantity) as pieces 
                FROM sale_line_items 
                GROUP BY invoice_id
            ) sli_sum ON sli_sum.invoice_id = si.id
            ${whereClause}
            GROUP BY date(si.created_at)
            ORDER BY sale_date ASC LIMIT 30`,
            params
        );

        // 3. Category Contribution
        const categories = this.db.all(
            `SELECT 
                COALESCE(c.name, 'أصناف عامة') as category_name,
                COALESCE(SUM(sli.quantity), 0) as units_sold,
                COALESCE(SUM(sli.line_total), 0) as category_revenue,
                COALESCE(SUM(sli.line_profit), 0) as category_profit
            FROM sale_line_items sli
            JOIN sales_invoices si ON sli.invoice_id = si.id
            JOIN products p ON sli.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            ${whereClause}
            GROUP BY c.id
            ORDER BY category_revenue DESC`,
            params
        );

        (categories || []).forEach(cat => {
            cat.share_percent = netSales > 0 ? Math.round((cat.category_revenue / netSales) * 1000) / 10 : 0;
            cat.profit_margin = cat.category_revenue > 0 ? Math.round((cat.category_profit / cat.category_revenue) * 1000) / 10 : 0;
        });

        // 4. Payment breakdown
        const tenders = this.db.all(
            `SELECT 
                si.payment_method,
                COUNT(*) as count,
                COALESCE(SUM(si.final_total), 0) as total
            FROM sales_invoices si
            ${whereClause}
            GROUP BY si.payment_method`,
            params
        );

        // 5. Sellers Performance (Branch Sellers Only - Admin does NOT sell in branch)
        let sellerQuery = `
            SELECT 
                u.id as user_id,
                COALESCE(e.full_name, u.display_name) as display_name,
                u.username,
                u.role,
                COALESCE(e.job_title, 'مسؤول مبيعات بالفرع') as job_title,
                COUNT(si.id) as invoices_count,
                COALESCE(SUM(si.final_total), 0) as total_sales,
                COALESCE(SUM(si.total_cost), 0) as total_cost,
                COALESCE(SUM(si.final_total - si.total_cost), 0) as total_profit,
                COALESCE(SUM(si.discount_amount), 0) as total_discounts,
                COALESCE(AVG(si.final_total), 0) as avg_order_value,
                COALESCE(SUM(sli_sum.pieces), 0) as total_pieces
            FROM users u
            LEFT JOIN employees e ON e.user_id = u.id
            JOIN sales_invoices si ON si.user_id = u.id AND si.status = 'completed' ${dateCond}
            LEFT JOIN (
                SELECT invoice_id, SUM(quantity) as pieces 
                FROM sale_line_items 
                GROUP BY invoice_id
            ) sli_sum ON sli_sum.invoice_id = si.id
            WHERE u.role != 'admin'
        `;
        const sellerQueryParams = [...dateParams];
        if (sellerId) {
            sellerQuery += ' AND u.id = ?';
            sellerQueryParams.push(sellerId);
        }
        sellerQuery += ' GROUP BY u.id ORDER BY total_sales DESC';

        const sellers = this.db.all(sellerQuery, sellerQueryParams);
        (sellers || []).forEach((s, idx) => {
            s.sales_share = netSales > 0 ? Math.round((s.total_sales / netSales) * 1000) / 10 : 0;
            s.discount_rate = (s.total_sales + s.total_discounts) > 0 ? Math.round((s.total_discounts / (s.total_sales + s.total_discounts)) * 1000) / 10 : 0;
            s.badge = idx === 0 ? 'top_performer' : (s.total_sales >= 500 ? 'high_volume' : 'active');
            s.avg_order_value = Math.round(s.avg_order_value * 100) / 100;
        });

        // 6. Top Movers (Top 10 products)
        const topProducts = this.db.all(
            `SELECT 
                sli.product_id,
                sli.item_name,
                sli.barcode,
                COALESCE(c.name, 'عام') as category_name,
                COALESCE(SUM(sli.quantity), 0) as total_quantity_sold,
                COALESCE(SUM(sli.line_total), 0) as total_revenue,
                COALESCE(SUM(sli.line_profit), 0) as total_profit,
                COALESCE(AVG(sli.unit_price), 0) as avg_unit_price
            FROM sale_line_items sli
            JOIN sales_invoices si ON sli.invoice_id = si.id
            JOIN products p ON sli.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            ${whereClause}
            GROUP BY sli.product_id
            ORDER BY total_revenue DESC LIMIT 10`,
            params
        );

        // 7. Hourly Peak Trading Distribution (24 Hours)
        const hourlyData = this.db.all(
            `SELECT 
                cast(strftime('%H', si.created_at) as integer) as hour_num,
                COUNT(si.id) as count,
                COALESCE(SUM(si.final_total), 0) as total_sales,
                COALESCE(SUM(si.final_total - si.total_cost), 0) as total_profit
            FROM sales_invoices si
            ${whereClause}
            GROUP BY hour_num
            ORDER BY hour_num ASC`,
            params
        );

        // Fill all 24 hours (00 to 23)
        const hourlyDistribution = [];
        const hourlyMap = new Map((hourlyData || []).map(h => [h.hour_num, h]));
        for (let h = 0; h < 24; h++) {
            const row = hourlyMap.get(h) || { hour_num: h, count: 0, total_sales: 0, total_profit: 0 };
            hourlyDistribution.push(row);
        }

        // 8. Day of Week Distribution (Sunday=0 .. Saturday=6)
        const dayNamesArabic = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const dowData = this.db.all(
            `SELECT 
                cast(strftime('%w', si.created_at) as integer) as day_index,
                COUNT(si.id) as count,
                COALESCE(SUM(si.final_total), 0) as total_sales,
                COALESCE(SUM(si.final_total - si.total_cost), 0) as total_profit
            FROM sales_invoices si
            ${whereClause}
            GROUP BY day_index
            ORDER BY day_index ASC`,
            params
        );

        const dowMap = new Map((dowData || []).map(d => [d.day_index, d]));
        // Reorder starting from Saturday (6, 0, 1, 2, 3, 4, 5)
        const weekOrder = [6, 0, 1, 2, 3, 4, 5];
        const dayOfWeekDistribution = weekOrder.map(idx => {
            const row = dowMap.get(idx) || { day_index: idx, count: 0, total_sales: 0, total_profit: 0 };
            return {
                ...row,
                day_name: dayNamesArabic[idx]
            };
        });

        // 9. Users list for seller filter dropdown (Branch Sellers Only - Admin does NOT sell in branch)
        const allSellers = this.db.all(`
            SELECT 
                u.id, 
                u.display_name, 
                u.username, 
                u.role,
                e.full_name as employee_name,
                e.job_title
            FROM users u
            LEFT JOIN employees e ON e.user_id = u.id
            WHERE u.role != 'admin' AND u.is_active = 1
            ORDER BY COALESCE(e.full_name, u.display_name) ASC
        `, []);

        return {
            kpis: {
                netSales,
                grossProfit,
                profitMargin,
                totalInvoices,
                avgOrderValue,
                totalDiscounts,
                discountRate,
                totalPieces,
                avgBasketPieces
            },
            timeline: timeline || [],
            categories: categories || [],
            tenders: tenders || [],
            sellers: sellers || [],
            topProducts: topProducts || [],
            allSellers: allSellers || [],
            hourlyDistribution,
            dayOfWeekDistribution
        };
    }
}

module.exports = { ReportService };
