const { get, pick } = require('lodash');
const { getPrevDate, getNextDate, fmtNumber } = require('../../js/helpers');
const {
  CLOSED,
  PREMARKET,
  REGULAR,
  LOW,
} = require('../../js/constants');
const { bestStrategies } = require('../../config');

module.exports = {
  getSnap: async (api, collection, symbol, date) => {
    const queryClosed = { 'price.symbol': symbol, 'price.marketState': CLOSED };
    const [docClosed] =
      await collection.find(queryClosed).sort({ $natural: -1 }).limit(1).toArray();
    const { price: priceClosed } = docClosed || {};

    const queryPre = { 'price.symbol': symbol, 'price.marketState': PREMARKET };
    const [docPre] =
      await collection.find(queryPre).sort({ $natural: -1 }).limit(1).toArray();
    const { price: pricePre } = docPre || {};

    const queryRegular = { 'price.symbol': symbol, 'price.marketState': REGULAR };
    const [docRegular] =
      await collection.find(queryRegular).sort({ $natural: -1 }).limit(1).toArray();
    const { price: priceRegular } = docRegular || {};

    const status = get(priceRegular, 'marketState') || get(pricePre, 'marketState') || get(priceClosed, 'marketState');
    const preMarketPrice = get(pricePre, 'preMarketPrice');
    const prevMarketDayHigh = get(pricePre, 'regularMarketDayHigh');
    const prevMarketDayLow = get(pricePre, 'regularMarketDayLow');
    const regularMarketOpen = get(priceRegular, 'regularMarketOpen');

    // Tinkoff API
    const { figi } = await api.searchOne({ ticker: symbol });
    const { candles } = await api.candlesGet({
      figi,
      interval: 'day',
      from: `${getPrevDate(date, -10)}T00:00:00.000Z`,
      to: `${getNextDate(date)}T00:00:00.000Z`,
    });

    // TODO compute signal
    const [strategy] = bestStrategies[symbol];
    const signalPrice = strategy.prevPriceBuy === LOW
      ? prevMarketDayLow
      : prevMarketDayHigh;
    // const prevPriceBuy = get(pricePre, 'regularMarketDayHigh'); // high
    // const priceBuy = get(priceRegular, 'regularMarketOpen'); // open

    let signalBuy = false;
    if (status === PREMARKET) {
      signalBuy = preMarketPrice > signalPrice;
    } else if (status === REGULAR) {
      signalBuy = regularMarketOpen > signalPrice;
    }

    let buyPrice;
    let takeProfit;
    let stopLoss;
    if (signalBuy) {
      buyPrice = regularMarketOpen || preMarketPrice;
      takeProfit = fmtNumber(buyPrice * (1 + strategy.profit));
      stopLoss = fmtNumber(buyPrice * (1 - strategy.stopLoss));
    }

    let decisionType;
    if (takeProfit < get(priceRegular, 'regularMarketDayHigh')) {
      if (stopLoss > get(priceRegular, 'regularMarketDayLow')) {
        decisionType = 'BOTH';
      } else {
        decisionType = 'PROFIT';
      }
    } else if (stopLoss > get(priceRegular, 'regularMarketDayLow')) {
      decisionType = 'LOSS';
    }

    const result = {
      symbol,
      status,
      prev: pick(pricePre || priceClosed, [
        'regularMarketDayHigh',
        'regularMarketDayLow',
        'regularMarketOpen',
        'regularMarketPrice',
      ]),
      current: pick(priceRegular || pricePre, [
        'preMarketPrice',
        'regularMarketDayHigh',
        'regularMarketDayLow',
        'regularMarketOpen',
        'regularMarketPrice',
      ]),
      strategy,
      signalBuy,
      decision: {
        // preMarketPrice,
        // prevMarketDayHigh,
        signalPrice,
        buyPrice,
        takeProfit,
        stopLoss,
        decisionType,
        // isProfit: takeProfit < get(priceRegular, 'regularMarketDayHigh'),
        // isLoss: stopLoss > get(priceRegular, 'regularMarketDayLow'),
      },
      candles,
    };
    result.current.status = status;

    return result;
  },
};
