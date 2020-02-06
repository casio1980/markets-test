/* eslint-disable no-underscore-dangle */
require('dotenv').config();
const express = require('express');
const graphqlHTTP = require('express-graphql');
const OpenAPI = require('@tinkoff/invest-openapi-js-sdk');
const log4js = require('log4js');
const cors = require('cors');
const schema = require('./src/schema');
const { getSnap } = require('./src/snap');
const { connect } = require('../js/database');
const { getCurrentDate } = require('../js/helpers');

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
const isProduction = process.env.PRODUCTION === 'true';

server.use(log4js.connectLogger(logger, { level: 'auto' }));
server.use(cors());

let apiURL;
let secretToken;
if (isProduction) {
  // PRODUCTION mode
  logger.trace('PRODUCTION mode');

  apiURL = 'https://api-invest.tinkoff.ru/openapi';
  secretToken = process.env.TOKEN;
} else {
  // SANDBOX mode
  apiURL = 'https://api-invest.tinkoff.ru/openapi/sandbox/';
  secretToken = process.env.SANDBOX_TOKEN;
}

const socketURL = 'wss://api-invest.tinkoff.ru/openapi/md/v1/md-openapi/ws';
const api = new OpenAPI({ apiURL, secretToken, socketURL });

server.use('/query', graphqlHTTP({
  schema,
  graphiql: true, // TODO close me
}));

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
    const { date } = req.query;
    const collectionName = date || getCurrentDate();

    client = await connect(process.env.DB_URL);
    const db = client.db(process.env.DB_NAME);

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
    const db = client.db(process.env.DB_NAME);

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

    const result = await getSnap(api, collection, symbolName);
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
