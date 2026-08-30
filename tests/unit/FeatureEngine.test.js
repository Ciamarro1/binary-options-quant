"use strict";
const FeatureEngine = require('../../src/strategy/FeatureEngine');
const MarketObservation = require('../../src/core/MarketObservation');

describe('FeatureEngine', () => {
  it('extracts valid FeatureSnapshot deterministically', () => {
    const engine = new FeatureEngine('baseline', '1.0');
    const obs = [
      new MarketObservation({ asset: 'BTC', timestamp: 1, open: 1, high: 2, low: 0, close: 1, volume: 1, timeframe: 'M1' }),
      new MarketObservation({ asset: 'BTC', timestamp: 2, open: 1, high: 2, low: 0, close: 1.5, volume: 1, timeframe: 'M1' })
    ];
    
    const snap = engine.extractFeatures('BTC', 2, obs);
    expect(snap.asset).toBe('BTC');
    expect(snap.timestamp).toBe(2);
    expect(snap.features.obsCount).toBe(2);
    expect(snap.features.lastClose).toBe(1.5);
    expect(snap.featureSetId).toBe('baseline');
  });
});
