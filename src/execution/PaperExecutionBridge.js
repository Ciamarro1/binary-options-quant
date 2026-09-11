"use strict";

const crypto = require('crypto');
const TradeLedger = require('./TradeLedger');

class PaperExecutionBridge {
  /**
   * Initializes the Paper Execution Bridge.
   * @param {Object} options
   * @param {TradeLedger} options.ledger - Attached trade ledger instance.
   * @param {number} [options.maxLatencyMs=250] - Maximum latency budget in milliseconds.
   * @param {number} [options.payoutRate=0.88] - Reference broker payout rate.
   * @param {number} [options.defaultStake=1.0] - Unit stake per trade.
   */
  constructor(options = {}) {
    this.ledger = options.ledger;
    this.maxLatencyMs = options.maxLatencyMs || 250;
    this.payoutRate = options.payoutRate || 0.88;
    this.defaultStake = options.defaultStake || 1.0;
    this.isConnected = true;
    this.activePositions = new Map(); // tradeId -> order details
  }

  setConnectionStatus(connected) {
    this.isConnected = Boolean(connected);
  }

  /**
   * Dispatches a paper trade order based on model signal.
   * Enforces Latency Budget, Disconnect Fail-Safe, and Zero Logic Inversion.
   */
  dispatchOrder(signal, currentMarketObservation, currentWallClockMs = Date.now()) {
    const tradeId = `TRADE_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    // 1. Disconnect Fail-Safe Invariant
    if (!this.isConnected) {
      const rejectEvent = {
        tradeId,
        eventType: 'REJECTED',
        reason: 'DISCONNECT_FAIL_SAFE_ACTIVE',
        timestamp: currentWallClockMs
      };
      if (this.ledger) this.ledger.recordEvent(rejectEvent);
      return { status: 'REJECTED', reason: 'DISCONNECT_FAIL_SAFE_ACTIVE', tradeId };
    }

    // 2. Latency Budget Invariant (< 250ms)
    const signalTimeMs = currentMarketObservation.timestamp;
    const latencyMs = currentWallClockMs - signalTimeMs;

    if (latencyMs > this.maxLatencyMs) {
      const rejectEvent = {
        tradeId,
        eventType: 'REJECTED',
        reason: 'LATENCY_BUDGET_EXCEEDED',
        latencyMs,
        maxLatencyMs: this.maxLatencyMs,
        timestamp: currentWallClockMs
      };
      if (this.ledger) this.ledger.recordEvent(rejectEvent);
      return { status: 'REJECTED', reason: 'LATENCY_BUDGET_EXCEEDED', latencyMs, tradeId };
    }

    // 3. Zero Logic Inversion Invariant: Direction must strictly match signal
    if (signal.direction !== 'CALL' && signal.direction !== 'PUT') {
      return { status: 'IGNORED', reason: 'NO_DIRECTIONAL_SIGNAL' };
    }

    const order = {
      tradeId,
      asset: currentMarketObservation.asset,
      direction: signal.direction,
      entryPrice: currentMarketObservation.close,
      stake: this.defaultStake,
      expirySeconds: signal.expirySeconds || 900,
      dispatchedAtMs: currentWallClockMs,
      latencyMs,
      payoutRate: this.payoutRate,
      status: 'FILLED'
    };

    // Record DISPATCHED event
    if (this.ledger) {
      this.ledger.recordEvent({
        tradeId,
        eventType: 'DISPATCHED',
        asset: order.asset,
        direction: order.direction,
        stake: order.stake,
        expirySeconds: order.expirySeconds,
        timestamp: currentWallClockMs
      });

      // Record FILLED event (Paper execution assumes immediate fill at observation close)
      this.ledger.recordEvent({
        tradeId,
        eventType: 'FILLED',
        fillPrice: order.entryPrice,
        stake: order.stake,
        timestamp: currentWallClockMs
      });
    }

    this.activePositions.set(tradeId, order);
    return { status: 'FILLED', order, tradeId };
  }

  /**
   * Settles an active position upon expiry.
   */
  settlePosition(tradeId, exitPrice, settlementTimestampMs = Date.now()) {
    const order = this.activePositions.get(tradeId);
    if (!order) {
      throw new Error(`ORDER ERROR: Trade ${tradeId} not found in active positions`);
    }

    let outcome;
    let payoutProfit = 0;

    if (exitPrice === order.entryPrice) {
      outcome = 'PUSH';
      payoutProfit = 0;
    } else if (order.direction === 'CALL') {
      if (exitPrice > order.entryPrice) {
        outcome = 'WIN';
        payoutProfit = order.stake * order.payoutRate;
      } else {
        outcome = 'LOSS';
        payoutProfit = -order.stake;
      }
    } else if (order.direction === 'PUT') {
      if (exitPrice < order.entryPrice) {
        outcome = 'WIN';
        payoutProfit = order.stake * order.payoutRate;
      } else {
        outcome = 'LOSS';
        payoutProfit = -order.stake;
      }
    }

    const settleEvent = {
      tradeId,
      eventType: 'SETTLED',
      asset: order.asset,
      direction: order.direction,
      entryPrice: order.entryPrice,
      exitPrice,
      stake: order.stake,
      outcome,
      payoutProfit,
      timestamp: settlementTimestampMs
    };

    if (this.ledger) {
      this.ledger.recordEvent(settleEvent);
    }

    this.activePositions.delete(tradeId);
    return settleEvent;
  }
}

module.exports = PaperExecutionBridge;
