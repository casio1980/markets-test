/* eslint-disable func-names */
/* eslint-disable no-console */
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

const logger = log4js.getLogger('server');

const symbols = process.env.SYMBOLS.replace(/ /g, '').split(','); // ['TSLA', 'AMZN', 'AAPL']
const modules = ['price'];

(async function () {
  try {
    logger.debug(`Downloading ${process.env.SYMBOLS}...`);
    const quotes = await requestYahooQuote({ symbols, modules });

    logger.debug('Connecting to DB...');
    const client = await connect(process.env.DB_URL);
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection(getCurrentDate());

    const result = await collection.insertMany(_.values(quotes));
    logger.trace(result);
    client.close();

    // collection.insertMany(_.values(quotes), (err, result) => {
    //   console.log(result);
    //   client.close();
    // });

    // symbols.forEach((symbol) => {
    //   const collection = db.collection(symbol);

    //   collection.insertOne(quotes[symbol], (err, result) => {
    //     logger.debug(result);
    //   });
    // });
  } catch (err) {
    logger.fatal(err);
  }
}());
