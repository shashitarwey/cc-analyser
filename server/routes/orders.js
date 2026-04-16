const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Card = require('../models/Card');
const Seller = require('../models/Seller');
const { pickFields, parsePagination, paginatedResponse } = require('../utils/helpers');
const { invalidateSummaryCache } = require('../utils/cache');
const { logActivity } = require('../utils/activityLogger');
const validate = require('../middleware/validate');
const { createRules, updateRules, idRule, bulkStatusRules, bulkClearRules, bulkDeleteRules } = require('../validators/orders.validator');

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders with filters
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: order_date_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: order_date_to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: delivery_date_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: delivery_date_to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: seller_id
 *         schema: { type: string }
 *       - in: query
 *         name: card_id
 *         schema: { type: string }
 *       - in: query
 *         name: delivery_status
 *         schema: { type: string, enum: [Yes, No, Cancelled] }
 *       - in: query
 *         name: model_ordered
 *         schema: { type: string, description: "Partial match search" }
 *       - in: query
 *         name: ecomm_site
 *         schema: { type: string }
 *     responses:
 *       200: { description: Array of order objects }
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     responses:
 *       201: { description: Order created }
 * /orders/{id}:
 *   put:
 *     summary: Update an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Order updated }
 *   delete:
 *     summary: Delete an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Order deleted }
 */

// Allowed fields for order creation/update
const ORDER_FIELDS = [
    'card_id', 'seller_id', 'order_date', 'delivered_date',
    'order_amount', 'return_amount', 'quantity', 'cashback',
    'variant', 'model_ordered', 'id_used', 'delivery_status', 'ecomm_site', 'is_cleared', 'remark'
];

// GET orders for the logged-in user with filters + server-side pagination
router.get('/', async (req, res, next) => {
    try {
        const {
            order_date_from, order_date_to,
            delivery_date_from, delivery_date_to,
            seller_id, card_id, delivery_status,
            model_ordered, ecomm_site,
            all
        } = req.query;

        const filter = { user_id: req.user.id };

        if (order_date_from || order_date_to) {
            filter.order_date = {};
            if (order_date_from) filter.order_date.$gte = order_date_from;
            if (order_date_to) filter.order_date.$lte = order_date_to;
        }

        if (delivery_date_from || delivery_date_to) {
            filter.delivered_date = {};
            if (delivery_date_from) filter.delivered_date.$gte = delivery_date_from;
            if (delivery_date_to) filter.delivered_date.$lte = delivery_date_to;
        }

        if (seller_id) filter.seller_id = seller_id;
        if (card_id) filter.card_id = card_id;
        if (delivery_status) filter.delivery_status = delivery_status;
        if (model_ordered) filter.model_ordered = { $regex: model_ordered, $options: 'i' };
        if (ecomm_site) filter.ecomm_site = ecomm_site;

        const query = Order.find(filter)
            .populate('card_id', 'bank_name last_four_digit card_network')
            .populate('seller_id', 'name city')
            // Tie-break same-day orders by created_at desc so the most
            // recently added order surfaces at the top of its date group.
            .sort({ order_date: -1, created_at: -1 });

        if (all === 'true') {
            const orders = await query;
            return res.json(orders);
        }

        const { pageNum, limitNum, skip } = parsePagination(req.query);
        const [orders, total] = await Promise.all([
            query.skip(skip).limit(limitNum),
            Order.countDocuments(filter)
        ]);

        res.json(paginatedResponse(orders, total, pageNum, limitNum));
    } catch (err) { next(err); }
});

// POST a new order — verify ownership of card_id and seller_id
router.post('/', createRules, validate, async (req, res, next) => {
    try {
        const data = pickFields(req.body, ORDER_FIELDS);
        // Strip empty delivered_date / delivery_status so Mongoose uses defaults
        // (delivered_date stays undefined, delivery_status defaults to 'No').
        // These are optional at creation and filled in later when delivered.
        if (!data.delivered_date) delete data.delivered_date;
        if (!data.delivery_status) delete data.delivery_status;
        data.user_id = req.user.id;

        // Verify the card belongs to the current user
        if (data.card_id) {
            const card = await Card.findOne({ _id: data.card_id, user_id: req.user.id });
            if (!card) return res.status(400).json({ error: 'Invalid card_id — card not found or not yours' });
        }

        // Verify the seller belongs to the current user
        if (data.seller_id) {
            const seller = await Seller.findOne({ _id: data.seller_id, user_id: req.user.id });
            if (!seller) return res.status(400).json({ error: 'Invalid seller_id — seller not found or not yours' });
        }

        const newOrder = new Order(data);
        await newOrder.save();
        invalidateSummaryCache(req);
        const orderDate = new Date(data.order_date).toLocaleDateString('en-GB');

        // Build snapshot with resolved names
        const snap = newOrder.toObject();
        const [cardDoc, sellerDoc] = await Promise.all([
            Card.findById(newOrder.card_id, 'bank_name last_four_digit'),
            Seller.findById(newOrder.seller_id, 'name city')
        ]);
        if (cardDoc) snap.card_id = `${cardDoc.bank_name} •••• ${cardDoc.last_four_digit}`;
        if (sellerDoc) snap.seller_id = `${sellerDoc.name}, ${sellerDoc.city}`;

        logActivity(req.user.id, 'created', 'order', newOrder._id, `Added order: ${data.model_ordered} | ${data.ecomm_site} | ₹${data.order_amount} | ${orderDate}`, snap);
        res.status(201).json(newOrder);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT update an order — verify ownership of card_id and seller_id if changed
router.put('/:id', updateRules, validate, async (req, res, next) => {
    try {
        const data = pickFields(req.body, ORDER_FIELDS);
        // An empty delivered_date means "clear it" (e.g. user reverted delivery
        // status from Yes back to No). Convert to null so Mongoose clears the
        // field instead of failing to cast '' to Date. If the field wasn't
        // sent at all, pickFields omits it and we leave it untouched.
        if (data.delivered_date === '') data.delivered_date = null;
        // delivery_status is an enum without a "blank" option — drop empty
        // values so the existing status is preserved on update.
        if (data.delivery_status === '') delete data.delivery_status;

        // Verify the card belongs to the current user if being changed
        if (data.card_id) {
            const card = await Card.findOne({ _id: data.card_id, user_id: req.user.id });
            if (!card) return res.status(400).json({ error: 'Invalid card_id — card not found or not yours' });
        }

        // Verify the seller belongs to the current user if being changed
        if (data.seller_id) {
            const seller = await Seller.findOne({ _id: data.seller_id, user_id: req.user.id });
            if (!seller) return res.status(400).json({ error: 'Invalid seller_id — seller not found or not yours' });
        }

        // Fetch old order to compute changed fields
        const oldOrder = await Order.findOne({ _id: req.params.id, user_id: req.user.id });
        if (!oldOrder) return res.status(404).json({ error: 'Order not found' });

        const updatedOrder = await Order.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.id },
            data,
            { new: true, runValidators: true }
        );
        invalidateSummaryCache(req);

        // Compute which fields actually changed
        const changedFields = Object.keys(data).filter(k => String(oldOrder[k]) !== String(updatedOrder[k]));

        const oDate = new Date(updatedOrder.order_date).toLocaleDateString('en-GB');
        const orderTag = `${updatedOrder.model_ordered} | ${updatedOrder.ecomm_site} | ₹${updatedOrder.order_amount} | ${oDate}`;
        const desc = `Updated order: ${orderTag}`;

        // Build snapshot with resolved names
        const snap = updatedOrder.toObject();
        const [cardDoc, sellerDoc] = await Promise.all([
            Card.findById(updatedOrder.card_id, 'bank_name last_four_digit'),
            Seller.findById(updatedOrder.seller_id, 'name city')
        ]);
        if (cardDoc) snap.card_id = `${cardDoc.bank_name} •••• ${cardDoc.last_four_digit}`;
        if (sellerDoc) snap.seller_id = `${sellerDoc.name}, ${sellerDoc.city}`;

        logActivity(req.user.id, 'updated', 'order', updatedOrder._id, desc, snap, changedFields);
        res.json(updatedOrder);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE an order
router.delete('/:id', idRule, validate, async (req, res, next) => {
    try {
        const deletedOrder = await Order.findOneAndDelete({ _id: req.params.id, user_id: req.user.id });
        if (!deletedOrder) return res.status(404).json({ error: 'Order not found' });
        invalidateSummaryCache(req);
        const delDate = new Date(deletedOrder.order_date).toLocaleDateString('en-GB');

        const snap = deletedOrder.toObject();
        const [cardDoc, sellerDoc] = await Promise.all([
            Card.findById(deletedOrder.card_id, 'bank_name last_four_digit'),
            Seller.findById(deletedOrder.seller_id, 'name city')
        ]);
        if (cardDoc) snap.card_id = `${cardDoc.bank_name} •••• ${cardDoc.last_four_digit}`;
        if (sellerDoc) snap.seller_id = `${sellerDoc.name}, ${sellerDoc.city}`;

        logActivity(req.user.id, 'deleted', 'order', deletedOrder._id, `Deleted order: ${deletedOrder.model_ordered} | ${deletedOrder.ecomm_site} | ₹${deletedOrder.order_amount} | ${delDate}`, snap);
        res.json({ success: true });
    } catch (err) { next(err); }
});

// ── Bulk Actions ────────────────────────────────────────────────────────────

// POST bulk status update
router.post('/bulk/status', bulkStatusRules, validate, async (req, res, next) => {
    try {
        const { ids, delivery_status, delivered_date } = req.body;
        const update = { delivery_status };
        if (delivery_status === 'Yes' && delivered_date) {
            update.delivered_date = delivered_date;
        } else if (delivery_status !== 'Yes') {
            update.delivered_date = null;
        }
        const result = await Order.updateMany(
            { _id: { $in: ids }, user_id: req.user.id },
            update
        );
        invalidateSummaryCache(req);
        logActivity(req.user.id, 'updated', 'order', null,
            `Bulk status update: ${result.modifiedCount} order(s) → ${delivery_status}`, { ids, delivery_status });
        res.json({ success: true, modified: result.modifiedCount });
    } catch (err) { next(err); }
});

// POST bulk mark cleared / uncleared
router.post('/bulk/clear', bulkClearRules, validate, async (req, res, next) => {
    try {
        const { ids, is_cleared } = req.body;
        const result = await Order.updateMany(
            { _id: { $in: ids }, user_id: req.user.id },
            { is_cleared }
        );
        invalidateSummaryCache(req);
        logActivity(req.user.id, 'updated', 'order', null,
            `Bulk ${is_cleared ? 'cleared' : 'uncleared'}: ${result.modifiedCount} order(s)`, { ids, is_cleared });
        res.json({ success: true, modified: result.modifiedCount });
    } catch (err) { next(err); }
});

// POST bulk delete
router.post('/bulk/delete', bulkDeleteRules, validate, async (req, res, next) => {
    try {
        const { ids } = req.body;
        const result = await Order.deleteMany(
            { _id: { $in: ids }, user_id: req.user.id }
        );
        invalidateSummaryCache(req);
        logActivity(req.user.id, 'deleted', 'order', null,
            `Bulk deleted: ${result.deletedCount} order(s)`, { ids });
        res.json({ success: true, deleted: result.deletedCount });
    } catch (err) { next(err); }
});

module.exports = router;
