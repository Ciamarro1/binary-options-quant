"use strict";

const MetricsEngine = require('../../src/research/MetricsEngine');
const CalibrationEngine = require('../../src/research/CalibrationEngine');
const WalkForward = require('../../src/validation/WalkForward');

describe('Quantitative Evidence Laboratory Core', () => {
  it('MetricsEngine calculates Edge correctly and reports EDGE NOT DETECTED on variance', () => {
    const preds = Array.from({ length: 40 }, () => ({ prob: 0.55, outcome: 'WIN' }))
      .concat(Array.from({ length: 60 }, () => ({ prob: 0.55, outcome: 'LOSS' })));
    
    // 40 wins out of 100 = 40% win rate. Break even for payout 0.85 = ~54.05%
    const metrics = MetricsEngine.calculate(preds, 0.85);
    expect(metrics.winRate).toBe(0.4);
    expect(metrics.edge).toBeLessThan(0);
    expect(metrics.status).toBe('EDGE NOT DETECTED');
  });

  it('MetricsEngine requires statistical significance for EDGE DETECTED', () => {
    // For 1.0 payout, BE = 0.5.
    // 55/100 = 0.55.
    // Wilson CI lower bound for p=0.55, N=100, z=1.96:
    // center ≈ 0.549, spread ≈ 0.096 => ciLower ≈ 0.453
    // Since 0.453 is NOT > 0.50, edge is NOT detected statistically.
    const preds = Array.from({ length: 55 }, () => ({ prob: 0.55, outcome: 'WIN' }))
      .concat(Array.from({ length: 45 }, () => ({ prob: 0.55, outcome: 'LOSS' })));
    
    const metrics = MetricsEngine.calculate(preds, 1.0);
    expect(metrics.edge).toBeCloseTo(0.05);
    expect(metrics.status).toBe('EDGE NOT DETECTED'); 
  });

  it('MetricsEngine reports EDGE DETECTED for highly significant result', () => {
    // 600 wins out of 1000 = 60%. CI lower bound = ~57%. > 50%
    const preds = Array.from({ length: 600 }, () => ({ prob: 0.60, outcome: 'WIN' }))
      .concat(Array.from({ length: 400 }, () => ({ prob: 0.60, outcome: 'LOSS' })));
    
    const metrics = MetricsEngine.calculate(preds, 1.0);
    expect(metrics.status).toBe('EDGE DETECTED');
  });

  it('CalibrationEngine bins probabilities correctly', () => {
    const preds = [
      { prob: 0.65, outcome: 'WIN' },
      { prob: 0.62, outcome: 'LOSS' },
      { prob: 0.68, outcome: 'WIN' }
    ];
    // Bin for 0.6 - 0.7 should have 3 items, 2 wins -> empirical 0.666
    const calibration = CalibrationEngine.analyze(preds, 10);
    const bin = calibration[6]; // 0.6 to 0.7
    expect(bin.count).toBe(3);
    expect(bin.empirical).toBeCloseTo(0.666, 2);
  });

  it('WalkForward splits temporally', () => {
    const data = [
      { timestamp: 1 }, { timestamp: 2 }, { timestamp: 3 }, 
      { timestamp: 4 }, { timestamp: 5 }
    ];
    const splits = [...WalkForward.generateSplits(data, 2, 1)];
    // S1: train [1, 2] test [3]
    // S2: train [2, 3] test [4]  wait no, start advances by testSize
    // Start 0: train [1,2], test [3]. start += 1 => 1
    // Start 1: train [2,3], test [4]. start += 1 => 2
    // Start 2: train [3,4], test [5]. 
    expect(splits.length).toBe(3);
    expect(splits[0].train[1].timestamp).toBe(2);
    expect(splits[0].test[0].timestamp).toBe(3);
    expect(splits[1].train[0].timestamp).toBe(2); // strictly temporal window roll
  });

  it('WalkForward throws on causality violation', () => {
    const data = [
      { timestamp: 1 }, { timestamp: 5 }, { timestamp: 2 }, 
    ]; // out of order
    expect(() => [...WalkForward.generateSplits(data, 2, 1)]).toThrow(/Temporal leak detected/);
  });
});
