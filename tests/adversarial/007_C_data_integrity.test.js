"use strict";

/**
 * 007-C: Data Integrity
 * Tests that DatasetLoader and DatasetValidator/MarketObservation reject corrupted data.
 *
 * All error paths throw — we verify the right errors are thrown at the right layer.
 *
 * Scenarios:
 * C1. NaN in close     → DatasetLoader throws "Non-finite value"
 * C2. Infinity volume  → DatasetLoader throws "Non-finite value"
 * C3. Too few columns  → DatasetLoader throws "Invalid column count"
 * C4. OHLC invalid     → MarketObservation constructor throws
 * C5. Duplicate timestamps → DatasetValidator throws
 * C6. Out-of-order timestamps → DatasetValidator throws
 * C7. 5-minute gap     → DatasetValidator throws (expects 60s gap)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const DatasetLoader = require('../../src/data/DatasetLoader');
const DatasetValidator = require('../../src/data/DatasetValidator');
const MarketObservation = require('../../src/core/MarketObservation');

// Helper: write a temp CSV and return its path
function writeTempCSV(rows) {
  const header = 'timestamp,open,high,low,close,volume';
  const content = [header, ...rows].join('\n');
  const tmpPath = path.join(os.tmpdir(), `007c_${Date.now()}_${Math.random()}.csv`);
  fs.writeFileSync(tmpPath, content, 'utf-8');
  return tmpPath;
}

const LOAD_OPTS = { datasetId: 'TEST', asset: 'BTCUSDT', timeframe: '1m', source: 'test' };

describe('007-C: Data Integrity', () => {

  // ── C1: NaN in close ──────────────────────────────────────────────────────
  it('C1: throws on NaN close (text string)', () => {
    const tmpPath = writeTempCSV([
      '1704067200000,100,105,95,INVALID,1000',
    ]);
    expect(() => DatasetLoader.loadCSV(tmpPath, LOAD_OPTS)).toThrow(/Non-finite value/);
    fs.unlinkSync(tmpPath);
  });

  // ── C2: Infinity in volume ────────────────────────────────────────────────
  it('C2: throws on Infinity volume', () => {
    // parseFloat('Infinity') = Infinity, which fails Number.isFinite
    const tmpPath = writeTempCSV([
      '1704067200000,100,105,95,100,Infinity',
    ]);
    expect(() => DatasetLoader.loadCSV(tmpPath, LOAD_OPTS)).toThrow(/Non-finite value/);
    fs.unlinkSync(tmpPath);
  });

  // ── C3: Too few columns ───────────────────────────────────────────────────
  it('C3: throws on row with fewer than 6 columns', () => {
    const tmpPath = writeTempCSV([
      '1704067200000,100,105,95,100',  // 5 cols only
    ]);
    expect(() => DatasetLoader.loadCSV(tmpPath, LOAD_OPTS)).toThrow(/Invalid column count/);
    fs.unlinkSync(tmpPath);
  });

  // ── C4: OHLC invalid (high < low) ────────────────────────────────────────
  it('C4: MarketObservation throws on high < low', () => {
    expect(() => new MarketObservation({
      asset: 'BTCUSDT', timestamp: 1704067200000,
      open: 100, high: 90, low: 95,  // high < low
      close: 100, volume: 100, timeframe: '1m'
    })).toThrow(/High cannot be less than/);
  });

  // ── C5: Duplicate timestamps ──────────────────────────────────────────────
  it('C5: DatasetValidator throws on duplicate timestamps', () => {
    const ts = 1704067200000;
    const obs = [
      new MarketObservation({ asset: 'BTC', timestamp: ts,           open: 100, high: 105, low: 95, close: 100, volume: 100, timeframe: '1m' }),
      new MarketObservation({ asset: 'BTC', timestamp: ts + 60000,   open: 101, high: 106, low: 96, close: 101, volume: 101, timeframe: '1m' }),
      new MarketObservation({ asset: 'BTC', timestamp: ts + 60000,   open: 102, high: 107, low: 97, close: 102, volume: 102, timeframe: '1m' }),
    ];
    expect(() => DatasetValidator.validate(obs)).toThrow(/Duplicate timestamp/);
  });

  // ── C6: Out-of-order timestamps ───────────────────────────────────────────
  it('C6: DatasetValidator throws on out-of-order timestamps', () => {
    const obs = [
      new MarketObservation({ asset: 'BTC', timestamp: 1704067320000, open: 102, high: 107, low: 97, close: 102, volume: 102, timeframe: '1m' }),
      new MarketObservation({ asset: 'BTC', timestamp: 1704067260000, open: 101, high: 106, low: 96, close: 101, volume: 101, timeframe: '1m' }),
    ];
    expect(() => DatasetValidator.validate(obs)).toThrow(/Out-of-order/);
  });

  // ── C7: 5-minute gap — Architecture A: DatasetValidator is NOT cadence-aware ──
  //
  // ARCHITECTURAL DECISION (FROZEN: Commit 007, QUANT_CONTRACT.md §6):
  //   Architecture A is chosen. Dataset is a general-purpose abstraction.
  //   DatasetValidator enforces: strict chronological ordering and no duplicates.
  //   It does NOT enforce Δt cadence — that responsibility belongs to the
  //   ingest pipeline (ingest_dataset.js) and/or the experimental protocol.
  //
  //   Rationale: A Dataset may legitimately have irregular timestamps
  //   (e.g., tick data, weekend gaps, dataset slices). Forcing 60s cadence
  //   into the base validator would contaminate the abstraction.
  //
  //   If this test ever FAILS, it means gap validation was added to
  //   DatasetValidator — which requires a conscious protocol review.
  it('C7 (Architecture A): DatasetValidator does NOT enforce Δt cadence — 5-min gap is accepted', () => {
    const obs = [
      new MarketObservation({ asset: 'BTC', timestamp: 1704067200000, open: 100, high: 105, low: 95, close: 100, volume: 100, timeframe: '1m' }),
      new MarketObservation({ asset: 'BTC', timestamp: 1704067260000, open: 101, high: 106, low: 96, close: 101, volume: 101, timeframe: '1m' }),
      // 5-minute jump — intentionally NOT rejected by DatasetValidator (Architecture A)
      new MarketObservation({ asset: 'BTC', timestamp: 1704067560000, open: 102, high: 107, low: 97, close: 102, volume: 102, timeframe: '1m' }),
    ];
    // Must NOT throw — gap enforcement belongs to the ingest pipeline, not here.
    expect(() => DatasetValidator.validate(obs)).not.toThrow();
  });
});

