const Scene = require('telegraf/scenes/base');
const { Keyboard } = require('telegram-keyboard');
const { serializeError } = require('serialize-error');
const scenes = require('../../../data/scenes.json').contest;
const keyboard = require('../../../data/keyboard.json');
const log = require('../../log');

/**
 * Scene to delete a contest 
 * @param {*} clients 
 */
module.exports.build = function (clients) {

    const scene = new Scene(scenes.DELETE);
    scene.enter(async ctx => {
        try {
            const contests = await clients.list.request({});
            if (!contests || !contests.length) {
                await ctx.reply("You don't have any contests right now!");
                return ctx.scene.enter(scenes.MENU);
            }

            const keyboardContests = Keyboard.reply([
                ...contests.map(c => c.id),
                keyboard.CANCEL
            ]);
            ctx.reply('Okay! Which contest do you want to delete?', keyboardContests);
        }
        catch (error) {
            await log.error('Failed to init delete contest.', { error: serializeError(error), session: ctx.session });
            await ctx.reply('Something went wrong.');
            ctx.scene.enter(scenes.MENU);
        }
    });
    scene.hears(keyboard.CANCEL, ctx => ctx.scene.enter(scenes.MENU));
    scene.on('message', async ctx => {
        try {
            const deleted = await clients.delete.request(ctx.message.text);
            if (!deleted)
                throw new Error('Contest has not been deleted.');

            await ctx.reply('Done!');
        }
        catch (error) {
            log.warning('Failed to delete contests', { error: serializeError(error), contest: ctx.message.text });
            await ctx.reply("Sorry, I can't delete that contest right now");
        }
        finally {
            ctx.scene.enter(scenes.MENU);
        }
    });

    return scene;
}