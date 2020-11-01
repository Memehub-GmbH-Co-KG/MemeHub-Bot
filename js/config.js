const { Subscriber, Client } = require('redis-request-broker');
const log = require('./log');
const lc = require('./lifecycle');

/** Mapping of config names to callback functions subscribed to this config */
const subscribers = {};
/** Mapping of config names to the current configs */
const configs = {};

let subscriberConfigChanged;

/**
 * Subscribes to a config file.
 * @param config_name The config_name of the config to subscribe to.
 * @param update_callback The callback to execute, when the config has changed. This will
 * also be executed upon subscribing or when the config has been first read.
 */
function subscribe(config_name, update_callback) {
    if (config_name in subscribers) {
        add_subscriber(config_name, update_callback);
        return;
    }

    subscribers[config_name] = [update_callback];
    get_config(config_name);
}

// Listen for config chagnes
lc.on('init', async () => {
    try {
        const channelChanged = await do_get_config('rrb:channels:config:changed');
        subscriberConfigChanged = new Subscriber(channelChanged, onConfigChange);
        await subscriberConfigChanged.listen();
    }
    catch (error) {
        console.error(error);
    }
});

// Stop listen for changes
lc.early('stop', async () => {
    await subscriberConfigChanged.stop();
});

async function do_get_config(config_name) {
    const client = new Client('config:get', { timeout: 10000 });
    await client.connect();
    const [config] = await client.request([config_name]);
    await client.disconnect();
    return config;
}

/**
 * Whenever something in the config changes, call read_config for every
 * top-level key that changed and is loaded (as defined per the 'config' object).
 * @param {*} keys 
 */
async function onConfigChange(keys) {
    // If everything changed, just refresh all current configs
    if (!Array.isArray(keys))
        return await onConfigChange(Object.keys(configs));

    keys = keys
        .filter(k => typeof k === 'string')
        .map(k => k.split(':')[0])
        .filter(k => k in configs);

    log.debug('Config Changed. Filtered keys to refresh:', keys);

    await Promise.all(keys.map(get_config));
}

async function get_config(config_name) {
    try {
        const config = await do_get_config(config_name);
        on_update(config_name, config);
    }
    catch (error) {
        await log.error(`Cannot get config "${config_name}"`, error);
    }
}

function add_subscriber(config_name, update_callback) {
    subscribers[config_name].push(update_callback);
    if (configs[config_name])
        update_callback(configs[config_name]);
}

function on_update(config_name, new_config) {
    configs[config_name] = new_config;
    notify_subscribers(config_name, new_config);
}

function notify_subscribers(config_name, config = null) {
    if (!config) config = configs[config_name];
    for (update_callback of subscribers[config_name]) {
        update_callback(config);
    }
}

module.exports.subscribe = subscribe;