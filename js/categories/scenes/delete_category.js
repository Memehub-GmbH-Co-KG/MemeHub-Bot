const Scene = require('telegraf/scenes/base');
const { Keyboard } = require('telegram-keyboard');
const scenes = require('../../../data/scenes.json').categories;
const log = require('../../log');
const _keyboard = require('../../../data/keyboard.json');

module.exports.build = function build(clients) {

    const scene = new Scene(scenes.DELETE);

    scene.enter(async ctx => {

        const categories = await clients.listCategories.request();
        const keyboard = Keyboard.reply([
            ...categories,
            _keyboard.CANCEL
        ]);
        await ctx.reply("Which category do you want do remove?", keyboard);

    });
    scene.hears(_keyboard.CANCEL, ctx => ctx.scene.enter(scenes.MENU));
    scene.on('message', async ctx => {
        try {
            const { deleted } = await clients.deleteCategory.request({ category: ctx.message.text });

            if (!deleted)
                await ctx.reply("Looks like this category does not exist.");

            await ctx.reply("It's gone!");
        }
        catch (error) {
            await log.warn('Failed to delete category', error);
            await ctx.reply("Sorry, somthing went wrong.");
        }
        finally {
            ctx.scene.enter(scenes.MENU);
        }
    });

    return scene;
}