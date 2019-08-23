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
      progress = require('cli-progress'),
      util = require('./util.js'),
      allUrls = require('./urls.json'),
      ips = require('./ips.json'),
      {threads} = require('./config/lookup.json');

/**
 * Constants.
 */
const errors = fs.createWriteStream('results/lookup-errors.txt', {flags: 'a'}),
      results = fs.createWriteStream('results/lookup.txt', {flags: 'a'}),
      errored = [];

/**
 * Looks up contributions of a batch of users.
 * @param {string} url URL of the wiki to execute lookup on
 * @param {Array<string>} batch Batch of users to lookup
 * @param {string} start Offset from which to look up the contributions
 */
async function lookupBatch(url, batch, start) {
    try {
        const d = await util.apiQuery(url, {
            list: 'usercontribs',
            uclimit: 'max',
            ucstart: start,
            ucuser: batch.join('|')
        });
        if (d.error || !d || !d.query || !d.query.usercontribs) {
            if (errored.indexOf(url) === -1) {
                if (typeof d === 'string') {
                    errors.write(`Nonexistent wiki: ${url}.\n`);
                } else if (d.error && d.error.code === 'readapidenied') {
                    errors.write(`Private wiki: ${url}.\n`);
                } else {
                    errors.write(`API error: ${url}: ${JSON.stringify(d)}.\n`);
                }
                errored.push(url);
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
                    addr.map(a => `${url}/wiki/Special:Contribs/${a}\n`)
                        .join('')
                );
            }
            if (d['query-continue']) {
                return d['query-continue'].usercontribs.ucstart;
            }
        }
    } catch (e) {
        if (errored.indexOf(url) !== -1) {
            return;
        }
        if (e.error && e.error.code === 'ENOTFOUND') {
            errors.write(`Nonexistent wiki: ${url}.\n`);
        } else if (e.statusCode === 403) {
            errors.write(`Internal wiki: ${url}.\n`);
        } else if (e.statusCode === 410) {
            errors.write(`Closed wiki: ${url}.\n`);
        } else if (e.statusCode >= 500) {
            console.error(e.error || e.body);
            errors.write(`${e.statusCode} on ${url}: ${JSON.stringify(e.error || e.body)}\n`);
        } else {
            console.error(e.error || e.body);
            errors.write(`Error code ${e.statusCode}: ${url}.\n`);
        }
        errored.push(url);
    }
}

/**
 * Executes lookup on a wiki.
 * @param {string} url URL of the wiki to execute lookup on
 */
async function lookupWiki(url) {
    let offset = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const batch = ips.slice(offset, offset + 50);
        if (batch.length === 0) {
            break;
        }
        let start = await lookupBatch(url, batch);
        while (start) {
            start = await lookupBatch(url, batch, start);
        }
        offset += 50;
    }
}

/**
 * Runs the lookup.
 */
async function run() {
    const urls = process.argv.includes('--errored') ?
        require('./results/lookup-errors.json') :
        allUrls,
          all = urls.length,
          bar = new progress.Bar({
        barsize: 25,
        clearOnComplete: true,
        format: '[{bar}] {percentage}% ({value}: {eta}s)',
        stopOnComplete: true,
        stream: process.stdout
    });
    bar.start(all, 0);
    while (urls.length) {
        const promises = [];
        for (let j = 0; j < threads; ++j) {
            const url = urls.shift();
            if (!url) {
                break;
            }
            promises.push(lookupWiki(url));
        }
        await Promise.all(promises);
        bar.update(all - urls.length);
    }
    bar.stop();
    if (errored.length) {
        await fs.writeFile('results/lookup-errors.json', JSON.stringify(errored, null, 4));
    }
}

// Run the thing.
run();
