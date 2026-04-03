const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetTokenSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    used: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
});

// Index for automatic cleanup of expired tokens
passwordResetTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

/**
 * Generate a secure random token and save it.
 * @param {string} userId
 * @param {number} expiryMinutes — token validity (default 60 min = 1 hour)
 */
passwordResetTokenSchema.statics.createToken = async function (userId, expiryMinutes = 60) {
    // Invalidate any existing unused tokens for this user
    await this.deleteMany({ user_id: userId, used: false });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    await this.create({
        user_id: userId,
        token: hashedToken,
        expires_at: new Date(Date.now() + expiryMinutes * 60 * 1000),
    });

    return rawToken; // send this in the URL; we store the hash
};

/**
 * Verify a token from a URL.
 * Returns the token doc if valid, or null.
 */
passwordResetTokenSchema.statics.verifyToken = async function (rawToken) {
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const doc = await this.findOne({
        token: hashedToken,
        used: false,
        expires_at: { $gt: new Date() },
    });
    return doc;
};

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
