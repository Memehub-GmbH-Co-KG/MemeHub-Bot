const Scene = require('telegraf/scenes/base');
const { Keyboard } = require('telegram-keyboard');
const { serializeError } = require('serialize-error');

const log = require('../../log');
const scenes = require('../../../data/scenes.json').contest;
const keyboard = require('../../../data/keyboard.json');

/**
 * Scene to start a contest
 * @param {*} scenes 
 * @param {*} keyboard 
 * @param {*} clients 
 */
module.exports.build = function (clients) {

    const scene = new Scene(scenes.TOP_ID);
    scene.enter(async ctx => {
        try {
            const contests = await clients.list.request({});
            if (!contests || !contests.length)
                return await ctx.reply("You don't have any contests right now!");

            const keyboardContests = Keyboard.reply([
                ...contests.map(c => c.id),
                keyboard.CANCEL
            ]);
            ctx.reply('For which contest?', keyboardContests);
        }
        catch (error) {
            log.warn('Contest scene "top_id" failed.', { error: serializeError(error), session: ctx.session });
            await ctx.reply('Something went wrong, sorry!');
            ctx.scene.enter(scenes.MENU);
        }
    });
    scene.hears(keyboard.CANCEL, ctx => ctx.scene.enter(scenes.MENU));
    scene.on('message', async ctx => {
        ctx.session.id = ctx.message.text;
        ctx.scene.enter(scenes.TOP_VOTE);
    });
    return scene;
}