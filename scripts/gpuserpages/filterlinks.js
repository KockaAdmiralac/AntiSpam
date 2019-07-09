'use strict';
const REGEX = /^https?:\/\/(?:www\.)?(.*)/,
      WHITELIST = new RegExp('^(' + require('./link-whitelist.json').join('|').replace(/\./g, '\\.') + ')', 'i'),
      newdata = {};

module.exports = function() {
    const data = require('./links.json');
    for (const user in data) {
        const links = data[user],
              newlinks = [];
        links.forEach(function(l) {
            const m = REGEX.exec(l);
            REGEX.lastIndex = 0;
            if (m) {
                const split = m[1].split('/')[0].split('.');
                if (split.length < 2) {
                    return;
                }
                let long = 0, parts = [];
                for (let i = split.length - 1; i >= 0 && (long < 1 || parts.length === 1); --i) {
                    const part = split[i];
                    if (part.length > 3) {
                        ++long;
                    }
                    parts.unshift(part);
                }
                const newlink = parts.join('.');
                if (!WHITELIST.test(newlink)) {
                    newlinks.push(newlink);
                }
                WHITELIST.lastIndex = 0;            
            }
        });
        if (newlinks.length) {
            newdata[user] = newlinks;
        }
    }

    require('fs').writeFileSync('links-filtered.json', JSON.stringify(newdata, null, '    '));
};
