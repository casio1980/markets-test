/* eslint-disable no-underscore-dangle */
const { connect } = require('../../js/database');
const { getCurrentDate } = require('../../js/helpers');

const {
  GraphQLObjectType,
  GraphQLString,
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

const SymbolType = new GraphQLObjectType({
  name: 'Symbol',
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLString) },
    date: { type: GraphQLString },
    quotes: {
      type: new GraphQLList(QuoteType),
      description: 'List of all quotes for the symbol and date',
      resolve: async (parent) => {
        const { date, _id: symbol } = parent;

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
            _id: doc._id,
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
