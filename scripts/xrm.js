'use strict';

/**
 * Importing modules.
 */
const http = require('request-promise-native'),
      urls = require('./urls.json'),
      {compareTwoStrings} = require('string-similarity'),
      fs = require('fs'),
      net = require('net');

/**
 * Constants
 */
const THREADS = 39,
      errors = fs.createWriteStream('results/xrm-errors.txt', {flags: 'a'}),
      results = fs.createWriteStream('results/xrm.txt', {flags: 'a'});

/**
 * Shared variables.
 */
let wiki = null,
    domain = null,
    pages = null,
    running = false;

/**
 * Normalizes a MediaWiki title or summary.
 * @param {String} str Title or summary to normalize
 * @returns {String} Normalized title or summary
 */
function normalize(str) {
    return str.toLowerCase().trim().replace(/_/g, ' ');
}

/**
 * Checks the next wiki.
 */
function nextWiki() {
    wiki = urls.shift();
    if (!wiki) {
        console.log('Finished!');
        return;
    }
    domain = wiki.replace(/^https?:\/\//, '').replace(/\.(wikia|fandom)\.com/, '');
    running = 0;
    pages = [];
    console.log('Listing', wiki);
    // eslint-disable-next-line no-use-before-define
    listPages();
}

/**
 * Checks whether a single page's first revision might be XRumer spam.
 */
function checkPage() {
    if (running === 0 || running === 40) {
        console.log('Too many or no running threads');
        return;
    }
    const page = pages.shift();
    if (!page) {
        // console.log('Finishing thread');
        if (--running === 0) {
            setTimeout(nextWiki, 0);
        }
        return;
    }
    // console.log('Checking', page, 'running', running);
    http({
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'XRumer spam exterminator'
        },
        json: true,
        qs: {
            action: 'query',
            cb: Date.now(),
            format: 'json',
            prop: 'revisions',
            rvdir: 'newer',
            rvlimit: 1,
            rvprop: 'user|comment',
            titles: page
        },
        uri: `${wiki}/api.php`
    }).then(function(d) {
        if (!d || !d.query || !d.query.pages || d.error) {
            console.log('API error on', wiki);
            errors.write(`${wiki}: ${JSON.stringify(d)}\n`);
            setTimeout(checkPage, 0);
            return;
        }
        const {pp} = d.query,
              p = pp[Object.keys(pp)[0]];
        if (p && p.revisions && p.revisions[0]) {
            const rev = p.revisions[0],
                  similarity = compareTwoStrings(
                      normalize(page),
                      normalize(rev.comment)
                  );
            if (similarity >= 0.9 && net.isIP(rev.user)) {
                results.write(`* [[w:c:${domain}:Special:Contribs/${rev.user}|${rev.user}]] (${Math.round(similarity * 100)}%)\n`);
            }
        }
        // console.log('Restarting thread');
        setTimeout(checkPage, 0);
    }).catch(function(e) {
        console.log('HTTP error on', wiki);
        errors.write(`${wiki}: ${JSON.stringify(e)}\n`);
        setTimeout(checkPage, 0);
    });
}

/**
 * Lists pages from the current wiki
 * @param {String} apfrom Continuation mark
 */
function listPages(apfrom) {
    http({
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'XRumer spam exterminator'
        },
        json: true,
        qs: {
            action: 'query',
            apfrom,
            aplimit: 'max',
            apnamespace: 0,
            cb: Date.now(),
            format: 'json',
            list: 'allpages'
        },
        uri: `${wiki}/api.php`
    }).then(function(d) {
        if (!d || !d.query || !d.query.allpages || d.error) {
            console.log('API error on', wiki);
            errors.write(`${wiki}: ${JSON.stringify(d)}\n`);
            if (!running) {
                setTimeout(nextWiki, 0);
            }
            return;
        }
        pages = pages.concat(d.query.allpages.map(p => p.title));
        const available = THREADS - running;
        if (available > 0) {
            const toStart = available > pages.length ? pages.length : available;
            for (let i = 0; i < toStart; ++i) {
                ++running;
                setTimeout(checkPage, 0);
            }
        }
        if (d['query-continue']) {
            listPages(d['query-continue'].allpages.apfrom);
        } else if (pages.length === 0 && running === 0) {
            // Wiki has no pages
            console.log(wiki, 'has no pages...?');
            setTimeout(nextWiki, 0);
        }
    }).catch(function(e) {
        console.log('HTTP error on', wiki);
        errors.write(`${wiki}: ${JSON.stringify(e)}\n`);
        if (!running) {
            setTimeout(nextWiki, 0);
        }
    });
}

setInterval(function() {
    const usage = process.memoryUsage();
    console.log(
        'Running',
        running,
        'threads, pages length',
        pages.length,
        ', heap',
        usage.heapUsed,
        '/',
        usage.heapTotal,
        ', external',
        usage.external,
        ', rss',
        usage.rss
    );
}, 1000);

nextWiki();
