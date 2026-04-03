const express = require('express');
const router = express.Router();
const multer = require('multer');
const Seller = require('../models/Seller');
const Order = require('../models/Order');
const SellerPayment = require('../models/SellerPayment');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { toObjectId } = require('../utils/helpers');

/**
 * @swagger
 * /sellers:
 *   get:
 *     summary: Get all sellers with aggregated stats
 *     tags: [Sellers]
 *     responses:
 *       200: { description: Array of sellers with total_amount_ordered, total_amount_get, due_balance, profit }
 *   post:
 *     summary: Create a new seller
 *     tags: [Sellers]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, city]
 *             properties:
 *               name: { type: string }
 *               city: { type: string }
 *               phone: { type: string }
 *     responses:
 *       201: { description: Seller created }
 * /sellers/{id}:
 *   get:
 *     summary: Get single seller with stats
 *     tags: [Sellers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Seller object with stats }
 *   put:
 *     summary: Update a seller
 *     tags: [Sellers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Seller updated }
 *   delete:
 *     summary: Delete a seller (fails if orders exist)
 *     tags: [Sellers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Seller deleted }
 *       400: { description: Cannot delete — orders exist }
 * /sellers/{sellerId}/payment:
 *   get:
 *     summary: Get payment ledger for a seller
 *     tags: [Sellers]
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Array of payment objects }
 * /sellers/payment:
 *   post:
 *     summary: Add a seller payment (with optional receipt upload)
 *     tags: [Sellers]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [seller_id, amount, payment_date]
 *             properties:
 *               seller_id: { type: string }
 *               amount: { type: number }
 *               payment_date: { type: string, format: date }
 *               notes: { type: string }
 *               receipt: { type: string, format: binary }
 *     responses:
 *       201: { description: Payment created }
 * /sellers/payment/{id}:
 *   put:
 *     summary: Update a seller payment
 *     tags: [Sellers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Payment updated }
 *   delete:
 *     summary: Delete a seller payment
 *     tags: [Sellers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Payment deleted }
 */

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 * 1024 } // 1MB limit
});

// Get all sellers with dynamically aggregated stats
router.get('/', async (req, res, next) => {
    try {
        const userId = toObjectId(req.user.id);
        const sellers = await Seller.find({ user_id: req.user.id }).sort({ name: 1 });

        // Aggregate order stats per seller
        const stats = await Order.aggregate([
            { $match: { user_id: userId, delivery_status: 'Yes' } },
            {
                $group: {
                    _id: '$seller_id',
                    total_amount_ordered: { $sum: '$order_amount' },
                    total_amount_get: { $sum: '$return_amount' },
                    total_cashback: { $sum: '$cashback' }
                }
            }
        ]);

        const statsMap = stats.reduce((acc, stat) => {
            acc[stat._id.toString()] = stat;
            return acc;
        }, {});

        // Aggregate payment stats from Khata book ledger
        const payments = await SellerPayment.aggregate([
            { $match: { user_id: userId } },
            {
                $group: {
                    _id: '$seller_id',
                    total_paid: { $sum: '$amount' }
                }
            }
        ]);

        const paymentsMap = payments.reduce((acc, p) => {
            acc[p._id.toString()] = p.total_paid;
            return acc;
        }, {});

        // Inject the dynamically calculated metrics directly
        const sellersWithStats = sellers.map(seller => {
            const stat = statsMap[seller._id.toString()] || { total_amount_ordered: 0, total_amount_get: 0, total_cashback: 0 };
            const total_paid = paymentsMap[seller._id.toString()] || 0;

            const total_amount_ordered = stat.total_amount_ordered;
            const total_amount_get = stat.total_amount_get;
            const profit = total_amount_get - total_amount_ordered + (stat.total_cashback || 0);
            const due_balance = total_amount_get - total_paid;

            return {
                ...seller.toObject(),
                total_amount_ordered,
                total_amount_get,
                total_received: total_paid,
                due_balance,
                profit
            };
        });

        res.json(sellersWithStats);
    } catch (err) { next(err); }
});

// Get a single seller by ID with stats
router.get('/:id', async (req, res, next) => {
    try {
        const seller = await Seller.findOne({ _id: req.params.id, user_id: req.user.id });
        if (!seller) return res.status(404).json({ error: 'Seller not found' });

        const userId = toObjectId(req.user.id);
        const sellerIdObj = toObjectId(seller._id);

        const [orderStat] = await Order.aggregate([
            { $match: { user_id: userId, seller_id: sellerIdObj, delivery_status: 'Yes' } },
            { $group: { _id: null, total_amount_ordered: { $sum: '$order_amount' }, total_amount_get: { $sum: '$return_amount' }, total_cashback: { $sum: '$cashback' } } }
        ]);

        const [paymentStat] = await SellerPayment.aggregate([
            { $match: { user_id: userId, seller_id: sellerIdObj } },
            { $group: { _id: null, total_paid: { $sum: '$amount' } } }
        ]);

        const stat = orderStat || { total_amount_ordered: 0, total_amount_get: 0, total_cashback: 0 };
        const total_paid = paymentStat?.total_paid || 0;
        const profit = stat.total_amount_get - stat.total_amount_ordered + (stat.total_cashback || 0);
        const due_balance = stat.total_amount_get - total_paid;

        res.json({
            ...seller.toObject(),
            total_amount_ordered: stat.total_amount_ordered,
            total_amount_get: stat.total_amount_get,
            total_received: total_paid,
            due_balance,
            profit
        });
    } catch (err) { next(err); }
});

// Add a seller
router.post('/', async (req, res, next) => {
    try {
        const { name, city, phone } = req.body;
        if (!name || !city) return res.status(400).json({ error: 'Name and city are required' });
        const newSeller = new Seller({
            user_id: req.user.id,
            name,
            city,
            phone: phone || ''
        });
        const savedSeller = await newSeller.save();
        res.status(201).json(savedSeller);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update a seller
router.put('/:id', async (req, res, next) => {
    try {
        const { name, city, phone } = req.body;
        const update = {};
        if (name !== undefined) update.name = name;
        if (city !== undefined) update.city = city;
        if (phone !== undefined) update.phone = phone;

        const updatedSeller = await Seller.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.id },
            update,
            { new: true, runValidators: true }
        );
        if (!updatedSeller) return res.status(404).json({ error: 'Seller not found' });
        res.json(updatedSeller);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete a seller
router.delete('/:id', async (req, res, next) => {
    try {
        const ordersCount = await Order.countDocuments({ seller_id: req.params.id, user_id: req.user.id });
        if (ordersCount > 0) {
            return res.status(400).json({ error: 'Cannot delete seller with existing orders. Please delete or reassign the orders first.' });
        }

        const deletedSeller = await Seller.findOneAndDelete({ _id: req.params.id, user_id: req.user.id });
        if (!deletedSeller) return res.status(404).json({ error: 'Seller not found' });
        res.json({ success: true });
    } catch (err) { next(err); }
});

// Get ledger for a specific seller
router.get('/:sellerId/payment', async (req, res, next) => {
    try {
        const payments = await SellerPayment.find({
            seller_id: req.params.sellerId,
            user_id: req.user.id
        }).sort({ payment_date: -1, createdAt: -1 });
        res.json(payments);
    } catch (err) { next(err); }
});

// Add a payment
router.post('/payment', upload.single('receipt'), async (req, res, next) => {
    try {
        const { seller_id, amount, payment_date, notes } = req.body;

        // Verify seller belongs to current user
        const seller = await Seller.findOne({ _id: seller_id, user_id: req.user.id });
        if (!seller) return res.status(400).json({ error: 'Invalid seller_id — seller not found or not yours' });

        let receipt_url = '';
        if (req.file) {
            receipt_url = await uploadToCloudinary(req.file.buffer, 'analyzer_receipts');
        }

        const newPayment = new SellerPayment({
            user_id: req.user.id,
            seller_id,
            amount: Number(amount),
            payment_date,
            notes,
            receipt_url
        });
        const savedPayment = await newPayment.save();
        res.status(201).json(savedPayment);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update a payment
router.put('/payment/:id', upload.single('receipt'), async (req, res, next) => {
    try {
        const { amount, payment_date, notes } = req.body;
        const update = {};
        if (amount !== undefined) update.amount = Number(amount);
        if (payment_date !== undefined) update.payment_date = payment_date;
        if (notes !== undefined) update.notes = notes;

        if (req.file) {
            update.receipt_url = await uploadToCloudinary(req.file.buffer, 'analyzer_receipts');
        } else if (req.body.remove_receipt === 'true') {
            update.receipt_url = '';
        }

        const updated = await SellerPayment.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.id },
            update,
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ error: 'Payment not found' });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete a payment
router.delete('/payment/:id', async (req, res, next) => {
    try {
        const deletedPayment = await SellerPayment.findOneAndDelete({
            _id: req.params.id,
            user_id: req.user.id
        });
        if (!deletedPayment) return res.status(404).json({ error: 'Payment not found' });
        res.json({ success: true });
    } catch (err) { next(err); }
});

module.exports = router;
