"use strict";
const RegimeEngine = require('../../src/strategy/RegimeEngine');
const MarketObservation = require('../../src/core/MarketObservation');

describe('RegimeEngine', () => {
  it('classifies regime deterministically', () => {
    const engine = new RegimeEngine();
    const obs = [
      new MarketObservation({ asset: 'BTC', timestamp: 1, open: 1, high: 2, low: 0, close: 1, volume: 1, timeframe: 'M1' }),
      new MarketObservation({ asset: 'BTC', timestamp: 2, open: 1, high: 2, low: 0, close: 1.5, volume: 1, timeframe: 'M1' })
    ];
    
    const snap = engine.classifyRegime('BTC', 2, obs);
    expect(snap.asset).toBe('BTC');
    expect(snap.regime).toBe('RANGE'); // based on our stub
  });
});
