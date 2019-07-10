/**
 * newusers.js
 *
 * Fetches profiles of all new users on a wiki.
 * @todo Concurrency.
 */
'use strict';

/**
 * Importing modules.
 */
const http = require('request-promise-native'),
      fs = require('fs'),
      util = require('./util.js'),
      {wiki} = require('./config/newusers.json');

/**
 * Constants.
 */
const users = [],
      profiles = {};

/**
 * Callback after writing script results to a file.
 * @param {Error} error Error that occurred while writing
 */
function writeCallback(error) {
    if (error) {
        console.error('An error occurred while writing to file:', error);
    } else {
        console.info('Finished.');
    }
}

/**
 * Writes contribution links to all fetched profiles with a website to a file.
 */
function writeWebsites() {
    const list = [];
    for (const id in profiles) {
        const profile = profiles[id];
        if (profile.website) {
            list.push(
                `${wiki}/wiki/Special:Contribs/${util.encode(profile.username)}`
            );
        }
    }
    fs.writeFile('results/newusers.txt', list.join('\n'), writeCallback);
}

/**
 * Lists profiles of users that created their account on a specified wiki.
 */
function listProfiles() {
    if (!users.length) {
        console.info('Writing to file...');
        writeWebsites();
        return;
    }
    http({
        headers: {
            'User-Agent': 'New user profiles spam finder'
        },
        method: 'GET',
        uri: `https://services.fandom.com/user-attribute/user/bulk?${
            users.splice(0, 20).map(u => `id=${u}`).join('&')
        }`
    }).then(function(d) {
        Object.assign(profiles, JSON.parse(d).users);
        listProfiles();
    }).catch(e => console.error('Error while fetching masthead info:', e));
}

/**
 * Fetches new users from the wiki.
 * @param {String} lestart Last offset to start from
 */
function listNewUsers(lestart) {
    util.apiQuery(wiki, {
        lelimit: 'max',
        leprop: 'user|userid',
        lestart,
        letype: 'useravatar|newusers',
        list: 'logevents'
    }).then(function(d) {
        d.query.logevents.forEach(function(e) {
            if (!users.includes(e.userid)) {
                users.push(e.userid);
            }
        });
        if (d['query-continue']) {
            listNewUsers(d['query-continue'].logevents.lestart);
        } else {
            console.info('Fetching profiles...');
            listProfiles();
        }
    }).catch(e => console.error('Error while fetching new users:', e));
}

console.info('Listing new users...');
listNewUsers();
