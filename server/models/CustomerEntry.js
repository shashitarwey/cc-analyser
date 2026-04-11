const mongoose = require('mongoose');

const CustomerEntrySchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    type: { type: String, enum: ['gave', 'got'], required: true },
    amount: { type: Number, required: true, min: 0 },
    entry_date: { type: Date, required: true },
    notes: { type: String, trim: true, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

CustomerEntrySchema.index({ user_id: 1, customer_id: 1, entry_date: -1 });

module.exports = mongoose.model('CustomerEntry', CustomerEntrySchema);
