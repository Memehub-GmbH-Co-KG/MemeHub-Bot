const maintain = require('./meme-maintaining');
const db = require('./mongo-db');
const log = require('./log');
const _config = require('./config');
const _bot = require('./bot');
const posting = require('./meme-posting');
const lc = require('./lifecycle');
const util = require('./util');
const admins = require('./admins');
const fs = require('fs').promises;

let mha_users = undefined;

let config = {};
let mha = {};
_config.subscribe('debug', c => config = c);
_config.subscribe('mha', m => mha = m);
_bot.subscribe(bot => {
    bot.use(log_all_updates);
    bot.command('chatinfo', reply_with_chatinfo);
    bot.command('updateusername', trigger_update_user_name);
    bot.command('meme', show_meme);
    bot.command('mha', show_voting_token);
    bot.command('broadcast_mha_tokens', broadcast_voting_token);
});

lc.hook(async (stage, event) => {
    if (!config || !config.log_lifecycle_events) return;
    log.info(`Lifecycle ${stage}:${event}`);
});


async function reply_with_chatinfo(ctx) {
    if (!config.command_chatinfo) return;
    log.info('Chat info', ctx.update.message.chat);
    ctx.reply(JSON.stringify(ctx.update.message.chat, null, '  '));
}

async function trigger_update_user_name(ctx) {
    if (!config.command_update_username) return;
    const user = await db.get_user(ctx.update.message.from.id);
    maintain.update_user_name(user);
}

async function log_all_updates(ctx, next) {
    if (!config.log_all_updates) {
        next();
        return;
    }

    // Log to both logger and console
    console.log(ctx.update);
    log.info('Incoming update', ctx.update);
    next();
}

async function show_voting_token(ctx) {
    try {
        if (!config.command_voting_token) return;
        if (ctx.chat.type !== "private") return;

        const mha_users = await get_mha_users();
        const user = ctx.update.message.from.id;
        const tokens = Object.keys(mha_users).filter(k => mha_users[k].id == user);
        if (tokens.length < 1) {
            await ctx.reply("You are not allowed to vote 🙃");
            return;
        }

        if (tokens.length > 1) {
            await log.warning("Found multiple token for user to vote with", { context: ctx });
        }

        await ctx.reply(`You can cast your vote here:\n${mha.url}${tokens[0]}`);
    }
    catch (error) {
        await log.warn("Error during show_voting_token command.", error);
    }
}

async function broadcast_voting_token(ctx) {
    if (ctx.chat.type !== "private") return;
    if (!await admins.can_change_info(ctx.from)) {
        ctx.reply("You are not allowed to use this command.");
        return;
    }

    try {
        const users = await get_mha_users();
        await log.notice(`Broadcasting MHA invite links to ${Object.keys(users).length} users.`);
        for (token in users) {
            try {
                const id = users[token].id;
                await ctx.telegram.sendMessage(id, `It's time for the Memehub Awards 2021! Vote here:\n${mha.url}${token}`);
            }
            catch (err) {
                await log.warn("Failed to send MHA invite link.", {
                    token,
                    user: users[token],
                    problem: err.message
                });
            }
        }
        log.notice("Finished broadcasting MHA invite links.");
    }
    catch (error) {
        log.warn("Error while broadcasting MHA invite links.", error);
    }
}

async function get_mha_users() {
    if (!mha_users)
        mha_users = JSON.parse(await fs.readFile('/users.json'));

    return mha_users;
}

async function show_meme(ctx) {
    const id = ctx.state.command.splitArgs[0];
    if (!await admins.is_admin(ctx.from)) {
        ctx.reply("You are not allowed to uses this command.");
        return;
    }
    if (!id) {
        ctx.reply("You need to include an id in your request");
        return;
    }
    try {
        const meme = await db.get_meme_by_id(id);
        const extra = {
            caption: posting.build_caption(meme.user, meme.categories)
        };
        await util.send_media_by_type(ctx.telegram, ctx.chat.id, meme._id, meme.type, extra);
    }
    catch (error) {
        log.error("Cannot show meme", error);
        await ctx.reply("Something went wrong");
    }
}
