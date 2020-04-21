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
const { fmtNumber, isRegularMarket, applySMA } = require("./js/helpers");
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
    const { time } = current
    const { priceBuy, prevPriceBuy } = params;
    return isRegularMarket(time) && current[priceBuy] > previous[prevPriceBuy]
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
        if (strategy.length === 1)
          console.log(`${current.time}: ${decision.name} @ ${decision.price}`);
      } else if (decision.type === SELL && position === LONG) {
        store.dispatch(sell(decision.price));
        if (strategy.length === 1)
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
//   { priceBuy: OPEN, prevPriceBuy: OPEN, profit: 0.07, stopLoss: 0.012 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.07, stopLoss: 0.012 },
//   { priceBuy: OPEN, prevPriceBuy: LOW, profit: 0.07, stopLoss: 0.012 },
//   { priceBuy: OPEN, prevPriceBuy: HIGH, profit: 0.07, stopLoss: 0.012 },
// ];
// const strategy = [
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.1, stopLoss: 0.008 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.1, stopLoss: 0.009 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.1, stopLoss: 0.01 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.1, stopLoss: 0.011 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.1, stopLoss: 0.012 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.1, stopLoss: 0.013 }, // 9.15%
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.1, stopLoss: 0.014 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.1, stopLoss: 0.015 }, // - best
// ];
// const strategy = [
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.05, stopLoss: 0.013 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.06, stopLoss: 0.013 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.07, stopLoss: 0.013 }, // 15.4%
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.08, stopLoss: 0.013 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.09, stopLoss: 0.013 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.1, stopLoss: 0.013 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.11, stopLoss: 0.013 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.12, stopLoss: 0.013 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.13, stopLoss: 0.013 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.14, stopLoss: 0.013 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.15, stopLoss: 0.013 },
// ];
const strategy = [
  // { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.07, stopLoss: 0.01 },  // 15.44%
  // { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.07, stopLoss: 0.011 }, // 16.82%
  { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.07, stopLoss: 0.012 }, // 17.43% <- best
  // { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.07, stopLoss: 0.013 }, // 15.4%
  // { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.07, stopLoss: 0.014 }, // 16.73%
  // { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.07, stopLoss: 0.015 },
  // { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.07, stopLoss: 0.016 },
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
