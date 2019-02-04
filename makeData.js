/* eslint-disable no-console */
const fs = require('fs');
const moment = require('moment');
const minimist = require('minimist');
const {
  CLOSE,
  DATA_FOLDER,
  DATE_FORMAT,
  DATE,
  HIGH,
  LOW,
  MEDIAN,
  OPEN,
  RAW_FOLDER,
  SMA_PERIODS,
} = require('./js/constants');
const { SMA } = require('./js/functions');
const { fmtNumber } = require('./js/helpers');

function sortByDate(arr) {
  arr.sort((a, b) => (new Date(a.date) - new Date(b.date)));
}

function formatData(arr) {
  arr.forEach((elem) => {
    /* eslint-disable no-param-reassign */
    elem[DATE] = moment(elem[DATE]).format(DATE_FORMAT);

    elem[CLOSE] = fmtNumber(elem[CLOSE]);
    elem[HIGH] = fmtNumber(elem[HIGH]);
    elem[LOW] = fmtNumber(elem[LOW]);
    elem[OPEN] = fmtNumber(elem[OPEN]);
    elem[MEDIAN] = fmtNumber((elem[LOW] + elem[HIGH]) / 2);
    /* eslint-enable no-param-reassign */
  });
}

function applySMA(arr) {
  SMA_PERIODS.forEach((period) => {
    const attr = `sma_${period}`;
    arr.forEach((elem, idx) => {
      // eslint-disable-next-line no-param-reassign
      elem[attr] = SMA(arr, idx, period);
    });
  });
}

// node makeData.js AAPL TSLA
const { _: symbols } = minimist(process.argv.slice(2));
if (symbols.length === 0) {
  console.log('ERROR: At least one symbol should be specified');
  process.exit();
}

// processing
symbols.forEach((symbol) => {
  const rawFileName = `${RAW_FOLDER}/${symbol}.json`;
  const dataFileName = `${DATA_FOLDER}/${symbol}.json`;
  console.log(`Processing ${rawFileName}...`);

  fs.readFile(rawFileName, (err, raw) => {
    if (err) {
      return console.log(err);
    }

    const data = JSON.parse(raw);
    sortByDate(data);
    formatData(data);
    applySMA(data);

    fs.writeFile(dataFileName, JSON.stringify(data), (e) => {
      if (e) {
        return console.log(e);
      }
      console.log(`${symbol} saved to ${dataFileName} (${data.length} records)`);
      return null;
    });

    return null;
  });
});
