const config = {};

config.bestStrategies = {
  NVDA: [{
    // priceBuy: 'open', prevPriceBuy: 'high', profit: 0.01, stopLoss: 0.005, yield: '22.72%',
    priceBuy: 'open', prevPriceBuy: 'low', profit: 0.01, stopLoss: 0.005, yield: '163.52%',
  }],
  TSLA: [{
    // priceBuy: 'open', prevPriceBuy: 'high', profit: 0.025, stopLoss: 0.005, yield: '34.12%',
    // priceBuy: 'open', prevPriceBuy: 'high', profit: 0.015, stopLoss: 0.005, // -> 13306.87 | 33.07%
    // priceBuy: 'open', prevPriceBuy: 'high', profit: 0.015, stopLoss: 0.005, // -> 12864.61 | 28.65%
    priceBuy: 'open', prevPriceBuy: 'low', profit: 0.015, stopLoss: 0.005, yield: '336%',
  }],
  TWTR: [{
    // priceBuy: 'open', prevPriceBuy: 'high', profit: 0.08, stopLoss: 0.2, yield: '85.8%',
    priceBuy: 'open', prevPriceBuy: 'low', profit: 0.015, stopLoss: 0.005, yield: '336%',
  }],
  GOOG: [{
    priceBuy: 'open', prevPriceBuy: 'high', profit: 0.09, stopLoss: 0.3, yield: '28.05%',
    // priceBuy: 'open', prevPriceBuy: 'low', profit: 0.005, stopLoss: 0.005, //  15117.29 | 51.17%
  }],
  AMZN: [{
    priceBuy: 'open', prevPriceBuy: 'high', profit: 0.1, stopLoss: 0.03, yield: '60.52%',
    // priceBuy: 'open', prevPriceBuy: 'low', profit: 0.1, stopLoss: 0.01, //  17187.18 | 71.87%
  }],
  AAPL: [{
    priceBuy: 'open', prevPriceBuy: 'high', profit: 0.01, stopLoss: 0.2, yield: '27.81%',
    // priceBuy: 'open', prevPriceBuy: 'low', profit: 0.015, stopLoss: 0.005, // 16386.66 | 63.87%
  }],

  SOHU: [{
    priceBuy: 'open', prevPriceBuy: 'low', profit: 0.015, stopLoss: 0.005, yield: '284.82%',
  }],
  V: [{
    priceBuy: 'open', prevPriceBuy: 'low', profit: 0.005, stopLoss: 0.005, yield: '44.42%',
  }],
  NFLX: [{
    priceBuy: 'open', prevPriceBuy: 'low', profit: 0.02, stopLoss: 0.005, yield: '181.47%',
    // priceBuy: 'open', prevPriceBuy: 'high', profit: 0.09, stopLoss: 0.2 // 24217.51 | 142.18%
  }],
  TIF: [{
    priceBuy: 'open', prevPriceBuy: 'low', profit: 0.005, stopLoss: 0.005, yield: '87.98%',
  }],
  BIDU: [{
    priceBuy: 'open', prevPriceBuy: 'low', profit: 0.01, stopLoss: 0.005, yield: '65.04%',
  }],
  DLTR: [{
    priceBuy: 'open', prevPriceBuy: 'low', profit: 0.01, stopLoss: 0.005, yield: '78.16%',
  }],
  DG: [{
    priceBuy: 'open', prevPriceBuy: 'low', profit: 0.025, stopLoss: 0.01, yield: '63.44%',
  }],
  F: [{
    priceBuy: 'open', prevPriceBuy: 'low', profit: 0.005, stopLoss: 0.005, yield: '45.83%',
  }],
  FB: [{
    priceBuy: 'open', prevPriceBuy: 'low', profit: 0.015, stopLoss: 0.005, yield: '76.12%',
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
