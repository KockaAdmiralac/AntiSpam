/**
 * ipcreated.js
 *
 * Lists all pages created by anonymous user in specified namespaces.
 * @todo Concurrency.
 */
'use strict';

/**
 * Importing modules.
 */
const fs = require('fs'),
      net = require('net'),
      util = require('./util.js'),
      {url, namespace} = require('./config/ipcreated.json');

/**
 * Constants.
 */
const results = fs.createWriteStream('results/ipcreated.txt');

/**
 * Global variables.
 */
let list = [];

/**
 * Checks whether a page has been created by an anonymous user.
 */
function apiPage() {
    const page = list.shift();
    if (!page) {
        results.end();
        return;
    }
    util.apiQuery(url, {
        indexpageids: 1,
        prop: 'revisions',
        rvdir: 'newer',
        rvprop: 'user',
        titles: page
    }).then(function(d) {
        if (d.error) {
            console.error('API error while checking page revisions:', d.error);
        } else {
            const pageinfo = d.query.pages[d.query.pageids[0]];
            if (!pageinfo || !pageinfo.revisions) {
                console.error('No page revisions:', d);
            } else {
                const {user} = pageinfo.revisions[0];
                if (net.isIP(user)) {
                    results.write(`${url}/wiki/Special:Contribs/${user}\n`);
                }
            }
        }
        apiPage();
    });
}

/**
 * Lists all pages from a namespace.
 * @param {String} apfrom API parameter to continue listing pages
 */
function apiList(apfrom) {
    util.apiQuery(url, {
        apfrom,
        aplimit: 'max',
        apnamespace: namespace,
        list: 'allpages'
    }).then(function(d) {
        list = list.concat(d.query.allpages.map(p => p.title));
        if (d['query-continue']) {
            apiList(d['query-continue'].allpages.apfrom);
        } else {
            console.info('Finished listing pages, looking up first revisions.');
            apiPage();
        }
    });
}

console.info('Starting IP creation lookup.');
apiList();
