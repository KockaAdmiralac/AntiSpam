'use strict';
module.exports = function(wiki) {
    require('fs').writeFileSync(
        'links.txt',
        require('./links-final.json')
            .map(l => `https://${wiki}/User:${l}`)
            .join('\n')
    );
};
