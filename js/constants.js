const _ = require("lodash");

module.exports = {
  DATE_FORMAT: "YYYY-MM-DD",
  DEFAULT_FROM_DATE: "2010-01-01",

  NOT_AVAILABLE: "N/A",

  CLOSED: "CLOSED",
  PREPRE: "PREPRE",
  PREMARKET: "PRE",
  REGULAR: "REGULAR",

  INITIAL_MONEY: 1000,
  COMMISSION: 0.0005, // 0.003,

  figiUSD: "BBG0013HGFT4",
  figiTWTR: "BBG000H6HNW3",

  ADJ_CLOSE: "adjClose",
  CLOSE: "c",
  DATE: "date",
  HIGH: "h",
  LOW: "l",
  MEDIAN: "median",
  OPEN: "o",
  VOLUME: "v",

  SHORT: "SHORT",
  LONG: "LONG",

  RAW_FOLDER: "./raw",
  DATA_FOLDER: "./data",

  SMA_PERIODS: [2, 3, 4, 5, 7]
    .concat(_.range(10, 61, 5))
    .concat(_.range(70, 101, 10)),
};
