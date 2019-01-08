const { CLOSE } = require('./constants');

// SMA = SUM (CLOSE (i), N) / N
//
// где:
// SUM — сумма;
// CLOSE (i) — цена закрытия (открытия и т.д.) текущего периода;
// N — число периодов расчета.
exports.SMA = (quote, idx, n, field = CLOSE, offset = 0) => {
  let count = 0;
  let sum = 0;

  // eslint-disable-next-line no-param-reassign
  idx -= offset;
  if (idx < 0) return undefined;

  while (count < n) {
    const i = idx - count;
    if (i >= 0) {
      sum += quote[i][field];
      count += 1;
    } else {
      return +(sum / count).toFixed(4);
    }
  }

  return +(sum / count).toFixed(4);
};
