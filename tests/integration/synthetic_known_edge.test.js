"use strict";
const SyntheticDataGenerator = require('../../src/research/SyntheticDataGenerator');
const ReplayEngine = require('../../src/replay/ReplayEngine');
const WalkForward = require('../../src/validation/WalkForward');
const BaselineModel = require('../../src/research/BaselineModel');
const MetricsEngine = require('../../src/research/MetricsEngine');
const FeatureEngine = require('../../src/strategy/FeatureEngine');
const RegimeEngine = require('../../src/strategy/RegimeEngine');
const SignalEngine = require('../../src/strategy/SignalEngine');

describe('Synthetic Known-Edge Validation (Commit 006A)', () => {
  it('KNOWN EDGE PROCESS: validates that the detector successfully detects a true edge', () => {
    // We generate a dataset with P(UP) = 0.60
    // payout = 0.80 => BE = 55.55%
    // The baseline model will learn P(UP) ~ 0.60, and will predict CALL with 0.60 prob.
    // Real win rate will be ~0.60.
    // CI lower bound will be ~ 0.59, which is > BE.
    // EDGE DETECTED must trigger.
    
    const seed = 9999;
    const payout = 0.80; 
    
    // 1. Generate Known-Edge Dataset
    const dataset = SyntheticDataGenerator.generate({
      seed,
      asset: 'EDGE_ASSET',
      timeframe: 'M1',
      numObservations: 10000,
      initialPrice: 1000,
      upProbability: 0.60,
      volatility: 0.001
    });

    // 2. Setup engines
    const signalEngine = new SignalEngine({
      featureEngine: new FeatureEngine('v1', '1.0'),
      regimeEngine: new RegimeEngine()
    });
    const replayEngine = new ReplayEngine({ signalEngine });

    // 3. Walk Forward Splits
    const allOutcomes = [];
    const splits = WalkForward.generateSplits(dataset.observations, 1000, 1000);
    
    for (const { train, test } of splits) {
      const testDataset = { ...dataset, observations: test };
      const fittedModel = BaselineModel.fit(train);
      
      const replay = replayEngine.run(testDataset, fittedModel, payout);
      allOutcomes.push(...replay.outcomes);
    }

    // 4. Evaluate metrics
    const mappedOutcomes = allOutcomes.map(o => ({ prob: o.probability, outcome: o.outcome }));
    const metrics = MetricsEngine.calculate(mappedOutcomes, payout);
    
    // Expected: The edge is strictly detected.
    expect(metrics.status).toBe('EDGE DETECTED');
    expect(metrics.winRate).toBeGreaterThan(0.58);
    expect(metrics.winRate).toBeLessThan(0.62);
  });
});
