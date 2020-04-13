/* eslint-disable no-console */
const { createStore } = require("redux");
const minimist = require("minimist");

const {
  DATA_FOLDER,
  INITIAL_MONEY,
  CLOSE,
  HIGH,
  LONG,
  LOW,
  MEDIAN,
  OPEN,
} = require("./js/constants");
const { fmtNumber, applySMA } = require("./js/helpers");
const { BUY, buy, SELL, sell } = require("./js/actions");
const { reducer } = require("./js/reducers");

// node findStrategy.js TWTR
const { _: symbols, best } = minimist(process.argv.slice(2));
if (symbols.length !== 1) {
  console.log("ERROR: Symbol should be specified");
  process.exit();
}
const [symbol] = symbols;
const dataFiles = require(`${DATA_FOLDER}/index.js`)[symbol.toLowerCase()];

const data = dataFiles
  .map((fileName) => {
    console.log(`Processing ${fileName}...`);
    const { candles } = require(`${DATA_FOLDER}/${fileName}`);
    return candles;
  })
  .flat();

// applySMA(data);

// {
//   o: 23.85,
//   c: 23.94,
//   h: 23.94,
//   l: 23.85,
//   v: 5,
//   time: '2020-04-06T09:15:00Z',
//   interval: '1min',
//   figi: 'BBG000H6HNW3',
//   sma_2: 23.895,
//   sma_3: 23.88,
//   sma_4: 23.8725,
//   sma_5: 23.888,
//   sma_7: 23.9071,
//   sma_10: 23.92,
//   sma_15: 23.91,
//   sma_20: 23.8895,
//   sma_25: 23.8904,
//   sma_30: 23.889,
//   sma_35: 23.8766,
//   sma_40: 23.8615,
//   sma_45: 23.8611,
//   sma_50: 23.8808,
//   sma_55: 23.8965,
//   sma_60: 23.9023,
//   sma_70: 23.9119,
//   sma_80: 23.9144,
//   sma_90: 23.917,
//   sma_100: 23.9096
// }

const funcs = [
  // TODO BUYs should be on top of SELLs
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
      ? { type: BUY, price: current[priceBuy], name: "BUY" }
      : undefined;
  },

  // function buyWhenPriceAndSMAGoUp(state, current, previous, params) {
  //   const { priceBuy, prevPriceBuy, period } = params;
  //   const priceGoesUp = current[priceBuy] > previous[prevPriceBuy];
  //   const smaGoesUp = current[`sma_${period}`] > previous[`sma_${period}`];

  //   return priceGoesUp && smaGoesUp
  //     ? { type: BUY, price: current[priceBuy] }
  //     : undefined;
  // },

  function sellOnStopLoss(state, current, previous, params) {
    const { stopLoss } = params;
    const stopLossPrice = fmtNumber(state.price * (1 - stopLoss));
    return stopLossPrice > current[LOW]
      ? { type: SELL, price: stopLossPrice, name: "SL" }
      : undefined;
  },

  function sellOnProfit(state, current, previous, params) {
    const { profit } = params;
    const profitablePrice = fmtNumber(state.price * (1 + profit));
    return profitablePrice < current[HIGH]
      ? { type: SELL, price: profitablePrice, name: "PROFIT" }
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
        console.log(`${current.time}: ${decision.name} @ ${decision.price}`);
      } else if (decision.type === SELL && position === LONG) {
        store.dispatch(sell(decision.price));
        console.log(
          `${current.time}: ${decision.name} @ ${decision.price} -> ${
            store.getState().money
          }`
        );
      }
    }
  });
};

const results = [];
// const strategy = [
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.01, stopLoss: 0.005 }, // best
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.01, stopLoss: 0.005 },
//   { priceBuy: OPEN, prevPriceBuy: LOW, profit: 0.01, stopLoss: 0.005 },
//   { priceBuy: OPEN, prevPriceBuy: HIGH, profit: 0.01, stopLoss: 0.005 },
// ];
// const strategy = [
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.005, stopLoss: 0.005 },
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.01, stopLoss: 0.005 },
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.015, stopLoss: 0.005 },
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.02, stopLoss: 0.005 },
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.025, stopLoss: 0.005 }, // best
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.03, stopLoss: 0.005 },
// ];
// const strategy = [
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.025, stopLoss: 0.001 }, // best
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.025, stopLoss: 0.002 },
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.025, stopLoss: 0.003 },
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.025, stopLoss: 0.004 },
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.025, stopLoss: 0.005 },
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.025, stopLoss: 0.006 },
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.025, stopLoss: 0.007 },
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.025, stopLoss: 0.008 },
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.025, stopLoss: 0.009 },
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.025, stopLoss: 0.01 },
// ];

const strategy = [
  { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.025, stopLoss: 0.001 },
];
strategy.forEach((item) => {
  const store = createStore(reducer);

  // main loop
  data.forEach((current, idx, arr) =>
    decisionFunc(store, current, arr[idx - 1], item)
  );

  // closing the last position
  const { position, price } = store.getState();
  if (position === LONG) {
    store.dispatch(sell(price));
  }

  results.push({ item, money: store.getState().money });
});

// results
results.sort((a, b) => b.money - a.money);
const logged = results.slice(0, best ? 1 : 5);
console.log();
logged.forEach((el, i) => {
  console.log(
    `${i + 1}. ${JSON.stringify(el.item)} -> ${el.money} | ${fmtNumber(
      ((el.money - INITIAL_MONEY) / INITIAL_MONEY) * 100
    )}%`
  );
});