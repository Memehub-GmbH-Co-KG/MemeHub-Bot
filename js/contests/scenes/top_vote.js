const Scene = require('telegraf/scenes/base');
const { Keyboard } = require('telegram-keyboard');
const { serializeError } = require('serialize-error');
const _confg = require('../../config');
const scenes = require('../../../data/scenes.json').contest;
const keyboard = require('../../../data/keyboard.json');

let vote_types;
_confg.subscribe('vote_types', v => vote_types = v);

const log = require('../../log');

/**
 * Scene to start a contest
 * @param {*} scenes 
 * @param {*} keyboard 
 * @param {*} clients 
 */
module.exports.build = function (_) {

    const scene = new Scene(scenes.TOP_VOTE);
    scene.enter(async ctx => {
        try {
            const keyboardVoteTypes = Keyboard.reply([
                ...(vote_types || []).map(v => v.emoji),
                keyboard.CANCEL
            ]);
            ctx.reply('Which vote type do you want to use?', keyboardVoteTypes);
        }
        catch (error) {
            log.warn('Contest scene "top_vote" failed.', { error: serializeError(error), session: ctx.session });
            await ctx.reply('Something went wrong, sorry!');
            ctx.scene.enter(scenes.MENU);
        }
    });
    scene.hears(keyboard.CANCEL, ctx => ctx.scene.enter(scenes.MENU));
    scene.on('message', async ctx => {
        const vote = vote_types.find(v => v.emoji === ctx.message.text);
        ctx.session.vote_type = vote ? vote.id : ctx.message.text;
        ctx.scene.enter(scenes.TOP_AMOUNT);
    });
    return scene;
}