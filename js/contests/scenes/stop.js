const Scene = require('telegraf/scenes/base');
const { Keyboard } = require('telegram-keyboard');
const { serializeError } = require('serialize-error');

const log = require('../../log');
const scenes = require('../../../data/scenes.json').contest;
const keyboard = require('../../../data/keyboard.json');

/**
 * Scene to stop a contest
 * @param {*} scenes 
 * @param {*} keyboard 
 * @param {*} clients 
 */
module.exports.build = function (clients) {
    const scene = new Scene(scenes.STOP);
    scene.enter(async ctx => {
        try {
            const contests = await clients.list.request({});
            if (!contests || !contests.length)
                return await ctx.reply("You don't have any contests right now!");

            const running = contests.filter(c => c.running);

            if (running.length < 1)
                return await ctx.reply("There is no contest that is running!");

            const keyboardContests = Keyboard.reply([
                ...running.map(c => c.id),
                keyboard.CANCEL
            ]);
            ctx.reply('Okay! Which contest do you want to stop?', keyboardContests);
        }
        catch (error) {
            log.warn('Contest scene "stop" failed.', { error: serializeError(error), session: ctx.session });
            await ctx.reply('Something went wrong, sorry!');
            ctx.scene.enter(scenes.MENU);
        }
    });
    scene.hears(keyboard.CANCEL, ctx => ctx.scene.enter(scenes.MENU));
    scene.on('message', async ctx => {
        try {
            const stopped = await clients.stop.request(ctx.message.text);
            if (!stopped)
                throw new Error('Contest has not been stopped.');

            await ctx.reply('Done!');
            await ctx.reply("TODO show some more info here");
        }
        catch (error) {
            log.warning('Failed to stop contest', { error: serializeError(error), contest: ctx.message.text });
            await ctx.reply("Sorry, I can't stop that contest right now");
        }
        finally {
            ctx.scene.enter(scenes.MENU);
        }
    });
    return scene;
}