const mongoose = require('mongoose');

/**
 * Pick only the specified fields from an object.
 * Prevents mass-assignment by whitelisting allowed properties.
 *
 * @param {Object} source - The source object (typically req.body)
 * @param {string[]} allowedFields - Array of field names to pick
 * @returns {Object} A new object containing only the allowed fields
 */
function pickFields(source, allowedFields) {
    const result = {};
    for (const key of allowedFields) {
        if (source[key] !== undefined) result[key] = source[key];
    }
    return result;
}

/**
 * Convert a string ID to a Mongoose ObjectId.
 * Shorthand for `new mongoose.Types.ObjectId(id)`.
 *
 * @param {string} id - The string ID to convert
 * @returns {mongoose.Types.ObjectId}
 */
function toObjectId(id) {
    return new mongoose.Types.ObjectId(id);
}

/**
 * Build a date range filter object for Mongoose queries.
 *
 * @param {string} [fromDate] - Start date in YYYY-MM-DD format
 * @param {string} [toDate]   - End date in YYYY-MM-DD format
 * @returns {Object|null} A Mongoose query filter { $gte, $lte } or null if no dates provided
 */
function buildDateRange(fromDate, toDate) {
    if (!fromDate && !toDate) return null;
    const range = {};
    if (fromDate) range.$gte = new Date(`${fromDate}T00:00:00.000Z`);
    if (toDate) range.$lte = new Date(`${toDate}T23:59:59.999Z`);
    return range;
}

module.exports = { pickFields, toObjectId, buildDateRange };
