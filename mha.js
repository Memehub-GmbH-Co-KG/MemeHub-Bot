const Telegraf = require('telegraf');
const config = require('./config/config.json');
const mha_config = require('./config/mha.json');
const MongoClient = require('mongodb').MongoClient;
const uuidv4 = require('uuid').v4;
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const basename = path.basename;
const CsvReadableStream = require('csv-reader');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const url = require('url');
const URL = url.URL;
const fetch = require('node-fetch');



if (process.argv[2] === 'users') {
    export_users();
}
if (process.argv[2] === 'nominees') {
    export_top(500, "like", new Date("2020-12-17"), new Date("2021-12-16"));
}
if (process.argv[2] === 'weeb') {
    export_top(20, "weeb", new Date("2020-12-17"), new Date("2021-12-16"));
}
if (process.argv[2] === 'media') {
    export_media();
}
if (process.argv[2] === 'broadcast') {
    broadcast();
}
if (process.argv[2] === 'mentions') {
    mentions();
}
if (process.argv[2] === 'evaluate') {
    evaluate();
}

async function export_nominees() {
    console.log('Exporting nominees...');
    console.log('Connecting to mongodb...');
    const client = new MongoClient(config.mongodb.connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(config.mongodb.database);
    console.log('Connectet!');

    const nominees = {};
    const collection = db.collection(config.mongodb.collection_names.memes);
    for (category of mha_config.nominees.categories) {
        console.log(`Getting memes of category ${category}...`);
        const votes_field = category == "Weeb" ? "$votes.weeb" : "$votes.like";
        const match = {
            categories: category,
            post_date: {
                $gt: "2020-12-17",
                $lt: "2021-12-16"
            }
        };
        match[`votes.${category == 'Weeb' ? 'weeb' : 'like'}`] = { $exists: true };
        const result = await collection.aggregate([
            { $match: match },
            {
                $project: {
                    id: '$_id',
                    user_id: '$poster_id',
                    votes: { $size: votes_field },
                    _id: false
                }
            },
            { $sort: { votes: -1 } },
            { $limit: 10 },
            {
                $project: {
                    id: 1,
                    user_id: 1
                }
            }
        ]);

        const memes = await result.toArray();
        nominees[`#${category}`] = memes.map(meme => meme.id);
        console.log(`Got ${nominees[`#${category}`].length} Nominees for ${category}!`);
    }
    const json = JSON.stringify(nominees, null, '  ');
    for (const file of mha_config.nominees.nominees_paths) {
        await fs.promises.writeFile(file, json);
    }
    console.log('Done!');
}

/**
 * Queries the best memes posted during a given timeframe and downloads them.
 * The names of the files will include the amount of votes, the categories and 
 * the meme id. 
 * @param {*} amount The amount of memes to download.
 * @param {*} votes_field The vote filed used to determine best memes.
 * @param {*} date_start The start of the timeframe in which the memes have been posted.
 * @param {*} date_end The end of the timeframe in which the memes have been posted.
 */
async function export_top(amount, votes_field, date_start, date_end) {
    console.log(`Exporting nominees (${amount} best, using the vote file ${votes_field})...`);
    console.log('Connecting to mongodb...');
    const client = new MongoClient(config.mongodb.connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(config.mongodb.database);
    console.log('Connectet!');

    const collection = db.collection(config.mongodb.collection_names.memes);
    const match = {
        post_date: {
            $gte: date_start,
            $lt: date_end
        }
    };
    match[`votes.${votes_field}`] = { $exists: true };
    const result = await collection.aggregate([
        { $match: match },
        {
            $project: {
                id: '$_id',
                user_id: '$poster_id',
                votes: { $size: `$votes.${votes_field}` },
                categories: true,
                _id: false
            }
        },
        { $sort: { votes: -1 } },
        { $limit: amount },
        {
            $lookup: {
                from: config.mongodb.collection_names.users,
                localField: "user_id",
                foreignField: "_id",
                as: "users"
            }
        },
        {
            $replaceRoot: {
                newRoot: { $mergeObjects: [{ $arrayElemAt: ["$users", 0] }, "$$ROOT"] }
            }
        }
    ]);

    const memes = await result.toArray();

    if (memes.length !== amount) {
        console.log(`WARNING: Not enough memes found: ${memes.length} / ${amount}`);
    }

    for (const meme of memes) {
        console.log(meme);
        // Get metadata for file
        const meta_result = await fetch(`https://media.memehub.leifb.dev/${meme.id}/meta`);
        const meta = await meta_result.json();

        // Download file itself
        const file_name = `${meme.votes}_${meme.username}_${meme.categories.join("-")}_[${meme.id}]`;
        await download(`https://media.memehub.leifb.dev/${meme.id}/file`, `./nominees/${file_name}.${meta.ext}`);
    }
    console.log('Done!');
}

async function export_users() {
    console.log('Exporting users...');
    console.log('Connecting to mongodb...');
    const client = new MongoClient(config.mongodb.connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(config.mongodb.database);
    console.log('Connectet!');

    const users = await get_users(db);
    const final_object = {};
    users.forEach(user => final_object[uuidv4()] = user);

    console.log('Writing to file...');
    const json = JSON.stringify(final_object, null, '  ');
    await fs.promises.writeFile("users.json", json);
    console.log('Done!');
}

async function export_media() {
    const bot = new Telegraf(config.bot_token);
    const nominees = require(mha_config.media.nominees_path);
    console.log(`Downloading media for ${Object.keys(nominees).length} nominees...`);
    await fs.promises.mkdir(mha_config.media.media_path, { recursive: true });
    const media = {}
    for (const category in nominees) {
        for (const id of nominees[category]) {
            try {
                media[id] = await download_image(bot, id);
            }
            catch (err) {
                console.error(`failed downloading file for id "${id}"`);
                console.error(err);
            }
        }
    }
    const json = JSON.stringify(media, null, '  ');
    for (file of mha_config.media.media_files) {
        await fs.promises.writeFile(file, json);
    }
    console.log("Done!");
}

async function broadcast() {
    const users = require("./config/users.json");
    const bot = new Telegraf(config.bot_token);
    for (token in users) {
        try {
            const id = users[token].id;
            await bot.telegram.sendMessage(id, `${mha_config.broadcast.message}${mha_config.broadcast.url_base}${token}`, { parse_mode: 'markdown' });
        }
        catch (err) {
            console.log('Cannot broadcast message.');
            console.log(err);
        }
    }
}

async function mentions() {
    console.log('Aggregating mentions...');
    console.log('Connecting to mongodb...');
    const client = new MongoClient(config.mongodb.connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(config.mongodb.database);
    const mentions = require('./js/mentions');
    const memes = db.collection(config.mongodb.collection_names.memes);

    await mentions.most_voting(memes);
    await mentions.best_average(memes);
    await mentions.most_likes(memes);
    await mentions.most_memes(memes);
    await mentions.most_weeb_votes(memes);
    await mentions.most_condemn_votes(memes);
    await mentions.most_oc(memes);
    await mentions.lowest_average_likes(memes);
    await mentions.new_and_most_memes(memes);
    await mentions.new_and_most_likes(memes);
    await mentions.new_and_best_avg(memes);
    await mentions.most_memes_in_a_day(memes);
    await mentions.self_like(memes);
    await mentions.best_meme(memes);
}

async function evaluate() {
    const inputStream = fs.createReadStream('report.csv', 'utf8');
    const client = new MongoClient(config.mongodb.connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(config.mongodb.database);
    const memes = db.collection(config.mongodb.collection_names.memes);
    const csvWriter = createCsvWriter({
        path: 'report_enriched.csv',
        alwaysQuote: false,
        fieldDelimiter: ",",
        header: [
            { id: 'id', title: 'id' },
            { id: 'category', title: 'Kategorie' },
            { id: 'votes', title: 'Votes' },
            { id: 'user', title: 'User' },
            { id: 'likes', title: 'likes' },
            { id: 'weebs', title: 'weebs' }
        ]
    });
    const csv = [];
    inputStream
        .pipe(CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true }))
        .on('data', async function (row) {
            // console.log(row);
            if (row[0] === 'id') return;

            csv.push({
                id: row[0],
                category: row[1],
                votes: row[2],
            });
        })
        .on('end', async function () {
            for (const meme of csv) {
                const stats = await getMemeStats(memes, meme.id);
                meme.user = `@${stats.user.username}`;
                meme.likes = stats.likes;
                meme.weebs = stats.weebs;
            }
            await csvWriter.writeRecords(csv);
            console.log('done');
        });
}

async function get_users(db) {
    const collection = db.collection(config.mongodb.collection_names.users);
    console.log('Getting all users...');
    const result = collection.aggregate([
        { $match: {} },
        {
            $project: {
                id: '$_id',
                name: '$first_name',
                _id: false
            }
        }
    ]);

    const users = await result.toArray();
    console.log(`Got ${users.length} users!`);
    return users;
}

async function download_image(bot, id) {
    const file_data = await bot.telegram.getFile(id);
    const file_type = get_file_type(file_data, id);
    if (!['jpg', 'png', 'mp4', 'gif'].includes(file_type)) throw 'unknown file type! ' + file_data.file_path;
    const local_file_path = `${mha_config.media.media_path}${id}.${file_type}`
    const local_file = fs.createWriteStream(local_file_path);
    const result = await doRequest(`https://api.telegram.org/file/bot${config.bot_token}/${file_data.file_path}`);
    result.pipe(local_file);
    return `${mha_config.media.media_prefix}${id}.${file_type}`;
}

function get_file_type(file_data, id) {
    const segments = file_data.file_path.split('.');
    if (segments.length < 2) {
        console.error(`No file extension found for meme "${id}"! using jpg.`);
        return "jpg";
    }
    return segments.slice(-1)[0];
}

async function doRequest(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url);
        req.on('response', res => {
            resolve(res);
        });

        req.on('error', err => {
            reject(err);
        });
    });
}

async function getMemeStats(memes, id) {
    const result = await memes.aggregate([
        {
            $match: {
                _id: id,
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'poster_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $replaceRoot: {
                newRoot: {
                    user: {
                        $arrayElemAt: ["$user", 0]
                    },
                    likes: {
                        $size: {
                            $ifNull: ["$votes.like", []]
                        }
                    },
                    weebs: {
                        $size: {
                            $ifNull: ["$votes.weeb", []]
                        }
                    }

                }
            }
        }
    ]);
    return await result.next();
}

const TIMEOUT = 10000;
function download(url, dest) {
    const uri = new URL(url)
    if (!dest) {
        dest = basename(uri.pathname)
    }
    const pkg = url.toLowerCase().startsWith('https:') ? https : http

    return new Promise((resolve, reject) => {
        const request = pkg.get(uri.href).on('response', (res) => {
            if (res.statusCode === 200) {
                const file = fs.createWriteStream(dest, { flags: 'wx' })
                res
                    .on('end', () => {
                        file.end()
                        // console.log(`${uri.pathname} downloaded to: ${path}`)
                        resolve()
                    })
                    .on('error', (err) => {
                        file.destroy()
                        fs.unlink(dest, () => reject(err))
                    }).pipe(file)
            } else if (res.statusCode === 302 || res.statusCode === 301) {
                // Recursively follow redirects, only a 200 will resolve.
                download(res.headers.location, dest).then(() => resolve())
            } else {
                reject(new Error(`Download request failed, response status: ${res.statusCode} ${res.statusMessage}`))
            }
        })
        request.setTimeout(TIMEOUT, function () {
            request.abort()
            reject(new Error(`Request timeout after ${TIMEOUT / 1000.0}s`))
        })
    })
}
