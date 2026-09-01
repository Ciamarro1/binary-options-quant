"use strict";

const FeatureEngine = require('../../src/strategy/FeatureEngine');
const MarketObservation = require('../../src/core/MarketObservation');

describe('Exhaustion Boundary Fuzzing', () => {
  let engine;

  beforeEach(() => {
    engine = new FeatureEngine('fuzz', '1.0');
  });

  test('EB-001: Flat candle (H=L=O=C) fuzzing', () => {
    const obs = [
      new MarketObservation({ asset: 'BTCUSDT', timeframe: '1m', timestamp: 1000, open: 50, high: 50, low: 50, close: 50, volume: 0 })
    ];
    const snap = engine.extractFeatures('BTCUSDT', 1000, obs);
    expect(snap.features.closeLocation).toBeNull();
    expect(snap.features.body).toBe(0);
    expect(snap.features.r).toBe(0);
  });

  test('EB-002: Zero volume across 20 periods handles gracefully', () => {
    const obs = [];
    for (let i = 0; i < 22; i++) {
      obs.push(new MarketObservation({
        asset: 'BTCUSDT',
        timeframe: '1m',
        timestamp: 1000 + i * 60000,
        open: 100, high: 105, low: 95, close: 100, volume: 0
      }));
    }
    const snap = engine.extractFeatures('BTCUSDT', 1000 + 21 * 60000, obs);
    expect(snap.features.meanVolume).toBe(0);
    expect(snap.features.volumeRatio).toBeNull();
  });
});
