const util = require('./util');
const db = require('./sql-db');

let group_id;

/**
 * Initializes the module.
 */
function init() {
    group_id = util.load_env_variable("GROUP_ID");
}

/**
 * Saves memes to the db, forwards them and handles upvoting
 * @param {The telegraph message context} ctx 
 * @param {A callback used to find the file id of the media in that message} file_id_callback 
 */
function handle_meme_request(ctx) {
    try {
        let user = ctx.message.from
        let file_id = util.any_media_id(ctx.message)
        let category = util.categroy_from_cation(ctx.message.caption)
        
        console.log(` === Meme request from user "${user.first_name} ${user.last_name}" ===`);

        if (!user.username) {
            ctx.reply('Posting without username not allowed! Set your username in settings.');
            console.log("Aborting due to missung username");
            return;
        }
        if (user.is_bot) {
            ctx.reply('Only humans may send memes, sorry!')
            console.log("Aborting because user is a bot");
            return;
        }
        if (file_id === null) {
            ctx.reply('It looks like I am not able to send this kind of meme, sorry!')
            console.log("Aborting due to missing file id");
            return
        }
        
        db.save_user(user);
        db.save_meme(user.id, file_id, ctx.message.message_id, category)
            .then(() => { 
                ctx.reply('👍'); 
                forward_meme_to_group(ctx, file_id, user, category)
            })
            .catch((err) => {
                if (!!err.sqlMessage && err.sqlMessage.includes('photoID')) {
                    ctx.telegram.sendMessage(user.id, 'REPOST DU SPAST 😡');
                    return;
                }
                ctx.reply("Something went horribly wrong 😢 I cannot send your meme!");
            });
    }
    catch(exception) {
        console.log("ERROR: Unknown exception");
        console.log(`  > Exception: ${exception}`);
    }
}

/**
 * Forwards a meme to the meme group.
 * @param {The message context of the users meme request} ctx 
 * @param {The id of the meme media} file_id 
 * @param {The user that wants the meme to be forwarded} user 
 * @param {The category of the meme or null for no category} category
 * @returns {The promise that is returned by the send method}
 */
function forward_meme_to_group(ctx, file_id, user, category) {
    let caption = `@${user.username}`
    if (category) caption += ` | #${category}`;

    return util.send_any_media(
        ctx,
        group_id,
        file_id,
        {
            caption: caption,
            reply_markup: {
                inline_keyboard: [[{ text: "👍", callback_data: "upvote" }]]
            }
        }
    )
        .then((ctx) => { 
            console.log("Meme send to group");
            db.save_meme_group_message(ctx);
        })
        .catch((err) => {
            console.log("ERROR: Could not send meme to group");
            console.log(`  > Error: ${err}`);
        });  
}

module.exports.init = init;
module.exports.handle_meme_request = handle_meme_request;
module.exports.forward_meme_to_group = forward_meme_to_group;