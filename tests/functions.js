const { expect } = require('chai');
const { CLOSE } = require('../js/constants');
const functions = require('../js/functions');

describe('Functions', () => {
  describe('SMA', () => {
    const quote = [
      { [CLOSE]: 1 },
      { [CLOSE]: 2 },
      { [CLOSE]: 3 },
      { [CLOSE]: 2 },
      { [CLOSE]: 1 },
    ];

    it('should return 1 for SMA(0, 3)', () => {
      const result = functions.SMA(quote, 0, 3);
      expect(result).to.be.a('number');
      expect(result).to.be.equal(1);
    });

    it('should return 1.5 for SMA(1, 3)', () => {
      const result = functions.SMA(quote, 1, 3);
      expect(result).to.be.a('number');
      expect(result).to.be.equal(1.5);
    });

    it('should return 2 for SMA(2, 3)', () => {
      const result = functions.SMA(quote, 2, 3);
      expect(result).to.be.a('number');
      expect(result).to.be.equal(2);
    });

    it('should return 2.3333 for SMA(3, 3)', () => {
      const result = functions.SMA(quote, 3, 3);
      expect(result).to.be.a('number');
      expect(result).to.be.equal(2.3333);
    });

    it('should return 2 for SMA(4, 3)', () => {
      const result = functions.SMA(quote, 4, 3);
      expect(result).to.be.a('number');
      expect(result).to.be.equal(2);
    });

    describe('Offset', () => {
      it("should return 'undefined' for SMA(0, 3, Close, 1)", () => {
        const result = functions.SMA(quote, 0, 3, CLOSE, 1);
        // eslint-disable-next-line no-unused-expressions
        expect(result).to.be.undefined;
      });

      it('should return 1 for SMA(1, 3, Close, 1)', () => {
        const result = functions.SMA(quote, 1, 3, CLOSE, 1);
        expect(result).to.be.a('number');
        expect(result).to.be.equal(1);
      });

      it('should return 2.3333 for SMA(4, 3, Close, 1)', () => {
        const result = functions.SMA(quote, 4, 3, CLOSE, 1);
        expect(result).to.be.a('number');
        expect(result).to.be.equal(2.3333);
      });

      it('should return 2.3333 for SMA(5, 3, Close, 2)', () => {
        const result = functions.SMA(quote, 5, 3, CLOSE, 2);
        expect(result).to.be.a('number');
        expect(result).to.be.equal(2.3333);
      });
    });
  });
});
