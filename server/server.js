/* eslint-disable no-underscore-dangle */
require('dotenv').config();
const express = require('express');
const graphqlHTTP = require('express-graphql');
const log4js = require('log4js');
const cors = require('cors');
const { get, pick } = require('lodash');
const schema = require('./src/schema.js');
const { connect } = require('../js/database');
const { getCurrentDate, fmtNumber } = require('../js/helpers');
const {
  CLOSED,
  PREMARKET,
  REGULAR,
  LOW,
} = require('../js/constants');
const { bestStrategies } = require('../config');

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
server.use(cors());

server.use('/query', graphqlHTTP({
  schema,
  graphiql: true, // TODO close me
}));

server.get('/symbols', async (req, res, next) => {
  let client;
  try {
    client = await connect(process.env.DB_URL);
    const db = client.db(process.env.DB_NAME_QUOTES);
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

const getSnap = async (collection, symbolName) => {
  const queryClosed = { 'price.symbol': symbolName, 'price.marketState': CLOSED };
  const [docClosed] =
    await collection.find(queryClosed).sort({ $natural: -1 }).limit(1).toArray();
  const { price: priceClosed } = docClosed || {};

  const queryPre = { 'price.symbol': symbolName, 'price.marketState': PREMARKET };
  const [docPre] =
    await collection.find(queryPre).sort({ $natural: -1 }).limit(1).toArray();
  const { price: pricePre } = docPre || {};

  const queryRegular = { 'price.symbol': symbolName, 'price.marketState': REGULAR };
  const [docRegular] =
    await collection.find(queryRegular).sort({ $natural: -1 }).limit(1).toArray();
  const { price: priceRegular } = docRegular || {};

  const status = get(priceRegular, 'marketState') || get(pricePre, 'marketState') || get(priceClosed, 'marketState');
  const preMarketPrice = get(pricePre, 'preMarketPrice');
  const prevMarketDayHigh = get(pricePre, 'regularMarketDayHigh');
  const prevMarketDayLow = get(pricePre, 'regularMarketDayLow');
  const regularMarketOpen = get(priceRegular, 'regularMarketOpen');

  // TODO compute signal
  const [strategy] = bestStrategies[symbolName];
  const signalPrice = strategy.prevPriceBuy === LOW
    ? prevMarketDayLow
    : prevMarketDayHigh;
  // const prevPriceBuy = get(pricePre, 'regularMarketDayHigh'); // high
  // const priceBuy = get(priceRegular, 'regularMarketOpen'); // open

  let signalBuy = false;
  if (status === PREMARKET) {
    signalBuy = preMarketPrice > signalPrice;
  } else if (status === REGULAR) {
    signalBuy = regularMarketOpen > signalPrice;
  }

  let buyPrice;
  let takeProfit;
  let stopLoss;
  if (signalBuy) {
    buyPrice = regularMarketOpen || preMarketPrice;
    takeProfit = fmtNumber(buyPrice * (1 + strategy.profit));
    stopLoss = fmtNumber(buyPrice * (1 - strategy.stopLoss));
  }

  let decisionType;
  if (takeProfit < get(priceRegular, 'regularMarketDayHigh')) {
    if (stopLoss > get(priceRegular, 'regularMarketDayLow')) {
      decisionType = 'BOTH';
    } else {
      decisionType = 'PROFIT';
    }
  } else if (stopLoss > get(priceRegular, 'regularMarketDayLow')) {
    decisionType = 'LOSS';
  }

  return {
    status,
    prev: pick(pricePre || priceClosed, [
      'regularMarketDayHigh',
      'regularMarketDayLow',
      'regularMarketOpen',
      'regularMarketPrice',
    ]),
    current: pick(priceRegular || pricePre, [
      'preMarketPrice',
      'regularMarketDayHigh',
      'regularMarketDayLow',
      'regularMarketOpen',
      'regularMarketPrice',
    ]),
    strategy,
    signalBuy,
    decision: {
      // preMarketPrice,
      // prevMarketDayHigh,
      signalPrice,
      buyPrice,
      takeProfit,
      stopLoss,
      decisionType,
      // isProfit: takeProfit < get(priceRegular, 'regularMarketDayHigh'),
      // isLoss: stopLoss > get(priceRegular, 'regularMarketDayLow'),
    },
  };
};

server.get('/snap/', async (req, res, next) => {
  let client;
  try {
    const { date } = req.query;
    const collectionName = date || getCurrentDate();

    client = await connect(process.env.DB_URL);
    const db = client.db(process.env.DB_NAME_QUOTES);

    const collections = await db.collections();
    if (!collections.map(c => c.s.name).includes(collectionName)) {
      res.status(404).send('Unknown collection');
      return;
    }

    const collection = db.collection(collectionName);
    const querySymbols = [{ $group: { _id: '$price.symbol' } }];
    const symbols = await collection.aggregate(querySymbols).toArray();

    const result = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const symbol of symbols) {
      const id = symbol._id;
      // eslint-disable-next-line no-await-in-loop
      result[id] = await getSnap(collection, id);
    }

    // TODO remove
    result.signals = [];
    symbols.forEach((symbol) => {
      const id = symbol._id;
      if (result[id].signalBuy) {
        result.signals.push(id);
      }
    });

    res.json(result);
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
    const { date } = req.query;
    const collectionName = date || getCurrentDate();

    client = await connect(process.env.DB_URL);
    const db = client.db(process.env.DB_NAME_QUOTES);

    const collections = await db.collections();
    if (!collections.map(c => c.s.name).includes(collectionName)) {
      res.status(404).send('Unknown collection');
      return;
    }

    const collection = db.collection(collectionName);
    const queryHasSymbol = { 'price.symbol': symbolName };
    const hasSymbol = await collection.findOne(queryHasSymbol);
    if (!hasSymbol) {
      res.status(404).send('Unknown symbol');
      return;
    }

    const result = await getSnap(collection, symbolName);
    res.json(result);
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
