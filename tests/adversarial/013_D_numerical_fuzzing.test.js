"use strict";

const FeatureEngine = require('../../src/strategy/FeatureEngine');
const ExhaustionModel = require('../../src/strategy/models/ExhaustionModel');
const MarketObservation = require('../../src/core/MarketObservation');

describe('Adversarial 013-D: Extreme Numerical Fuzzing', () => {
  let engine;
  let model;

  beforeEach(() => {
    engine = new FeatureEngine('fuzz', '1.0');
    model = new ExhaustionModel(0.60, 0.60);
  });

  test('NF-001: Flat candle (O=H=L=C=0) does not produce NaN or false signals', () => {
    const obs = [new MarketObservation({
      asset: 'BTCUSDT', timeframe: '1m', timestamp: 1000,
      open: 0, high: 0, low: 0, close: 0, volume: 0
    })];

    const snap = engine.extractFeatures('BTCUSDT', 1000, obs);
    expect(snap.features.closeLocation).toBeNull();
    expect(snap.features.volumeRatio).toBeNull();
    expect(model.predict(snap)).toBeNull();
  });

  test('NF-002: Zero ATR does not cause division by zero or NaN', () => {
    const obs = [];
    for (let i = 0; i < 25; i++) {
      obs.push(new MarketObservation({
        asset: 'BTCUSDT', timeframe: '1m', timestamp: 1000 + i * 60000,
        open: 100, high: 100, low: 100, close: 100, volume: 100
      }));
    }
    const snap = engine.extractFeatures('BTCUSDT', 1000 + 24 * 60000, obs);
    expect(snap.features.atr).toBe(0);
    expect(snap.features.bodyRatio).toBeNull();
    expect(model.predict(snap)).toBeNull();
  });
});
