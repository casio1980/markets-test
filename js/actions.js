module.exports = {
  BUY: "BUY",
  SELL: "SELL",
  SET_HIGH: "SET_HIGH",

  buy: (price, other) => ({
    type: "BUY",
    price,
    ...other,
  }),

  sell: (price, other) => ({
    type: "SELL",
    price,
    ...other,
  }),

  setHigh: (price, other) => ({
    type: "SET_HIGH",
    price,
    ...other,
  }),
};
