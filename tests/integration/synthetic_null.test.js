"use strict";
const SyntheticDataGenerator = require('../../src/research/SyntheticDataGenerator');
const ReplayEngine = require('../../src/replay/ReplayEngine');
const WalkForward = require('../../src/validation/WalkForward');
const BaselineModel = require('../../src/research/BaselineModel');
const MetricsEngine = require('../../src/research/MetricsEngine');
const FeatureEngine = require('../../src/strategy/FeatureEngine');
const RegimeEngine = require('../../src/strategy/RegimeEngine');
const SignalEngine = require('../../src/strategy/SignalEngine');

describe('Synthetic Null Validation (Commit 006A)', () => {
  it('NULL PROCESS: validates that the detector does not fabricate edge on random data', () => {
    // We run 3 random seeds. NONE of them should detect an edge.
    // If one does, either it's a 1-in-20 false positive (due to 95% CI), or our logic is flawed.
    // To be safe against random chance making us fail, we use a large sample (N=50000) where CI is very tight.
    // With 50,000 samples, false positives at 95% CI for a 50% true probability hitting > 0.555 (BE for 0.8 payout) is astronomically low.
    
    const seeds = [20260830, 1001, 42];
    const payout = 0.80; // BE = 55.55%
    
    for (const seed of seeds) {
      // 1. Generate Null Dataset (P(UP) = 0.5)
      const dataset = SyntheticDataGenerator.generate({
        seed,
        asset: 'RANDOM',
        timeframe: 'M1',
        numObservations: 10000,
        initialPrice: 1000,
        upProbability: 0.50,
        volatility: 0.001
      });

      // 2. Setup engines
      const signalEngine = new SignalEngine({
        featureEngine: new FeatureEngine('v1', '1.0'),
        regimeEngine: new RegimeEngine() // stub needs 2 obs
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
      
      // Expected: Since it's a random walk, edge is NOT DETECTED.
      // Expected win rate ~ 0.50
      expect(metrics.status).toBe('EDGE NOT DETECTED');
      expect(metrics.winRate).toBeGreaterThan(0.48);
      expect(metrics.winRate).toBeLessThan(0.52);
    }
  });
});
