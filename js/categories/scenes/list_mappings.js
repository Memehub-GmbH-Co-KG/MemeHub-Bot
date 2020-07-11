const Scene = require('telegraf/scenes/base');
const scenes = require('../../../data/scenes.json').categories;
const log = require('../../log');

module.exports.build = function build(clients) {

    const scene = new Scene(scenes.LIST_MAPPINGS);

    scene.enter(async ctx => {
        try {
            const mappings = await clients.categoriesMappings.request();
            const keys = Object.keys(mappings);
            let text = `There are currently ${keys.length} mappings:\n`;
            for (const key of keys)
                text += `\n${key} -> ${mappings[key]}`;

            await ctx.reply(text);
        }
        catch (error) {
            await log.warn('Failed to list mappings', error);
            await ctx.reply("Sorry, somthing went wrong.");
        }
        finally {
            ctx.scene.enter(scenes.MENU);
        }
    });

    return scene;
}