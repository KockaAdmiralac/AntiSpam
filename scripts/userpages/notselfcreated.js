'use strict';
const http = require('request-promise-native'),
      results = [];
let THREADS, running, wikiURL, callback, pages;

function apiCall() {
    const title = pages.shift();
    if (!title) {
        if (--running === 0) {
            require('fs').writeFileSync('notselfcreated.txt', results.join('\n'));
            setTimeout(callback, 10);
        }
        return;
    }
    http({
        method: 'GET',
        uri: wikiURL,
        qs: {
            action: 'query',
            prop: 'revisions',
            titles: title,
            rvprop: 'user',
            rvdir: 'newer',
            format: 'json',
            t: Date.now()
        },
        headers: {
            'User-Agent': 'Kocka & Lucky spam finder'
        },
        json: true
    }).then(function(d) {
        if (!d || !d.query || !d.query.pages || d.error) {
            console.log('ERROR:', d);
            process.exit();
        }
        const pages = d.query.pages,
              key = Object.keys(pages)[0],
              page = pages[key];
        if (key === -1) {
            apiCall();
            return;
        }
        if (!page || !page.revisions || !page.revisions[0]) {
            console.log('PAGE ERROR:', page);
            process.exit();
        }
        const user = page.revisions[0].user;
        if (user !== title.substring(5) && user !== 'FANDOM' && user !== 'Wikia' && user !== 'Fandom' && user !== '127.0.0.1') {
            results.push(title);
        }
        apiCall();
    });
}

module.exports = function(wiki, threads) {
    return new Promise(function(resolve) {
        callback = resolve;
        THREADS = threads;
        running = threads;
        wikiURL = `http://${wiki}/api.php`;
        pages = Object.keys(require('./links-filtered.json'));
        for (let i = 0; i < THREADS; ++i) {
            apiCall();
        }
    });
};
