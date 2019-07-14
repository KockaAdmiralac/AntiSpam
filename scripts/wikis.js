/**
 * wikis.js
 *
 * Crawls WikisApiController in search of all wikis on Fandom.
 */
'use strict';

/**
 * Importing modules.
 */
const fsPromises = require('fs').promises,
      http = require('request-promise-native'),
      progress = require('cli-progress'),
      {batch, idBatch, threads} = require('./config/wikis.json');

/**
 * Constants.
 */
const bar = new progress.Bar({
          barsize: 25,
          clearOnComplete: true,
          format: '[{bar}] {percentage}% ETA: {eta}s',
          stopOnComplete: true,
          stream: process.stdout
      }, progress.Presets.shades_classic);

/**
 * Global variables.
 */
let results = null,
    currentBatch = batch,
    currentThreads = threads;

/**
 * Opens the wiki info results file.
 */
async function openResults() {
    console.info('Opening results.');
    results = await fsPromises.open('wikis.json', 'w+');
    await results.write('{');
}

/**
 * Gets all wiki IDs.
 */
async function getAllIDs() {
    console.info('Obtaining all wiki IDs.');
    let offset = 1,
        ids = [];
    while (offset) {
        const {nextOffset, wikiIds} = await http({
            json: true,
            method: 'GET',
            qs: {
                controller: 'UnifiedSearchIndexing',
                limit: idBatch,
                method: 'getWikis',
                offset
            },
            uri: 'https://community.fandom.com/wikia.php'
        });
        offset = nextOffset;
        ids = ids.concat(wikiIds);
    }
    return ids;
}

/**
 * Gets information about a batch of wikis.
 * @param {Array<Number>} ids Wiki IDs to get information about
 * @returns {Promise} Promise to listen on for response
 */
function getWikiInfo(ids) {
    return http({
        json: true,
        method: 'POST',
        qs: {
            cb: Date.now(),
            ids: ids.join(',')
        },
        uri: 'https://community.fandom.com/api/v1/Wikis/Details'
    });
}

/**
 * Gets information about wikis with specified IDs.
 * @param {Array<Number>} wikiIds IDs of wikis to get info about
 */
async function getInfo(wikiIds) {
    const allWikis = wikiIds.length;
    console.info(
        'Starting fetch of',
        allWikis,
        'wikis, with',
        currentThreads,
        'concurrent HTTP requests and',
        currentBatch,
        'wikis in a batch.'
    );
    bar.start(allWikis, 0);
    const errorIds = [];
    while (wikiIds.length) {
        const promises = [],
              allIds = [];
        for (let i = 0; i < currentThreads; ++i) {
            if (wikiIds.length) {
                const batchIds = wikiIds.splice(0, currentBatch);
                allIds.push(...batchIds);
                promises.push(getWikiInfo(batchIds));
            } else {
                break;
            }
        }
        try {
            const wikis = (await Promise.all(promises))
                .reduce((a, b) => Object.assign(a, b));
            for (const id in wikis) {
                await results.write(`"${id}":${JSON.stringify(wikis[id])},`);
            }
            bar.update(allWikis - wikiIds.length);
        } catch (error) {
            errorIds.push(...allIds);
        }
    }
    bar.stop();
    return errorIds;
}

/**
 * Fetches information about all wikis.
 * @param {Array<Number>} wikiIds IDs of all Fandom wikis
 */
async function getAllInfo(wikiIds) {
    let checkIds = wikiIds;
    while (checkIds.length) {
        checkIds = await getInfo(checkIds);
        if (currentBatch === 1 && currentThreads === 1) {
            break;
        }
        currentBatch = Math.round(currentBatch / 2);
        currentThreads = Math.round(currentThreads / 2);
    }
    if (checkIds.length) {
        const errorFile = await fsPromises.open(
            'results/wikis-errors.json',
            'w+'
        );
        await errorFile.writeFile(JSON.stringify(checkIds, null, 4));
        await errorFile.close();
        console.info(
            'Errors have occurred while fetching wikis,',
            'see the error log for wikis that failed to fetch.'
        );
    }
}

/**
 * Closes the results file.
 */
async function closeResults() {
    await results.write('"no":null}');
    await results.close();
    console.info('Finished.');
}

// Start.
openResults()
    .then(getAllIDs)
    .then(getAllInfo)
    .then(closeResults)
    .catch(error => console.error(
        'An error occurred:', error
    ));
