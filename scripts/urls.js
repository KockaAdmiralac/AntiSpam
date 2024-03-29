/**
 * urls.json
 *
 * Simplifies data from wikis.json so scripts can load it with less segfaulting.
 */
'use strict';

/**
 * Importing modules.
 */
const wikis = require('./wikis.json');
const fs = require('fs');
const {blacklist} = require('./config/urls.json');

/**
 * Constants.
 */
const urls = [];

// End marker used by wikis.js.
delete wikis.no;
for (const id in wikis) {
    let {url} = wikis[id];
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    if (
        !blacklist.includes(url) &&
        !url.startsWith('https://ucp-internal-test') &&
        !url.startsWith('https://old.') &&
        !url.includes('.preview.')
    ) {
        urls.push(url);
    }
}

fs.writeFile('urls.json', JSON.stringify(urls), function(e) {
    if (e) {
        console.error('Failed to write to file', e);
    }
});
