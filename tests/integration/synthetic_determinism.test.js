"use strict";
const SyntheticDataGenerator = require('../../src/research/SyntheticDataGenerator');

describe('Synthetic Determinism Validation', () => {
  it('generates identical datasets for the same seed and parameters', () => {
    const params = {
      seed: 12345,
      asset: 'BTC',
      timeframe: 'M1',
      numObservations: 100,
      initialPrice: 1000,
      upProbability: 0.5,
      volatility: 0.01
    };
    
    const d1 = SyntheticDataGenerator.generate(params);
    const d2 = SyntheticDataGenerator.generate(params);
    
    expect(d1.metadata.contentHash).toBe(d2.metadata.contentHash);
    
    for (let i = 0; i < d1.observations.length; i++) {
      expect(d1.observations[i].close).toBe(d2.observations[i].close);
    }
  });

  it('generates different datasets for different seeds', () => {
    const d1 = SyntheticDataGenerator.generate({
      seed: 1, asset: 'BTC', timeframe: 'M1', numObservations: 100, initialPrice: 1000, upProbability: 0.5, volatility: 0.01
    });
    const d2 = SyntheticDataGenerator.generate({
      seed: 2, asset: 'BTC', timeframe: 'M1', numObservations: 100, initialPrice: 1000, upProbability: 0.5, volatility: 0.01
    });
    
    expect(d1.metadata.contentHash).not.toBe(d2.metadata.contentHash);
  });
});
