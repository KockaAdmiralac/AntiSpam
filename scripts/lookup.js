/**
 * main.js
 *
 * Looks up user contributions across all wikis, given an array of URLs.
 */
'use strict';

/**
 * Importing modules.
 */
const fs = require('fs'),
      util = require('./util.js'),
      urls = require('./urls.json'),
      ips = require('./ips.json'),
      {threads} = require('./config/lookup.json');

/**
 * Constants.
 */
const errors = fs.createWriteStream('results/lookup-errors.txt', {flags: 'a'}),
      results = fs.createWriteStream('results/lookup.txt', {flags: 'a'}),
      ALL = urls.length,
      errored = [];

/**
 * Shared variables.
 */
let offset = 0,
    url = urls.shift(),
    interval = null;

/**
 * Gets the next batch of IPs.
 * @returns {Array<String>} Next batch of IPs
 */
function nextBatch() {
    const slice = ips.slice(offset, offset + 50);
    if (slice.length) {
        offset += 50;
        return slice;
    }
    url = urls.shift();
    offset = 50;
    return ips.slice(0, 50);
}

/**
 * Runs the next API query.
 */
function nextCall() {
    const batch = nextBatch(),
          currl = url;
    if (!currl) {
        // Stopping...
        return;
    }
    util.apiQuery(currl, {
        list: 'usercontribs',
        uclimit: 'max',
        ucuser: batch.join('|')
    }).then(function(d) {
        if (d.error || !d || !d.query || !d.query.usercontribs) {
            if (errored.indexOf(currl) === -1) {
                if (typeof d === 'string') {
                    errors.write(`Nonexistent wiki: ${currl}.\n`);
                } else if (d.error && d.error.code === 'readapidenied') {
                    errors.write(`Private wiki: ${currl}.\n`);
                } else {
                    errors.write(`API error: ${currl}: ${JSON.stringify(d)}.\n`);
                }
                errored.push(currl);
            }
        } else {
            const addr = [];
            d.query.usercontribs.forEach(function(c) {
                if (!addr.includes(c.user)) {
                    addr.push(c.user);
                }
            });
            if (addr.length) {
                results.write(
                    addr.map(a => `${currl}/wiki/Special:Contribs/${a}\n`)
                        .join('')
                );
            }
            if (d['query-continue']) {
                results.write(`${currl} has continuation!\n`);
            }
        }
        setTimeout(nextCall, 0);
    }).catch(function(e) {
        if (errored.indexOf(currl) === -1) {
            if (e.statusCode === 403) {
                errors.write(`Internal wiki: ${currl}.\n`);
            } else if (e.statusCode === 410) {
                errors.write(`Closed wiki: ${currl}.\n`);
            } else if (e.statusCode >= 500) {
                console.error(e);
                errors.write(`5XX on ${currl}: ${e.body}\n`);
            } else {
                console.error(e);
                errors.write(`Error code ${e.statusCode}: ${currl}.\n`);
            }
            errored.push(currl);
        }
        setTimeout(nextCall, 0);
    });
}

/**
 * Logs current lookup status.
 */
function log() {
    if (url) {
        const curr = ALL - urls.length;
        console.info(
            `${curr}/${ALL} (${Math.round(curr / ALL * 10000) / 100}%)`
        );
    } else {
        clearInterval(interval);
        console.info('Finished!');
    }
}

// Run the thing.
console.info('Running Lookup.');
for (let i = 0; i < threads; ++i) {
    nextCall();
}
interval = setInterval(log, 5000);
