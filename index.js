/* eslint-disable no-console */
const { createStore } = require('redux');

const data = require('./data/TSLA.json');
const {
  CLOSE,
  HIGH,
  LONG,
  LOW,
  MEDIAN,
  OPEN,
} = require('./js/constants');
const { sequence } = require('./js/helpers');
const {
  BUY,
  buy,
  SELL,
  sell,
} = require('./js/actions');
const { reducer } = require('./js/reducers');

const prices = [CLOSE, HIGH, LOW, MEDIAN, OPEN];
const periods = [2, 3, 4, 5, 7];

const pricesAndPeriods = sequence([])
  .addDimension(prices, 'price')
  .addDimension(prices, 'prevPrice')
  .addDimension(periods, 'period')
  .value();

// pricesAndPeriods.push({ price: 'close', prevPrice: 'high', period: 2 });

const funcs = [
  function whenPriceCrossedSMA(s, c, p, opts) {
    const { price, period } = opts;
    const sma = p[`sma_${period}`];
    return p[price] > sma ? BUY : SELL;
  },

  function whenPriceGoesUp(s, c, p, opts) {
    const { price } = opts;
    return c[price] > p[price] ? BUY : SELL;
  },

  function whenPriceGoesUpImproved(s, c, p, opts) {
    const { price, prevPrice } = opts;
    return c[price] > p[prevPrice] ? BUY : SELL;
  },
];


function decisionFunc(state, current, previous, params) {
  if (!current || !previous) return undefined;
  const { position } = state;
  // const { period } = params;

  const signal = funcs[2](state, current, previous, params);
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
    const previous = arr[idx - 1];
    const decision = decisionFunc(state, val, previous, item);

    if (decision === BUY) {
      store.dispatch(buy(val.close));
      if (pricesAndPeriods.length === 1) { // TODO
        console.log(val.date, 'BUY ->', store.getState());
      }
    } else if (decision === SELL) {
      store.dispatch(sell(val.close));
      if (pricesAndPeriods.length === 1) { // TODO
        console.log(val.date, 'SELL ->', store.getState());
      }
    }
  });

  // cleanup
  const { position, price } = store.getState();
  if (position === LONG) {
    store.dispatch(sell(price));
  }

  console.log(item, '->', store.getState().money);
});
