const Scene = require('telegraf/scenes/base');
const { Keyboard } = require('telegram-keyboard');
const scenes = require('../../../data/scenes.json').contest;
const keyboard = require('../../../data/keyboard.json');

/**
 * This is the main scene of the contest stage where the user
 * is asked to choose an action.
 * @param {*} scenes 
 * @param {*} keyboard 
 */
module.exports.build = function (_) {

    const keyboarStart = Keyboard.reply([
        [keyboard.CREATE, keyboard.LIST, keyboard.DELETE],
        [keyboard.START, keyboard.STOP],
        [keyboard.TOP, keyboard.DONE]
    ]);

    const scene = new Scene(scenes.MENU);
    scene.enter(async ctx => {
        if (ctx.session.isNotFirst)
            return ctx.reply("Is there anything else you want to do?", keyboarStart);

        await ctx.reply("Okay, let's manage some contests!");
        ctx.reply("What do you want to do?", keyboarStart);
        ctx.session.isNotFirst = true;
    });
    scene.hears(keyboard.CREATE, ctx => ctx.scene.enter(scenes.CREATE_ID));
    scene.hears(keyboard.DELETE, ctx => ctx.scene.enter(scenes.DELETE));
    scene.hears(keyboard.LIST, ctx => ctx.scene.enter(scenes.LIST));
    scene.hears(keyboard.START, ctx => ctx.scene.enter(scenes.START));
    scene.hears(keyboard.STOP, ctx => ctx.scene.enter(scenes.STOP));
    scene.hears(keyboard.TOP, ctx => ctx.scene.enter(scenes.TOP_ID));
    scene.hears(keyboard.DONE, async ctx => {
        ctx.session.isNotFirst = false;
        await ctx.reply("See you soon!", { reply_markup: { remove_keyboard: true } });
        ctx.scene.leave();
    });

    return scene;
}