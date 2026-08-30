"use strict";

/**
 * 007-F: PUSH Stress
 * Tests behavior when PUSH proportion is extreme.
 *
 * Scenarios:
 * 1. 90% PUSH — N resolved should be small; must not crash.
 * 2. 95% PUSH — even smaller resolved N.
 * 3. ~100% PUSH — effectively zero resolved outcomes → INSUFFICIENT EVIDENCE.
 * 4. PUSH excluded from P_win denominator (structural check).
 */

const MetricsEngine = require('../../src/research/MetricsEngine');
const CalibrationEngine = require('../../src/research/CalibrationEngine');

function makeOutcomesWithPush(total, winFrac, lossFrac) {
  // pushFrac = 1 - winFrac - lossFrac
  const wins  = Math.round(total * winFrac);
  const losses = Math.round(total * lossFrac);
  const pushes = total - wins - losses;
  const outcomes = [];
  for (let i = 0; i < wins;   i++) outcomes.push({ prob: 0.55, outcome: 'WIN'  });
  for (let i = 0; i < losses; i++) outcomes.push({ prob: 0.55, outcome: 'LOSS' });
  for (let i = 0; i < pushes; i++) outcomes.push({ prob: 0.55, outcome: 'PUSH' });
  return outcomes;
}

describe('007-F: PUSH Stress', () => {
  const PAYOUT = 0.80;

  // ── F1: 90% PUSH ──────────────────────────────────────────────────────────
  it('F1: 90% PUSH — resolves without error; N reflects only WIN+LOSS', () => {
    // 1000 total: 50 WIN, 50 LOSS, 900 PUSH = 90%
    const outcomes = makeOutcomesWithPush(1000, 0.05, 0.05);
    expect(() => MetricsEngine.calculate(outcomes, PAYOUT)).not.toThrow();
    const m = MetricsEngine.calculate(outcomes, PAYOUT);
    expect(m.N).toBe(100); // only WIN+LOSS
    // With N=100 and winRate=50% → EDGE NOT DETECTED
    expect(m.status).toBe('EDGE NOT DETECTED');
  });

  // ── F2: 95% PUSH ──────────────────────────────────────────────────────────
  it('F2: 95% PUSH — N still counts only WIN+LOSS', () => {
    // 1000 total: 25 WIN, 25 LOSS, 950 PUSH = 95%
    const outcomes = makeOutcomesWithPush(1000, 0.025, 0.025);
    const m = MetricsEngine.calculate(outcomes, PAYOUT);
    expect(m.N).toBe(50);
    // 50% win rate, still not enough for edge
    expect(m.status).toBe('EDGE NOT DETECTED');
  });

  // ── F3: ~100% PUSH → INSUFFICIENT EVIDENCE ───────────────────────────────
  it('F3: ~100% PUSH (only 5 WIN, 5 LOSS out of 1000) → INSUFFICIENT EVIDENCE', () => {
    const outcomes = makeOutcomesWithPush(1000, 0.005, 0.005);
    const m = MetricsEngine.calculate(outcomes, PAYOUT);
    // N = 10, below MIN_SAMPLE_SIZE=30
    expect(m.status).toBe('INSUFFICIENT EVIDENCE');
    expect(m.N).toBeLessThan(MetricsEngine.MIN_SAMPLE_SIZE);
  });

  // ── F4: 100% PUSH → INSUFFICIENT EVIDENCE ────────────────────────────────
  it('F4: 100% PUSH → INSUFFICIENT EVIDENCE (N=0)', () => {
    const allPush = Array.from({ length: 500 }, () => ({ prob: 0.55, outcome: 'PUSH' }));
    const m = MetricsEngine.calculate(allPush, PAYOUT);
    expect(m.status).toBe('INSUFFICIENT EVIDENCE');
    expect(m.N).toBe(0);
  });

  // ── F5: CalibrationEngine correctly excludes PUSH ─────────────────────────
  it('F5: CalibrationEngine bin count excludes all PUSH outcomes', () => {
    const outcomes = makeOutcomesWithPush(1000, 0.05, 0.05);
    const pushCount  = outcomes.filter(o => o.outcome === 'PUSH').length;
    const resolvedCount = outcomes.filter(o => o.outcome === 'WIN' || o.outcome === 'LOSS').length;

    const calibration = CalibrationEngine.analyze(outcomes, 10);
    const totalCalibrated = calibration.reduce((acc, bin) => acc + bin.count, 0);

    // Must equal resolved count (WIN+LOSS), not total
    expect(totalCalibrated).toBe(resolvedCount);
    expect(totalCalibrated).toBeLessThan(outcomes.length);
    expect(pushCount + totalCalibrated).toBe(outcomes.length);
  });

  // ── F6: PUSH mixed with known-edge dataset should not dilute edge signal ──
  it('F6: known 80% WIN rate dataset is still EDGE DETECTED even with 90% PUSH', () => {
    // 1000 total: 800 WIN proportion of resolved = 80%.
    // But resolved is only 100 (10%). 80 WIN, 20 LOSS, 900 PUSH.
    const outcomes = [];
    for (let i = 0; i < 80;  i++) outcomes.push({ prob: 0.85, outcome: 'WIN'  });
    for (let i = 0; i < 20;  i++) outcomes.push({ prob: 0.85, outcome: 'LOSS' });
    for (let i = 0; i < 900; i++) outcomes.push({ prob: 0.85, outcome: 'PUSH' });
    const m = MetricsEngine.calculate(outcomes, PAYOUT);
    expect(m.N).toBe(100);
    expect(m.winRate).toBeCloseTo(0.80, 2);
    // 80% >> P_BE 55.56% → EDGE DETECTED
    expect(m.status).toBe('EDGE DETECTED');
  });
});
