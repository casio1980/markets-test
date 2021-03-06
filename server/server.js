/* eslint-disable no-underscore-dangle */
require("dotenv").config();
const moment = require("moment");
const express = require("express");
const graphqlHTTP = require("express-graphql");
const log4js = require("log4js");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip");
const schema = require("./src/schema");
const { getSnap } = require("./src/snap");
const { getAPI } = require("../js/api");
const { connect } = require("../js/database");
const { getCurrentDate, getNextDate } = require("../js/helpers");
const { DATE_FORMAT } = require("../js/constants");

log4js.configure({
  appenders: {
    console: { type: "console" },
    file: { type: "file", filename: "server.log" },
  },
  categories: {
    server: { appenders: ["file"], level: "debug" },
    default: { appenders: ["console", "file"], level: "debug" },
  },
});

const logger = log4js.getLogger(process.env.LOG_CATEGORY || "default");
const server = express();
const port = process.env.PORT;
const api = getAPI();

server.use(log4js.connectLogger(logger, { level: "auto" }));
server.use(cors());
server.use(bodyParser.json());
server.use(requestIp.mw());

server.use(
  "/query",
  graphqlHTTP({
    schema,
    graphiql: true, // TODO close me
  })
);

server.get("/symbols", async (req, res, next) => {
  let client;
  try {
    client = await connect(process.env.DB_URL);
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection(getCurrentDate());

    const query = [{ $group: { _id: "$price.symbol" } }];
    const docs = await collection.aggregate(query).toArray();
    res.json(docs);
  } catch (err) {
    next(err);
  } finally {
    if (client) client.close();
  }
});

server.get("/snap/", async (req, res, next) => {
  let client;
  try {
    const { date } = req.query;
    const collectionName = date || getCurrentDate();

    client = await connect(process.env.DB_URL);
    const db = client.db(process.env.DB_NAME);

    const collections = await db.collections();
    if (!collections.map((c) => c.s.name).includes(collectionName)) {
      res.status(404).send("Unknown collection");
      return;
    }

    const collection = db.collection(collectionName);
    const querySymbols = [{ $group: { _id: "$price.symbol" } }];
    const symbols = await collection.aggregate(querySymbols).toArray();

    const result = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const symbol of symbols) {
      const id = symbol._id;
      // eslint-disable-next-line no-await-in-loop
      result[id] = await getSnap(api, collection, id);
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

server.get("/snap/:symbol", async (req, res, next) => {
  let client;
  try {
    const { symbol } = req.params;
    const symbolName = symbol.toUpperCase();
    const { date } = req.query;
    const collectionName = date || getCurrentDate();

    client = await connect(process.env.DB_URL);
    const db = client.db(process.env.DB_NAME);

    const collections = await db.collections();
    if (!collections.map((c) => c.s.name).includes(collectionName)) {
      res.status(404).send("Unknown collection");
      return;
    }

    const collection = db.collection(collectionName);
    const queryHasSymbol = { "price.symbol": symbolName };
    const hasSymbol = await collection.findOne(queryHasSymbol);
    if (!hasSymbol) {
      res.status(404).send("Unknown symbol");
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

server.get("/history/:ticker", async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const { figi } = await api.searchOne({ ticker });

    const date = moment("2020-05-19");
    const from = `${date.format(DATE_FORMAT)}T00:00:00Z`;
    const to = `${getNextDate(from)}T00:00:00Z`;

    const candles = await api.candlesGet({
      figi,
      interval: "1min",
      from,
      to,
    });

    const fs = require("fs");
    fs.writeFile(
      `../data/twtr1m/twtr-w${date.week()}-${date.format("MM-DD")}.json`,
      JSON.stringify(candles),
      "utf8",
      () => {}
    );

    res.json(candles);
  } catch (err) {
    next(err);
  } finally {
    // if (client) client.close();
  }
});

server.post("/placeOrder", async (req, res, next) => {
  if (!req.clientIp.includes(process.env.IP_FILTER)) {
    res.status(403).send("Forbidden");
    return;
  }

  try {
    const { ticker, operation, type, lots, price } = req.body;
    const { figi } = await api.searchOne({ ticker });

    // orderId: "c541fda4-9ecb-48be-bcd3-544bf9c18aea"
    // operation: "Buy"
    // status: "Fill"
    // requestedLots: 1
    // executedLots: 1
    let order;

    if (type === "limit") {
      order = await api.limitOrder({
        operation,
        figi,
        lots,
        price,
      });
    } else if (type === "market") {
      order = await api.marketOrder({
        operation,
        figi,
        lots,
      });
    } else {
      order = { err: "Unknown order type." };
    }

    res.json(order);
  } catch (err) {
    next(err);
  } finally {
    // if (client) client.close();
  }
});

// eslint-disable-next-line no-unused-vars
server.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).send(err);
});

// eslint-disable-next-line consistent-return
server.listen(port, (err) => {
  if (err) {
    return logger.fatal(err);
  }
  logger.debug(`Server is listening on port ${port}`);
});
