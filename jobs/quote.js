/* eslint-disable func-names */
require('dotenv').config();
const log4js = require('log4js');
const _ = require('lodash');
const { requestYahooQuote, getCurrentDate } = require('../js/helpers');
const { connect } = require('../js/database');

log4js.configure({
  appenders: {
    console: { type: 'console' },
    file: { type: 'file', filename: 'quote.log' },
  },
  categories: {
    server: { appenders: ['file'], level: 'trace' },
    default: { appenders: ['console', 'file'], level: 'trace' },
  },
});

const logger = log4js.getLogger(process.env.LOG_CATEGORY || 'default');

(async function () {
  let client;
  try {
    const symbols = process.env.SYMBOLS.replace(/ /g, '').split(','); // ['TSLA', 'AMZN', 'AAPL']
    const modules = ['price'];

    logger.trace(`Downloading ${process.env.SYMBOLS}...`);
    const quotes = await requestYahooQuote({ symbols, modules });
    logger.debug(_.keys(quotes));

    logger.trace('Connecting to DB...');
    client = await connect(process.env.DB_URL);
    const db = client.db(process.env.DB_NAME_QUOTES);
    const collection = db.collection(getCurrentDate());

    const result = await collection.insertMany(_.values(quotes));
    logger.trace(result.result);
  } catch (err) {
    logger.fatal(err);
  } finally {
    if (client) client.close();
  }
}());
