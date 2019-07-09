'use strict';
const data = {},
      fs = require('fs'),
      split = /\d+ \| .* \| https?:\/\/(?:www\.)*([^\/]*)/,
      arr = new Array(1000);

fs.readFileSync('websites-none.txt').toString().split('\n').forEach(function(el) {
    split.lastIndex = 0;
    const res = split.exec(el);
    if(res === null) {
        console.log(el);
        return;
    }
    const site = res[1].trim().toLowerCase();
    if(data[site]) {
        ++data[site];
    } else {
        data[site] = 1;
    }
});
for(let i in data) {
    const v = data[i];
    if(v === 1) {
        continue;
    }
    if(arr[v]) {
        arr[v].push(i);
    } else {
        arr[v] = [i];
    }
}
fs.writeFileSync('websites-sort.txt', arr.filter(el => typeof el !== 'undefined').map(el => el.join('\n')).join('\n'));
