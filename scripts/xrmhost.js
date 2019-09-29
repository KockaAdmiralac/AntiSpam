/**
 * xrmhost.js
 *
 * Hosts the XRM spamfinder.
 */
'use strict';

/**
 * Importing modules.
 */
const bluebird = require('bluebird'),
      messenger = require('messenger'),
      pm2 = require('pm2');

/**
 * IPC variables.
 */
const listener = messenger.createListener(10001),
      speaker = messenger.createSpeaker(10002);

/**
 *
 * @param {object} status Status of the
 */
async function update(status) {
    //
}

/**
 * Runs the XRM spamfinder host.
 */
async function run() {
    try {
        await pm2.connectAsync();
    } catch (error) {
        console.error('An error occurred while connecting to PM2:', error);
    }
}

bluebird.promisifyAll(pm2);
listener.on('done', update);
run();
