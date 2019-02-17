const _ = require('lodash');

module.exports = {
  DATE_FORMAT: 'YYYY-MM-DD',
  DEFAULT_FROM_DATE: '2010-01-01',

  NOT_AVAILABLE: 'N/A',

  CLOSED: 'CLOSED',
  PREMARKET: 'PRE',
  REGULAR: 'REGULAR',

  INITIAL_MONEY: 10000,
  COMMISSION: 0.003,

  ADJ_CLOSE: 'adjClose',
  CLOSE: 'close',
  DATE: 'date',
  HIGH: 'high',
  LOW: 'low',
  MEDIAN: 'median',
  OPEN: 'open',
  VOLUME: 'volume',

  SHORT: 'SHORT',
  LONG: 'LONG',

  RAW_FOLDER: './raw',
  DATA_FOLDER: './data',

  SMA_PERIODS: [2, 3, 4, 5, 7]
    .concat(_.range(10, 61, 5))
    .concat(_.range(70, 101, 10)),
};
