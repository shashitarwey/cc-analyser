const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Card = require('../models/Card');
const Seller = require('../models/Seller');
const { pickFields } = require('../utils/helpers');
const { invalidateSummaryCache } = require('../utils/cache');

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
    'variant', 'model_ordered', 'id_used', 'delivery_status', 'ecomm_site'
];

// GET all orders for the logged-in user with filters
router.get('/', async (req, res, next) => {
    try {
        const {
            order_date_from, order_date_to,
            delivery_date_from, delivery_date_to,
            seller_id, card_id, delivery_status,
            model_ordered, ecomm_site
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

        const orders = await Order.find(filter)
            .populate('card_id', 'bank_name last_four_digit card_network')
            .populate('seller_id', 'name city')
            .sort({ order_date: -1 });
        res.json(orders);
    } catch (err) { next(err); }
});

// POST a new order — verify ownership of card_id and seller_id
router.post('/', async (req, res, next) => {
    try {
        const data = pickFields(req.body, ORDER_FIELDS);
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
        res.status(201).json(newOrder);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT update an order — verify ownership of card_id and seller_id if changed
router.put('/:id', async (req, res, next) => {
    try {
        const data = pickFields(req.body, ORDER_FIELDS);

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

        const updatedOrder = await Order.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.id },
            data,
            { new: true, runValidators: true }
        );
        if (!updatedOrder) return res.status(404).json({ error: 'Order not found' });
        invalidateSummaryCache(req);
        res.json(updatedOrder);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE an order
router.delete('/:id', async (req, res, next) => {
    try {
        const deletedOrder = await Order.findOneAndDelete({ _id: req.params.id, user_id: req.user.id });
        if (!deletedOrder) return res.status(404).json({ error: 'Order not found' });
        invalidateSummaryCache(req);
        res.json({ success: true });
    } catch (err) { next(err); }
});

module.exports = router;
