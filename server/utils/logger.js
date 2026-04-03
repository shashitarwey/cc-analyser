const { createLogger, format, transports } = require('winston');

const { combine, timestamp, printf, colorize, errors } = format;

// Custom log format: [timestamp] LEVEL: message
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${stack || message}${metaStr}`;
});

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
    ),
    transports: [
        // Console transport with colors in development
        new transports.Console({
            format: combine(colorize(), devFormat),
        }),
        // File transport for errors — persists across restarts
        new transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: combine(devFormat),
            maxsize: 5 * 1024 * 1024, // 5 MB
            maxFiles: 3,
        }),
        // File transport for all logs
        new transports.File({
            filename: 'logs/combined.log',
            format: combine(devFormat),
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
        }),
    ],
});

module.exports = logger;
