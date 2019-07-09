'use strict';
const fs = require('fs');

module.exports = function() {
    const data = require('./links-filtered.json');

    fs.readFileSync('notselfcreated.txt').toString().split('\n').forEach(function(title) {
        delete data[title];
    });

    fs.writeFileSync('links-filtered2.json', JSON.stringify(data, null, '    '));
};
