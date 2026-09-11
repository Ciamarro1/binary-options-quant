"use strict";

const fs = require('fs');
const path = require('path');
const TradeLedger = require('../../src/execution/TradeLedger');
const PaperExecutionBridge = require('../../src/execution/PaperExecutionBridge');

describe('Paper Execution Bridge & Trade Ledger Invariants', () => {
  const tmpLedgerPath = path.join(__dirname, '..', '..', 'scratch', 'test_trade_ledger.jsonl');

  beforeEach(() => {
    if (fs.existsSync(tmpLedgerPath)) fs.unlinkSync(tmpLedgerPath);
  });

  afterAll(() => {
    if (fs.existsSync(tmpLedgerPath)) fs.unlinkSync(tmpLedgerPath);
  });

  test('TradeLedger appends valid events and computes correct summary', () => {
    const ledger = new TradeLedger(tmpLedgerPath);

    ledger.recordEvent({ tradeId: 'T1', eventType: 'DISPATCHED', timestamp: 1000 });
    ledger.recordEvent({ tradeId: 'T1', eventType: 'FILLED', fillPrice: 100, timestamp: 1050 });
    ledger.recordEvent({ tradeId: 'T1', eventType: 'SETTLED', outcome: 'WIN', payoutProfit: 0.88, timestamp: 2000 });

    ledger.recordEvent({ tradeId: 'T2', eventType: 'DISPATCHED', timestamp: 3000 });
    ledger.recordEvent({ tradeId: 'T2', eventType: 'FILLED', fillPrice: 105, timestamp: 3050 });
    ledger.recordEvent({ tradeId: 'T2', eventType: 'SETTLED', outcome: 'LOSS', stake: 1.0, timestamp: 4000 });

    const summary = ledger.getSummary();
    expect(summary.totalTrades).toBe(2);
    expect(summary.settledTrades).toBe(2);
    expect(summary.wins).toBe(1);
    expect(summary.losses).toBe(1);
    expect(summary.winRate).toBe(0.5);
    expect(summary.totalPnl).toBeCloseTo(-0.12, 2);
  });

  test('Invariant 1: Zero Logic Inversion', () => {
    const ledger = new TradeLedger(tmpLedgerPath);
    const bridge = new PaperExecutionBridge({ ledger, maxLatencyMs: 250 });

    const obs = { asset: 'XAUXAG', timestamp: 10000, close: 68.5 };
    const callSignal = { direction: 'CALL', expirySeconds: 900 };

    const result = bridge.dispatchOrder(callSignal, obs, 10050); // 50ms latency
    expect(result.status).toBe('FILLED');
    expect(result.order.direction).toBe('CALL');
    expect(result.order.entryPrice).toBe(68.5);

    const putSignal = { direction: 'PUT', expirySeconds: 900 };
    const putResult = bridge.dispatchOrder(putSignal, obs, 10080); // 80ms latency
    expect(putResult.status).toBe('FILLED');
    expect(putResult.order.direction).toBe('PUT');
  });

  test('Invariant 2: Latency Budget Enforcement (< 250ms)', () => {
    const ledger = new TradeLedger(tmpLedgerPath);
    const bridge = new PaperExecutionBridge({ ledger, maxLatencyMs: 250 });

    const obs = { asset: 'XAUXAG', timestamp: 10000, close: 68.5 };
    const signal = { direction: 'CALL', expirySeconds: 900 };

    // Latency = 300ms (> 250ms) -> Must be rejected
    const result = bridge.dispatchOrder(signal, obs, 10300);
    expect(result.status).toBe('REJECTED');
    expect(result.reason).toBe('LATENCY_BUDGET_EXCEEDED');
    expect(result.latencyMs).toBe(300);

    const events = ledger.readAllEvents();
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('REJECTED');
    expect(events[0].reason).toBe('LATENCY_BUDGET_EXCEEDED');
  });

  test('Invariant 3: Disconnect Fail-Safe', () => {
    const ledger = new TradeLedger(tmpLedgerPath);
    const bridge = new PaperExecutionBridge({ ledger, maxLatencyMs: 250 });

    bridge.setConnectionStatus(false); // Simulate broker websocket disconnect

    const obs = { asset: 'XAUXAG', timestamp: 10000, close: 68.5 };
    const signal = { direction: 'CALL', expirySeconds: 900 };

    const result = bridge.dispatchOrder(signal, obs, 10050);
    expect(result.status).toBe('REJECTED');
    expect(result.reason).toBe('DISCONNECT_FAIL_SAFE_ACTIVE');

    const events = ledger.readAllEvents();
    expect(events[0].reason).toBe('DISCONNECT_FAIL_SAFE_ACTIVE');
  });

  test('Complete Trade Settlement Lifecycle', () => {
    const ledger = new TradeLedger(tmpLedgerPath);
    const bridge = new PaperExecutionBridge({ ledger, maxLatencyMs: 250, payoutRate: 0.88 });

    const obs = { asset: 'XAUXAG', timestamp: 10000, close: 68.0 };
    const signal = { direction: 'CALL', expirySeconds: 900 };

    const { order, tradeId } = bridge.dispatchOrder(signal, obs, 10050);

    // CALL expires higher (68.5 > 68.0) -> WIN
    const settle = bridge.settlePosition(tradeId, 68.5, 10950);
    expect(settle.outcome).toBe('WIN');
    expect(settle.payoutProfit).toBeCloseTo(0.88, 2);

    const summary = ledger.getSummary();
    expect(summary.settledTrades).toBe(1);
    expect(summary.wins).toBe(1);
    expect(summary.winRate).toBe(1.0);
  });
});
