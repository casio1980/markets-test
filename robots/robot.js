/* eslint-disable func-names */
require("dotenv").config();
const log4js = require("log4js");
const storage = require("node-persist");
const { getAPI } = require("../js/api");
const { OPEN, CLOSE, figiTWTR: figi, figiUSD } = require("../js/constants");
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
  prevPriceBuy: CLOSE,
  profit: 0.0382,
  loss: 0.0136,
  secureBalance: 1000,
};

(async function () {
  try {
    await storage.init();

    if (!isProduction) {
      await api.sandboxClear();
      await api.setCurrenciesBalance({ currency: "USD", balance: 10000 });
    } else {
      console.log("*** PRODUCTION MODE ***");
    }

    const portfolio = await api.portfolio();
    const { positions } = portfolio;
    await logBalance(portfolio);

    const usd = positions.find((el) => el.figi === figiUSD);
    if (usd) {
      const { balance } = usd;
      await storage.setItem("balance", balance);
    }

    const twtr = positions.find((el) => el.figi === figi);
    if (twtr) {
      position = {
        status: "confirmed",
        takeProfit: await storage.getItem("takeProfit"),
        stopLoss: await storage.getItem("stopLoss"),
        lots: await storage.getItem("lots"),
      };
      setPosition(position);
      console.log(
        `RESTORED | Profit: ${position.takeProfit}, Loss: ${position.stopLoss}`
      );
    }

    api.candle({ figi, interval: "1min" }, mainLoop);
  } catch (err) {
    logger.fatal(err);
  }
})();
