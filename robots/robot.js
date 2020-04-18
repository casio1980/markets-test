/* eslint-disable func-names */
require("dotenv").config();
const log4js = require("log4js");
const { getAPI } = require("../js/api");
const storage = require("node-persist");

const { OPEN, LOW, figiUSD, figiTWTR } = require("../js/constants");
const { fmtNumber } = require("../js/helpers");

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
  loss: 0.0006,
  lots: 10,
};

let prevCandle;
let position;
let skipCandle = false;

const logBalance = async (portfolio) => {
  const { positions } = portfolio || (await api.portfolio());
  const usd = positions.find((el) => el.figi === figiUSD);
  const twtr = positions.find((el) => el.figi === figiTWTR);
  const balanceStr = `Balance is ${usd.balance} USD`;
  const twtrStr = twtr ? ` | ${twtr.ticker}: ${twtr.balance}` : "";
  logger.info(balanceStr + twtrStr);
};

const mainLoop = async (candle) => {
  const { time, c: price } = candle;
  const { priceBuy, prevPriceBuy, profit, loss, lots } = strategy;

  if (!prevCandle) {
    // init the reference candle
    prevCandle = candle;
  } else if (!position) {
    if (candle[priceBuy] > prevCandle[prevPriceBuy] && !skipCandle) {
      const takeProfit = fmtNumber(price * (1 + profit));
      const stopLoss = fmtNumber(price * (1 - loss));

      position = {
        status: "unconfirmed",
        buyPrice: price,
        takeProfit,
        stopLoss,
      };
      skipCandle = true;

      await storage.setItem("takeProfit", takeProfit);
      await storage.setItem("stopLoss", stopLoss);

      api.marketOrder({
        operation: "Buy",
        figi: figiTWTR,
        lots,
      });
    }
  } else if (position) {
    const { status, buyPrice, takeProfit, stopLoss, balance } = position;
    if (status === "unconfirmed") {
      position = { ...position, status: "confirming" };
      const portfolio = await api.portfolio();
      const { positions } = portfolio;
      const twtr = positions.find((el) => el.figi === figiTWTR);

      if (twtr) {
        position = { ...position, balance: twtr.balance, status: "confirmed" };
        logger.info(
          `BUY @ ${buyPrice} | Profit: ${takeProfit}, Loss: ${stopLoss}`
        );
        logBalance(portfolio);
      } else {
        position = { ...position, status: "unconfirmed" }; // TODO refactor
      }
    } else if (status === "confirmed" && !skipCandle) {
      const isProfit = price >= takeProfit;
      const isLoss = stopLoss >= price;
      if (isProfit || isLoss) {
        position = {
          ...position,
          status: "closed",
          type: isProfit ? "PROFIT" : "LOSS",
          sellPrice: price,
        };
        skipCandle = true;

        api.marketOrder({
          operation: "Sell",
          figi: figiTWTR,
          lots: balance,
        });
      }
    } else if (status === "closed") {
      position = { ...position, status: "deleting" };
      const portfolio = await api.portfolio();
      const { positions } = portfolio;
      const twtr = positions.find((el) => el.figi === figiTWTR);

      if (!twtr) {
        const { type, sellPrice } = position;
        logger.info(`${type} @ ${sellPrice}`);
        logBalance(portfolio);

        position = null;
      } else {
        position = { ...position, status: "closed" }; // TODO refactor
      }
    }
  }

  if (time !== prevCandle.time) {
    // update the reference candle
    prevCandle = candle;
    skipCandle = false;
    process.stdout.write("\n");
  }

  process.stdout.write(
    `${time} | low: ${fmtNumber(candle.l)} open: ${fmtNumber(
      candle.o
    )}, current: ${fmtNumber(price)}, vol: ${candle.v}          \r`
  );
};

(async function () {
  try {
    await storage.init();

    if (!isProduction) {
      await api.sandboxClear();
      await api.setCurrenciesBalance({ currency: "USD", balance: 10000 });
    } else {
      console.log("*** PRODUCTION MODE ***");

      const portfolio = await api.portfolio();
      const { positions } = portfolio;
      const twtr = positions.find((el) => el.figi === figiTWTR);
      if (twtr) {
        position = {
          status: "confirmed",
          balance: twtr.balance,
          takeProfit: await storage.getItem("takeProfit"),
          stopLoss: await storage.getItem("stopLoss"),
        };
      }
      await logBalance(portfolio);
    }

    api.candle({ figi: figiTWTR, interval: "1min" }, mainLoop);
  } catch (err) {
    logger.fatal(err);
  }
})();
