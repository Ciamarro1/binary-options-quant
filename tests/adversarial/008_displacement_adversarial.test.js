"use strict";
const FeatureEngine = require('../../src/strategy/FeatureEngine');
const DisplacementModel = require('../../src/strategy/models/DisplacementModel');
const MarketObservation = require('../../src/core/MarketObservation');

describe('Adversarial QA 008: Causal Integrity & Lookahead Stress', () => {
  it('future observation injection at t+1 MUST NOT alter features at t', () => {
    const engine = new FeatureEngine('adv_008', '1.0');
    const obsHistory = [];
    for (let i = 1; i <= 25; i++) {
      obsHistory.push(new MarketObservation({
        asset: 'BTCUSDT',
        timestamp: i * 60000,
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 50,
        timeframe: '1m'
      }));
    }

    const snapBefore = engine.extractFeatures('BTCUSDT', 25 * 60000, obsHistory);

    const futureObs = new MarketObservation({
      asset: 'BTCUSDT',
      timestamp: 26 * 60000,
      open: 99999,
      high: 999999,
      low: 1,
      close: 500000,
      volume: 999999,
      timeframe: '1m'
    });

    expect(() => {
      engine.extractFeatures('BTCUSDT', 25 * 60000, [...obsHistory, futureObs]);
    }).toThrow(/Causality violation/);
  });
});
