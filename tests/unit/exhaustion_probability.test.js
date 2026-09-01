"use strict";

const ExhaustionModel = require('../../src/strategy/models/ExhaustionModel');
const MarketObservation = require('../../src/core/MarketObservation');

describe('Exhaustion Probability Estimation Certification', () => {
  test('EP-001: N < 30 in Train sets probability = null and blocks signals', () => {
    const obs = [];
    for (let i = 0; i < 30; i++) {
      obs.push(new MarketObservation({
        asset: 'BTCUSDT',
        timeframe: '1m',
        timestamp: 1000 + i * 60000,
        open: 100, high: 105, low: 95, close: 100, volume: 100
      }));
    }

    const model = ExhaustionModel.fit(obs, { minTrainSamples: 30 });
    expect(model.probCall).toBeNull();
    expect(model.probPut).toBeNull();
  });

  test('EP-002: Independent probabilities by direction', () => {
    const model = new ExhaustionModel(0.58, 0.62, { minTrainSamples: 30 });
    expect(model.probCall).toBe(0.58);
    expect(model.probPut).toBe(0.62);
    expect(Object.isFrozen(model)).toBe(true);
  });
});
