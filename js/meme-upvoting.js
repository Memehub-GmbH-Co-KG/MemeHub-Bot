const util = require('./util');
const db = require('./sql-db');

/**
 * Saves the user, his upvote and updates the upvote count.
 * @param {The context of the callback_query} ctx 
 */
function handle_upvote_request(ctx) {
    let file_id = util.any_media_id(ctx.update.callback_query.message);
    let user = ctx.update.callback_query.from;
    
    db.save_user(ctx.update.callback_query.from);
    db.save_upvote(user.id, file_id)
        .then(() => {
            db.count_upvotes(file_id)
                .then((upvotes) => {
                    ctx.editMessageReplyMarkup({ inline_keyboard: [[{ text: "👍 - " + upvotes, callback_data: "upvote" }]] });
                    ctx.answerCbQuery();
                })
                .catch(() => {
                    ctx.answerCbQuery();
                });
        })
        .catch(() => {
            ctx.answerCbQuery();
        });
    
}

module.exports.handle_upvote_request = handle_upvote_request;