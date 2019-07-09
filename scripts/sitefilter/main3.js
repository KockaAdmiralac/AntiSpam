'use strict';

function makeRegex(type) {
    return new RegExp('(' + require(`./${type}.json`).join('|').replace(/\./g, '\\.').replace(/<>/g, '.')  + ')', 'ig');
}

const fs = require('fs'),
      whiteList = [],
      blackList = [],
      none = [],
      whitelist = makeRegex('whitelist'),
      blacklist = makeRegex('blacklist');

fs.readFileSync('websites3.txt').toString().split('\n').forEach(function(el) {
    el = el.trim();
    if(whitelist.test(el) || whitelist.test(el)) {
        whiteList.push(el);
    } else if(blacklist.test(el) || blacklist.test(el)) {
        blackList.push(el);
    } else {
        none.push(el);
    }
});

fs.writeFileSync('websites3-blacklist.txt', blackList.join('\n'));
fs.writeFileSync('websites3-whitelist.txt', whiteList.join('\n'));
fs.writeFileSync('websites3-none.txt', none.join('\n'));
