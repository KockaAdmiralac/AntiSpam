/**
 * lookupfetch.js
 *
 * Fetches IPs to lookup from the Watchers Wiki.
 */
'use strict';

/**
 * Importing modules.
 */
const fs = require('fs'),
      Bot = require('nodemw'),
      config = require('./config/lookupfetch.json');

/**
 * Constants.
 */
// eslint-disable-next-line no-process-env
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
const client = new Bot({
    concurrency: 1,
    password: config.password,
    path: '/wiki',
    protocol: 'https',
    server: 'localhost',
    userAgent: 'Lookup list fetcher',
    username: config.username
});

/**
 * Callback after writing IPs to ips.json.
 * @param {Error} error Error that occurred
 */
function writeCallback(error) {
    if (error) {
        console.error('An error occurred while writing ips.json!', error);
    } else {
        console.info('Successfully written ips.json.');
    }
}

/**
 * Callback after editing ips.json.
 * @param {Error} error Error that occurred while editing
 */
function pageEditCallback(error) {
    if (error) {
        console.error('An error occurred while editing ips.json.', error);
    } else {
        console.info('Blanked ips.json.');
    }
}

/**
 * Callback after editing oldips.json.
 * @param {Error} error Error that occurred while editing
 */
function archiveEditCallback(error) {
    if (error) {
        console.error('An error occurred while editing oldips.json.', error);
    } else {
        console.info('Updated oldips.json with new IPs.');
    }
}

/**
 * Callback after fetching articles.
 * @param {Error} error Error that occurred
 * @param {Object} data Fetched article data
 */
function fetchCallback(error, data) {
    if (error) {
        console.error('An error occurred while fetching article data:', error);
        return;
    }
    const contents = {};
    data.pageids.forEach(function(pageid) {
        const page = data.pages[pageid];
        contents[page.title] = JSON.parse(page.revisions[0]['*']);
    });
    const oldips = contents[config.archive],
          newips = contents[config.page].filter(ip => !oldips.includes(ip));
    console.info('Updating file and pages...');
    fs.writeFile(
        'ips.json',
        JSON.stringify(newips, null, '    '),
        writeCallback
    );
    client.edit(
        config.page,
        '[\n]',
        'Written to ips.json.',
        true,
        pageEditCallback
    );
    client.edit(
        config.archive,
        JSON.stringify(oldips.concat(newips), null, '    '),
        'Updated with new IPs.',
        true,
        archiveEditCallback
    );
}

/**
 * Callback after logging in.
 * @param {Error} error Error that occurred
 */
function loggedIn(error) {
    if (error) {
        console.error('An error occurred while logging in:', error);
        return;
    }
    console.info('Fetching articles...');
    client.api.call({
        action: 'query',
        indexpageids: 1,
        prop: 'revisions',
        rvprop: 'content',
        titles: [
            config.archive,
            config.page
        ].join('|')
    }, fetchCallback);
}

console.info('Logging in...');
client.logIn(config.username, config.password, loggedIn);
