/* eslint-disable func-names */
require("dotenv").config();
const log4js = require("log4js");
const storage = require("node-persist");
const { getAPI } = require("../js/api");
const { OPEN, LOW, figiTWTR: figi } = require("../js/constants");
const { mainLoop, setPosition, logBalance } = require("../robots/mainLoop.js");

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

global.strategy = {
  priceBuy: OPEN,
  prevPriceBuy: LOW,
  profit: 0.009,
  loss: 0.0006,
  lots: 10,
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
      const twtr = positions.find((el) => el.figi === figi);
      if (twtr) {
        position = {
          status: "confirmed",
          takeProfit: await storage.getItem("takeProfit"),
          stopLoss: await storage.getItem("stopLoss"),
        };
        setPosition(position);
        console.log(
          `RESTORED | Profit: ${position.takeProfit}, Loss: ${position.stopLoss}`
        );
      }
      await logBalance(portfolio);
    }

    api.candle({ figi, interval: "1min" }, mainLoop);
  } catch (err) {
    logger.fatal(err);
  }
})();
