const mongoose = require('mongoose');

/**
 * Transaction Model
 *
 * Fields:
 *  card_id     – reference to Card
 *  amount      – spend amount in ₹
 *  description – merchant / note
 *  date        – ISO date string (YYYY-MM-DD)
 */
const transactionSchema = new mongoose.Schema(
    {
        card_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Card',
            required: [true, 'card_id is required'],
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0.01, 'Amount must be positive'],
        },
        description: {
            type: String,
            default: '',
            trim: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

transactionSchema.index({ card_id: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
