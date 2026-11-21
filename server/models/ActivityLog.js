const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
        type: String,
        enum: ['created', 'updated', 'deleted'],
        required: true
    },
    entity: {
        type: String,
        enum: ['order', 'seller', 'seller_payment', 'transaction', 'card', 'customer', 'customer_entry'],
        required: true
    },
    entity_id: { type: mongoose.Schema.Types.ObjectId },
    description: { type: String, required: true },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    changed_fields: { type: [String], default: [] }
}, { timestamps: { createdAt: 'created_at' } });

ActivityLogSchema.index({ user_id: 1, created_at: -1 });
ActivityLogSchema.index({ user_id: 1, entity_id: 1 });
// TTL: auto-delete after ~15 months (456 days)
const ACTIVITY_TTL_SECONDS = 456 * 24 * 60 * 60;
ActivityLogSchema.index({ created_at: 1 }, { expireAfterSeconds: ACTIVITY_TTL_SECONDS });

const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

/**
 * MongoDB does NOT update an existing TTL index when the schema value changes —
 * Mongoose's autoIndex just fails with IndexOptionsConflict and the old expiry
 * stays in force. This syncs the live index via collMod on startup.
 */
ActivityLog.syncTTL = async () => {
    const indexes = await ActivityLog.collection.indexes().catch(() => []);
    const ttl = indexes.find(i => i.key?.created_at === 1 && Object.keys(i.key).length === 1);
    if (ttl && ttl.expireAfterSeconds !== ACTIVITY_TTL_SECONDS) {
        await mongoose.connection.db.command({
            collMod: ActivityLog.collection.collectionName,
            index: { keyPattern: { created_at: 1 }, expireAfterSeconds: ACTIVITY_TTL_SECONDS },
        });
        return { from: ttl.expireAfterSeconds, to: ACTIVITY_TTL_SECONDS };
    }
    return null;
};

module.exports = ActivityLog;
