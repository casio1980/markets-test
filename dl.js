/* eslint-disable no-console */
const fs = require('fs');
const yahooFinance = require('yahoo-finance');
const minimist = require('minimist');
const moment = require('moment');
const { RAW_FOLDER, DEFAULT_FROM_DATE, DATE_FORMAT } = require('./js/constants');

// node dl.js AAPL TSLA --from 2018-01-01 --to 2019-01-01
const today = moment().format(DATE_FORMAT);
const { _: symbols, from = DEFAULT_FROM_DATE, to = today } = minimist(process.argv.slice(2));
if (symbols.length === 0) {
  console.log('At least one symbol should be specified');
  process.exit();
}

// downloading
yahooFinance.historical(
  { symbols, from, to },
  (err, quotes) => {
    symbols.forEach((symbol) => {
      const quote = quotes[symbol];
      const fileName = `${RAW_FOLDER}/${symbol}.json`;

      fs.writeFile(fileName, JSON.stringify(quote), (e) => {
        if (e) {
          return console.log(e);
        }
        console.log(`${symbol} saved to ${fileName} (${quote.length} records)`);
        return null;
      });
    });
  }
);
