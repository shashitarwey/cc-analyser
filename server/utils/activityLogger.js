const ActivityLog = require('../models/ActivityLog');
const logger = require('./logger');

/**
 * Log a user activity. Fire-and-forget — never blocks the request.
 * @param {string} userId
 * @param {string} action         - 'created' | 'updated' | 'deleted'
 * @param {string} entity         - 'order' | 'seller' | 'seller_payment' | 'transaction' | 'card'
 * @param {string} entityId       - The document _id
 * @param {string} description    - Human-readable summary
 * @param {Object} [snapshot]     - Full entity data at the time of action
 * @param {string[]} [changedFields] - List of field names that were changed (for updates)
 */
function logActivity(userId, action, entity, entityId, description, snapshot = null, changedFields = []) {
    const data = { user_id: userId, action, entity, entity_id: entityId, description, changed_fields: changedFields };
    if (snapshot) {
        const obj = typeof snapshot.toObject === 'function' ? snapshot.toObject() : { ...snapshot };
        delete obj.__v;
        data.snapshot = obj;
    }
    ActivityLog.create(data)
        .catch(err => logger.error('Failed to log activity', { error: err.message }));
}

module.exports = { logActivity };
