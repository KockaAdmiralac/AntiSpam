/**
 * util.js
 *
 * Utilities for other spam-finding scripts.
 */
'use strict';

/**
 * Importing modules.
 */
const http = require('request-promise-native');

/**
 * Constants.
 */
const USER_AGENT = 'Wikia Watchers spam lookup utility script, ' +
                   'contact KockaAdmiralac through 1405223@gmail.com ' +
                   'for specific information.';

/**
 * Makes a GET request to a JSON endpoint.
 * @param {String} url URL to query
 * @param {Object} qs Query string parameters
 * @returns {Promise} Promise to listen on for response
 */
function getJSON(url, qs) {
    return http({
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': USER_AGENT
        },
        json: true,
        method: 'GET',
        qs,
        uri: url
    });
}

/**
 * Queries the MediaWiki API.
 * @param {String} url Wiki URL
 * @param {Object} params Parameters to supply in the query
 * @returns {Promise} Promise to listen on for response
 */
function apiQuery(url, params) {
    params.action = 'query';
    params.cb = Date.now();
    params.format = 'json';
    return getJSON(`${url}/api.php`, params);
}

/**
 * Encodes URL components MediaWiki-style.
 * Based on mw.util.wikiUrlencode
 * @param {String} url URL component to encode
 * @returns {String} Encoded URL
 */
function encode(url) {
    return encodeURIComponent(url)
        .replace(/!/g, '%21')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/\*/g, '%2A')
        .replace(/~/g, '%7E')
        .replace(/%20/g, '_')
        .replace(/%3A/g, ':')
        .replace(/%2F/g, '/');
}

module.exports = {
    apiQuery,
    encode,
    getJSON
};
