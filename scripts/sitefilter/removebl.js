'use strict';
const fs = require('fs'),
      lineregex = /(\d+): ([^\n]+)/g,
	  data = {};
let newtext = '';
fs.readFileSync('websites.txt').toString().split('\n').forEach(function(el) {
    const res = lineregex.exec(el) || lineregex.exec(el);
    data[Number(res[1])] = res[2];
});
fs.readFileSync('websites-blacklist.txt').toString().split('\n').forEach(function(el) {
	const res = lineregex.exec(el) || lineregex.exec(el);
	delete data[res[1]];
});
for(let i in data) {
	newtext += `${i}: ${data[i]}\n`;
}
fs.writeFileSync('websites-new.txt', newtext);