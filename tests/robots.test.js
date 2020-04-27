const {
  mainLoop,
  getPosition,
  setPosition,
  resetLoop,
} = require("../robots/mainLoop.js");
const { OPEN, LOW, figiUSD, figiTWTR } = require("../js/constants");

global.strategy = {
  priceBuy: OPEN,
  prevPriceBuy: LOW,
  profit: 0.009,
  loss: 0.0006,
  secureBalance: 900,
};

const mockPortfolio = jest.fn();
jest.mock("../js/api", () => ({
  getAPI: () => ({
    marketOrder: jest.fn(),
    portfolio: () => mockPortfolio(),
  }),
}));

const mockGetItem = jest.fn();
jest.mock("node-persist", () => ({
  getItem: () => mockGetItem(),
  setItem: jest.fn(),
}));

describe("Robot", () => {
  beforeEach(async () => {
    resetLoop();
    await mainLoop({
      time: "2020-01-01T18:00:00Z",
      l: 9,
      o: 10,
      c: 10,
      v: 100,
    }); // init reference candle
  });

  test("should not create a position on the reference candle", () => {
    expect(getPosition()).toBeUndefined();
  });

  test("should create an unconfirmed position", async () => {
    mockGetItem.mockReturnValueOnce(1000);
    await mainLoop({
      time: "2020-01-01T18:00:00Z",
      l: 9,
      o: 10,
      c: 11,
      v: 100,
    });

    expect(getPosition()).toMatchSnapshot();
  });

  test("should confirm an unconfirmed position", async () => {
    setPosition({
      buyPrice: 11,
      buyTime: "2020-01-01T18:00:00Z",
      lots: 9,
      status: "unconfirmed",
      stopLoss: 10.99,
      takeProfit: 11.1,
    });
    mockPortfolio.mockReturnValueOnce({
      positions: [
        {
          ticker: "USD",
          figi: figiUSD,
          balance: 0,
        },
        {
          ticker: "TWTR",
          figi: figiTWTR,
          balance: 10,
        },
      ],
    });
    await mainLoop({
      time: "2020-01-01T18:00:00Z",
      l: 9,
      o: 10,
      c: 11.01,
      v: 100,
    });

    expect(getPosition()).toMatchSnapshot();
  });

  test("should take profit within the same candle", async () => {
    setPosition({
      buyPrice: 11,
      buyTime: "2020-01-01T18:00:00Z",
      lots: 9,
      status: "confirmed",
      stopLoss: 10.99,
      takeProfit: 11.1,
    });
    await mainLoop({
      time: "2020-01-01T18:00:00Z",
      l: 9,
      o: 10,
      c: 11.11,
      v: 100,
    });

    const position = getPosition();
    expect(position.status).toBe("closed");
    expect(position).toMatchSnapshot();
  });

  test("should not take loss within the same candle", async () => {
    setPosition({
      buyPrice: 11,
      buyTime: "2020-01-01T18:00:00Z",
      lots: 9,
      status: "confirmed",
      stopLoss: 10.99,
      takeProfit: 11.1,
    });
    await mainLoop({
      time: "2020-01-01T18:00:00Z",
      l: 9,
      o: 10,
      c: 10.98,
      v: 100,
    });

    const position = getPosition();
    expect(position.status).toBe("confirmed");
    expect(position).toMatchSnapshot();
  });

  test("should take loss within the next candle", async () => {
    setPosition({
      buyPrice: 11,
      buyTime: "2020-01-01T18:00:00Z",
      lots: 9,
      status: "confirmed",
      stopLoss: 10.99,
      takeProfit: 11.1,
    });
    await mainLoop({
      time: "2020-01-01T18:01:00Z",
      l: 9,
      o: 10,
      c: 10.98,
      v: 100,
    });

    const position = getPosition();
    expect(position.status).toBe("closed");
    expect(position).toMatchSnapshot();
  });

  test("should delete a closed position", async () => {
    setPosition({
      balance: 10,
      buyPrice: 11,
      buyTime: "2020-01-01T18:00:00Z",
      sellPrice: 11.11,
      status: "closed",
      stopLoss: 10.99,
      takeProfit: 11.1,
      type: "PROFIT",
    });
    mockPortfolio.mockReturnValueOnce({
      positions: [
        {
          ticker: "USD",
          figi: figiUSD,
          balance: 100,
        },
      ],
    });
    await mainLoop({
      time: "2020-01-01T18:00:00Z",
      l: 9,
      o: 10,
      c: 10.98,
      v: 100,
    });

    expect(getPosition()).toBeUndefined();
  });
});
