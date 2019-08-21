const yahooFinance = require('yahoo-finance'); // TODO https://github.com/pilwon/node-google-finance
const _ = require('lodash');
const moment = require('moment');
const { DATE_FORMAT } = require('./constants');

exports.fmtNumber = number => +number.toFixed(2);

exports.getCurrentDate = () => moment().format(DATE_FORMAT);

exports.requestYahooQuote = async options =>
  new Promise((resolve, reject) => {
    yahooFinance.quote(options, (err, quotes) => {
      if (err) reject(err);
      else resolve(quotes);
    }).catch((err) => {
      reject(err);
    });
  });

exports.requestYahooHistorical = async options =>
  new Promise((resolve, reject) => {
    yahooFinance.historical(options, (err, quotes) => {
      if (err) reject(err);
      else resolve(quotes);
    }).catch((err) => {
      reject(err);
    });
  });

const addDimension = (array, dimension, name = 'item') => {
  const response = [];
  dimension.forEach((item) => {
    if (_.isEmpty(array)) {
      const obj = {};
      obj[name] = item;
      response.push(obj);
    } else {
      array.forEach((element) => {
        const obj = _.clone(element);
        obj[name] = item;
        response.push(obj);
      });
    }
  });
  return response;
};

exports.sequence = (array) => {
  const obj = {
    val: array,
    addDimension: (dimension, name) => {
      obj.val = addDimension(obj.val, dimension, name);
      return obj;
    },
    value: () => (obj.val),
  };

  return obj;
};
