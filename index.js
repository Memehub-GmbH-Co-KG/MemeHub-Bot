const { Defaults } = require('redis-request-broker');
Defaults.setDefaults({
    redis: {
        prefix: process.env.REDIS_PREFIX || 'mh:',
        host: process.env.REDIS_HOST || "mhredis",
        port: process.env.REDIS_PORT || undefined,
        db: process.env.REDIS_DB || undefined,
        password: process.env.REDIS_PASSWORD || undefined
    }
});

require('./js/bot');
require('./js/log');
require('./js/best-of');
require('./js/categories');
require('./js/contests');
require('./js/debug');
require('./js/admins.js');
require('./js/meme-maintaining.js');
require('./js/welcome-message');
require('./js/meme-posting');
require('./js/meme-handling');
require('./js/statistics');
require('./js/meme-clearing');
require('./js/meme-voting');
require('./js/tokens');
require('./js/config_commands');