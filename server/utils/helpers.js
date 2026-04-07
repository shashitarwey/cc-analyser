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

/**
 * Compute the start date of the current cashback cycle for a card.
 * @param {number} resetDay    - Day of month the cycle resets (1-31)
 * @param {string} period      - 'monthly' | 'quarterly' | 'half-yearly' | 'yearly'
 * @param {number} startMonth  - Month when first cycle begins (1-12). Only used for non-monthly periods.
 * @returns {Date} Start of the current cycle (UTC midnight)
 */
function getCashbackCycleStart(resetDay = 1, period = 'monthly', startMonth = 1) {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth(); // 0-based

    // Clamp resetDay to last day of a given month (e.g. day 31 in Feb → 28/29)
    const clamp = (year, month, day) => {
        const max = new Date(year, month + 1, 0).getDate();
        return new Date(Date.UTC(year, month, Math.min(day, max)));
    };

    if (period === 'monthly') {
        // For monthly, just find the most recent reset day
        const thisMonth = clamp(y, m, resetDay);
        return thisMonth <= now ? thisMonth : clamp(y, m - 1, resetDay);
    }

    // For quarterly/half-yearly/yearly: cycles are anchored to startMonth
    // e.g. startMonth=3 (March), quarterly, resetDay=16 →
    //   Mar 16, Jun 16, Sep 16, Dec 16, Mar 16 (next year)…
    const step = { 'quarterly': 3, 'half-yearly': 6, 'yearly': 12 }[period] || 3;
    const anchor = startMonth - 1; // Convert 1-based to 0-based

    // Generate all cycle start months for this year and previous year
    // by stepping forward from the anchor month
    const candidates = [];
    for (let baseYear = y - 1; baseYear <= y + 1; baseYear++) {
        for (let mo = anchor; mo < anchor + 12; mo += step) {
            candidates.push(clamp(baseYear, mo, resetDay));
        }
    }

    // Find the most recent candidate that is <= now
    candidates.sort((a, b) => b - a); // Descending
    for (const c of candidates) {
        if (c <= now) return c;
    }
    return candidates[candidates.length - 1];
}

module.exports = { pickFields, toObjectId, buildDateRange, getCashbackCycleStart };
