"use strict";

const FeatureEngine = require('../../src/strategy/FeatureEngine');
const MarketObservation = require('../../src/core/MarketObservation');

describe('Exhaustion Features Certification', () => {
  let engine;

  beforeEach(() => {
    engine = new FeatureEngine('test', '1.0');
  });

  test('EF-001: high === low yields closeLocation = null', () => {
    const obs = [
      new MarketObservation({ asset: 'BTCUSDT', timeframe: '1m', timestamp: 1000, open: 100, high: 100, low: 100, close: 100, volume: 10 })
    ];
    const snap = engine.extractFeatures('BTCUSDT', 1000, obs);
    expect(snap.features.closeLocation).toBeNull();
  });

  test('EF-002: closeLocation calculated accurately across range', () => {
    // Close at top: (110 - 90) / (110 - 90) = 1.0
    const obs1 = [
      new MarketObservation({ asset: 'BTCUSDT', timeframe: '1m', timestamp: 1000, open: 95, high: 110, low: 90, close: 110, volume: 10 })
    ];
    const snap1 = engine.extractFeatures('BTCUSDT', 1000, obs1);
    expect(snap1.features.closeLocation).toBeCloseTo(1.0, 6);

    // Close at bottom: (90 - 90) / (110 - 90) = 0.0
    const obs2 = [
      new MarketObservation({ asset: 'BTCUSDT', timeframe: '1m', timestamp: 1000, open: 95, high: 110, low: 90, close: 90, volume: 10 })
    ];
    const snap2 = engine.extractFeatures('BTCUSDT', 1000, obs2);
    expect(snap2.features.closeLocation).toBeCloseTo(0.0, 6);

    // Close at 90%: (108 - 90) / (110 - 90) = 18 / 20 = 0.90
    const obs3 = [
      new MarketObservation({ asset: 'BTCUSDT', timeframe: '1m', timestamp: 1000, open: 95, high: 110, low: 90, close: 108, volume: 10 })
    ];
    const snap3 = engine.extractFeatures('BTCUSDT', 1000, obs3);
    expect(snap3.features.closeLocation).toBeCloseTo(0.90, 6);
  });

  test('EF-003: Manual Wilder ATR(14) verification', () => {
    // Create 15 deterministic candles with constant TR = 10
    const obs = [];
    for (let i = 0; i < 15; i++) {
      obs.push(new MarketObservation({
        asset: 'BTCUSDT',
        timeframe: '1m',
        timestamp: 1000 + i * 60000,
        open: 100,
        high: 110,
        low: 100,
        close: 105,
        volume: 100
      }));
    }
    const snap = engine.extractFeatures('BTCUSDT', 1000 + 14 * 60000, obs);
    expect(snap.features.atr).toBeCloseTo(10.0, 5);
  });

  test('EF-004: Volume SMA(20) strictly excludes current candle t', () => {
    const obs = [];
    // Candles 0 to 19 (20 candles) have volume = 100
    for (let i = 0; i < 20; i++) {
      obs.push(new MarketObservation({
        asset: 'BTCUSDT',
        timeframe: '1m',
        timestamp: 1000 + i * 60000,
        open: 100, high: 105, low: 95, close: 100,
        volume: 100
      }));
    }
    // Candle 20 (current candle t) has volume = 200
    obs.push(new MarketObservation({
      asset: 'BTCUSDT',
      timeframe: '1m',
      timestamp: 1000 + 20 * 60000,
      open: 100, high: 105, low: 95, close: 100,
      volume: 200
    }));

    const snap = engine.extractFeatures('BTCUSDT', 1000 + 20 * 60000, obs);
    expect(snap.features.meanVolume).toBe(100); // Average of prior 20
    expect(snap.features.volumeRatio).toBe(2.0); // 200 / 100 = 2.0
  });
});
