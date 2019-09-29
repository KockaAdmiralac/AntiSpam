'use strict';

const http = require('request-promise-native'),
      fs = require('fs');

http({
    method: 'GET',
    uri: 'https://help.gamepedia.com/api.php',
    headers: {
        'User-Agent': 'Kocka spam lookup'
    },
    qs: {
        action: 'allsites',
        format: 'json',
        formatversion: 2,
        do: 'getSiteStats'
    },
    json: true
}).then(function(results) {
    fs.writeFile(
        'results/gpurls.json',
        JSON.stringify(
            results.data.wikis
                .map(w => `https://${w.wiki_domain}`)
                .filter(w => w !== 'https://gamepedia.com'),
                null,
                '    '
            ),
        function(error) {
            if (error) {
                console.error('Error while writing to gpurls.json:', error);
            } else {
                console.info('Written to urls.json.');
            }
        }
    );
}).catch(function(error) {
    console.error('Error while fetching all sites:', error);
});

