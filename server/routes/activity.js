const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { parsePagination, paginatedResponse } = require('../utils/helpers');

// GET activity logs for the logged-in user (paginated)
router.get('/', async (req, res, next) => {
    try {
        const { pageNum, limitNum, skip } = parsePagination(req.query);
        const { entity, search } = req.query;
        const filter = { user_id: req.user.id };
        if (entity) filter.entity = entity;
        if (search) filter.description = { $regex: search, $options: 'i' };

        const [logs, total] = await Promise.all([
            ActivityLog.find(filter)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limitNum),
            ActivityLog.countDocuments(filter)
        ]);

        res.json(paginatedResponse(logs, total, pageNum, limitNum));
    } catch (err) { next(err); }
});

// GET all activity logs for a specific entity (full history)
router.get('/entity/:entityId', async (req, res, next) => {
    try {
        const logs = await ActivityLog.find({
            user_id: req.user.id,
            entity_id: req.params.entityId
        }).sort({ created_at: -1 });
        res.json(logs);
    } catch (err) { next(err); }
});

module.exports = router;
