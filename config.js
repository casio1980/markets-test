const config = {};

config.bestStrategies = {
  AMZN: [{
    priceBuy: 'open', prevPriceBuy: 'low', priceSell: 'close', prevPriceSell: 'high', profit: 0.03, // 2220.05
  }],
  TSLA: [{
    // priceBuy: 'open', prevPriceBuy: 'high', profit: 0.015, stopLoss: 0.005, // -> 13306.87 | 33.07%
    priceBuy: 'open', prevPriceBuy: 'high', profit: 0.015, stopLoss: 0.005, // -> 12864.61 | 28.65%
  }],
};

module.exports = config;

// TSLA
// seq = [{ priceBuy: 'open', prevPriceBuy: 'low', priceSell: 'close', prevPriceSell: 'high', profit: 0.02 }]; // 43967.52
// seq = [{ priceBuy: 'open', prevPriceBuy: 'low', priceSell: 'close', prevPriceSell: 'open', profit: 0.015, stopLoss: 0.005 }]; // 41119.28 | 311.19%
// seq = [{ priceBuy: 'open', prevPriceBuy: 'low', priceSell: 'close', prevPriceSell: 'median', profit: 0.015, stopLoss: 0.005 }]; // 41119.28 | 311.19%'
// seq = [{ priceBuy: 'open', prevPriceBuy: 'low', profit: 0.015, stopLoss: 0.004 }]; // 45345.18 | 353.45%
// seq = [{ priceBuy: 'open', prevPriceBuy: 'low', profit: 0.015, stopLoss: 0.005 }]; // 41119.28 | 311.19%
// seq = [{ priceBuy: 'open', period: 3, profit: 0.015, stopLoss: 0.005 }]; // '->' '27171.22 | 171.71%'
// seq = [{ priceBuy: 'open', prevPriceBuy: 'high', profit: 0.04, stopLoss: 0.005 }]; //  '->' '13306.87 | 33.07%'
