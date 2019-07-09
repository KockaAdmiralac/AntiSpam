'use strict';
const http = require('request-promise-native'),
      fs = require('fs'),
      NAMESPACES = [2],
      results = {},
      subpages = false;
let wikiURL, callback;

function apiCall(ns, from) {
    if (!ns) {
        ns = NAMESPACES.shift();
    }
    http({
        method: 'GET',
        uri: wikiURL,
        qs: {
            action: 'query',
            generator: 'allpages',
            gapnamespace: ns,
            gapfrom: from,
            gaplimit: 'max',
            gapfilterredir: 'nonredirects',
            prop: 'extlinks',
            ellimit: 'max',
            format: 'json',
            t: Date.now()
        },
        headers: {
            'User-Agent': 'Kocka & Lucky spam finder'
        },
        json: true
    }).then(function(d) {
        if (!d || !d.query || !d.query.pages || d.error) {
            console.log('ERROR: ', d);
            return;
        }
        const pages = d.query.pages;
        for (const i in pages) {
            const page = pages[i];
            if (
                page.extlinks instanceof Array && page.extlinks.length &&
                (subpages || !page.title.includes('/'))
            ) {
                results[page.title] = page.extlinks.map(l => l['*']);
            }
        }
        if (d['query-continue'] && d['query-continue'].allpages) {
            apiCall(ns, d['query-continue'].allpages.gapfrom);
        } else if (NAMESPACES.length) {
            apiCall();
        } else {
            fs.writeFileSync('links.json', JSON.stringify(results, null, '    '));
            setTimeout(callback, 10);
        }
    });
}

module.exports = function(wiki) {
    return new Promise(function(resolve) {
        callback = resolve;
        wikiURL = `https://${wiki}/api.php`;
        apiCall();
    });
};
