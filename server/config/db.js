const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/credit_card_analyser';

mongoose.connect(MONGO_URI)
    .then(async () => {
        logger.info('MongoDB connected');
        try {
            const changed = await require('../models/ActivityLog').syncTTL();
            if (changed) logger.info('ActivityLog TTL index updated', changed);
        } catch (err) {
            logger.warn('ActivityLog TTL sync failed', { error: err.message });
        }
    })
    .catch(err => { logger.error('MongoDB connection failed', { error: err.message }); process.exit(1); });
