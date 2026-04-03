const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    card_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true },
    order_date: { type: Date, required: true },
    delivered_date: { type: Date },
    order_amount: { type: Number, required: true },
    return_amount: { type: Number, required: true },
    quantity: { type: Number, default: 1 },
    cashback: { type: Number, default: 0 },
    variant: {
        type: String,
        enum: ['NA', '6/128', '8/128', '8/256', '12/256', '4/64', '4/128', '12/1024', '12/512'],
        default: 'NA'
    },
    model_ordered: { type: String, required: true },
    id_used: { type: String, required: true },

    delivery_status: {
        type: String,
        enum: ['Yes', 'No', 'Cancelled'],
        default: 'No',
        required: true
    },
    ecomm_site: {
        type: String,
        enum: ['Flipkart', 'Amazon', 'Myntra', 'Ajio', 'Samsung Store', 'Oneplus Store', 'Realme Store', 'Reliance Digital', 'Other'],
        required: true
    },
    seller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

OrderSchema.index({ user_id: 1, order_date: -1 });
OrderSchema.index({ card_id: 1, delivery_status: 1 });

module.exports = mongoose.model('Order', OrderSchema);
