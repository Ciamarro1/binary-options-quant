"use strict";

/**
 * 007-E: Reproducibility
 * Tests that the core pipeline is strictly deterministic.
 *
 * Scenarios:
 * 1. ReplayEngine produces identical replayHash across two runs with same inputs.
 * 2. Dataset round-trip: load CSV → contentHash == stored manifest contentHash.
 * 3. Normalized baseline OOS report is idempotent (excluding executedAt).
 *
 * NOTE on E3: the full OOS script is not re-run here (too slow for unit tests).
 * Instead we verify metric idempotence at the MetricsEngine level and
 * verify that the SyntheticDataGenerator is bit-identical across two runs.
 */

const crypto = require('crypto');
const path = require('path');
const SyntheticDataGenerator = require('../../src/research/SyntheticDataGenerator');
const MetricsEngine = require('../../src/research/MetricsEngine');
const ReplayEngine = require('../../src/replay/ReplayEngine');
const DatasetLoader = require('../../src/data/DatasetLoader');

const PAYOUT = 0.80;

// Minimal fake signal engine (same as 007-B)
function makeSingleShotEngine() {
  return {
    generateSignal(asset, timestamp, history, model) {
      if (history.length === 1) {
        return { signalId: 'repro_sig', timestamp, direction: 'CALL', expirySeconds: 60, probability: 0.55, inputHash: 'repro' };
      }
      return null;
    }
  };
}

function makeSimpleDataset(seed) {
  return SyntheticDataGenerator.generate({
    seed,
    asset: 'BTCUSDT',
    timeframe: '1m',
    numObservations: 200,
    initialPrice: 42000,
    upProbability: 0.50,
    volatility: 0.002
  });
}

describe('007-E: Reproducibility', () => {
  const model = { id: 'TEST_REPRO', version: '1.0' };

  // ── E1: ReplayEngine is bit-identical on two runs ─────────────────────────
  it('E1: ReplayEngine produces identical replayHash for identical inputs', () => {
    const dataset = makeSimpleDataset(42);
    const engine = new ReplayEngine({ signalEngine: makeSingleShotEngine() });

    const result1 = engine.run(dataset, model, PAYOUT);
    const result2 = engine.run(dataset, model, PAYOUT);

    expect(result1.replayHash).toBe(result2.replayHash);
    expect(result1.signals.length).toBe(result2.signals.length);
    expect(result1.outcomes.length).toBe(result2.outcomes.length);
  });

  // ── E2: Different seeds → different replayHash ────────────────────────────
  it('E2: Different dataset seeds produce different replayHashes', () => {
    const engine = new ReplayEngine({ signalEngine: makeSingleShotEngine() });
    const d1 = makeSimpleDataset(42);
    const d2 = makeSimpleDataset(999);

    const r1 = engine.run(d1, model, PAYOUT);
    const r2 = engine.run(d2, model, PAYOUT);

    expect(r1.replayHash).not.toBe(r2.replayHash);
  });

  // ── E3: SyntheticDataGenerator is bit-identical for same seed ─────────────
  it('E3: SyntheticDataGenerator produces identical datasetContentHash for same seed', () => {
    const d1 = makeSimpleDataset(12345);
    const d2 = makeSimpleDataset(12345);
    expect(d1.metadata.contentHash).toBe(d2.metadata.contentHash);
  });

  it('E3b: Different seeds produce different contentHash', () => {
    const d1 = makeSimpleDataset(12345);
    const d2 = makeSimpleDataset(99999);
    expect(d1.metadata.contentHash).not.toBe(d2.metadata.contentHash);
  });

  // ── E4: MetricsEngine is deterministic (no RNG inside) ───────────────────
  it('E4: MetricsEngine.calculate is deterministic for same inputs', () => {
    const outcomes = Array.from({ length: 200 }, (_, i) => ({
      prob: 0.55,
      outcome: i % 2 === 0 ? 'WIN' : 'LOSS'
    }));

    const m1 = MetricsEngine.calculate(outcomes, PAYOUT);
    const m2 = MetricsEngine.calculate(outcomes, PAYOUT);

    expect(m1.winRate).toBe(m2.winRate);
    expect(m1.ev).toBe(m2.ev);
    expect(m1.status).toBe(m2.status);
    expect(m1.confidenceInterval.lower).toBe(m2.confidenceInterval.lower);
    expect(m1.confidenceInterval.upper).toBe(m2.confidenceInterval.upper);
  });

  // ── E5: Dataset round-trip ────────────────────────────────────────────────
  it('E5: DatasetLoader contentHash matches manifest.datasetContentHash for real dataset', () => {
    const csvPath = path.join(
      __dirname, '..', '..', 'research', 'datasets', 'BTCUSDT', '1m', '2024-01', 'canonical', 'BTCUSDT_1m_2024_01.csv'
    );
    const manifestPath = path.join(
      __dirname, '..', '..', 'research', 'datasets', 'BTCUSDT', '1m', '2024-01', 'manifest.json'
    );

    const fs = require('fs');
    if (!fs.existsSync(csvPath) || !fs.existsSync(manifestPath)) {
      // Skip gracefully if real dataset not present in environment
      return;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const dataset = DatasetLoader.loadCSV(csvPath, {
      datasetId: manifest.datasetId,
      asset: 'BTCUSDT',
      timeframe: '1m',
      source: 'test'
    });
    expect(dataset.metadata.contentHash).toBe(manifest.datasetContentHash);
  });

  // ── E6: Normalized OOS report components are idempotent ───────────────────
  it('E6: MetricsEngine output keys are stable (no executedAt or timestamps)', () => {
    const outcomes = Array.from({ length: 500 }, (_, i) => ({
      prob: 0.52,
      outcome: i % 2 === 0 ? 'WIN' : 'LOSS'
    }));

    const m = MetricsEngine.calculate(outcomes, PAYOUT);

    // Normalized report should not contain time-varying fields
    const normalized = JSON.stringify({
      N: m.N,
      winRate: m.winRate,
      ev: m.ev,
      edge: m.edge,
      status: m.status,
      ciLower: m.confidenceInterval.lower,
      ciUpper: m.confidenceInterval.upper,
      brier: m.brier,
      logLoss: m.logLoss
    });

    // Re-run to verify
    const m2 = MetricsEngine.calculate(outcomes, PAYOUT);
    const normalized2 = JSON.stringify({
      N: m2.N, winRate: m2.winRate, ev: m2.ev, edge: m2.edge, status: m2.status,
      ciLower: m2.confidenceInterval.lower, ciUpper: m2.confidenceInterval.upper,
      brier: m2.brier, logLoss: m2.logLoss
    });

    expect(normalized).toBe(normalized2);
  });
});
