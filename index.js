const { Defaults } = require('redis-request-broker');
Defaults.setDefaults({
    redis: {
        prefix: 'mh:',
        host: 'mhredis'
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