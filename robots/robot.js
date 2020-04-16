/* eslint-disable func-names */
require("dotenv").config();
const log4js = require("log4js");
const { getAPI } = require("../js/api");

const { OPEN, LOW } = require("../js/constants");
const { fmtNumber } = require("../js/helpers");

const figiUSD = "BBG0013HGFT4";
const figiTWTR = "BBG000H6HNW3";

log4js.configure({
  appenders: {
    console: { type: "console" },
    file: { type: "file", filename: "robot.log" },
  },
  categories: {
    server: { appenders: ["file"], level: "trace" },
    default: { appenders: ["console", "file"], level: "trace" },
  },
});

const logger = log4js.getLogger(process.env.LOG_CATEGORY || "default");
const isProduction = process.env.PRODUCTION === "true";

const api = getAPI();

const strategy = {
  priceBuy: OPEN,
  prevPriceBuy: LOW,
  profit: 0.009,
  stopLoss: 0.0006,
  lots: 1,
};

const logBalance = async (portfolio) => {
  const { positions } = portfolio || (await api.portfolio());
  const usd = positions.find((el) => el.figi === figiUSD);
  const twtr = positions.find((el) => el.figi === figiTWTR);
  const balanceStr = `Balance is ${usd.balance} USD`;
  const twtrStr = twtr ? ` | ${twtr.ticker}: ${twtr.balance}` : "";
  logger.info(balanceStr + twtrStr);
};

let candleWatcher = null;
let subscribeTimer = null;

let prevCandle = null;
let position = null;

const mainLoop = async (candle) => {
  const { time, o, c, v } = candle;

  clearTimeout(subscribeTimer);
  subscribeTimer = setTimeout(() => {
    candleWatcher();
    candleWatcher = null;
  }, 60000);

  if (!prevCandle) {
    // init the reference candle
    prevCandle = candle;
    await logBalance();
  }

  if (!position && o > prevCandle.o) {
    const { profit, stopLoss, lots } = strategy;
    position = {
      status: "unconfirmed",
      price: o,
      lots,
      takeProfit: fmtNumber(o * (1 + profit)),
      stopLoss: fmtNumber(o * (1 - stopLoss)),
    };

    api.marketOrder({
      operation: "Buy",
      figi: figiTWTR,
      lots,
    });
  }

  if (position && position.status === "unconfirmed") {
    const portfolio = await api.portfolio();
    const { positions } = portfolio;
    const twtr = positions.find((el) => el.figi === figiTWTR);

    if (!!twtr) {
      position.status = "confirmed";

      logger.info(
        `BUY @ ${o} | Profit: ${position.takeProfit}, Loss: ${position.stopLoss}`
      );
      logBalance(portfolio);
    }
  }

  if (position && position.status === "confirmed") {
    const { takeProfit, stopLoss, lots } = position;
    const isProfit = c >= takeProfit;
    const isLoss = stopLoss >= c;
    if (isProfit || isLoss) {
      try {
        api.marketOrder({
          operation: "Sell",
          figi: figiTWTR,
          lots,
        });
        position = {
          ...position,
          status: "closed",
          type: isProfit ? "PROFIT" : "LOSS",
          closed: c,
        };
      } catch (err) {
        logger.fatal(err);
      }
    }
  }

  if (position && position.status === "closed") {
    const portfolio = await api.portfolio();
    const { positions } = portfolio;
    const twtr = positions.find((el) => el.figi === figiTWTR);

    if (!twtr) {
      const { type, closed } = position;
      logger.info(`${type} @ ${closed}`);
      logBalance(portfolio);

      position = null;
    }
  }

  if (time !== prevCandle.time) {
    // update the reference candle
    prevCandle = candle;
    process.stdout.write("\n");
  }

  process.stdout.write(`${time} | o: ${o}, c: ${c}, vol: ${v}\r`);

  // o: 33.48,
  // c: 33.49,
  // h: 33.49,
  // l: 33.48,
  // v: 1000,
  // time: '2020-02-05T17:01:00Z',
  // interval: '1min',
  // figi: 'BBG000H6HNW3'
  // ---

  // rounds += 1;
  // if (rounds === 5) {
  //   logger.debug("Unsubscribing from candles");
  //   candleWatcher();
  //   process.exit();
  // }
};

(async function () {
  try {
    if (!isProduction) {
      await api.sandboxClear();
      await api.setCurrenciesBalance({ currency: "USD", balance: 10000 });
    } else {
      console.log("*** PRODUCTION MODE ***");

      const { positions } = await api.portfolio();
      const hasPosition = !!positions.find((el) => el.figi === figiTWTR);
      if (hasPosition) {
        console.log("There is an open position, terminating.");
        process.exit();
      }
    }

    candleWatcher = api.candle({ figi: figiTWTR, interval: "1min" }, mainLoop);
    setInterval(() => {
      if (!candleWatcher) {
        logger.debug("Resubscribed");
        candleWatcher = api.candle(
          { figi: figiTWTR, interval: "1min" },
          mainLoop
        );
      }
    }, 60000);

    // const { figi } = await api.searchOne({ ticker });
    // const stocks = await api.stocks(); // all available instruments
    // const currencies = await api.currencies(); // all available currencies
    // const orders = await api.orders(); // all available orders => []

    // const portfolio = await api.portfolio(); // all positions in my portfolio
    // console.log(portfolio);

    // figi: 'BBG0013HGFT4',
    // ticker: 'USD000UTSTOM',
    // instrumentType: 'Currency',
    // balance: 7575.39,
    // lots: 7,
    // expectedYield: { currency: 'RUB', value: -3068.03 },
    // averagePositionPrice: { currency: 'RUB', value: 63.4775 },
    // name: 'Доллар США'
    // ---
    // const { balance } = await api.instrumentPortfolio({ figi: figiUSD });
    // console.log(balance);

    // orderId: 'efee2839-4999-4b4f-80d5-be6a5ba6f19b',
    // operation: 'Buy',
    // status: 'Fill',
    // requestedLots: 1,
    // executedLots: 1
    // ---
    // const orderBuy = await api.limitOrder({
    //   operation: 'Buy', figi: figiTWTR, lots: 1, price: 100,
    // });

    // orderId: '2df829e8-699b-4c40-b184-d39d9f82babc',
    // operation: 'Sell',
    // status: 'Fill',
    // requestedLots: 1,
    // executedLots: 1
    // ---
    // const orderSell = await api.limitOrder({
    //   operation: 'Sell', figi: figiTWTR, lots: 1, price: 110,
    // });

    // figi: 'BBG000H6HNW3',
    // depth: 3,
    // tradeStatus: 'NormalTrading',
    // minPriceIncrement: 0.01,
    // lastPrice: 33.98,
    // closePrice: 33.07,
    // limitUp: 36,
    // limitDown: 31.94,
    // bids: [
    //   { price: 33.98, quantity: 1918 },
    //   { price: 33.97, quantity: 2000 },
    //   { price: 33.96, quantity: 3200 }
    // ],
    // asks: [
    //   { price: 33.99, quantity: 3509 },
    //   { price: 34, quantity: 7193 },
    //   { price: 34.01, quantity: 3350 }
    // ]
    // ---
    // const orderbook = await api.orderbookGet({ figi: figiTWTR });
    // const { lastPrice } = orderbook;

    // const orderBuy = await api.limitOrder({
    //   operation: 'Buy', figi: figiTWTR, lots: 1, price: lastPrice,
    // });
    // console.log(orderBuy);

    // const orders = await api.orders(); // all available orders => []
    // const portfolio = await api.portfolio(); // all positions in my portfolio
  } catch (err) {
    logger.fatal(err);
  } finally {
    //
  }
})();
