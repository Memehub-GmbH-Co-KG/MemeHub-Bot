const { serializeError } = require('serialize-error');
const { Client } = require('redis-request-broker');

const _bot = require('../bot');
const log = require('../log');
const _config = require('../config');
const lc = require('../lifecycle');
const admins = require('../admins');
const util = require('../util');
const scenes = require('../../data/scenes.json').contest;
const keyboard = require('../../data/keyboard.json');

let clients = {};
let group_id;

_config.subscribe('rrb', async rrb => {
    await start(rrb);
});
_config.subscribe('telegram', c => {
    group_id = c.group_id;
})
_bot.subscribe(bot => {
    bot.command('contests', command_contests);
    // Create stage and load scenes
    bot._stage.register(
        require('./scenes/menu').build(clients),
        require('./scenes/create_id').build(clients),
        require('./scenes/create_tag').build(clients),
        require('./scenes/create_emoji').build(clients),
        require('./scenes/create_finish').build(clients),
        require('./scenes/delete').build(clients),
        require('./scenes/list').build(clients),
        require('./scenes/start').build(clients),
        require('./scenes/stop').build(clients),
        require('./scenes/top_id').build(clients),
        require('./scenes/top_vote').build(clients),
        require('./scenes/top_amount').build(clients)
    )
});
lc.on('stop', stop);

async function start(rrb) {
    try {
        clients.create = new Client(rrb.channels.contests.create);
        clients.start = new Client(rrb.channels.contests.start);
        clients.stop = new Client(rrb.channels.contests.stop);
        clients.delete = new Client(rrb.channels.contests.delete);
        clients.list = new Client(rrb.channels.contests.list);
        clients.top = new Client(rrb.channels.contests.top);
        clients.validateCategories = new Client(rrb.channels.categories.validate);
        for (const client of Object.values(clients))
            await client.connect();

    }
    catch (error) {
        log.error('Failed to start contests: Cannot connect to rrb.', error);
        setTimeout(() => lc.trigger('stop'), 100);
    }
}

async function stop() {
    for (const client of Object.values(clients)) {
        await client.disconnect();
    }
}

async function command_contests(ctx) {
    if (!await validate(ctx))
        return;

    ctx.scene.enter(scenes.MENU);
}

/**
 * Validates a contest command.
 * Contests may only be managed in the private chat with the bot.
 * Also, only admins are allowed to issue these commands.
 * @param {*} ctx The context of the message
 * @returns {boolean} True, if this is a valid command request.
 */
async function validate(ctx) {
    // Check group
    if (!util.is_private_chat(ctx)) {
        ctx.deleteMessage(ctx.message.id).catch(e => log.error('Cannot delete command message', e));
        ctx.telegram.sendMessage(ctx.message.from.id, 'The /contests command can only be used here')
            .catch(e => log.error('Cannot send message to user', e));
        return false;
    }

    // Check admin
    if (!await admins.can_change_info(ctx.message.from)) {
        log.info('User tried to issue contest command without permission.', { user: ctx.message.from, command: ctx.state.command });
        return false;
    }

    return true;
}