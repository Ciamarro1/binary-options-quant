"use strict";

/**
 * 007-B: Temporal Adversarial
 * Tests precise boundary behavior of the ReplayEngine.
 *
 * Scenarios:
 * 1. Expiry - 1ms  → signal NOT resolved yet.
 * 2. Expiry exact  → signal resolved at precisely t + expiryMs.
 * 3. Expiry + 1ms  → signal resolved (one millisecond past target).
 * 4. Irregular async timestamps → engine handles non-uniform spacing.
 */

const ReplayEngine = require('../../src/replay/ReplayEngine');
const MarketObservation = require('../../src/core/MarketObservation');

// Fake SignalEngine that emits one CALL signal at the first observation
function makeSingleShotSignalEngine(expirySeconds) {
  return {
    generateSignal(asset, timestamp, history, model) {
      if (history.length === 1) {
        return {
          signalId: 'adv_sig_001',
          timestamp,
          direction: 'CALL',
          expirySeconds,
          probability: 0.55,
          inputHash: `hash_${timestamp}`
        };
      }
      return null;
    }
  };
}

describe('007-B: Temporal Adversarial — Expiry Boundaries', () => {
  const PAYOUT = 0.80;
  const ENTRY_TIME = 1704067200000; // 2024-01-01T00:00:00Z
  const EXPIRY_S = 60;
  const EXPIRY_MS = EXPIRY_S * 1000;

  const model = { id: 'ADV_MODEL', version: '1.0' };
  const baseMetadata = { asset: 'BTCUSDT', contentHash: 'test_hash_b' };

  function makeDataset(extraObs) {
    const entryObs = { timestamp: ENTRY_TIME, open: 100, high: 105, low: 95, close: 100, volume: 10 };
    return {
      observations: [entryObs, ...extraObs],
      metadata: baseMetadata
    };
  }

  // ── B1: expiry - 1ms → signal NOT yet resolved ───────────────────────────
  it('B1: signal at t is NOT resolved at t + expiryMs - 1', () => {
    const engine = new ReplayEngine({ signalEngine: makeSingleShotSignalEngine(EXPIRY_S) });
    const dataset = makeDataset([
      { timestamp: ENTRY_TIME + EXPIRY_MS - 1, close: 110, open: 100, high: 115, low: 99, volume: 5 }
    ]);

    const result = engine.run(dataset, model, PAYOUT);
    expect(result.signals.length).toBe(1);
    expect(result.outcomes.length).toBe(0);
    expect(result.unresolvedCount).toBe(1);
  });

  // ── B2: expiry exact → signal resolved at precisely t + expiryMs ─────────
  it('B2: signal at t IS resolved at exactly t + expiryMs', () => {
    const engine = new ReplayEngine({ signalEngine: makeSingleShotSignalEngine(EXPIRY_S) });
    const dataset = makeDataset([
      { timestamp: ENTRY_TIME + EXPIRY_MS, close: 110, open: 100, high: 115, low: 99, volume: 5 }
    ]);

    const result = engine.run(dataset, model, PAYOUT);
    expect(result.signals.length).toBe(1);
    expect(result.outcomes.length).toBe(1);
    expect(result.unresolvedCount).toBe(0);
    expect(result.outcomes[0].outcome).toBe('WIN'); // close 110 > entry 100
    expect(result.outcomes[0].expiryTimestamp).toBe(ENTRY_TIME + EXPIRY_MS);
  });

  // ── B3: expiry + 1ms → also resolved (one ms past) ──────────────────────
  it('B3: signal at t IS also resolved at t + expiryMs + 1', () => {
    const engine = new ReplayEngine({ signalEngine: makeSingleShotSignalEngine(EXPIRY_S) });
    const dataset = makeDataset([
      { timestamp: ENTRY_TIME + EXPIRY_MS + 1, close: 90, open: 100, high: 105, low: 85, volume: 5 }
    ]);

    const result = engine.run(dataset, model, PAYOUT);
    expect(result.signals.length).toBe(1);
    expect(result.outcomes.length).toBe(1);
    expect(result.outcomes[0].outcome).toBe('LOSS'); // close 90 < entry 100
  });

  // ── B4: both exact and +1ms observations present → resolves at exact ─────
  it('B4: when exact and +1ms both present, resolves on the first eligible (exact)', () => {
    const engine = new ReplayEngine({ signalEngine: makeSingleShotSignalEngine(EXPIRY_S) });
    const dataset = makeDataset([
      { timestamp: ENTRY_TIME + EXPIRY_MS,     close: 110, open: 100, high: 115, low: 99, volume: 5 },
      { timestamp: ENTRY_TIME + EXPIRY_MS + 1, close: 90,  open: 100, high: 105, low: 85, volume: 5 }
    ]);

    const result = engine.run(dataset, model, PAYOUT);
    expect(result.outcomes.length).toBe(1);
    // Resolved at the exact boundary, not at +1ms
    expect(result.outcomes[0].expiryTimestamp).toBe(ENTRY_TIME + EXPIRY_MS);
    expect(result.outcomes[0].outcome).toBe('WIN');
  });

  // ── B5: Irregular async timestamps (not exactly 60s apart) ───────────────
  it('B5: resolves correctly with irregular non-uniform timestamp spacing', () => {
    const engine = new ReplayEngine({ signalEngine: makeSingleShotSignalEngine(EXPIRY_S) });
    const dataset = makeDataset([
      // Gaps of varying size — none land on exactly expiryMs until the last one
      { timestamp: ENTRY_TIME + 15000,           close: 101, open: 100, high: 105, low: 99, volume: 1 },
      { timestamp: ENTRY_TIME + 37500,           close: 102, open: 100, high: 105, low: 99, volume: 1 },
      { timestamp: ENTRY_TIME + 59999,           close: 103, open: 100, high: 105, low: 99, volume: 1 }, // just before
      { timestamp: ENTRY_TIME + 60001,           close: 120, open: 100, high: 125, low: 99, volume: 1 }  // just after
    ]);

    const result = engine.run(dataset, model, PAYOUT);
    expect(result.signals.length).toBe(1);
    expect(result.outcomes.length).toBe(1);
    // Resolved at the first timestamp >= entryTime + 60000ms = 60001ms
    expect(result.outcomes[0].expiryTimestamp).toBe(ENTRY_TIME + 60001);
    expect(result.outcomes[0].outcome).toBe('WIN'); // close 120 > entry 100
  });
});
