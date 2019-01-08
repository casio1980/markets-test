const yahooFinance = require('yahoo-finance'); // TODO https://github.com/pilwon/node-google-finance
const _ = require('lodash');

exports.fmtNumber = number => +number.toFixed(2);

exports.requestYahooQuote = async options =>
  new Promise((resolve, reject) => {
    yahooFinance.quote(options, (err, quotes) => {
      if (err) reject(err);
      else resolve(quotes);
    });
  });

exports.addDimension = (array, dimension, name = 'item') => {
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
