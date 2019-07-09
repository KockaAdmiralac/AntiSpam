/**
 * ewpfilter.js
 *
 * Filters results of ewp.js by removing existent users from the list.
 */
'use strict';

/**
 * Importing modules.
 */
const fs = require('fs'),
      util = require('./util.js');

/**
 * Global variables.
 */
const users = [],
      existent = [];
let lines = null;

/**
 * Callback after writing to file.
 * @param {Error} error Error that occurred while writing
 */
function fileWriteCallback(error) {
    if (error) {
        console.error('An error occurred while writing list:', error);
    } else {
        console.info('Writing list...');
    }
}

/**
 * Filters existent users from the list.
 */
function doFiltering() {
    const list1 = [],
          list2 = [];
    lines.forEach(function(line) {
        const spl = line.split(':');
        if (existent.includes(spl[2])) {
            list2.push(line);
        } else {
            list1.push(line);
        }
    });
    fs.writeFile('results/ewpfilter.txt', list1.join('\n'), fileWriteCallback);
    fs.writeFile(
        'results/ewpfilter-filtered.txt',
        list2.join('\n'),
        fileWriteCallback
    );
}

/**
 * Callback after fetching users fails.
 * @param {Error} error Error that occurred
 */
function usersFail(error) {
    console.error('Fetching users failed with:', error);
}

/**
 * Callback after receiving users from the API.
 * @param {Object} data API response
 */
function usersCallback(data) {
    data.query.users.forEach(function(user) {
        existent.push(user.name);
    });
    // eslint-disable-next-line no-use-before-define
    checkUsers();
}

/**
 * Checks for existence of 50 user accounts from the list.
 */
function checkUsers() {
    const batch = users.splice(0, 50);
    if (batch.length === 0) {
        console.info('Filtering...');
        doFiltering();
        return;
    }
    util.apiQuery('https://community.fandom.com', {
        list: 'users',
        ususers: batch.join('|')
    }).then(usersCallback).catch(usersFail);
}

/**
 * Callback after reading the results file.
 * @param {Error} error Error that occurred while reading the file
 * @param {String} contents File contents
 */
function fileCallback(error, contents) {
    if (error) {
        console.error('Failed to read results/ewp.txt:', error);
        return;
    }
    console.info('Extracting users...');
    lines = contents.toString().split('\n').filter(Boolean);
    lines.forEach(function(line) {
        const spl = line.split(':');
        if (spl.length === 3 && !users.includes(spl[2])) {
            users.push(spl[2]);
        }
    });
    console.info('Checking users...');
    checkUsers();
}

// Run
console.info('Reading EWP results...');
fs.readFile('results/ewp.txt', fileCallback);
