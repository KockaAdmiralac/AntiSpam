'use strict';
module.exports = function(wiki) {
    require('fs').writeFileSync(
        'links.txt',
        require('./links-final.json')
            .map(l => `https://${wiki}/Special:Contributions/${l}`)
            .join('\n')
    );
};
