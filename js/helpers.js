const yahooFinance = require("yahoo-finance"); // TODO https://github.com/pilwon/node-google-finance
const _ = require("lodash");
const moment = require("moment");
const { DATE_FORMAT, SMA_PERIODS } = require("./constants");
const { SMA } = require("./functions");

const minutesOfDay = (d) => d.hours() * 60 + d.minutes();

exports.fmtNumber = (number) => +number.toFixed(2);
exports.fmtDate = (date) => moment(date).format(DATE_FORMAT);

exports.getCurrentDate = () => moment().format(DATE_FORMAT);
exports.getPrevDate = (date, days = -1) =>
  moment(date).add(days, "days").format(DATE_FORMAT);
exports.getNextDate = (date) => moment(date).add(1, "days").format(DATE_FORMAT);

const isRegularMarket = (date) => minutesOfDay(moment(date)) >= 17 * 60 + 30;
exports.isRegularMarket = isRegularMarket;

const isClosingMarket = (date) => minutesOfDay(moment(date)) >= 23 * 60 + 30;
exports.isClosingMarket = isClosingMarket;

exports.canOpenPosition = (date) => {
  return (
    isRegularMarket(date) &&
    !isClosingMarket(date) &&
    minutesOfDay(moment(date)) >= 22 * 60 + 00
  );
};

exports.requestYahooQuote = async (options) =>
  new Promise((resolve, reject) => {
    yahooFinance
      .quote(options, (err, quotes) => {
        if (err) reject(err);
        else resolve(quotes);
      })
      .catch((err) => {
        reject(err);
      });
  });

exports.requestYahooHistorical = async (options) =>
  new Promise((resolve, reject) => {
    yahooFinance
      .historical(options, (err, quotes) => {
        if (err) reject(err);
        else resolve(quotes);
      })
      .catch((err) => {
        reject(err);
      });
  });

const addDimension = (array, dimension, name = "item") => {
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
    value: () => obj.val,
  };

  return obj;
};

exports.applySMA = (array) => {
  SMA_PERIODS.forEach((period) => {
    const attr = `sma_${period}`;
    array.forEach((elem, idx) => {
      elem[attr] = SMA(array, idx, period);
    });
  });
};
