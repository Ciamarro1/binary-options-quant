"use strict";

const RatioZScoreModel = require('../../src/strategy/models/RatioZScoreModel');
const ReversedRatioZScoreModel = require('../../src/strategy/models/ReversedRatioZScoreModel');
const H005Runner = require('../../src/strategy/runners/H005Runner');

// Deterministic Mulberry32 PRNG
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('035 Adversarial Red Team Suite: HYPOTHESIS_005', () => {

  test('035-A: Causal Invariant — Zero Lookahead Leakage', () => {
    const model = new RatioZScoreModel(120, 2.0, 900);
    const initialPrice = 100.0;

    // Feed 120 candles of stable price with minor random noise
    for (let i = 0; i < 120; i++) {
      const c = {
        timestamp: 1000 + i * 60000,
        open: initialPrice + (i % 2 === 0 ? 0.1 : -0.1),
        high: initialPrice + 0.5,
        low: initialPrice - 0.5,
        close: initialPrice + (i % 2 === 0 ? 0.1 : -0.1),
        volume: 100
      };
      model.predict(c);
      model.update(c);
    }

    // At candle 121, predict on a normal candle
    const testCandle = {
      timestamp: 1000 + 120 * 60000,
      open: 100.0,
      high: 100.2,
      low: 99.8,
      close: 100.0,
      volume: 100
    };

    const predBefore = model.predict(testCandle);

    // Verify window state does NOT contain testCandle
    expect(model.window.length).toBe(120);
    expect(model.window[model.window.length - 1]).not.toBe(Math.log(testCandle.close));

    // Calling predict multiple times is idempotent and read-only
    const predRepeat = model.predict(testCandle);
    expect(predBefore.zScore).toBe(predRepeat.zScore);
    expect(predBefore.direction).toBe(predRepeat.direction);
  });

  test('035-B: Numerical Fuzzing & Boundary Protection', () => {
    const model = new RatioZScoreModel(120, 2.0, 900);

    // 1. Insufficient lookback (< 120 candles)
    for (let i = 0; i < 50; i++) {
      const c = { timestamp: i * 60000, open: 80, high: 81, low: 79, close: 80, volume: 10 };
      const pred = model.predict(c);
      expect(pred.direction).toBe('NO_SIGNAL');
      expect(pred.reason).toBe('INSUFFICIENT_LOOKBACK');
      model.update(c);
    }

    // 2. Flatline prices -> Zero variance guard
    const flatModel = new RatioZScoreModel(10, 2.0, 900);
    for (let i = 0; i < 10; i++) {
      const c = { timestamp: i * 60000, open: 50.0, high: 50.0, low: 50.0, close: 50.0, volume: 10 };
      flatModel.update(c);
    }
    const flatPred = flatModel.predict({ timestamp: 600000, open: 50.0, high: 50.0, low: 50.0, close: 50.0, volume: 10 });
    expect(flatPred.direction).toBe('NO_SIGNAL');
    expect(flatPred.reason).toBe('ZERO_OR_INVALID_VARIANCE');

    // 3. Corrupt/negative close price
    const negPred = model.predict({ timestamp: 1, open: 50, high: 50, low: 50, close: -10, volume: 10 });
    expect(negPred.direction).toBe('NO_SIGNAL');
    expect(negPred.reason).toBe('INVALID_CANDLE');
  });

  test('035-C: Negative Directional Control Invariance', () => {
    const standardModel = new RatioZScoreModel(20, 1.5, 900);
    const reversedModel = new ReversedRatioZScoreModel(20, 1.5, 900);

    // Feed 20 candles
    for (let i = 0; i < 20; i++) {
      const c = {
        timestamp: i * 60000,
        open: 100, high: 101, low: 99,
        close: 100 + Math.sin(i),
        volume: 50
      };
      standardModel.update(c);
      reversedModel.update(c);
    }

    // Extreme drop -> standard should CALL, reversed should PUT
    const dropCandle = { timestamp: 20 * 60000, open: 95, high: 96, low: 90, close: 92, volume: 50 };
    const stdDrop = standardModel.predict(dropCandle);
    const revDrop = reversedModel.predict(dropCandle);

    expect(stdDrop.direction).toBe('CALL');
    expect(revDrop.direction).toBe('PUT');
    expect(revDrop.control).toBe('NEGATIVE_REVERSED');

    // Extreme spike -> standard should PUT, reversed should CALL
    const spikeCandle = { timestamp: 20 * 60000, open: 105, high: 110, low: 104, close: 108, volume: 50 };
    const stdSpike = standardModel.predict(spikeCandle);
    const revSpike = reversedModel.predict(spikeCandle);

    expect(stdSpike.direction).toBe('PUT');
    expect(revSpike.direction).toBe('CALL');
  });

  test('035-D: Synthetic Null Random Walk (Mulberry32 PRNG)', () => {
    const rng = mulberry32(0xDEADBEEF);
    const numBars = 5000;
    const syntheticObservations = [];
    let currentPrice = 100.0;

    for (let i = 0; i < numBars; i++) {
      // Gaussian noise via Box-Muller
      const u1 = rng();
      const u2 = rng();
      const z = Math.sqrt(-2.0 * Math.log(u1 + 1e-12)) * Math.cos(2.0 * Math.PI * u2);
      const ret = z * 0.001; // 10 bps standard deviation per minute
      currentPrice *= Math.exp(ret);

      syntheticObservations.push({
        timestamp: 1700000000000 + i * 60000,
        open: currentPrice,
        high: currentPrice * 1.0005,
        low: currentPrice * 0.9995,
        close: currentPrice,
        volume: 100,
        timeframe: '1m',
        asset: 'SYNTHETIC_NULL'
      });
    }

    const runner = new H005Runner(syntheticObservations, {
      lookback: 120,
      threshold: 2.0,
      expiryBars: 15,
      payoutRate: 0.88
    });

    const result = runner.runSlice(0, numBars);

    // On pure geometric Brownian motion, expected win rate is ~50%
    if (result.resolvedTrades >= 30) {
      expect(result.winRate).toBeGreaterThanOrEqual(0.40);
      expect(result.winRate).toBeLessThanOrEqual(0.60);
      // Wilson lower bound MUST NOT beat breakeven hurdle on noise
      expect(result.wilsonCI.lower).toBeLessThan(result.breakevenRate);
    }
  });

  test('035-E: Wilson Score Analytical Properties', () => {
    // Exact mathematical validation of Wilson formula
    const ci100 = H005Runner.computeWilsonCI(55, 100);
    expect(ci100.center).toBeCloseTo(0.55, 2);
    expect(ci100.lower).toBeLessThan(0.55);
    expect(ci100.upper).toBeGreaterThan(0.55);

    // When N -> infinity, CI shrinks to empirical mean
    const ciInf = H005Runner.computeWilsonCI(55000, 100000);
    expect(ciInf.lower).toBeCloseTo(0.55, 1);
    expect(ciInf.upper).toBeCloseTo(0.55, 1);
  });
});
