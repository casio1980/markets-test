/* eslint-disable func-names */
/* eslint-disable no-console */
require('dotenv').config();
const _ = require('lodash');
const moment = require('moment');
const { requestYahooQuote } = require('../js/helpers');
const { connect } = require('../js/database');
const { DATE_FORMAT } = require('../js/constants');

const symbols = ['TSLA', 'AMZN'];
const modules = ['price'];
const date = moment().format(DATE_FORMAT);

(async function () {
  try {
    console.log(`Downloading ${symbols}...`);
    const quotes = await requestYahooQuote({ symbols, modules });

    console.log('Connecting to DB...');
    const client = await connect(process.env.DB_URL);
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection(date);

    collection.insertMany(_.values(quotes), (err, result) => {
      console.log(result);
    });

    // symbols.forEach((symbol) => {
    //   const collection = db.collection(symbol);

    //   collection.insertOne(quotes[symbol], (err, result) => {
    //     console.log(result);
    //   });
    // });

    client.close();
    console.log('Done.');
  } catch (err) {
    console.error(err);
    process.exit();
  }
}());
