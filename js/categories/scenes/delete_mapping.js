const Scene = require('telegraf/scenes/base');
const { Keyboard } = require('telegram-keyboard');
const scenes = require('../../../data/scenes.json').categories;
const _keyboard = require('../../../data/keyboard.json');
const log = require('../../log');

module.exports.build = function build(clients) {

    const scene = new Scene(scenes.DELETE_MAPPING);

    scene.enter(async ctx => {

        const mappings = await clients.categoriesMappings.request();
        const keyboard = Keyboard.reply([
            ...Object.keys(mappings),
            _keyboard.CANCEL
        ]);
        await ctx.reply("Which mapping do you want do remove?", keyboard);

    });
    scene.hears(_keyboard.CANCEL, ctx => ctx.scene.enter(scenes.MENU));
    scene.on('message', async ctx => {
        try {
            const { deleted } = await clients.categoriesDeleteMapping.request({ key: ctx.message.text });

            if (!deleted)
                await ctx.reply("Looks like this mapping does not exist.");

            await ctx.reply("Okay, mapping removed");
        }
        catch (error) {
            await log.warn('Failed to delete category mapping', error);
            await ctx.reply("Sorry, somthing went wrong.");
        }
        finally {
            ctx.scene.enter(scenes.MENU);
        }
    });

    return scene;
}