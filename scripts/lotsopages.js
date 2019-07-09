/**
 * lotsopages.js
 *
 * Converts links to lots o' pages into contributions links
 * to contributions of the page creators.
 */
'use strict';

/**
 * Importing modules.
 */
const fs = require('fs'),
      util = require('./util.js');

/**
 * Constants.
 */
const wikis = {},
      users = [];

/**
 * Global variables.
 */
let lines = null,
    keys = null,
    currwiki = null;

/**
 * Callback after saving a file.
 * @param {Error} error Error that occurred while saving a file
 */
function saveCallback(error) {
    if (error) {
        console.error('An error occurred while saving the file:', error);
    } else {
        console.info('Finished!');
    }
}

/**
 * Saves users to file.
 */
function saveUsers() {
    console.info('Saving users...');
    fs.writeFile('results/lotsopages.txt', users.join('\n'), saveCallback);
}

/**
 * Finds contributions of users on a single wiki.
 */
function findContribs() {
    let title = null;
    if (!wikis[currwiki].length) {
        currwiki = keys.shift();
        if (!currwiki) {
            saveUsers();
            return;
        }
    }
    title = wikis[currwiki].shift();
    util.apiQuery(currwiki, {
        indexpageids: 1,
        prop: 'revisions',
        rvdir: 'newer',
        rvlimit: 1,
        titles: title
    }).then(function(data) {
        const user = `${currwiki}/wiki/Special:Contribs/${
            data.query.pages[data.query.pageids[0]].revisions[0].user
        }`;
        if (!users.includes(user)) {
            users.push(user);
        }
        findContribs();
    }).catch(function(error) {
        console.error('Failed to fetch contributions:', error);
    });
}

/**
 * Callback after reading the file.
 * @param {Error} error Error that occurred while reading the file
 * @param {Buffer} contents Contents of the file
 */
function readCallback(error, contents) {
    if (error) {
        console.error('An error occurred while reading:', error);
        return;
    }
    lines = contents.toString().split('\n');
    lines.forEach(function(line) {
        const match = /(https?:\/\/.*)\/wiki\/(.*)$/.exec(line),
              wiki = match[1],
              page = decodeURIComponent(match[2]);
        if (!wikis[wiki]) {
            wikis[wiki] = [];
        }
        wikis[wiki].push(page);
    });
    keys = Object.keys(wikis);
    console.info('Finding contributions...');
    currwiki = keys.shift();
    findContribs();
}

console.info('Reading file...');
fs.readFile('config/lotsopages.txt', readCallback);
