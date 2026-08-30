"use strict";
const DatasetValidator = require('../../src/data/DatasetValidator');
const MarketObservation = require('../../src/core/MarketObservation');

describe('DatasetValidator', () => {
  it('throws on empty or invalid array', () => {
    expect(() => DatasetValidator.validate([])).toThrow(/Empty dataset/);
    expect(() => DatasetValidator.validate(null)).toThrow(/Empty dataset/);
  });

  it('throws on invalid instances', () => {
    expect(() => DatasetValidator.validate([{ timestamp: 1 }])).toThrow(/not a MarketObservation/);
  });

  it('throws on duplicate timestamps', () => {
    const obs = [
      new MarketObservation({ asset: 'BTC', timestamp: 1, open: 1, high: 1, low: 1, close: 1, volume: 1, timeframe: 'M1' }),
      new MarketObservation({ asset: 'BTC', timestamp: 1, open: 1, high: 1, low: 1, close: 1, volume: 1, timeframe: 'M1' })
    ];
    expect(() => DatasetValidator.validate(obs)).toThrow(/Duplicate timestamp/);
  });

  it('throws on out-of-order timestamps', () => {
    const obs = [
      new MarketObservation({ asset: 'BTC', timestamp: 2, open: 1, high: 1, low: 1, close: 1, volume: 1, timeframe: 'M1' }),
      new MarketObservation({ asset: 'BTC', timestamp: 1, open: 1, high: 1, low: 1, close: 1, volume: 1, timeframe: 'M1' })
    ];
    expect(() => DatasetValidator.validate(obs)).toThrow(/Out-of-order timestamp/);
  });

  it('passes on valid dataset', () => {
    const obs = [
      new MarketObservation({ asset: 'BTC', timestamp: 1, open: 1, high: 1, low: 1, close: 1, volume: 1, timeframe: 'M1' }),
      new MarketObservation({ asset: 'BTC', timestamp: 2, open: 1, high: 1, low: 1, close: 1, volume: 1, timeframe: 'M1' })
    ];
    expect(DatasetValidator.validate(obs)).toBe(true);
  });
});
