require('./config/db');

const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    logger.info(`Server running at http://localhost:${PORT}`);

    // Start background account cleanup (deletes accounts 7 days after deletion request)
    const { startCleanupScheduler } = require('./utils/accountCleanup');
    startCleanupScheduler();
});
