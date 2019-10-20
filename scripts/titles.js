/**
 * titles.js
 *
 * Cross-wiki searches for titles.
 */
'use strict';

/**
 * Importing modules.
 */
const fs = require('fs'),
      net = require('net'),
      util = require('./util.js'),
      {threads, logTime} = require('./config/titles.json'),
      {namespaces, regex} = require('./config/titles-settings.json');

/**
 * Constants.
 */
const errors = fs.createWriteStream('results/titles-errors.txt', {flags: 'a'}),
      results = fs.createWriteStream('results/titles.txt', {flags: 'a'}),
      REGEX = new RegExp(regex, 'u');

/**
 * Global variables.
 */
let urls = [],
    pages = [],
    running = 0,
    all = 0,
    url = null,
    logInterval = null,
    listing = false;

/**
 * Logs an error to both stdin and file.
 * @param {String} error Error to log
 */
function errlog(error) {
    console.error(error);
    errors.write(`${error}\n`);
}

/**
 * Logs an HTTP error.
 * @param {Error} error Error that occurred.
 */
function logError(error) {
    if (error.statusCode === 404) {
        errlog(`${url} doesn't exist\n`);
    } else if (error.statusCode === 410) {
        errlog(`${url} is closed\n`);
    } else if (error.statusCode >= 500) {
        errlog(`${url} server error: ${error.response} or ${error.body}\n`);
    } else {
        errlog(`Error on ${url}\n`);
        console.log(error);
    }
}

/**
 * Repeats the process for the next wiki.
 */
function nextWiki() {
    url = urls.shift();
    if (!url) {
        console.info('Finished!');
        clearInterval(logInterval);
        return;
    }
    running = 0;
    pages = [];
    listing = true;
    // eslint-disable-next-line no-use-before-define
    listPages(namespaces[0]);
}

/**
 * Continue after an error occurs in checkPage.
 */
function checkPageError() {
    // eslint-disable-next-line no-use-before-define
    setTimeout(checkPage, 0);
}

/**
 * Checks a page on the current wiki.
 */
function checkPage() {
    if (running === 0 || running === 40) {
        console.error(
            'Something odd happened with the thread count:',
            running
        );
        return;
    }
    const page = pages.shift();
    if (!page) {
        if (--running === 0 && !listing) {
            setTimeout(nextWiki, 0);
        }
        return;
    }
    util.apiQuery(url, {
        indexpageids: true,
        prop: 'revisions',
        rvdir: 'newer',
        rvlimit: 1,
        rvprop: 'user',
        titles: page
    }).then(function(data) {
        // Whether something odd happened with the data.
        if (typeof data !== 'object') {
            errlog(`Data isn't an object: ${JSON.stringify(data)} | ${url}/${page}`);
            return checkPageError();
        }
        // Whether a MediaWiki API error occurred.
        if (typeof data.error === 'object') {
            errlog(`MediaWiki API error: ${data.error.code} (${data.error.info}) | ${url}/${page}`);
            return checkPageError();
        }
        // Whether data.query is an object and data.query.allpages is an array.
        if (
            typeof data.query !== 'object' ||
            typeof data.query.pages !== 'object' ||
            !(data.query.pageids instanceof Array)
        ) {
            errlog(`Data is missing some keys: ${JSON.stringify(data)} | ${url}/${page}`);
            return checkPageError();
        }
        const p = data.query.pages[data.query.pageids[0]];
        // Whether there are oddities in page data.
        if (
            typeof p !== 'object' ||
            !(p.revisions instanceof Array) ||
            p.revisions.length === 0 ||
            typeof p.revisions[0] !== 'object' ||
            typeof p.revisions[0].user !== 'string'
        ) {
            if (!namespaces.includes(p.ns)) {
                errlog(`Page is not in the correct namespace: ${url}/wiki/${util.encode(page)}`);
            } else if (p.missing === '') {
                errlog(`Page does not exist: ${url}/wiki/${util.encode(page)}`);
            } else {
                errlog(`Something is odd in page data: ${JSON.stringify(p)} | ${url}/${page}`);
            }
            return checkPageError();
        }
        // Whether the user is an IP and the title matches a certain criteria.
        const {user} = p.revisions[0];
        if (net.isIP(user) && user !== '127.0.0.1') {
            results.write(`${url}/wiki/${util.encode(page)}\n`);
        }
        checkPageError();
    }).catch(function(error) {
        logError(error);
        checkPageError();
    });
}

/**
 * Continue after an error occurs in listPages.
 */
function listPagesError() {
    listing = false;
    if (running === 0) {
        setTimeout(nextWiki, 0);
    }
}

/**
 * Lists all pages of the current wiki.
 * @param {Number} apnamespace Namespace to be listing
 * @param {String} apfrom Continuation mark
 */
function listPages(apnamespace, apfrom) {
    util.apiQuery(url, {
        apfrom,
        aplimit: 'max',
        apnamespace,
        list: 'allpages'
    }).then(function(data) {
        // Whether something odd happened with the data.
        if (typeof data !== 'object') {
            if (
                typeof data !== 'string' ||
                !data.startsWith('<!doctype html>')
            ) {
                errlog(`Data isn't an object: ${JSON.stringify(data)} | ${url}, ns:${apnamespace}, from ${apfrom}.`);
            }
            return listPagesError();
        }
        // Whether a MediaWiki API error occurred.
        if (typeof data.error === 'object') {
            errlog(`MediaWiki API error: ${data.error.code} (${data.error.info}) | ${url}, ns:${apnamespace}, from ${apfrom}.`);
            return listPagesError();
        }
        // Whether data.query is an object and data.query.allpages is an array.
        if (
            typeof data.query !== 'object' ||
            !(data.query.allpages instanceof Array)
        ) {
            if (data && data.interwiki) {
                errlog(`Interwiki link issues | ${url}, ns:${apnamespace}, from ${apfrom}`);
            } else {
                errlog(`Data is missing some keys: ${JSON.stringify(data)} | ${url}, ns:${apnamespace}, from ${apfrom}`);
            }
            return listPagesError();
        }
        // Register the newly fetched pages.
        pages = pages.concat(
            data.query.allpages
                .map(page => page.title)
                .filter(page => REGEX.test(page))
        );
        // Calculate the amount of available threads.
        const available = threads - running;
        if (available > 0) {
            // Run the available threads.
            const toStart = available > pages.length ? pages.length : available;
            for (let i = 0; i < toStart; ++i) {
                ++running;
                setTimeout(checkPage, 0);
            }
        }
        const index = namespaces.indexOf(apnamespace);
        if (data['query-continue']) {
            listPages(apnamespace, data['query-continue'].allpages.apfrom);
        } else if (index !== namespaces.length - 1) {
            listPages(namespaces[index + 1]);
        } else if (pages.length === 0 && running === 0) {
            setTimeout(nextWiki, 0);
        } else {
            listPagesError();
        }
    }).catch(function(error) {
        logError(error);
        listPagesError();
    });
}

/**
 * Logs the current status.
 */
function log() {
    console.debug(`[${all - urls.length}/${all}] (${
        Math.round((all - urls.length - 1) / all * 10000) / 100
    }%) - ${url} | running: ${running} | listing: ${listing}`);
}

/**
 * Initializes the fetching process.
 */
function init() {
    try {
        urls = require('./urls.json');
        all = urls.length;
    } catch (e) {
        console.error('Failed to load urls.json. Have you ran urls.js?');
        process.exit();
    }
    setTimeout(nextWiki, 0);
    logInterval = setInterval(log, logTime * 1000);
}

init();
