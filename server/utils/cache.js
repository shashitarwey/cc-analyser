/**
 * Redis Cache Utility
 *
 * Provides caching with automatic JSON serialization and graceful degradation
 * when Redis is not available (all operations become silent no-ops).
 *
 * Configure via: REDIS_URL (default: redis://localhost:6379)
 */
const Redis = require('ioredis');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DEFAULT_TTL = 300; // 5 minutes

let redis = null;
let isConnected = false;

function getClient() {
    if (redis) return redis;

    redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
            if (times > 3) return null; // stop retrying after 3 attempts
            return Math.min(times * 500, 3000);
        },
        lazyConnect: true,
        enableOfflineQueue: false,
    });

    redis.on('connect', () => {
        isConnected = true;
        logger.info('Redis connected', { url: REDIS_URL });
    });

    redis.on('error', (err) => {
        if (isConnected) {
            logger.warn('Redis error', { error: err.message });
        }
        isConnected = false;
    });

    redis.on('close', () => {
        isConnected = false;
    });

    // Attempt connection (non-blocking)
    redis.connect().catch(() => {
        logger.warn('Redis unavailable — caching disabled, running without cache');
    });

    return redis;
}

/**
 * Get a cached value.
 * @returns parsed JSON or null
 */
async function get(key) {
    if (!isConnected) return null;
    try {
        const data = await getClient().get(key);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

/**
 * Set a cached value.
 * @param {string} key
 * @param {*} value — will be JSON-stringified
 * @param {number} ttl — seconds (default 300 = 5 min)
 */
async function set(key, value, ttl = DEFAULT_TTL) {
    if (!isConnected) return;
    try {
        await getClient().set(key, JSON.stringify(value), 'EX', ttl);
    } catch {
        // silently ignore
    }
}

/**
 * Delete keys matching a pattern (e.g. "summary:userId:*").
 */
async function invalidate(pattern) {
    if (!isConnected) return;
    try {
        const client = getClient();
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(...keys);
            logger.info('Cache invalidated', { pattern, count: keys.length });
        }
    } catch {
        // silently ignore
    }
}

/**
 * Delete a specific key.
 */
async function del(key) {
    if (!isConnected) return;
    try {
        await getClient().del(key);
    } catch {
        // silently ignore
    }
}

/**
 * Express middleware: cache GET responses.
 * Usage: router.get('/path', cacheMiddleware(ttl), handler)
 *
 * Cache key format: "route:userId:url"
 */
function cacheMiddleware(ttl = DEFAULT_TTL) {
    return async (req, res, next) => {
        if (!isConnected) return next();

        const key = `route:${req.user?.id || 'anon'}:${req.originalUrl}`;
        try {
            const cached = await get(key);
            if (cached) {
                return res.json(cached);
            }
        } catch {
            return next();
        }

        // Intercept res.json to cache the response
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                set(key, body, ttl).catch(() => { });
            }
            return originalJson(body);
        };

        next();
    };
}

/**
 * Express middleware: invalidate a user's cached summary data after mutations.
 * Usage: router.post('/path', handler, invalidateSummaryCache)
 */
function invalidateSummaryCache(req, res, next) {
    // Run invalidation after the response is sent
    if (req.user?.id) {
        invalidate(`route:${req.user.id}:*`).catch(() => { });
    }
    if (next) next();
}

/** Check if Redis is connected */
function isRedisConnected() {
    return isConnected;
}

// Initialize the client on module load
getClient();

module.exports = {
    get, set, del, invalidate,
    cacheMiddleware, invalidateSummaryCache,
    isRedisConnected,
};
