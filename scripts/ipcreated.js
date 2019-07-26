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
      progress = require('cli-progress'),
      util = require('./util.js'),
      {url, namespaces, threads} = require('./config/ipcreated.json');

/**
 * Constants.
 */
const results = fs.createWriteStream('results/ipcreated.txt'),
      bar = new progress.Bar({
          barsize: 25,
          clearOnComplete: true,
          format: '[{bar}] {percentage}% ({value}: {eta}s)',
          stopOnComplete: true,
          stream: process.stdout
      });

/**
 * Gets the creator of an article.
 * @param {string} title Article whose creator should be retrieved
 */
async function getCreator(title) {
    const result = await util.apiQuery(url, {
        indexpageids: 1,
        prop: 'revisions',
        rvdir: 'newer',
        rvprop: 'user',
        titles: title
    });
    if (result.error) {
        throw results.error;
    }
    const q = result.query,
          page = q.pages[q.pageids[0]];
    if (!page.revisions) {
        return;
    }
    return page.revisions[0].user;
}

/**
 * Lists all pages from a namespace.
 * @param {Number} namespace Namespace to list all pages from
 * @param {String} from API parameter to continue listing pages
 */
async function listPages(namespace, from) {
    const result = await util.apiQuery(url, {
        apfrom: from,
        aplimit: 'max',
        apnamespace: namespace,
        list: 'allpages'
    });
    return {
        offset: result['query-continue'] ?
            result['query-continue'].allpages.apfrom :
            null,
        pages: result.query.allpages.map(page => page.title)
    };
}

/**
 * Runs the anon creation lookup.
 */
async function run() {
    for (let i = 0, l = namespaces.length; i < l; ++i) {
        console.info('Listing namespace', namespaces[i], '...');
        let offset = null;
        const pages = [];
        while (true) {
            const result = await listPages(namespaces[i], offset);
            ({offset} = result);
            pages.push(...result.pages);
            if (!offset) {
                break;
            }
        }
        const {length} = pages;
        bar.start(length, 0);
        while (pages.length) {
            const promises = [];
            for (let j = 0; j < threads; ++j) {
                promises.push(getCreator(pages.shift()));
                if (!pages.length) {
                    break;
                }
            }
            try {
                const users = await Promise.all(promises);
                users.filter(net.isIP).forEach(user => results.write(
                    `${url}/wiki/Special:Contribs/${util.encode(user)}\n`
                ));
            } catch (error) {
                console.error('API error:', error);
            }
            bar.update(length - pages.length);
        }
        bar.stop();
    }
    results.end();
}

// Run.
run();
