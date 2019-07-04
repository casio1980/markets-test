/* eslint-disable no-console */
/* eslint-disable func-names */
require('dotenv').config();
const { connect } = require('./js/database');
const { createStore } = require('redux');
const minimist = require('minimist');
const { get } = require('lodash');
const { bestStrategies } = require('./config');
const { fmtNumber } = require('./js/helpers');

const {
  PREMARKET,
  REGULAR,
  LOW,
} = require('./js/constants');

const {
  buy,
  sell,
} = require('./js/actions');
const { reducer } = require('./js/reducers');

// node index.js TSLA
const { _: symbols } = minimist(process.argv.slice(2));
if (symbols.length !== 1) {
  console.log('ERROR: Symbol should be specified');
  process.exit();
}
const [symbol] = symbols;
console.log(`Processing ${symbol}...`);

(async function () {
  let client;
  try {
    client = await connect(process.env.DB_URL);
    const db = client.db(process.env.DB_NAME);
    const collectionInstances = await db.collections();
    const collections = collectionInstances.map(c => c.s.name).sort();

    const store = createStore(reducer);

    // eslint-disable-next-line no-restricted-syntax
    for (const colName of collections) {
      const collection = db.collection(colName);

      const queryPre = { 'price.symbol': symbol, 'price.marketState': PREMARKET };
      // eslint-disable-next-line no-await-in-loop
      const [docPre] = await collection.find(queryPre).sort({ $natural: -1 }).limit(1).toArray();
      const { price: pricePre } = docPre || {};

      const queryRegular = { 'price.symbol': symbol, 'price.marketState': REGULAR };
      // eslint-disable-next-line no-await-in-loop
      const docsRegular = await collection.find(queryRegular).sort({ $natural: 1 }).toArray();

      const prevMarketDayHigh = get(pricePre, 'regularMarketDayHigh');
      const prevMarketDayLow = get(pricePre, 'regularMarketDayLow');

      const [strategy] = bestStrategies[symbol];
      const signalPrice = strategy.prevPriceBuy === LOW
        ? prevMarketDayLow
        : prevMarketDayHigh;

      let takeProfit;
      let stopLoss;
      let tradeType;
      let regularMarketPrice;
      docsRegular.forEach(({ price }) => {
        const {
          regularMarketOpen, regularMarketDayHigh, regularMarketDayLow,
        } = price;
        // const { position } = store.getState();
        // eslint-disable-next-line prefer-destructuring
        regularMarketPrice = price.regularMarketPrice;
        // console.log(price);

        if (!tradeType && regularMarketOpen > signalPrice) {
          takeProfit = fmtNumber(regularMarketOpen * (1 + strategy.profit));
          stopLoss = fmtNumber(regularMarketOpen * (1 - strategy.stopLoss));

          store.dispatch(buy(regularMarketPrice));
          // console.log('Buy @', regularMarketPrice);
          tradeType = 'OPEN';
        }

        if (tradeType === 'OPEN' && stopLoss > regularMarketDayLow) {
          store.dispatch(sell(stopLoss));
          tradeType = 'LOSS';
          // console.log('Sell @', stopLoss, tradeType);
        }
        if (tradeType === 'OPEN' && takeProfit < regularMarketDayHigh) {
          store.dispatch(sell(takeProfit));
          tradeType = 'PROFIT';
          // console.log('Sell @', takeProfit, tradeType);
        }
      });
      if (tradeType === 'OPEN') {
        store.dispatch(sell(regularMarketPrice));
        tradeType = 'CLOSED';
        // console.log('Sell @', regularMarketPrice, tradeType);
      }

      // console.log(`${colName} > [${prevMarketDayLow}, ${prevMarketDayHigh}] ${signalPrice}`);
      console.log(`${colName} > ${store.getState().money}, ${tradeType}`);
      // console.log();
    }

    console.log('Done', store.getState());
  } catch (err) {
    console.error(err);
  } finally {
    if (client) client.close();
  }
}());
