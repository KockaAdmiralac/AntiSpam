'use strict';

function makeRegex(type) {
    return new RegExp('(' + require(`./${type}.json`).join('|').replace(/\./g, '\\.').replace(/<>/g, '.')  + ')', 'ig');
}

const fs = require('fs'),
      whiteList = [],
      blackList = [],
      none = [],
      whitelist = makeRegex('whitelist'),
      blacklist = makeRegex('blacklist'),
      split = /(\d+) \| (.*) \| (.*)/g;


fs.readFileSync('websites.txt').toString().split('\n').forEach(function(el) {
    let match = split.exec(el) || split.exec(el);
	if(match === null) {
		console.log(el);
		return;
	}
    const site = match[3];
    if(whitelist.test(site) || whitelist.test(site) || site.indexOf('.') === -1) {
        whiteList.push(el);
    } else if(blacklist.test(site) || blacklist.test(site)) {
        blackList.push(el);
    } else {
        none.push(el);
    }
});

fs.writeFileSync('websites-blacklist.txt', blackList.join('\n'));
fs.writeFileSync('websites-whitelist.txt', whiteList.join('\n'));
fs.writeFileSync('websites-none.txt', none.join('\n'));
