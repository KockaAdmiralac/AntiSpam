/**
 * startfrom.js
 *
 * Makes XRM lookup start from specified point.
 */
'use strict';

/**
 * Importing modules.
 */
const fs = require('fs'),
      urls = require('./urls.json');

/**
 * Callback after writing to file.
 * @param {Error} error Error that occurred
 */
function writeFileCallback(error) {
    if (error) {
        console.error('Error while writing to file:', error);
    } else {
        console.info('Done.');
    }
}

// Do it.
fs.writeFile(
    'urls.json',
    JSON.stringify(urls.slice(urls.indexOf(process.argv[1]))),
    writeFileCallback
);
