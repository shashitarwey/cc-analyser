const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Seller = require('../models/Seller');
const { toObjectId } = require('../utils/helpers');
const { cacheMiddleware } = require('../utils/cache');

/**
 * @swagger
 * /analytics/profit:
 *   get:
 *     summary: Get profit analytics (monthly trend, by seller, by platform)
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: from_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Object with monthly, bySeller, byEcommSite, totals, fy
 */

/**
 * GET /api/analytics/profit
 *
 * Returns:
 *  - monthly: [{ label, year, month, order_amount, return_amount, cashback, profit, order_count }]
 *    Empty months between earliest and latest are filled with zeros so the trend
 *    chart doesn't draw long straight lines across gaps.
 *  - bySeller / byEcommSite / totals — date-filtered when from_date/to_date are set.
 *  - fy: { start, days, profit, per_day_profit } — always FY-to-date (1 Apr → today),
 *    independent of the date filter. Used by the "Per Day Profit (FY)" stat card.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Fill empty months between start and end (inclusive) so a sparse trend
// renders as zeros instead of a single sloped line across the gap.
function fillMonthlyGaps(rows, startDate, endDate) {
    const byKey = new Map(rows.map(r => [`${r.year}-${r.month}`, r]));
    const out = [];
    const cur = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
    const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
    while (cur <= end) {
        const y = cur.getUTCFullYear();
        const m = cur.getUTCMonth() + 1;
        const key = `${y}-${m}`;
        const existing = byKey.get(key);
        out.push(existing || {
            year: y, month: m,
            order_amount: 0, return_amount: 0, cashback: 0, profit: 0, order_count: 0,
            label: `${MONTHS[m - 1]} ${y}`,
        });
        cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    return out;
}

router.get('/profit', cacheMiddleware(300), async (req, res, next) => {
    try {
        const userId = toObjectId(req.user.id);
        const { from_date, to_date } = req.query;

        const baseMatch = { user_id: userId, delivery_status: 'Yes' };
        if (from_date || to_date) {
            baseMatch.order_date = {};
            if (from_date) baseMatch.order_date.$gte = new Date(from_date);
            if (to_date) baseMatch.order_date.$lte = new Date(`${to_date}T23:59:59.999Z`);
        }

        // ── Monthly profit trend ────────────────────────────────────────
        const monthly = await Order.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: {
                        year: { $year: '$order_date' },
                        month: { $month: '$order_date' },
                    },
                    order_amount: { $sum: '$order_amount' },
                    return_amount: { $sum: '$return_amount' },
                    cashback: { $sum: '$cashback' },
                    order_count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    order_amount: 1,
                    return_amount: 1,
                    cashback: 1,
                    order_count: 1,
                    profit: {
                        $add: [
                            { $subtract: ['$return_amount', '$order_amount'] },
                            '$cashback',
                        ],
                    },
                },
            },
            { $sort: { year: 1, month: 1 } },
        ]);

        const monthlyWithLabels = monthly.map(m => ({
            ...m,
            label: `${MONTHS[m.month - 1]} ${m.year}`,
        }));

        // Range for gap-filling: use filter bounds if provided, else min-order-date
        // to today. Falls back to today/today when there are no orders at all.
        let trendStart, trendEnd;
        if (from_date) trendStart = new Date(from_date);
        else if (monthlyWithLabels.length) trendStart = new Date(Date.UTC(monthlyWithLabels[0].year, monthlyWithLabels[0].month - 1, 1));
        else trendStart = new Date();
        if (to_date) trendEnd = new Date(to_date);
        else trendEnd = new Date();

        const monthlyFormatted = monthlyWithLabels.length || (from_date && to_date)
            ? fillMonthlyGaps(monthlyWithLabels, trendStart, trendEnd)
            : [];

        // ── Profit by seller ────────────────────────────────────────────
        const bySeller = await Order.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: '$seller_id',
                    order_amount: { $sum: '$order_amount' },
                    return_amount: { $sum: '$return_amount' },
                    cashback: { $sum: '$cashback' },
                    order_count: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: 'sellers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'seller',
                },
            },
            { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    seller_id: '$_id',
                    seller_name: { $ifNull: ['$seller.name', 'Unknown'] },
                    seller_city: { $ifNull: ['$seller.city', ''] },
                    order_amount: 1,
                    return_amount: 1,
                    cashback: 1,
                    order_count: 1,
                    profit: {
                        $add: [
                            { $subtract: ['$return_amount', '$order_amount'] },
                            '$cashback',
                        ],
                    },
                    profit_percent: {
                        $cond: [
                            { $eq: ['$order_amount', 0] },
                            0,
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            {
                                                $divide: [
                                                    { $add: [{ $subtract: ['$return_amount', '$order_amount'] }, '$cashback'] },
                                                    '$order_amount',
                                                ]
                                            },
                                            100,
                                        ],
                                    },
                                    2,
                                ],
                            },
                        ],
                    },
                },
            },
            { $sort: { profit: -1 } },
        ]);

        // ── Profit by e-commerce site ───────────────────────────────────
        const byEcommSite = await Order.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: '$ecomm_site',
                    order_amount: { $sum: '$order_amount' },
                    return_amount: { $sum: '$return_amount' },
                    cashback: { $sum: '$cashback' },
                    order_count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    ecomm_site: '$_id',
                    order_amount: 1,
                    return_amount: 1,
                    cashback: 1,
                    order_count: 1,
                    profit: {
                        $add: [
                            { $subtract: ['$return_amount', '$order_amount'] },
                            '$cashback',
                        ],
                    },
                },
            },
            { $sort: { profit: -1 } },
        ]);

        // ── Overall totals (within filter) ──────────────────────────────
        const [totals] = await Order.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: null,
                    order_amount: { $sum: '$order_amount' },
                    return_amount: { $sum: '$return_amount' },
                    cashback: { $sum: '$cashback' },
                    order_count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    order_amount: 1,
                    return_amount: 1,
                    cashback: 1,
                    order_count: 1,
                    profit: {
                        $add: [
                            { $subtract: ['$return_amount', '$order_amount'] },
                            '$cashback',
                        ],
                    },
                },
            },
        ]);

        // ── FY-to-date per-day profit (independent of filter) ───────────
        // Indian FY runs 1 Apr → 31 Mar. Stat shows total FY profit / days elapsed.
        const now = new Date();
        const fyStartYear = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
        const fyStart = new Date(Date.UTC(fyStartYear, 3, 1));
        const fyDays = Math.max(1, Math.floor((now - fyStart) / 86400000) + 1);

        const [fyTotals] = await Order.aggregate([
            { $match: { user_id: userId, delivery_status: 'Yes', order_date: { $gte: fyStart } } },
            {
                $group: {
                    _id: null,
                    profit: {
                        $sum: { $add: [{ $subtract: ['$return_amount', '$order_amount'] }, '$cashback'] },
                    },
                },
            },
        ]);
        const fyProfit = fyTotals?.profit || 0;

        res.json({
            monthly: monthlyFormatted,
            bySeller,
            byEcommSite,
            totals: totals || { order_amount: 0, return_amount: 0, cashback: 0, profit: 0, order_count: 0 },
            fy: {
                start: fyStart.toISOString().slice(0, 10),
                days: fyDays,
                profit: fyProfit,
                per_day_profit: fyProfit / fyDays,
            },
        });
    } catch (err) { next(err); }
});

module.exports = router;
