const MarketObservation = require('../../src/core/MarketObservation');
const BinaryContract = require('../../src/core/BinaryContract');
const ProbabilitySnapshot = require('../../src/core/ProbabilitySnapshot');
const EVEngine = require('../../src/probability/EVEngine');

describe('Constitutional Adversarial Tests', () => {

  describe('MarketObservation Adversarial', () => {
    it('should reject invalid OHLC logic', () => {
      expect(() => new MarketObservation({ asset: 'EURUSD', timestamp: 1, open: 1, high: 0.9, low: 0.5, close: 1, volume: 10, timeframe: 'M1' }))
        .toThrow('High cannot be less than max(open, close)');
      expect(() => new MarketObservation({ asset: 'EURUSD', timestamp: 1, open: 1, high: 1.5, low: 1.2, close: 1, volume: 10, timeframe: 'M1' }))
        .toThrow('Low cannot be greater than min(open, close)');
    });

    it('should reject NaN and Infinity', () => {
      expect(() => new MarketObservation({ asset: 'EURUSD', timestamp: 1, open: NaN, high: 1.5, low: 0.5, close: 1, volume: 10, timeframe: 'M1' }))
        .toThrow('Invalid open');
      expect(() => new MarketObservation({ asset: 'EURUSD', timestamp: 1, open: 1, high: 1.5, low: 0.5, close: Infinity, volume: 10, timeframe: 'M1' }))
        .toThrow('Invalid close');
    });

    it('should reject missing or negative values', () => {
      expect(() => new MarketObservation({ asset: 'EURUSD', timestamp: 0, open: 1, high: 1.5, low: 0.5, close: 1, volume: 10, timeframe: 'M1' }))
        .toThrow('Invalid timestamp');
      expect(() => new MarketObservation({ asset: 'EURUSD', timestamp: 1, open: 1, high: 1.5, low: 0.5, close: 1, volume: -1, timeframe: 'M1' }))
        .toThrow('Invalid volume');
    });
  });

  describe('BinaryContract Adversarial', () => {
    it('should reject invalid direction', () => {
      expect(() => new BinaryContract({ direction: 'SIDEWAYS', expirySeconds: 60, payout: 0.8, stake: 10 })).toThrow('Invalid direction');
    });
    
    it('should reject non-positive payout and stake', () => {
      expect(() => new BinaryContract({ direction: 'CALL', expirySeconds: 60, payout: 0, stake: 10 })).toThrow('Invalid payout');
      expect(() => new BinaryContract({ direction: 'CALL', expirySeconds: 60, payout: -1, stake: 10 })).toThrow('Invalid payout');
      expect(() => new BinaryContract({ direction: 'CALL', expirySeconds: 60, payout: 0.8, stake: 0 })).toThrow('Invalid stake');
      expect(() => new BinaryContract({ direction: 'CALL', expirySeconds: 60, payout: 0.8, stake: -100 })).toThrow('Invalid stake');
    });
  });

  describe('ProbabilitySnapshot Adversarial', () => {
    it('should reject out of bounds probability', () => {
      expect(() => new ProbabilitySnapshot({ probability: -0.1, modelId: 'm1', modelVersion: 'v1', generatedAt: 1, inputHash: 'h' })).toThrow('Invalid probability');
      expect(() => new ProbabilitySnapshot({ probability: 1.1, modelId: 'm1', modelVersion: 'v1', generatedAt: 1, inputHash: 'h' })).toThrow('Invalid probability');
    });

    it('should reject NaN and Infinity', () => {
      expect(() => new ProbabilitySnapshot({ probability: NaN, modelId: 'm1', modelVersion: 'v1', generatedAt: 1, inputHash: 'h' })).toThrow('Invalid probability');
      expect(() => new ProbabilitySnapshot({ probability: Infinity, modelId: 'm1', modelVersion: 'v1', generatedAt: 1, inputHash: 'h' })).toThrow('Invalid probability');
    });
  });

  describe('EVEngine Adversarial', () => {
    it('should reject invalid inputs', () => {
      expect(() => EVEngine.calculateEV(1.1, 0.8)).toThrow('Invalid probability');
      expect(() => EVEngine.calculateEV(-0.1, 0.8)).toThrow('Invalid probability');
      expect(() => EVEngine.calculateEV(0.5, 0)).toThrow('Invalid payout');
      expect(() => EVEngine.calculateEV(0.5, -1)).toThrow('Invalid payout');
      expect(() => EVEngine.calculateEV(NaN, 0.8)).toThrow('Invalid probability');
      expect(() => EVEngine.calculateEV(0.5, Infinity)).toThrow('Invalid payout');
    });

    it('floating point edge cases - precision checks', () => {
      const p = 0.1 + 0.2; // 0.30000000000000004
      const ev = EVEngine.calculateEV(p, 1.0); // 0.3*1 - 0.7 = -0.4
      expect(ev).toBeCloseTo(-0.4);
    });
  });
});
