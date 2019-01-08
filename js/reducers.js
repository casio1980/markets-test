/* eslint-disable no-case-declarations */
const { fmtNumber } = require('./helpers');
const { BUY, SELL } = require('./actions');
const { COMMISSION, LONG } = require('./constants');

const initialState = {
  assets: 0,
  money: 1000,
  position: undefined,
  price: undefined,
};

exports.reducer = (state = initialState, action) => {
  const { type, price, ...other } = action;

  switch (type) {
    case BUY:
      const assets = Math.floor(state.money / price / (1 + COMMISSION)); // max possible amount
      if (assets > 0) {
        const sum = -fmtNumber(assets * price);
        const comm = -fmtNumber(sum * COMMISSION);

        return {
          assets,
          money: fmtNumber(state.money + sum + comm),
          position: LONG,
          price,
          ...other,
        };
      }
      return state;

    case SELL:
      if (state.assets > 0) { // max possible amount
        const sum = +fmtNumber(state.assets * price);
        const comm = -fmtNumber(sum * COMMISSION);

        return {
          assets: 0,
          money: fmtNumber(state.money + sum + comm),
          position: undefined,
          price,
          ...other,
        };
      }
      return state;

    default:
      return state;
  }
};
