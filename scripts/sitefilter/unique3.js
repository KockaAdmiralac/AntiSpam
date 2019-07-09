'use strict';
const data = {},
      fs = require('fs'),
      arr = new Array(1000);

fs.readFileSync('websites3-none.txt').toString().split('\n').forEach(function(el) {
	el = el.trim().split('/')[2];
    if(data[el]) {
        ++data[el];
    } else {
        data[el] = 1;
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
fs.writeFileSync('websites3-sort.txt', arr.filter(el => typeof el !== 'undefined').map(el => el.join('\n')).join('\n'));
