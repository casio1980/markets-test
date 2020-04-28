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
const { fmtNumber, isRegularMarket, isClosingMarket } = require("./js/helpers");
const { BUY, buy, SELL, sell, SET_HIGH, setHigh } = require("./js/actions");
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
    const { time } = current;
    const { priceBuy, prevPriceBuy } = params;
    return isRegularMarket(time) &&
      !isClosingMarket(time) &&
      current[priceBuy] > previous[prevPriceBuy]
      ? { type: BUY, price: current[priceBuy], name: "BUY" }
      : undefined;
  },

  // function slideStopLossIfPriceGoesUp(state, current, previous, params) {
  //   const { stopLoss } = params;
  //   const { position, price } = state;
  //   return position === LONG && current.c > price * (1 + stopLoss)
  //     ? { type: SET_HIGH, price: price * (1 + stopLoss) }
  //     : undefined;
  // },

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
    const stopLossPrice = fmtNumber(
      Math.max(state.price, state.high) * (1 - stopLoss)
    );
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

  // function sellOnMarketClose(state, current, previous, params) {
  //   return isClosingMarket(current.time)
  //     ? { type: SELL, price: current[CLOSE], name: "CLOSE" }
  //     : undefined;
  // },

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
      } else if (decision.type === SET_HIGH && position === LONG) {
        store.dispatch(setHigh(decision.price));
      }
    }
  });
};

const results = [];
// const strategy = [
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.0382, stopLoss: 0.0136 },
// ];
// const strategy = [
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.06, stopLoss: 0.009 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.06, stopLoss: 0.01 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.06, stopLoss: 0.011 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.06, stopLoss: 0.012 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.06, stopLoss: 0.013 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.06, stopLoss: 0.014 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.06, stopLoss: 0.015 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.06, stopLoss: 0.016 },
// ];
// const strategy = [
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.08, stopLoss: 0.003 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.09, stopLoss: 0.003 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.1, stopLoss: 0.003 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.04, stopLoss: 0.003 },
//   { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.05, stopLoss: 0.003 },
// ];

const strategy = [
  // { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.07, stopLoss: 0.009 }, // 2.42% w10-w17, 19.96% w14-w17
  // { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.035, stopLoss: 0.013 }, // 1m <- 29.62% w14-w17 <- w18 26.06%
  // { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.038, stopLoss: 0.014 }, //  -> 1311.98 | 31.2%
  { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.0382, stopLoss: 0.0136 }, // -> 1328.91 | 32.89%
  // { priceBuy: OPEN, prevPriceBuy: CLOSE, profit: 0.06, stopLoss: 0.011 }, // 5m - 23.07% 1m - 26.19%
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
