/* eslint-disable no-console */
require('dotenv').config();
const express = require('express');
const log4js = require('log4js');
const _ = require('lodash');
const { connect } = require('../js/database');
const { getCurrentDate } = require('../js/helpers');
const { PREMARKET, REGULAR } = require('../js/constants');

log4js.configure({
  appenders: {
    console: { type: 'console' },
    file: { type: 'file', filename: 'server.log' },
  },
  categories: {
    server: { appenders: ['file'], level: 'debug' },
    default: { appenders: ['console', 'file'], level: 'debug' },
  },
});

const logger = log4js.getLogger(process.env.LOG_CATEGORY || 'default');
const server = express();
const port = process.env.PORT;

server.use(log4js.connectLogger(logger, { level: 'auto' }));

server.get('/', async (req, res, next) => {
  let client;
  try {
    client = await connect(process.env.DB_URL);
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection(getCurrentDate());

    const query = { 'price.symbol': 'TSLA' };
    const docs = await collection.find(query).toArray();
    const mappedDocs = docs.map((doc) => {
      const { price } = doc;

      // marketState: "REGULAR"
      return _.pick(price, [
        'currency',
        'marketState',
        'preMarketChange',
        'preMarketChangePercent',
        'preMarketPrice',
        'preMarketSource',
        'preMarketTime',
        'regularMarketChange',
        'regularMarketChangePercent',
        'regularMarketDayHigh',
        'regularMarketDayLow',
        'regularMarketOpen',
        'regularMarketPreviousClose',
        'regularMarketPrice',
        'regularMarketSource',
        'regularMarketTime',
        'regularMarketVolume',
        'symbol',
      ]);
    });

    res.json(mappedDocs);
  } catch (err) {
    next(err);
  } finally {
    if (client) client.close();
  }
});

server.get('/symbols', async (req, res, next) => {
  let client;
  try {
    client = await connect(process.env.DB_URL);
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection(getCurrentDate());

    const query = [{ $group: { _id: '$price.symbol' } }];
    const docs = await collection.aggregate(query).toArray();
    res.json(docs);
  } catch (err) {
    next(err);
  } finally {
    if (client) client.close();
  }
});

server.get('/snap/', async (req, res, next) => {
  let client;
  try {
    client = await connect(process.env.DB_URL);
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection(getCurrentDate());

    const queryPre = [
      { $match: { 'price.marketState': PREMARKET } },
      { $group: { _id: '$price.symbol' } },
    ];
    const docs = await collection.aggregate(queryPre).toArray();

    // if (_.isEmpty(pricePre) && _.isEmpty(priceRegular)) {
    //   res.status(404).send('Unknown symbol'); // TODO
    // } else {
    //   res.json({
    //     prev: _.pick(pricePre, [
    //       'regularMarketDayHigh',
    //       'regularMarketDayLow',
    //       'regularMarketOpen',
    //       'regularMarketPrice',
    //     ]),
    //     current: _.pick(priceRegular, [
    //       'regularMarketDayHigh',
    //       'regularMarketDayLow',
    //       'regularMarketOpen',
    //       'regularMarketPrice',
    //     ]),
    //   });
    // }
  } catch (err) {
    next(err);
  } finally {
    if (client) client.close();
  }
});

server.get('/snap/:symbol', async (req, res, next) => {
  let client;
  try {
    const { symbol } = req.params;
    const symbolName = symbol.toUpperCase();

    client = await connect(process.env.DB_URL);
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection(getCurrentDate());

    const queryPre = { 'price.symbol': symbolName, 'price.marketState': PREMARKET };
    const { price: pricePre } = await collection.findOne(queryPre) || {};
    const queryRegular = { 'price.symbol': symbolName, 'price.marketState': REGULAR };
    const { price: priceRegular } = await collection.findOne(queryRegular) || {};

    if (_.isEmpty(pricePre) && _.isEmpty(priceRegular)) {
      res.status(404).send('Unknown symbol'); // TODO
    } else {
      res.json({
        prev: _.pick(pricePre, [
          'regularMarketDayHigh',
          'regularMarketDayLow',
          'regularMarketOpen',
          'regularMarketPrice',
        ]),
        current: _.pick(priceRegular, [
          'regularMarketDayHigh',
          'regularMarketDayLow',
          'regularMarketOpen',
          'regularMarketPrice',
        ]),
      });
    }
  } catch (err) {
    next(err);
  } finally {
    if (client) client.close();
  }
});

// eslint-disable-next-line no-unused-vars
server.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).send('Internal server error');
});

// eslint-disable-next-line consistent-return
server.listen(port, (err) => {
  if (err) {
    return logger.fatal(err);
  }
  logger.debug(`Server is listening on port ${port}`);
});
