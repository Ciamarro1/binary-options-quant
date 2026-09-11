"use strict";

/**
 * scripts/execution/run_paper_simulation.js
 * 
 * Runs the Paper/Shadow Execution Engine for MODEL_H006 on recorded IQ Option observations.
 * Enforces latency limits, zero logic inversion, and immutable trade ledger logging.
 */

const fs = require('fs');
const path = require('path');
const TradeLedger = require('../../src/execution/TradeLedger');
const PaperExecutionBridge = require('../../src/execution/PaperExecutionBridge');
const TrendConditionedRatioZScoreModel = require('../../src/strategy/models/TrendConditionedRatioZScoreModel');

const RAW_STREAM_PATH = path.join(
  __dirname,
  '..',
  '..',
  'research',
  'execution',
  'data_acquisition',
  'raw',
  'IQO_XAU_XAG_60s_raw.jsonl'
);

const PAPER_LEDGER_PATH = path.join(
  __dirname,
  '..',
  '..',
  'research',
  'execution',
  'paper_trades.jsonl'
);

async function main() {
  console.log('================================================================');
  console.log('PAPER / SHADOW EXECUTION ENGINE — MODEL_H006');
  console.log('Asset: XAUXAG | Expiry: 900s (15m) | Payout: 88%');
  console.log('Ledger:', PAPER_LEDGER_PATH);
  console.log('================================================================\n');

  if (!fs.existsSync(RAW_STREAM_PATH)) {
    console.log('[WARN] Raw stream file not found yet. Awaiting recorder data...');
    return;
  }

  // 1. Read closed observations from raw stream
  const rawLines = fs.readFileSync(RAW_STREAM_PATH, 'utf-8').trim().split('\n');
  const closedCandles = [];

  for (const line of rawLines) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line);
      if (rec.candle_status === 'CLOSED') {
        const p = rec.raw_payload;
        closedCandles.push({
          timestamp: p.from * 1000,
          open: p.open,
          high: p.max,
          low: p.min,
          close: p.close,
          volume: p.volume,
          asset: 'XAUXAG',
          timeframe: '1m'
        });
      }
    } catch (e) {}
  }

  console.log(`[STREAM] Ingested ${closedCandles.length} closed M1 candles from live recorder.`);

  // 2. Initialize Model & Bridge
  const model = new TrendConditionedRatioZScoreModel(120, 1440, 2.0, 900);
  const ledger = new TradeLedger(PAPER_LEDGER_PATH);
  const bridge = new PaperExecutionBridge({
    ledger,
    maxLatencyMs: 250,
    payoutRate: 0.88,
    defaultStake: 10.0 // $10 demo unit
  });

  console.log(`[MODEL] Initialized TrendConditionedRatioZScoreModel (L=120, M=1440).`);
  console.log(`[BRIDGE] Paper Execution Bridge ready with Latency Budget < 250ms.`);

  let dispatchedCount = 0;
  let settledCount = 0;
  const pendingTrades = [];

  for (let i = 0; i < closedCandles.length; i++) {
    const candle = closedCandles[i];

    // Check expiry for pending trades
    for (let p = pendingTrades.length - 1; p >= 0; p--) {
      const pt = pendingTrades[p];
      if (candle.timestamp >= pt.expiryTimestamp) {
        const settleEvent = bridge.settlePosition(pt.tradeId, candle.close, candle.timestamp);
        settledCount++;
        console.log(`[SETTLE] Trade ${pt.tradeId} | ${settleEvent.direction} | Entry: ${settleEvent.entryPrice} -> Exit: ${settleEvent.exitPrice} | Outcome: ${settleEvent.outcome} | PnL: $${settleEvent.payoutProfit.toFixed(2)}`);
        pendingTrades.splice(p, 1);
      }
    }

    // Predict signal strictly BEFORE updating model state
    const signal = model.predict(candle);

    if (signal && (signal.direction === 'CALL' || signal.direction === 'PUT')) {
      // Simulate order dispatch within 50ms latency
      const dispatchResult = bridge.dispatchOrder(signal, candle, candle.timestamp + 50);

      if (dispatchResult.status === 'FILLED') {
        dispatchedCount++;
        console.log(`[ORDER] #${dispatchedCount} | ${signal.direction} | Fill: ${candle.close} | Reason: ${signal.reason} | Z: ${signal.zScore.toFixed(2)}`);
        pendingTrades.push({
          tradeId: dispatchResult.tradeId,
          expiryTimestamp: candle.timestamp + 900 * 1000,
          entryPrice: candle.close
        });
      }
    }

    // Update model state strictly AFTER prediction
    model.update(candle);
  }

  const summary = ledger.getSummary();
  console.log('\n================================================================');
  console.log('PAPER EXECUTION RECONCILIATION SUMMARY');
  console.log('================================================================');
  console.log(`Total Stream Bars:    ${closedCandles.length}`);
  console.log(`Total Orders Placed:  ${dispatchedCount}`);
  console.log(`Settled Trades:       ${summary.settledTrades}`);
  console.log(`Active Pending:       ${pendingTrades.length}`);
  console.log(`Win Rate:             ${(summary.winRate * 100).toFixed(2)}% (Wins: ${summary.wins}, Losses: ${summary.losses}, Pushes: ${summary.pushes})`);
  console.log(`Paper P&L:            $${summary.totalPnl.toFixed(2)}`);
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('[FATAL ERROR IN PAPER SIMULATION]', err);
  process.exit(1);
});
