const mongoose = require('mongoose');

const SellerSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    city: { type: String, required: true },
    phone: { type: String, trim: true, default: '' },
    total_amount_ordered: { type: Number, default: 0 },
    total_amount_get: { type: Number, default: 0 },
    profit: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

SellerSchema.index({ user_id: 1, name: 1 });

module.exports = mongoose.model('Seller', SellerSchema);
