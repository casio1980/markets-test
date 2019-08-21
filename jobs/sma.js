/* eslint-disable func-names */
require('dotenv').config();
const log4js = require('log4js');
const _ = require('lodash');
const moment = require('moment');
const { requestYahooHistorical, getCurrentDate } = require('../js/helpers');
const { connect } = require('../js/database');
const {
  CLOSE,
  DATE_FORMAT,
  DATE,
  HIGH,
  LOW,
  MEDIAN,
  OPEN,
  SMA_PERIODS,
} = require('../js/constants');
const { SMA } = require('../js/functions');
const { fmtNumber } = require('../js/helpers');

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

// TODO: DRY
function sortByDate(arr) {
  arr.sort((a, b) => (new Date(a.date) - new Date(b.date)));
}

function formatData(arr) {
  arr.forEach((elem) => {
    /* eslint-disable no-param-reassign */
    elem[DATE] = moment(elem[DATE]).format(DATE_FORMAT);

    elem[CLOSE] = fmtNumber(elem[CLOSE]);
    elem[HIGH] = fmtNumber(elem[HIGH]);
    elem[LOW] = fmtNumber(elem[LOW]);
    elem[OPEN] = fmtNumber(elem[OPEN]);
    elem[MEDIAN] = fmtNumber((elem[LOW] + elem[HIGH]) / 2);
    /* eslint-enable no-param-reassign */
  });
}

function applySMA(arr) {
  SMA_PERIODS.forEach((period) => {
    const attr = `sma_${period}`;
    arr.forEach((elem, idx) => {
      // eslint-disable-next-line no-param-reassign
      elem[attr] = SMA(arr, idx, period);
    });
  });
}

(async function () {
  let client;
  try {
    const symbols = process.env.SYMBOLS.replace(/ /g, '').split(','); // ['TSLA', 'AMZN', 'AAPL']
    const options = {
      symbols,
      from: '2019-01-01',
      to: getCurrentDate(),
    };

    logger.trace(`Downloading ${process.env.SYMBOLS}...`);
    const historical = await requestYahooHistorical(options);
    logger.debug(_.keys(historical));

    logger.trace('Connecting to DB...');
    client = await connect(process.env.DB_URL);
    const db = client.db('historical');

    logger.trace('Dropping historical database...');
    await db.dropDatabase();

    logger.trace('Processing...');
    const collections = {};
    symbols.forEach((symbol) => {
      const symbolData = historical[symbol];
      sortByDate(symbolData);
      formatData(symbolData);
      applySMA(symbolData);

      symbolData.forEach((dateData) => {
        const date = dateData[DATE];
        const collection = collections[date] || [];
        collection.push({ symbol, ...dateData });
        collections[date] = collection;
      });
    });

    logger.trace('Saving...');
    // eslint-disable-next-line no-restricted-syntax
    for (const collectionName of _.keys(collections)) {
      const collection = db.collection(collectionName);
      // eslint-disable-next-line no-await-in-loop
      const result = await collection.insertMany(collections[collectionName]);
      logger.trace(result.result);
    }
  } catch (err) {
    logger.fatal(err);
  } finally {
    if (client) client.close();
  }
}());
