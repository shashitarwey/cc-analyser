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
 *     responses:
 *       200:
 *         description: Object with monthly array, bySeller array, byEcommSite array, and totals
 */

/**
 * GET /api/analytics/profit
 *
 * Returns:
 *  - monthly: [{ month, order_amount, return_amount, cashback, profit, order_count }]
 *  - bySeller: [{ seller_id, seller_name, seller_city, order_amount, return_amount, cashback, profit, order_count }]
 *  - byEcommSite: [{ ecomm_site, order_amount, return_amount, cashback, profit, order_count }]
 *  - totals: { order_amount, return_amount, cashback, profit, order_count }
 */
router.get('/profit', cacheMiddleware(300), async (req, res, next) => {
    try {
        const userId = toObjectId(req.user.id);
        const baseMatch = { user_id: userId, delivery_status: 'Yes' };

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

        // Format month labels
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyFormatted = monthly.map(m => ({
            ...m,
            label: `${MONTHS[m.month - 1]} ${m.year}`,
        }));

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

        // ── Overall totals ──────────────────────────────────────────────
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

        res.json({
            monthly: monthlyFormatted,
            bySeller,
            byEcommSite,
            totals: totals || { order_amount: 0, return_amount: 0, cashback: 0, profit: 0, order_count: 0 },
        });
    } catch (err) { next(err); }
});

module.exports = router;
