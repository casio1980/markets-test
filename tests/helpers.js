const { expect } = require('chai');
const helpers = require('../js/helpers');

describe('Helpers', () => {
  describe('addDimension', () => {
    it('should return empty array for empty array and empty dimension', () => {
      const result = helpers.sequence([]).addDimension([]).value();
      expect(result).to.be.a('array');
      expect(result.length).to.be.equal(0);
    });

    it('should return array of single-dimensional items for empty array and non-empty dimension', () => {
      const result = helpers.sequence([]).addDimension([1, 2, 3]).value();
      expect(result).to.be.a('array');
      expect(result.length).to.be.equal(3);
      expect(result[0]).to.be.a('object');
      expect(result[0].item).to.be.equal(1);
    });

    it('should return array of single-dimensional items with the given name', () => {
      const result = helpers.sequence([]).addDimension([1, 2, 3], 'name').value();
      expect(result).to.be.a('array');
      expect(result.length).to.be.equal(3);
      expect(result[2]).to.be.a('object');
      expect(result[2].name).to.be.equal(3);
    });

    it('should return array of double-dimensional items for non-empty array and non-empty dimension', () => {
      const result = helpers.sequence([{ val: 'a' }, { val: 'b' }]).addDimension([1, 2, 3]).value();
      expect(result).to.be.a('array');
      expect(result.length).to.be.equal(6);
      expect(result[0]).to.be.a('object');
      expect(result[0].val).to.be.equal('a');
      expect(result[0].item).to.be.equal(1);
    });

    it('should return array of double-dimensional items with the given name', () => {
      const result = helpers.sequence([{ val: 'a' }, { val: 'b' }]).addDimension([1, 2, 3], 'name').value();
      expect(result).to.be.a('array');
      expect(result.length).to.be.equal(6);
      expect(result[5]).to.be.a('object');
      expect(result[5].val).to.be.equal('b');
      expect(result[5].name).to.be.equal(3);
    });
  });
});
