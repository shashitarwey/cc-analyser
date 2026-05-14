const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Card = require('../models/Card');
const Seller = require('../models/Seller');
const SellerPayment = require('../models/SellerPayment');
const { toObjectId } = require('../utils/helpers');
const logger = require('../utils/logger');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_ORDERS_IN_CONTEXT = 2000;

// Build a compact, structured snapshot of the user's data for Gemini.
// Only includes fields useful for analytical reasoning — keeps token cost low
// while letting the model compute exact figures from real data.
async function buildUserDataSnapshot(userId) {
    const uid = toObjectId(userId);

    const [orders, cards, sellers, payments] = await Promise.all([
        Order.find({ user_id: uid })
            .sort({ order_date: -1 })
            .limit(MAX_ORDERS_IN_CONTEXT)
            .populate('card_id', 'bank_name last_four_digit card_network')
            .populate('seller_id', 'name city')
            .lean(),
        Card.find({ user_id: uid }).lean(),
        Seller.find({ user_id: uid }).lean(),
        SellerPayment.find({ user_id: uid })
            .sort({ payment_date: -1 })
            .limit(1000)
            .populate('seller_id', 'name')
            .lean(),
    ]);

    const orderTotal = await Order.countDocuments({ user_id: uid });

    return {
        today: new Date().toISOString().slice(0, 10),
        fy_start: (() => {
            const now = new Date();
            const y = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
            return `${y}-04-01`;
        })(),
        meta: {
            order_count_total: orderTotal,
            orders_in_context: orders.length,
            truncated: orderTotal > orders.length,
        },
        cards: cards.map(c => ({
            id: c._id.toString(),
            bank: c.bank_name,
            last_four: c.last_four_digit,
            network: c.card_network,
            billing_day: c.billing_date,
            due_day: c.due_date,
            cashback_percent: c.cashback_percent,
            cashback_max: c.cashback_max,
        })),
        sellers: sellers.map(s => ({
            id: s._id.toString(),
            name: s.name,
            city: s.city,
            phone: s.phone,
        })),
        orders: orders.map(o => ({
            id: o._id.toString(),
            date: o.order_date ? new Date(o.order_date).toISOString().slice(0, 10) : null,
            delivered_date: o.delivered_date ? new Date(o.delivered_date).toISOString().slice(0, 10) : null,
            item: o.model_ordered,
            variant: o.variant,
            qty: o.quantity,
            order_amount: o.order_amount,
            return_amount: o.return_amount,
            cashback: o.cashback,
            profit: (o.return_amount || 0) - (o.order_amount || 0) + (o.cashback || 0),
            status: o.delivery_status, // Yes=Delivered, No=Pending, Cancelled
            cleared: o.is_cleared,
            ecomm_site: o.ecomm_site,
            seller: o.seller_id ? { id: o.seller_id._id?.toString(), name: o.seller_id.name, city: o.seller_id.city } : null,
            card: o.card_id ? { id: o.card_id._id?.toString(), bank: o.card_id.bank_name, last_four: o.card_id.last_four_digit } : null,
        })),
        payments: payments.map(p => ({
            id: p._id.toString(),
            seller: p.seller_id ? { id: p.seller_id._id?.toString(), name: p.seller_id.name } : null,
            amount: p.amount,
            date: p.payment_date ? new Date(p.payment_date).toISOString().slice(0, 10) : null,
            notes: p.notes || '',
        })),
    };
}

const SYSTEM_PROMPT = `You are CardVault's financial analytics assistant for a credit card and reseller-order tracking app.

RULES:
- Use ONLY the JSON data provided in the user message. Never invent numbers, sellers, cards, or orders.
- If the data doesn't contain the answer, say so clearly. Do not guess.
- Format all currency in Indian style with ₹ symbol and Indian number grouping (e.g. ₹1,23,456).
- Round currency to whole rupees unless the user explicitly asks for paise precision.
- Profit for an order = return_amount - order_amount + cashback. "Delivered" means status === "Yes".
- "Cleared" means the order has been paid out by the seller (is_cleared: true).
- When asked about a time period, filter by order date unless the user specifies delivery date.
- Keep responses concise: lead with the number/answer, then 1-2 lines of context if useful.
- Use bullet points or compact tables when listing multiple items.
- The data may be truncated to the most recent ${MAX_ORDERS_IN_CONTEXT} orders. If meta.truncated is true, note this when relevant.`;

// POST /api/ai/ask — multi-turn chat with the user's real data as context.
// Request body:
//   { question: string, history?: [{ role: 'user'|'model', content: string }] }
// Response:
//   { answer: string }
router.post('/ask', async (req, res, next) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(503).json({ error: 'AI assistant is not configured. Set GEMINI_API_KEY on the server.' });
        }

        const { question, history } = req.body;
        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return res.status(400).json({ error: 'Question is required.' });
        }
        if (question.length > 1000) {
            return res.status(400).json({ error: 'Question is too long (max 1000 characters).' });
        }

        const snapshot = await buildUserDataSnapshot(req.user.id);

        // Build Gemini contents array. The data snapshot is bundled into the
        // current user turn so it always reflects fresh state; history holds
        // prior Q&A pairs to support follow-ups like "and what about last month?".
        const priorTurns = Array.isArray(history)
            ? history
                .filter(m => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'model'))
                .slice(-10) // cap to last 10 exchanges to bound token cost
                .map(m => ({ role: m.role, parts: [{ text: m.content }] }))
            : [];

        const currentTurn = {
            role: 'user',
            parts: [{
                text: `DATA (JSON):\n${JSON.stringify(snapshot)}\n\nQUESTION: ${question.trim()}`,
            }],
        };

        const body = {
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [...priorTurns, currentTurn],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1024,
            },
        };

        const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            logger.error('Gemini API error', { status: resp.status, body: errText.slice(0, 500) });
            if (resp.status === 429) {
                return res.status(429).json({ error: 'AI rate limit reached. Please wait a minute and try again.' });
            }
            if (resp.status === 401 || resp.status === 403) {
                return res.status(503).json({ error: 'AI key invalid or unauthorized. Check GEMINI_API_KEY.' });
            }
            return res.status(502).json({ error: 'AI service error. Please try again.' });
        }

        const data = await resp.json();
        const answer = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
        if (!answer) {
            return res.status(502).json({ error: 'AI returned an empty response.' });
        }

        res.json({ answer });
    } catch (err) { next(err); }
});

module.exports = router;
