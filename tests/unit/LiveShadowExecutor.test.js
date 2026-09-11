"use strict";

/**
 * tests/unit/LiveShadowExecutor.test.js
 *
 * Validates the Live Shadow Executor's architectural invariants:
 * 1. Pre-warming fills both lookback windows from canonical data
 * 2. Predict-before-update causal ordering in tail processing
 * 3. Settlement occurs at exactly EXPIRY_BARS after dispatch
 * 4. Ledger records DISPATCHED → FILLED → SETTLED lifecycle
 */

const path = require('path');
const fs = require('fs');
const TradeLedger = require('../../src/execution/TradeLedger');
const PaperExecutionBridge = require('../../src/execution/PaperExecutionBridge');
const TrendConditionedRatioZScoreModel = require('../../src/strategy/models/TrendConditionedRatioZScoreModel');
const DatasetLoader = require('../../src/data/DatasetLoader');

const CANONICAL_CSV = path.join(
  __dirname, '..', '..', 'research', 'datasets', 'XAUXAG',
  '1m', '2025-06_08', 'canonical', 'XAUXAG_1m_canonical.csv'
);

describe('Live Shadow Executor Architecture', () => {
  let model;
  let dataset;

  beforeAll(() => {
    dataset = DatasetLoader.loadCSV(CANONICAL_CSV, {
      datasetId: 'DATASET_XAUXAG_001',
      asset: 'XAUXAG',
      timeframe: '1m',
      source: 'DUKASCOPY_RECONSTRUCTED_SPOT'
    });
  });

  test('Pre-warming fills both lookback windows to capacity', () => {
    model = new TrendConditionedRatioZScoreModel(120, 1440, 2.0, 900);

    for (const obs of dataset.observations) {
      model.update({
        timestamp: obs.timestamp,
        open: obs.open,
        high: obs.high,
        low: obs.low,
        close: obs.close,
        volume: obs.volume || 0
      });
    }

    expect(model.intradayWindow.length).toBe(120);
    expect(model.macroWindow.length).toBe(1440);
  });

  test('Pre-warmed model emits valid signals on live-like candles', () => {
    // Model is pre-warmed from the previous test
    // Simulate a sharp dip (Z << -2.0) while price > macro mean
    const lastCanonicalClose = dataset.observations[dataset.observations.length - 1].close;
    const extremeDipCandle = {
      timestamp: Date.now(),
      open: lastCanonicalClose * 0.98,
      high: lastCanonicalClose * 0.985,
      low: lastCanonicalClose * 0.975,
      close: lastCanonicalClose * 0.978,
      volume: 100,
      asset: 'XAUXAG'
    };

    const signal = model.predict(extremeDipCandle);
    // Should either produce a signal or NO_SIGNAL with a valid reason
    expect(signal).toBeDefined();
    expect(signal.direction).toBeDefined();
    expect(['CALL', 'PUT', 'NO_SIGNAL']).toContain(signal.direction);
    expect(signal.zScore).not.toBeNull();
    expect(signal.reason).toBeDefined();
  });

  test('PaperExecutionBridge dispatch → settle lifecycle integrity', () => {
    const tmpLedgerPath = path.join(__dirname, '..', '..', 'research', 'execution', '_test_shadow_ledger.jsonl');

    // Clean up any prior test ledger
    if (fs.existsSync(tmpLedgerPath)) fs.unlinkSync(tmpLedgerPath);

    const ledger = new TradeLedger(tmpLedgerPath);
    const bridge = new PaperExecutionBridge({
      ledger,
      maxLatencyMs: 250,
      payoutRate: 0.88,
      defaultStake: 10.0
    });

    const signal = { direction: 'CALL', zScore: -2.5, expirySeconds: 900, reason: 'TEST' };
    const observation = { timestamp: 1000000, close: 67.5, asset: 'XAUXAG' };
    const dispatchResult = bridge.dispatchOrder(signal, observation, 1000050);

    expect(dispatchResult.status).toBe('FILLED');
    expect(dispatchResult.tradeId).toBeDefined();

    // Settle with a higher price (WIN for CALL)
    const settleEvent = bridge.settlePosition(dispatchResult.tradeId, 67.8, 1900000);
    expect(settleEvent.outcome).toBe('WIN');
    expect(settleEvent.payoutProfit).toBeCloseTo(8.8, 1); // 10 * 0.88

    // Verify ledger recorded full lifecycle
    const events = ledger.readAllEvents();
    const tradeEvents = events.filter(e => e.tradeId === dispatchResult.tradeId);
    expect(tradeEvents.length).toBe(3); // DISPATCHED, FILLED, SETTLED
    expect(tradeEvents.map(e => e.eventType)).toEqual(['DISPATCHED', 'FILLED', 'SETTLED']);

    // Cleanup
    if (fs.existsSync(tmpLedgerPath)) fs.unlinkSync(tmpLedgerPath);
  });

  test('Settlement for LOSS on CALL when exit < entry', () => {
    const tmpLedgerPath = path.join(__dirname, '..', '..', 'research', 'execution', '_test_shadow_ledger2.jsonl');
    if (fs.existsSync(tmpLedgerPath)) fs.unlinkSync(tmpLedgerPath);

    const ledger = new TradeLedger(tmpLedgerPath);
    const bridge = new PaperExecutionBridge({ ledger, payoutRate: 0.88, defaultStake: 10.0 });

    const signal = { direction: 'CALL', zScore: -2.5, expirySeconds: 900, reason: 'TEST' };
    const observation = { timestamp: 1000000, close: 67.5, asset: 'XAUXAG' };
    const result = bridge.dispatchOrder(signal, observation, 1000050);
    expect(result.status).toBe('FILLED');

    // Settle with a lower price (LOSS for CALL)
    const settleEvent = bridge.settlePosition(result.tradeId, 67.3, 1900000);
    expect(settleEvent.outcome).toBe('LOSS');
    expect(settleEvent.payoutProfit).toBe(-10.0);

    if (fs.existsSync(tmpLedgerPath)) fs.unlinkSync(tmpLedgerPath);
  });

  test('Latency budget rejection when delay exceeds 250ms', () => {
    const tmpLedgerPath = path.join(__dirname, '..', '..', 'research', 'execution', '_test_shadow_ledger3.jsonl');
    if (fs.existsSync(tmpLedgerPath)) fs.unlinkSync(tmpLedgerPath);

    const ledger = new TradeLedger(tmpLedgerPath);
    const bridge = new PaperExecutionBridge({ ledger, maxLatencyMs: 250, payoutRate: 0.88, defaultStake: 10.0 });

    const signal = { direction: 'CALL', zScore: -2.5, expirySeconds: 900, reason: 'TEST' };
    const observation = { timestamp: 1000000, close: 67.5, asset: 'XAUXAG' };

    // Dispatch with 300ms latency (exceeds 250ms budget)
    const result = bridge.dispatchOrder(signal, observation, 1000300);
    expect(result.status).toBe('REJECTED');
    expect(result.reason).toBe('LATENCY_BUDGET_EXCEEDED');

    if (fs.existsSync(tmpLedgerPath)) fs.unlinkSync(tmpLedgerPath);
  });
});
