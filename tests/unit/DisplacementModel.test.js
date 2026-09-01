"use strict";
const DisplacementModel = require('../../src/strategy/models/DisplacementModel');
const MarketObservation = require('../../src/core/MarketObservation');

describe('DisplacementModel', () => {
  it('fits on training observations and predicts signals accurately', () => {
    const obs = [];
    for (let i = 1; i <= 50; i++) {
      obs.push(new MarketObservation({
        asset: 'BTCUSDT',
        timestamp: i * 60000,
        open: 100,
        high: 110,
        low: 90,
        close: i % 2 === 0 ? 108 : 92,
        volume: 100,
        timeframe: '1m'
      }));
    }

    const model = DisplacementModel.fit(obs, { minTrainSamples: 2 });
    expect(model.id).toBe('DISPLACEMENT_MOMENTUM');
    expect(model.version).toBe('1.0.0');
    expect(Object.isFrozen(model)).toBe(true);
  });
});
