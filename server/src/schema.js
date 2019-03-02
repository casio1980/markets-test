/* eslint-disable no-underscore-dangle */
const { get, pick } = require('lodash');
const { connect } = require('../../js/database');
const { getCurrentDate, fmtNumber } = require('../../js/helpers');
const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLList,
  GraphQLSchema,
} = require('graphql');
const {
  CLOSED,
  PREMARKET,
  REGULAR,
  LOW,
} = require('../../js/constants');
const { bestStrategies } = require('../../config');

const QuoteType = new GraphQLObjectType({
  name: 'Quote',
  fields: () => ({
    currency: { type: new GraphQLNonNull(GraphQLString) },
    marketState: { type: new GraphQLNonNull(GraphQLString) },
    preMarketChange: { type: GraphQLString },
    preMarketChangePercent: { type: GraphQLString },
    preMarketPrice: { type: GraphQLString },
    preMarketSource: { type: new GraphQLNonNull(GraphQLString) },
    preMarketTime: { type: GraphQLString },
    regularMarketChange: { type: new GraphQLNonNull(GraphQLString) },
    regularMarketChangePercent: { type: new GraphQLNonNull(GraphQLString) },
    regularMarketDayHigh: { type: new GraphQLNonNull(GraphQLString) },
    regularMarketDayLow: { type: new GraphQLNonNull(GraphQLString) },
    regularMarketOpen: { type: new GraphQLNonNull(GraphQLString) },
    regularMarketPreviousClose: { type: new GraphQLNonNull(GraphQLString) },
    regularMarketPrice: { type: new GraphQLNonNull(GraphQLString) },
    regularMarketSource: { type: new GraphQLNonNull(GraphQLString) },
    regularMarketTime: { type: new GraphQLNonNull(GraphQLString) },
    regularMarketVolume: { type: new GraphQLNonNull(GraphQLString) },
    symbol: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const SnapType = new GraphQLObjectType({
  name: 'Snapshot',
  fields: () => ({
    status: { type: new GraphQLNonNull(GraphQLString) },
    prev: {
      type: new GraphQLObjectType({
        name: 'Previous',
        fields: () => ({
          regularMarketDayHigh: { type: new GraphQLNonNull(GraphQLFloat) },
          regularMarketDayLow: { type: new GraphQLNonNull(GraphQLFloat) },
          regularMarketOpen: { type: new GraphQLNonNull(GraphQLFloat) },
          regularMarketPrice: { type: new GraphQLNonNull(GraphQLFloat) },
        }),
      }),
    },
    current: {
      type: new GraphQLObjectType({
        name: 'Current',
        fields: () => ({
          preMarketPrice: { type: new GraphQLNonNull(GraphQLFloat) },
          regularMarketDayHigh: { type: new GraphQLNonNull(GraphQLFloat) },
          regularMarketDayLow: { type: new GraphQLNonNull(GraphQLFloat) },
          regularMarketOpen: { type: new GraphQLNonNull(GraphQLFloat) },
          regularMarketPrice: { type: new GraphQLNonNull(GraphQLFloat) },
        }),
      }),
    },
    strategy: {
      type: new GraphQLObjectType({
        name: 'Strategy',
        fields: () => ({
          priceBuy: { type: new GraphQLNonNull(GraphQLString) },
          prevPriceBuy: { type: new GraphQLNonNull(GraphQLString) },
          profit: { type: new GraphQLNonNull(GraphQLFloat) },
          stopLoss: { type: new GraphQLNonNull(GraphQLFloat) },
          yield: { type: new GraphQLNonNull(GraphQLString) },
        }),
      }),
    },
    signalBuy: { type: new GraphQLNonNull(GraphQLBoolean) },
    decision: {
      type: new GraphQLObjectType({
        name: 'Decision',
        fields: () => ({
          signalPrice: { type: new GraphQLNonNull(GraphQLFloat) },
          buyPrice: { type: GraphQLFloat },
          takeProfit: { type: GraphQLFloat },
          stopLoss: { type: GraphQLFloat },
          decisionType: { type: GraphQLString },
        }),
      }),
    },
  }),
});

const SymbolType = new GraphQLObjectType({
  name: 'Symbol',
  fields: () => ({
    symbol: { type: new GraphQLNonNull(GraphQLString) },
    date: { type: GraphQLString },

    quotes: {
      type: new GraphQLList(QuoteType),
      description: 'List of all quotes for the symbol and date',
      resolve: async (parent) => {
        const { date, symbol } = parent;

        let client;
        try {
          client = await connect(process.env.DB_URL);
          const db = client.db(process.env.DB_NAME);
          const collection = db.collection(date);

          const query = { 'price.symbol': symbol };
          const docs = await collection.find(query).toArray();

          return docs.map(doc => doc.price);
        } catch (err) {
          return err; // TODO
        } finally {
          if (client) client.close();
        }
      },
    },

    snap: {
      type: SnapType,
      description: 'Snapshot for the symbol and date',
      resolve: async (parent) => {
        const { date, symbol } = parent;

        let client;
        try {
          client = await connect(process.env.DB_URL);
          const db = client.db(process.env.DB_NAME);
          const collection = db.collection(date);

          const queryClosed = { 'price.symbol': symbol, 'price.marketState': CLOSED };
          const [docClosed] =
            await collection.find(queryClosed).sort({ $natural: -1 }).limit(1).toArray();
          const { price: priceClosed } = docClosed || {};

          const queryPre = { 'price.symbol': symbol, 'price.marketState': PREMARKET };
          const [docPre] =
            await collection.find(queryPre).sort({ $natural: -1 }).limit(1).toArray();
          const { price: pricePre } = docPre || {};

          const queryRegular = { 'price.symbol': symbol, 'price.marketState': REGULAR };
          const [docRegular] =
            await collection.find(queryRegular).sort({ $natural: -1 }).limit(1).toArray();
          const { price: priceRegular } = docRegular || {};

          const status = get(priceRegular, 'marketState') || get(pricePre, 'marketState') || get(priceClosed, 'marketState');
          const preMarketPrice = get(pricePre, 'preMarketPrice');
          const prevMarketDayHigh = get(pricePre, 'regularMarketDayHigh');
          const prevMarketDayLow = get(pricePre, 'regularMarketDayLow');
          const regularMarketOpen = get(priceRegular, 'regularMarketOpen');

          // TODO compute signal
          const [strategy] = bestStrategies[symbol];
          const signalPrice = strategy.prevPriceBuy === LOW
            ? prevMarketDayLow
            : prevMarketDayHigh;
          // const prevPriceBuy = get(pricePre, 'regularMarketDayHigh'); // high
          // const priceBuy = get(priceRegular, 'regularMarketOpen'); // open

          let signalBuy;
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
        } catch (err) {
          return err; // TODO
        } finally {
          if (client) client.close();
        }
      },
    },
  }),
});

const QuotesQueryRootType = new GraphQLObjectType({
  name: 'QuotesQuerySchema',
  fields: () => ({
    symbols: {
      type: new GraphQLList(SymbolType),
      description: 'List of all symbols',
      args: {
        date: { type: GraphQLString },
      },
      resolve: async (parent, args) => {
        const date = args.date || getCurrentDate();

        let client;
        try {
          client = await connect(process.env.DB_URL);
          const db = client.db(process.env.DB_NAME);
          const collection = db.collection(date);

          const query = [{ $group: { _id: '$price.symbol' } }];
          const docs = await collection.aggregate(query).toArray();

          return docs.map(doc => ({
            date,
            symbol: doc._id,
          }));
        } catch (err) {
          return err; // TODO
        } finally {
          if (client) client.close();
        }
      },
    },

    quotes: {
      type: new GraphQLList(QuoteType),
      description: 'List of all quotes',
      args: {
        symbol: { type: new GraphQLNonNull(GraphQLString) },
        date: { type: GraphQLString },
      },
      resolve: async (parent, args) => {
        const symbol = args.symbol.toUpperCase();
        const date = args.date || getCurrentDate();

        let client;
        try {
          client = await connect(process.env.DB_URL);
          const db = client.db(process.env.DB_NAME);
          const collection = db.collection(date);

          const query = { 'price.symbol': symbol };
          const docs = await collection.find(query).toArray();

          return docs.map(doc => doc.price);
        } catch (err) {
          return err; // TODO
        } finally {
          if (client) client.close();
        }
      },
    },
  }),
});

const QuotesQuerySchema = new GraphQLSchema({
  query: QuotesQueryRootType,
});

module.exports = QuotesQuerySchema;
