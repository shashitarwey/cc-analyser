const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'cardvault_secret_change_in_prod';

module.exports = function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer '))
        return res.status(401).json({ error: 'No token provided' });

    try {
        const payload = jwt.verify(header.slice(7), JWT_SECRET);
        req.user = payload;   // { id, email, name }
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
