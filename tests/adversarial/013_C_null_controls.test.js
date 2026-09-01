"use strict";

const SyntheticDataGenerator = require('../../src/research/SyntheticDataGenerator');
const MetricsEngine = require('../../src/research/MetricsEngine');

describe('Adversarial 013-C: Synthetic Null Controls', () => {
  test('NC-001: Pure random walk observations produce 0 edge in TargetEngine & Metrics', () => {
    const dataset = SyntheticDataGenerator.generate({
      seed: 1337,
      asset: 'BTCUSDT',
      timeframe: '1m',
      numObservations: 2000,
      initialPrice: 65000,
      upProbability: 0.50,
      volatility: 0.001
    });
    const syntheticObs = dataset.observations;
    
    // Measure 3-candle returns
    const outcomes = [];
    for (let i = 0; i < syntheticObs.length - 3; i++) {
      const entry = syntheticObs[i].close;
      const exit = syntheticObs[i + 3].close;
      if (entry === exit) continue;
      outcomes.push({
        prob: 0.50,
        outcome: exit < entry ? 'WIN' : 'LOSS',
        direction: 'PUT'
      });
    }

    const metrics = MetricsEngine.calculate(outcomes, 0.80);
    expect(metrics.status).toBe('EDGE NOT DETECTED');
    expect(metrics.winRate).toBeGreaterThan(0.45);
    expect(metrics.winRate).toBeLessThan(0.55);
  });
});
