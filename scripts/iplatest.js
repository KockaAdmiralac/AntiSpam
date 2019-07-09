/**
 * iplatest.js
 *
 * List pages with latest edits by an IP address on specified wikis.
 */
'use strict';

/**
 * Importing modules.
 */
const fs = require('fs'),
      net = require('net'),
      util = require('./util.js'),
      {threads, namespaces, wikis} = require('./config/iplatest.json');

/**
 * Constants.
 */
const result = {};

/**
 * Global variables.
 */
let currently = threads;

/**
 * Callback after writing the results file.
 * @param {Error} error Error that occurred while writing the file.
 */
function fileWriteCallback(error) {
    if (error) {
        console.error('An error occurred while writing to file:', error);
    } else {
        console.info('Finished.');
    }
}

/**
 * Starts listing the pages.
 * @param {String} url Wiki URL to call
 * @param {Number} namespace Namespace to list
 * @param {String} from apfrom API parameter
 */
function apiCall(url, namespace, from) {
    let ns = namespace,
        wiki = url;
    if (!wiki) {
        wiki = wikis.shift();
        if (!wiki) {
            if (--currently === 0) {
                let str = '';
                for (const i in result) {
                    str += `// NS ${namespaces[i]}\n${result[i].join('\n')}\n\n`;
                }
                fs.writeFile('results/iplatest.txt', str, fileWriteCallback);
            }
            return;
        }
    }
    if (!ns) {
        ns = 0;
    }
    util.apiQuery(`http://${wiki}`, {
        gapfilterredir: 'nonredirects',
        gapfrom: from,
        gaplimit: 'max',
        gapnamespace: namespaces[ns],
        generator: 'allpages',
        prop: 'revisions'
    }).then(function(d) {
        if (!d.query) {
            apiCall();
            return;
        }
        const {pages} = d.query;
        for (const i in pages) {
            const page = pages[i];
            if (Number(i) > 0 && page.revisions) {
                const rev = page.revisions[0];
                if (net.isIP(rev.user)) {
                    const str = `http://${wiki}/?diff=${rev.revid} : ${rev.comment}`;
                    if (!result[ns]) {
                        result[ns] = [];
                    }
                    result[ns].push(str);
                    console.log(str);
                }
            }
        }
        if (d['query-continue']) {
            apiCall(wiki, ns, d['query-continue'].allpages.gapfrom);
        } else if (++ns === namespaces.length) {
            apiCall();
        } else {
            apiCall(wiki, ns);
        }
    }).catch(e => console.error(
        'An error occurred while finding pages last edited by anons:',
        e
    ));
}

console.log('Starting latest IP edit lookup.');
for (let i = 0; i < threads; ++i) {
    apiCall();
}
