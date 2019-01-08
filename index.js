/* eslint-disable no-console */
const { createStore } = require('redux');

const data = require('./data/TSLA.json');
const {
  LONG, CLOSE, HIGH, LOW, MEDIAN, OPEN,
} = require('./js/constants');
const {
  BUY, SELL, buy, sell,
} = require('./js/actions');
const { reducer } = require('./js/reducers');

const prices = [CLOSE, HIGH, LOW, MEDIAN, OPEN];
const periods = [2, 3, 4, 5, 7];

const pricesAndPeriods = [];
prices.forEach((price) => {
  periods.forEach((period) => {
    pricesAndPeriods.push({ price, period });
  });
});

const funcs = [
  function whenPriceCrossedSMA(s, c, p, opts) {
    const { price, period } = opts;
    const sma = p[`sma_${period}`];
    return p[price] > sma ? BUY : SELL;
  },
];


function decisionFunc(state, current, previous, params) {
  if (!current || !previous) return undefined;
  const { position } = state;
  // const { period } = params;

  const signal = funcs[0](state, current, previous, params);
  if (position === undefined && signal === BUY) {
    return BUY;
  } else if (position === LONG && signal === SELL) {
    return SELL;
  }

  return undefined;
}

pricesAndPeriods.forEach((item) => {
  const store = createStore(reducer);

  data.forEach((val, idx, arr) => {
    const state = store.getState();
    const { median } = val;
    const decision = decisionFunc(state, val, arr[idx - 1], item);

    if (decision === BUY) {
      store.dispatch(buy(median));
    } else if (decision === SELL) {
      store.dispatch(sell(median));
    }
  });

  // cleanup
  const { position, price } = store.getState();
  if (position === LONG) {
    store.dispatch(sell(price));
  }

  console.log(item, '->', store.getState().money);
});
