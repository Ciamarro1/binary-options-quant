"use strict";

/**
 * 007-D: Statistical Boundaries
 * Tests the N and probability boundaries of MetricsEngine.
 *
 * Scenarios:
 * 1. N = 0  → INSUFFICIENT EVIDENCE
 * 2. N = 1  → INSUFFICIENT EVIDENCE
 * 3. N = 5  → INSUFFICIENT EVIDENCE
 * 4. N = 29 → INSUFFICIENT EVIDENCE  (boundary: MIN_SAMPLE_SIZE - 1)
 * 5. N = 30 → valid decision (boundary: MIN_SAMPLE_SIZE)
 * 6. N = 31 → valid decision
 * 7. P = 0.01 → Wilson CI must not produce NaN/error
 * 8. P = 0.99 → Wilson CI must not produce NaN/error
 */

const MetricsEngine = require('../../src/research/MetricsEngine');

const PAYOUT = 0.80;

function makeOutcomes(n, win) {
  return Array.from({ length: n }, (_, i) => ({
    prob: 0.55,
    outcome: i < win ? 'WIN' : 'LOSS'
  }));
}

// Build N outcomes where winRate = p_approx
function makePOutcomes(n, winFraction) {
  const wins = Math.round(n * winFraction);
  return makeOutcomes(n, wins);
}

describe('007-D: Statistical Boundaries', () => {
  // ── D1-D4: INSUFFICIENT EVIDENCE thresholds ──────────────────────────────
  const THRESHOLD = MetricsEngine.MIN_SAMPLE_SIZE;

  it(`D1: N=0 → INSUFFICIENT EVIDENCE`, () => {
    const m = MetricsEngine.calculate([], PAYOUT);
    expect(m.status).toBe('INSUFFICIENT EVIDENCE');
    expect(m.N).toBe(0);
  });

  it(`D2: N=1 → INSUFFICIENT EVIDENCE`, () => {
    const m = MetricsEngine.calculate(makeOutcomes(1, 1), PAYOUT);
    expect(m.status).toBe('INSUFFICIENT EVIDENCE');
    expect(m.N).toBe(1);
  });

  it(`D3: N=5 → INSUFFICIENT EVIDENCE`, () => {
    const m = MetricsEngine.calculate(makeOutcomes(5, 5), PAYOUT);
    expect(m.status).toBe('INSUFFICIENT EVIDENCE');
    expect(m.N).toBe(5);
  });

  it(`D4: N=29 (MIN-1) → INSUFFICIENT EVIDENCE`, () => {
    const m = MetricsEngine.calculate(makeOutcomes(29, 29), PAYOUT);
    expect(m.status).toBe('INSUFFICIENT EVIDENCE');
    expect(m.N).toBe(29);
    expect(m.minSampleSize).toBe(THRESHOLD);
  });

  it(`D5: N=30 (MIN) → produces a valid verdict (not INSUFFICIENT EVIDENCE)`, () => {
    const m = MetricsEngine.calculate(makeOutcomes(30, 30), PAYOUT);
    expect(m.status).not.toBe('INSUFFICIENT EVIDENCE');
    expect(m.N).toBe(30);
    expect(typeof m.winRate).toBe('number');
    expect(typeof m.ev).toBe('number');
  });

  it(`D6: N=31 → produces a valid verdict`, () => {
    const m = MetricsEngine.calculate(makeOutcomes(31, 31), PAYOUT);
    expect(m.status).not.toBe('INSUFFICIENT EVIDENCE');
    expect(m.N).toBe(31);
  });

  // ── D7: P_win = 0.01 (near-zero) ────────────────────────────────────────
  // makePOutcomes(200, 0.01) → 2 wins, 198 losses (N=200)
  // Wilson CI for p=0.01, N=200 ≈ [0.0027, 0.0357]
  // The CI must be narrow and NOT clamped to [0, 1].
  it('D7: P_win = 0.01 (near-zero) → Wilson CI is finite, narrow and positive (not clamped)', () => {
    const outcomes = makePOutcomes(200, 0.01);
    const m = MetricsEngine.calculate(outcomes, PAYOUT);
    expect(m.status).not.toBe('INSUFFICIENT EVIDENCE');
    expect(Number.isFinite(m.winRate)).toBe(true);
    expect(Number.isFinite(m.brier)).toBe(true);
    expect(Number.isFinite(m.logLoss)).toBe(true);

    const lo = m.confidenceInterval.lower;
    const hi = m.confidenceInterval.upper;

    // Must be within probability space
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(1);
    // Wilson CI should be NARROW, not a trivial [0, 1]
    // For N=200, p≈0.01, empirically CI width ≈ 0.033
    expect(hi - lo).toBeLessThan(0.10);  // CI width must be < 10pp
    // Lower bound should be positive (Wilson doesn't collapse to 0 for N=200)
    expect(lo).toBeGreaterThan(0.001);
    // Upper bound should be well below 1
    expect(hi).toBeLessThan(0.10);
  });

  // ── D8: P_win = 0.99 (near-one) ──────────────────────────────────────────
  // Wilson CI for p=0.99, N=200 ≈ [0.9643, 0.9973]
  it('D8: P_win = 0.99 (near-one) → Wilson CI is finite, narrow and close to 1 (not clamped)', () => {
    const outcomes = makePOutcomes(200, 0.99);
    const m = MetricsEngine.calculate(outcomes, PAYOUT);
    expect(m.status).not.toBe('INSUFFICIENT EVIDENCE');
    expect(Number.isFinite(m.winRate)).toBe(true);
    expect(Number.isFinite(m.brier)).toBe(true);
    expect(Number.isFinite(m.logLoss)).toBe(true);

    const lo = m.confidenceInterval.lower;
    const hi = m.confidenceInterval.upper;

    // Must be within probability space
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(1);
    // Wilson CI should be NARROW, not a trivial [0, 1]
    expect(hi - lo).toBeLessThan(0.10);  // CI width must be < 10pp
    // Lower bound should be well above 0
    expect(lo).toBeGreaterThan(0.90);
    // Upper bound should be below 1 (Wilson doesn't collapse to exactly 1 for N=200)
    expect(hi).toBeLessThan(1.0);
  });

  // ── D9: P_win exactly at break-even ───────────────────────────────────────
  it('D9: P_win exactly at break-even → EDGE NOT DETECTED', () => {
    const P_BE = 1 / (1 + PAYOUT);
    const wins = Math.round(200 * P_BE);
    const outcomes = makeOutcomes(200, wins);
    const m = MetricsEngine.calculate(outcomes, PAYOUT);
    // Exact break-even never satisfies CI_lower > P_BE
    expect(m.status).toBe('EDGE NOT DETECTED');
  });
});
