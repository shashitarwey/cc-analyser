const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const Transaction = require('../models/Transaction');
const { pickFields } = require('../utils/helpers');
const { invalidateSummaryCache } = require('../utils/cache');

/**
 * @swagger
 * /cards:
 *   get:
 *     summary: Get all cards for the authenticated user
 *     tags: [Cards]
 *     responses:
 *       200: { description: Array of card objects sorted by bank name }
 *   post:
 *     summary: Create a new credit card
 *     tags: [Cards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bank_name, card_network, last_four_digit, name_on_card]
 *             properties:
 *               bank_name: { type: string }
 *               card_network: { type: string, enum: [Visa, Mastercard, AmEx, RuPay] }
 *               last_four_digit: { type: string, pattern: "^\\d{4}$" }
 *               name_on_card: { type: string }
 *               cashback_enabled: { type: boolean }
 *               cashback_percent: { type: number }
 *               cashback_limit: { type: number }
 *               cashback_period: { type: string, enum: [monthly, quarterly, half-yearly, yearly] }
 *               billing_date: { type: integer, minimum: 1, maximum: 31 }
 *               due_date: { type: integer, minimum: 1, maximum: 31 }
 *     responses:
 *       201: { description: Card created }
 * /cards/{id}:
 *   put:
 *     summary: Update a card
 *     tags: [Cards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Card updated }
 *       404: { description: Card not found }
 *   delete:
 *     summary: Delete a card and all its transactions
 *     tags: [Cards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Card and transactions deleted }
 *       404: { description: Card not found }
 */

// Allowed fields for card creation/update
const CARD_FIELDS = [
    'bank_name', 'card_network', 'last_four_digit', 'name_on_card',
    'cashback_enabled', 'cashback_percent', 'cashback_limit', 'cashback_period',
    'billing_date', 'due_date'
];

// All routes scoped to req.user (set by authMiddleware in index.js)

router.get('/', async (req, res, next) => {
    try {
        const cards = await Card.find({ user_id: req.user.id }).sort({ bank_name: 1, createdAt: 1 });
        res.json(cards);
    } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
    try {
        const data = pickFields(req.body, CARD_FIELDS);
        data.user_id = req.user.id;
        const card = await Card.create(data);
        invalidateSummaryCache(req);
        res.status(201).json(card);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const data = pickFields(req.body, CARD_FIELDS);
        const card = await Card.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.id },
            data,
            { new: true, runValidators: true }
        );
        if (!card) return res.status(404).json({ error: 'Card not found' });
        invalidateSummaryCache(req);
        res.json(card);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const card = await Card.findOneAndDelete({ _id: req.params.id, user_id: req.user.id });
        if (!card) return res.status(404).json({ error: 'Card not found' });
        await Transaction.deleteMany({ card_id: req.params.id });
        invalidateSummaryCache(req);
        res.json({ success: true });
    } catch (err) { next(err); }
});

module.exports = router;
