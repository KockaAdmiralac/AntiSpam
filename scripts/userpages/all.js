'use strict';
const main = require('./userpages.js'),
      filterl = require('./filterlinks.js'),
      nsc = require('./notselfcreated.js'),
      filternsc = require('./filternotselfcreated.js'),
      sort = require('./sort.js'),
      list = require('./list.js'),
      wiki = process.argv[2],
      threads = Number(process.argv[3] || 10);

main(wiki).then(function() {
    filterl();
    return nsc(wiki, threads);
}).then(function() {
    filternsc();
    return sort(wiki);
}).then(function() {
    list(wiki);
});
