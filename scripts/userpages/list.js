'use strict';
module.exports = function(wiki) {
    require('fs').writeFileSync(
        'links.txt',
        require('./links-final.json')
            .map(l => `* [[w:c:${wiki}:User:${l}|${l}]] ([[w:c:${wiki}:Special:Contribs/${l}|c]])`)
            .join('\n')
    );
};
