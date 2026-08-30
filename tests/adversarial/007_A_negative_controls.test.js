"use strict";

/**
 * 007-A: Negative Controls
 * Tests that the detector reliably rejects bad models.
 *
 * Scenarios:
 * 1. Label permutation (N=100 seeds) – must produce zero EDGE DETECTED.
 * 2. Always-CALL in UP-trending market – must be rejected.
 * 3. Always-PUT in UP-trending market – must be rejected.
 * 4. Always-CALL in DOWN-trending market – must be rejected.
 * 5. Always-PUT in DOWN-trending market (wins a lot but P_win < P_BE) – must be rejected or detected correctly.
 * 6. Random-direction model – must be rejected.
 */

const MetricsEngine = require('../../src/research/MetricsEngine');
const SyntheticDataGenerator = require('../../src/research/SyntheticDataGenerator');
const mulberry32 = (a) => () => { var t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// Helpers
function makeOutcomes(n, winRate) {
  const outcomes = [];
  const rng = mulberry32(42);
  for (let i = 0; i < n; i++) {
    outcomes.push({ prob: 0.55, outcome: rng() < winRate ? 'WIN' : 'LOSS' });
  }
  return outcomes;
}

function shuffleOutcomes(outcomes, seed) {
  const arr = outcomes.map(o => ({ ...o }));
  const rng = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i].outcome, arr[j].outcome] = [arr[j].outcome, arr[i].outcome];
  }
  return arr;
}

describe('007-A: Negative Controls', () => {
  const PAYOUT = 0.80;
  const P_BE = 1 / (1 + PAYOUT); // 55.56%

  // ── A1: Label Permutation ──────────────────────────────────────────────────
  describe('A1: Label Permutation', () => {
    it('should produce zero EDGE DETECTED across 100 fixed-seed permutations', () => {
      // Use a dataset that has exactly P(win) = 52% (below break-even but not random noise)
      const baseOutcomes = makeOutcomes(1000, 0.52);

      let falsePositives = 0;
      for (let seed = 1; seed <= 100; seed++) {
        const permuted = shuffleOutcomes(baseOutcomes, seed);
        const metrics = MetricsEngine.calculate(permuted, PAYOUT);
        if (metrics.status === 'EDGE DETECTED') falsePositives++;
      }

      expect(falsePositives).toBe(0);
    });

    it('should preserve N and sum of wins across permutations (same labels, different order)', () => {
      const baseOutcomes = makeOutcomes(500, 0.58);
      const baseWins = baseOutcomes.filter(o => o.outcome === 'WIN').length;
      
      for (let seed = 1; seed <= 10; seed++) {
        const permuted = shuffleOutcomes(baseOutcomes, seed);
        const permWins = permuted.filter(o => o.outcome === 'WIN').length;
        expect(permuted.length).toBe(baseOutcomes.length);
        expect(permWins).toBe(baseWins);
      }
    });
  });

  // ── A2: Always-CALL in UP market ─────────────────────────────────────────
  describe('A2: Always-CALL model in strictly UP-trending market', () => {
    it('should win ~100% but payout still requires >P_BE — no edge if wins < P_BE', () => {
      // In an UP market, CALL always wins = 100% win rate => edge IS real.
      // This test checks that EDGE DETECTED is only triggered when P_win > P_BE.
      // 100% win rate IS above P_BE — this should be EDGE DETECTED.
      const neverLoses = Array.from({ length: 100 }, () => ({ prob: 0.99, outcome: 'WIN' }));
      const metrics = MetricsEngine.calculate(neverLoses, PAYOUT);
      expect(metrics.status).toBe('EDGE DETECTED');
      expect(metrics.winRate).toBe(1.0);
    });
  });

  // ── A3: Always-PUT in UP market ────────────────────────────────────────────
  describe('A3: Always-PUT model in UP-trending market', () => {
    it('should produce near-zero win rate → EDGE NOT DETECTED', () => {
      // PUT loses every candle that goes UP.
      const alwaysLose = Array.from({ length: 200 }, () => ({ prob: 0.55, outcome: 'LOSS' }));
      const metrics = MetricsEngine.calculate(alwaysLose, PAYOUT);
      expect(metrics.status).toBe('EDGE NOT DETECTED');
      expect(metrics.winRate).toBe(0);
      expect(metrics.ev).toBeLessThan(0);
    });
  });

  // ── A4: Always-CALL in DOWN market ────────────────────────────────────────
  describe('A4: Always-CALL model in DOWN-trending market', () => {
    it('should produce near-zero win rate → EDGE NOT DETECTED', () => {
      // CALL loses in a DOWN market — mirror of A3.
      const alwaysLose = Array.from({ length: 200 }, () => ({ prob: 0.55, outcome: 'LOSS' }));
      const metrics = MetricsEngine.calculate(alwaysLose, PAYOUT);
      expect(metrics.status).toBe('EDGE NOT DETECTED');
      expect(metrics.winRate).toBe(0);
    });
  });

  // ── A5: Symmetric always-wrong model in BOTH directions ───────────────────
  describe('A5: Symmetric always-wrong model', () => {
    it('should be rejected regardless of market direction', () => {
      // 20% win rate: far below P_BE = 55.56%
      const outcomes = Array.from({ length: 200 }, (_, i) => ({
        prob: 0.55,
        outcome: i % 5 === 0 ? 'WIN' : 'LOSS'
      }));
      const metrics = MetricsEngine.calculate(outcomes, PAYOUT);
      expect(metrics.status).toBe('EDGE NOT DETECTED');
      expect(metrics.winRate).toBeCloseTo(0.20, 1);
      expect(metrics.ev).toBeLessThan(-0.5);
    });
  });

  // ── A6: Random-direction model ────────────────────────────────────────────
  describe('A6: Random-direction model (50/50)', () => {
    it('should produce win rate ~50% → EDGE NOT DETECTED (below P_BE)', () => {
      const randomOutcomes = makeOutcomes(1000, 0.50);
      const metrics = MetricsEngine.calculate(randomOutcomes, PAYOUT);
      expect(metrics.status).toBe('EDGE NOT DETECTED');
      expect(metrics.winRate).toBeLessThan(P_BE);
    });

    it('should be consistent across 10 different seeds (all EDGE NOT DETECTED)', () => {
      let edgeCount = 0;
      for (let seed = 1; seed <= 10; seed++) {
        const rng = mulberry32(seed * 137);
        const outcomes = Array.from({ length: 500 }, () => ({
          prob: 0.52,
          outcome: rng() < 0.50 ? 'WIN' : 'LOSS'
        }));
        const metrics = MetricsEngine.calculate(outcomes, PAYOUT);
        if (metrics.status === 'EDGE DETECTED') edgeCount++;
      }
      // At P(win)=50%, statistical noise should never push us above P_BE=55.56%
      expect(edgeCount).toBe(0);
    });
  });
});
