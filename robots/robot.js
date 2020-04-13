/* eslint-disable func-names */
require("dotenv").config();
const log4js = require("log4js");
const { getAPI } = require("../js/api");

const { OPEN } = require("../js/constants");
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
  prevPriceBuy: OPEN,
  profit: 0.025,
  stopLoss: 0.001,
};
const LOTS = 1;

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

    let prevCandle = null;
    let position = null;
    const candleWatcher = api.candle(
      { figi: figiTWTR, interval: "1min" },
      async (candle) => {
        const { time, o, c, v } = candle;

        if (!prevCandle) {
          prevCandle = candle;

          const { positions } = await api.portfolio();
          const usd = positions.find((el) => el.figi === figiUSD);
          console.log(usd);
        }

        if (!position && o > prevCandle.o) {
          try {
            const order = await api.marketOrder({
              operation: "Buy",
              figi: figiTWTR,
              lots: LOTS,
            });

            const { profit, stopLoss } = strategy;
            position = {
              price: o,
              takeProfit: fmtNumber(o * (1 + profit)),
              stopLoss: fmtNumber(o * (1 - stopLoss)),
            };
            logger.debug(
              `BUY @ ${o} | Profit: ${position.takeProfit}, Loss: ${position.stopLoss}`
            );

            const { positions } = await api.portfolio();
            const usd = positions.find((el) => el.figi === figiUSD);
            console.log(usd);
          } catch (err) {
            logger.fatal(err);
          }
        }

        if (position) {
          const { takeProfit, stopLoss } = position;
          if (c >= takeProfit || stopLoss >= c) {
            try {
              const order = await api.marketOrder({
                operation: "Sell",
                figi: figiTWTR,
                lots: LOTS,
              });
              position = null;
              logger.debug(`SELL @ ${c}`);

              const { positions } = await api.portfolio();
              const usd = positions.find((el) => el.figi === figiUSD);
              console.log(usd);
            } catch (err) {
              logger.fatal(err);
            }
          }
        }

        if (time !== prevCandle.time) {
          prevCandle = candle;
        }

        logger.debug(`${time} | o: ${o}, c: ${c}, vol: ${v}`);

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
      }
    );

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
    // if (client) client.close();
  }
})();
