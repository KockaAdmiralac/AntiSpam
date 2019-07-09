/**
 * wikis.js
 *
 * Crawls WikisApiController in search of all wikis on Fandom.
 */
'use strict';

/**
 * Importing modules.
 */
const fs = require('fs'),
      http = require('request-promise-native'),
      {batch, first, last, threads} = require('./config/wikis.json');

/**
 * Constants.
 */
const results = fs.createWriteStream('wikis.json'),
      errors = fs.createWriteStream('results/wikis-errors.txt', {
          flags: 'a'
      });

/**
 * Global variables.
 */
let counter = 0,
    currwiki = first,
    logInterval = null;

/**
 * Callback after listing wiki data.
 * @param {Object} items Requested wiki data
 */
function listWikisCallback({items}) {
    if (typeof items === 'object') {
        for (const id in items) {
            ++counter;
            const data = items[id];
            for (const prop in data) {
                if (!data[prop]) {
                    delete data[prop];
                }
            }
            results.write(`"${id}":${JSON.stringify(data)},`);
        }
    } else {
        console.error('`items` is not an object!');
        errors.write('`items` is not an object!\n');
    }
    // eslint-disable-next-line no-use-before-define
    listWikis();
}

/**
 * Requests wiki data from WikisApiController.
 */
function listWikis() {
    const i = currwiki;
    if (i > last) {
        return;
    }
    currwiki += batch;
    const ids = [...Array(batch).keys()].map(a => a + i).join(',');
    http({
        json: true,
        method: 'POST',
        qs: {
            cb: Date.now(),
            ids
        },
        uri: 'https://community.fandom.com/api/v1/Wikis/Details'
    }).then(listWikisCallback).catch(function(error) {
        if (error.statusCode && error.statusCode >= 500) {
            console.error('Server error', error.statusCode, error.error);
        } else {
            console.error('Request error:', error);
        }
        errors.write(`${JSON.stringify(ids)}\n${error.statusCode}: ${JSON.stringify(error.error)}\n`);
        listWikis();
    });
}

/**
 * Logs current progress.
 */
function log() {
    console.info(`${currwiki}/${last} (${
        Math.round(currwiki / last * 10000) / 100
    }%) [${counter}]`);
    if (currwiki > last) {
        console.info('Finished!');
        results.write('"_end":{}}');
        clearInterval(logInterval);
    }
}

// Start.
console.info('Running wiki lister.');
results.write('{');
for (let i = 0; i < threads; ++i) {
    listWikis();
}
logInterval = setInterval(log, 5000);
