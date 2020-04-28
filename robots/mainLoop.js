const { getAPI } = require("../js/api");
const { fmtNumber, isRegularMarket } = require("../js/helpers");
const storage = require("node-persist");

const { figiTWTR: figi, figiUSD, COMMISSION } = require("../js/constants");

const api = getAPI();

const logger = {
  info: (text) => console.log(text),
};

let prevCandle;
let position;

const resetLoop = () => {
  prevCandle = undefined;
  position = undefined;
};
resetLoop();

const logBalance = async (portfolio) => {
  const { positions } = portfolio || (await api.portfolio());
  const usd = positions.find((el) => el.figi === figiUSD);
  const twtr = positions.find((el) => el.figi === figi);
  const balanceStr = `Balance is ${usd.balance} USD`;
  const twtrStr = twtr ? ` | ${twtr.ticker}: ${twtr.balance}` : "";
  logger.info(balanceStr + twtrStr);
};
exports.logBalance = logBalance;

exports.mainLoop = async (candle) => {
  const { time, c: price } = candle;
  const { priceBuy, prevPriceBuy, profit, loss, secureBalance } = strategy;

  if (!prevCandle) {
    // init the reference candle
    prevCandle = candle;
  } else if (!position) {
    if (
      candle[priceBuy] > prevCandle[prevPriceBuy] &&
      candle.time !== prevCandle.time &&
      isRegularMarket(time) &&
      !isClosingMarket(time)
    ) {
      const balance = await storage.getItem("balance");
      const lots = Math.floor(
        (balance - secureBalance) / price / (1 + COMMISSION)
      ); // max possible amount
      const takeProfit = fmtNumber(price * (1 + profit));
      const stopLoss = fmtNumber(price * (1 - loss));

      position = {
        status: "unconfirmed",
        buyTime: time,
        buyPrice: price,
        takeProfit,
        stopLoss,
        lots,
      };

      await storage.setItem("lots", lots);
      await storage.setItem("takeProfit", takeProfit);
      await storage.setItem("stopLoss", stopLoss);

      api.marketOrder({
        operation: "Buy",
        figi,
        lots,
      });
    }
  } else if (position) {
    const { status, buyTime, buyPrice, takeProfit, stopLoss, lots } = position;
    if (status === "unconfirmed") {
      position = { ...position, status: "confirming" };
      const portfolio = await api.portfolio();
      const { positions } = portfolio;
      const twtr = positions.find((el) => el.figi === figi);

      if (twtr) {
        position = { ...position, status: "confirmed" };
        logger.info(
          `\nBUY @ ${buyPrice} | Profit: ${takeProfit}, Loss: ${stopLoss}`
        );
        logBalance(portfolio);
      } else {
        position = { ...position, status: "unconfirmed" }; // TODO confirm immediately
      }
    } else if (status === "confirmed") {
      const isProfit = price >= takeProfit;
      const isLoss = price <= stopLoss && buyTime !== time;
      if (isProfit || isLoss) {
        position = {
          ...position,
          status: "closed",
          type: isProfit ? "PROFIT" : "LOSS",
          sellPrice: price,
        };

        api.marketOrder({
          operation: "Sell",
          figi,
          lots,
        });
      }
    } else if (status === "closed") {
      position = { ...position, status: "deleting" };
      const portfolio = await api.portfolio();
      const { positions } = portfolio;
      const twtr = positions.find((el) => el.figi === figi);

      if (!twtr) {
        const { type, sellPrice } = position;
        logger.info(`\n${type} @ ${sellPrice}`);
        logBalance(portfolio);

        position = undefined;
      } else {
        position = { ...position, status: "closed" }; // TODO confirm immediately
      }
    }
  }

  if (time !== prevCandle.time) {
    // update the reference candle
    prevCandle = candle;
    process.stdout.write("\n");
  }

  process.stdout.write(
    `${time} | low: ${fmtNumber(candle.l)} open: ${fmtNumber(
      candle.o
    )}, current: ${fmtNumber(price)}, vol: ${candle.v}          \r`
  );
};

exports.getPosition = () => position;
exports.setPosition = (value) => (position = value);

exports.resetLoop = resetLoop;
