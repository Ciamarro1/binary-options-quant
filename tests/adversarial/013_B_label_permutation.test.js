"use strict";

const MetricsEngine = require('../../src/research/MetricsEngine');

// Deterministic Mulberry32 PRNG
function mulberry32(seed) {
  return function() {
    var t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

describe('Adversarial 013-B: 1,000 Label Permutations Certification', () => {
  test('LP-001: Shuffled outcomes across 1,000 iterations produce 0 false positives', () => {
    const N = 500;
    const payout = 0.80;
    const P_BE = 1 / (1 + payout); // 0.555556
    
    // Create base data with 50% win rate
    const baseOutcomes = [];
    for (let i = 0; i < N; i++) {
      baseOutcomes.push({
        prob: 0.55,
        outcome: i < N / 2 ? 'WIN' : 'LOSS',
        direction: 'PUT'
      });
    }

    const rng = mulberry32(42);
    let falsePositives = 0;
    const iterations = 1000;

    for (let iter = 0; iter < iterations; iter++) {
      // Fisher-Yates shuffle using Mulberry32
      const shuffled = [...baseOutcomes];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const temp = shuffled[i].outcome;
        shuffled[i] = { ...shuffled[i], outcome: shuffled[j].outcome };
        shuffled[j] = { ...shuffled[j], outcome: temp };
      }

      const metrics = MetricsEngine.calculate(shuffled, payout);
      if (metrics.status === 'EDGE DETECTED') {
        falsePositives++;
      }
    }

    expect(falsePositives).toBe(0);
  });
});
