'use strict';
const http = require('request-promise-native'),
      fs = require('fs'),
      results = [];
let wikiURL, callback, list;

function apiCall() {
    const users = list.splice(0, 50).map(u => u.split(':').slice(1).join(':'));
    if (!users.length) {
        fs.writeFileSync('links-final.json', JSON.stringify(results.sort(function(u1, u2) {
            return u1[0] - u2[0];
        }).map(u => u[1]), null, '    '));
        setTimeout(callback, 10);
        return;
    }
    http({
        method: 'GET',
        uri: wikiURL,
        qs: {
            action: 'query',
            list: 'users',
            ususers: users.join('|'),
            usprop: 'editcount',
            format: 'json',
            t: Date.now()
        },
        headers: {
            'User-Agent': 'Kocka & Lucky spam finder'
        },
        json: true
    }).then(function(d) {
        if (d && d.query && d.query.users instanceof Array) {
            d.query.users.forEach(function(u) {
                if (u.editcount < 10) {
                    results.push([u.editcount, u.name]);
                }
            });
        } else {
            console.log('Error:', d);
        }
        apiCall();
    });
}

module.exports = function(wiki) {
    return new Promise(function(resolve) {
        callback = resolve;
        wikiURL = `https://${wiki}/api.php`;
        list = Object.keys(require('./links-filtered2.json'));
        apiCall();
    });
};
