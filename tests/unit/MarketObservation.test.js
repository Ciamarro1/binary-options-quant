"use strict";
const MarketObservation = require('../../src/core/MarketObservation');

describe('MarketObservation', () => {
  it('should create valid observation', () => {
    const obs = new MarketObservation({
      asset: 'EURUSD',
      timestamp: 1620000000,
      open: 1.1,
      high: 1.2,
      low: 1.0,
      close: 1.15,
      volume: 100,
      timeframe: 'M5'
    });
    expect(obs.asset).toBe('EURUSD');
    expect(obs.timeframe).toBe('M5');
  });

  it('should be immutable', () => {
    const obs = new MarketObservation({
      asset: 'EURUSD',
      timestamp: 1620000000,
      open: 1.1,
      high: 1.2,
      low: 1.0,
      close: 1.15,
      volume: 100,
      timeframe: 'M5'
    });
    expect(() => { obs.open = 1.3 }).toThrow(TypeError);
  });
});
