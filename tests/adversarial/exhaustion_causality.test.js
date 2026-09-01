"use strict";

const FeatureEngine = require('../../src/strategy/FeatureEngine');
const MarketObservation = require('../../src/core/MarketObservation');

describe('Exhaustion Causality Certification', () => {
  let engine;

  beforeEach(() => {
    engine = new FeatureEngine('causality_test', '1.0');
  });

  test('EC-001: Observation at t+1 cannot alter features at t', () => {
    const baseObs = [];
    for (let i = 0; i < 25; i++) {
      baseObs.push(new MarketObservation({
        asset: 'BTCUSDT',
        timeframe: '1m',
        timestamp: 1000 + i * 60000,
        open: 100 + i, high: 110 + i, low: 90 + i, close: 105 + i,
        volume: 100 + i * 10
      }));
    }

    const snap1 = engine.extractFeatures('BTCUSDT', baseObs[24].timestamp, baseObs);

    const poisonedObs = [...baseObs, new MarketObservation({
      asset: 'BTCUSDT',
      timeframe: '1m',
      timestamp: 1000 + 25 * 60000,
      open: 99999, high: 999999, low: 1, close: 999999, volume: 9999999
    })];

    const snap2 = engine.extractFeatures('BTCUSDT', baseObs[24].timestamp, baseObs);

    expect(snap1.features.closeLocation).toEqual(snap2.features.closeLocation);
    expect(snap1.features.atr).toEqual(snap2.features.atr);
    expect(snap1.features.volumeRatio).toEqual(snap2.features.volumeRatio);
    expect(snap1.inputHash).toEqual(snap2.inputHash);
  });

  test('EC-002: Throws on observation with timestamp > targetTimestamp', () => {
    const obs = [
      new MarketObservation({ asset: 'BTCUSDT', timeframe: '1m', timestamp: 2000, open: 100, high: 105, low: 95, close: 100, volume: 10 })
    ];
    expect(() => {
      engine.extractFeatures('BTCUSDT', 1000, obs);
    }).toThrow(/Causality violation/);
  });
});
