module.exports = {
  BUY: 'BUY',
  SELL: 'SELL',

  buy: (price, other) => ({
    type: 'BUY',
    price,
    ...other,
  }),

  sell: (price, other) => ({
    type: 'SELL',
    price,
    ...other,
  }),
};
