const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

CustomerSchema.index({ user_id: 1, name: 1 });

module.exports = mongoose.model('Customer', CustomerSchema);
