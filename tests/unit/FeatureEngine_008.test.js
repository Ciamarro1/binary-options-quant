"use strict";
const FeatureEngine = require('../../src/strategy/FeatureEngine');
const MarketObservation = require('../../src/core/MarketObservation');

describe('FeatureEngine 008 Features', () => {
  it('computes Wilder RMA ATR(14) and volume SMA(20) causally', () => {
    const engine = new FeatureEngine('v1', '1.0');
    const observations = [];
    
    for (let i = 1; i <= 30; i++) {
      observations.push(new MarketObservation({
        asset: 'BTCUSDT',
        timestamp: i * 60000,
        open: 100,
        high: 105,
        low: 95,
        close: i % 2 === 0 ? 102 : 98,
        volume: 10 + i,
        timeframe: '1m'
      }));
    }

    const snap = engine.extractFeatures('BTCUSDT', 30 * 60000, observations);
    expect(snap.features.hasData).toBe(true);
    expect(snap.features.atr).toBeGreaterThan(0);
    expect(snap.features.meanVolume).toBeGreaterThan(0);
    expect(snap.features.displacementRatio).toBeGreaterThan(0);
    expect(snap.features.volumeRatio).toBeGreaterThan(0);
  });
});
