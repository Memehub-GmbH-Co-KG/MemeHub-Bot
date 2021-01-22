const { Client } = require('redis-request-broker');
const timers = require('timers/promises');
const log = require('./log');
const _bot = require('./bot');
const _config = require('./config');
const lc = require('./lifecycle');
let bot;
let clientHasPermissions;
let get;
let set;

_bot.subscribe(bot => {
    bot.command('config_get', config_get);
    bot.command('config_set', config_set);
});

_config.subscribe('rrb', async rrb => {
    await stop();
    clientHasPermissions = new Client(rrb.channels.permissions.canChangeInfo);
    get = new Client(rrb.channels.config.get);
    set = new Client(rrb.channels.config.set);
    await Promise.all([
        clientHasPermissions.connect(),
        get.connect(),
        set.connect()
    ]);
});

lc.on('stop', stop);
async function stop() {
    try {
        await Promise.all([
            clientHasPermissions && await clientHasPermissions.disconnect(),
            get && await get.disconnect(),
            set && await set.disconnect(),
        ]);
    }
    catch (error) {
        await log.error('Faield to stop config_commands', error);
    }
}


async function config_get(ctx) {
    try {
        if (!await hasPermissions(ctx.update.message.from))
            throw 'You are not allowed to see the config.';

        const args = ctx.state.command.args.split(' ').filter(x => x !== '');
        const withArgs = args.length > 0;
        const response = await get.request(withArgs ? args : false);
        const messages = withArgs
            ? args.map((a, i) => formatValue(a, response[i]))
            : [Object.keys(response).reduce((res, key) => `${res}\n \\- ${formatKey(key)}`, 'Available keys:')];

        for (const message of messages) {
            await ctx.reply(message, { parse_mode: 'MarkdownV2' });
            await timers.setTimeout(100);
        }
    }
    catch (e) {
        await ctx.reply(`Error: ${e}`);
    }
}

async function config_set(ctx) {
    try {
        if (!await hasPermissions(ctx.update.message.from))
            throw 'You are not allowed to change the config.';

        const key = ctx.state.command.splitArgs[0];
        const value = JSON.parse(ctx.state.command.args.replace(key, '').trim());
        await set.request({ [key]: value });
        await ctx.reply(formatValue(key, value), { parse_mode: 'MarkdownV2' });
    }
    catch (e) {
        await ctx.reply(`Error: ${e}`);
    }
}

function formatValue(key, value) {
    return `${formatKey(key)}\n\`\`\`json\n${JSON.stringify(value, undefined, 2).replaceAll('*', '\\*')}\n\`\`\``
        .replace(/\./g, '\\.');
}

function formatKey(key) {
    return `*${key.replaceAll('_', '\\_')}*`
}

async function hasPermissions(user) {
    try {
        return await clientHasPermissions.request(user.id);
    }
    catch (error) {
        await log.warn('Failed to check permissions', { error, user });
        return false;
    }
}

