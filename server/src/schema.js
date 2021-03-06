/* eslint-disable no-underscore-dangle */
const { getSnap } = require('./snap');
const { connect } = require('../../js/database');
const { getAPI } = require('../../js/api');
const { getCurrentDate, fmtDate } = require('../../js/helpers');
const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLList,
  GraphQLSchema,
} = require('graphql');

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

const CandleType = new GraphQLObjectType({
  name: 'Candle',
  fields: () => ({
    o: { type: GraphQLFloat },
    c: { type: GraphQLFloat },
    h: { type: GraphQLFloat },
    l: { type: GraphQLFloat },
    v: { type: GraphQLFloat },
    date: { type: GraphQLString },
  }),
});

const SnapType = new GraphQLObjectType({
  name: 'Snapshot',
  fields: () => ({
    symbol: { type: new GraphQLNonNull(GraphQLString) },
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
          date: { type: new GraphQLNonNull(GraphQLString) },
          status: { type: new GraphQLNonNull(GraphQLString) },
          preMarketPrice: { type: GraphQLFloat },
          regularMarketDayHigh: { type: GraphQLFloat },
          regularMarketDayLow: { type: GraphQLFloat },
          regularMarketOpen: { type: GraphQLFloat },
          regularMarketPrice: { type: GraphQLFloat },
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
          signalPrice: { type: GraphQLFloat },
          buyPrice: { type: GraphQLFloat },
          takeProfit: { type: GraphQLFloat },
          stopLoss: { type: GraphQLFloat },
          decisionType: { type: GraphQLString },
        }),
      }),
    },
    candles: {
      type: new GraphQLList(CandleType),
      description: 'List of candles from Tinkoff API',
      resolve: async ({ candles }) => candles.map(({ time, ...other }) => ({
        ...other,
        date: fmtDate(time),
      })),
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
          const db = client.db(process.env.DB_NAME_QUOTES);
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
          const db = client.db(process.env.DB_NAME_QUOTES);
          const collection = db.collection(date);

          const result = await getSnap(getAPI(), collection, symbol, date);
          result.current.date = date;

          return result;
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
        symbol: { type: GraphQLString },
        date: { type: GraphQLString },
      },
      resolve: async (parent, args) => {
        const symbol = args.symbol ? args.symbol.toUpperCase() : null;
        const date = args.date || getCurrentDate();

        let client;
        try {
          client = await connect(process.env.DB_URL);
          const db = client.db(process.env.DB_NAME_QUOTES);
          const collection = db.collection(date);

          const query = [{ $group: { _id: '$price.symbol' } }];
          let docs = await collection.aggregate(query).toArray();
          if (symbol) {
            docs = docs.filter(doc => doc._id === symbol);
          }

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
          const db = client.db(process.env.DB_NAME_QUOTES);
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
