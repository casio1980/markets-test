/* eslint-disable no-console */
const { createStore } = require('redux');
const minimist = require('minimist');

const config = require('./config');
const {
  DATA_FOLDER,
  INITIAL_MONEY,
  CLOSE,
  HIGH,
  LONG,
  LOW,
  MEDIAN,
  OPEN,
} = require('./js/constants');
const { fmtNumber, sequence } = require('./js/helpers');
const {
  BUY,
  buy,
  SELL,
  sell,
} = require('./js/actions');
const { reducer } = require('./js/reducers');

const prices =
  [CLOSE, HIGH, LOW, MEDIAN, OPEN];
const periods =
  [2, 3, 4, 5, 7];
const fractions =
  [0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.035, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.2, 0.3];

// node index.js TSLA --best
const { _: symbols, best } = minimist(process.argv.slice(2));
if (symbols.length !== 1) {
  console.log('Symbol should be specified');
  process.exit();
}
const [symbol] = symbols;
const dataFileName = `${DATA_FOLDER}/${symbol}.json`;

console.log(`Processing ${dataFileName}...`);
// eslint-disable-next-line import/no-dynamic-require
const data = require(dataFileName);

const strategy = best
  ? config.bestStrategies[symbol]
  : sequence([])
    // .addDimension([OPEN], 'priceBuy')
    // .addDimension([LOW], 'prevPriceBuy')
    .addDimension([OPEN], 'priceBuy')
    .addDimension([HIGH], 'prevPriceBuy')
    // .addDimension([CLOSE], 'priceSell')
    // .addDimension(prices, 'prevPriceSell')
    // .addDimension(periods, 'period')
    .addDimension(fractions, 'profit')
    .addDimension(fractions, 'stopLoss')
    .value();

const funcs = [ // TODO BUYs should be on top of SELLs
  // function buyWhenPriceCrossSMA(state, current, previous, params) {
  //   const { priceBuy, period } = params;
  //   const sma = previous[`sma_${period}`];
  //   return current[priceBuy] > sma
  //     ? { type: BUY, price: current[priceBuy] }
  //     : undefined;
  // },

  function buyWhenPriceGoesUp(state, current, previous, params) {
    const { priceBuy, prevPriceBuy } = params;
    return current[priceBuy] > previous[prevPriceBuy]
      ? { type: BUY, price: current[priceBuy] }
      : undefined;
  },

  function sellOnProfit(state, current, previous, params) {
    const { profit } = params;
    const profitablePrice = fmtNumber(state.price * (1 + profit));

    // console.log('>>>', profitablePrice, current[HIGH]);

    return profitablePrice < current[HIGH]
      ? { type: SELL, price: profitablePrice, name: 'PROFIT' }
      : undefined;
  },

  function sellOnStopLoss(state, current, previous, params) {
    const { stopLoss } = params;
    const stopLossPrice = fmtNumber(state.price * (1 - stopLoss));

    // console.log('>>>', stopLossPrice, current[LOW], !!(stopLossPrice > current[LOW]));

    return stopLossPrice > current[LOW]
      ? { type: SELL, price: stopLossPrice, name: 'SL' }
      : undefined;
  },

  // function sellWhenPriceGoesDown(state, current, previous, params) {
  //   const { priceSell, prevPriceSell } = params;
  //   return current[priceSell] < previous[prevPriceSell]
  //     ? { type: SELL, price: current[priceSell], name: 'sellWhenPriceGoesDown' }
  //     : undefined;
  // },
];

// eslint-disable-next-line consistent-return
const decisionFunc = (store, current, previous, params) => {
  if (!current || !previous) return;

  funcs.forEach((func) => {
    const decision = func(store.getState(), current, previous, params);

    if (decision) {
      const { position } = store.getState();
      if (decision.type === BUY && !position) {
        store.dispatch(buy(decision.price));
        if (best) {
          const { price } = store.getState();
          console.log(current.date, `BUY -> ${price}`);
        }
      } else if (decision.type === SELL && position === LONG) {
        store.dispatch(sell(decision.price));
        if (best) {
          const { price, money, percent } = store.getState();
          console.log(current.date, `SELL -> ${price} ${money} | ${fmtNumber(percent)}% // ${decision.name}`);
        }
      }
    }
  });
};

const results = [];
strategy.forEach((item) => {
  const store = createStore(reducer);

  // main loop
  data.forEach((current, idx, arr) =>
    decisionFunc(store, current, arr[idx - 1], item));

  // cleanup
  const { position, price } = store.getState();
  if (position === LONG) {
    store.dispatch(sell(price));
  }

  results.push({ item, money: store.getState().money });
});

// results
results.sort((a, b) => (b.money - a.money));
console.log(results[0].item, '->', `${results[0].money} | ${fmtNumber(((results[0].money - INITIAL_MONEY) / INITIAL_MONEY) * 100)}%`);
if (!best) {
  console.log(results[1].item, '->', results[1].money);
  console.log(results[2].item, '->', results[2].money);
  console.log(results[3].item, '->', results[3].money);
  console.log(results[4].item, '->', results[4].money);
}
