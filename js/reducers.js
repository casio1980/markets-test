/* eslint-disable no-case-declarations */
const { fmtNumber } = require('./helpers');
const { BUY, SELL } = require('./actions');
const { COMMISSION, INITIAL_MONEY, LONG } = require('./constants');

const initialState = {
  assets: 0,
  money: INITIAL_MONEY,
  prevMoney: undefined,
  position: undefined,
  price: undefined,
  percent: undefined,
};

exports.reducer = (state = initialState, action) => {
  const { type, price } = action;
  const { position, assets, money, prevMoney } = state;

  if (type === BUY && !position) {
    const newAssets = Math.floor(money / price / (1 + COMMISSION)); // max possible amount

    const sum = -fmtNumber(newAssets * price);
    const comm = -fmtNumber(sum * COMMISSION);

    return {
      assets: newAssets,
      money: fmtNumber(money + sum + comm),
      prevMoney: money,
      position: LONG,
      price,
      percent: 0,
    };
  } else if (type === SELL && position === LONG) {
    const sum = +fmtNumber(assets * price);
    const comm = -fmtNumber(sum * COMMISSION);
    const newMoney = fmtNumber(money + sum + comm);

    return {
      assets: 0,
      money: newMoney,
      prevMoney,
      position: undefined,
      price,
      percent: ((newMoney - prevMoney) / prevMoney) * 100, // TODO extract
    };
  }

  return state;
};
