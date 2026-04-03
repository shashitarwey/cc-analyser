require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('./middleware/auth');

const app = express();

// ── CORS — restrict to frontend origin ───────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

// ── Body parsing with explicit size limit ────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Rate limiting on auth routes ─────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── Public routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/auth'));

// ── Protected routes (JWT required) ───────────────────────────────────────────
app.use('/api/cards', authMiddleware, require('./routes/cards'));
app.use('/api/transactions', authMiddleware, require('./routes/transactions'));
app.use('/api/orders', authMiddleware, require('./routes/orders'));
app.use('/api/sellers', authMiddleware, require('./routes/sellers'));
app.use('/api/summary', authMiddleware, require('./routes/summary'));
app.use('/api/analytics', authMiddleware, require('./routes/analytics'));

// ── Health check endpoint (public) ───────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const { isRedisConnected } = require('./utils/cache');
    const redisStatus = isRedisConnected() ? 'connected' : 'disconnected';
    const uptimeSec = process.uptime();
    const memUsage = process.memoryUsage();

    const healthy = mongoStatus === 'connected';
    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m ${Math.floor(uptimeSec % 60)}s`,
        mongo: mongoStatus,
        redis: redisStatus,
        memory: {
            rss: `${(memUsage.rss / 1024 / 1024).toFixed(1)} MB`,
            heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`,
            heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(1)} MB`,
        },
    });
});

// ── Swagger API Docs ────────────────────────────────────────────────────────
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CardVault API',
            version: '1.0.0',
            description: 'Credit Card Spend Tracker & Financial Analyser API',
        },
        servers: [{ url: '/api', description: 'API base path' }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./routes/*.js'],
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CardVault API Docs',
}));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// ── Global error handler ─────────────────────────────────────────────────────
const logger = require('./utils/logger');
app.use((err, req, res, next) => {
    logger.error('Unhandled server error', {
        method: req.method,
        url: req.originalUrl,
        error: err.message,
        stack: err.stack,
    });
    const status = err.status || 500;
    res.status(status).json({
        error: status >= 500 ? 'Internal server error' : err.message,
    });
});

module.exports = app;
