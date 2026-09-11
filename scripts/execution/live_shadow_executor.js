"use strict";

/**
 * scripts/execution/live_shadow_executor.js
 *
 * Live Shadow / Forward Test Daemon for MODEL_H006.
 *
 * Architecture:
 * 1. PRE-WARM: Loads the canonical Dukascopy dataset (DATASET_XAUXAG_001)
 *    and feeds it to the model to fill the intraday (120m) and macro (1440m)
 *    lookback windows. No signals are dispatched during warm-up.
 *
 * 2. TAIL: Watches the live recorder JSONL file for new CLOSED candles
 *    appended by the background recorder daemon. Each new closed candle is
 *    fed to the model; any CALL/PUT signal is dispatched through the
 *    PaperExecutionBridge and logged to the immutable TradeLedger.
 *
 * 3. SETTLEMENT: Tracks pending trades and settles them when the exit
 *    candle (15 bars = 15 minutes after entry) arrives.
 *
 * Constitutional Invariants Enforced:
 *   - Zero Logic Inversion (direction/stake immutable)
 *   - Predict BEFORE Update (strict causal ordering)
 *   - Latency budget < 250ms (paper simulated at 50ms)
 *   - Disconnect fail-safe (bridge connection state)
 *   - Append-only immutable TradeLedger
 */

const fs = require('fs');
const path = require('path');
const TradeLedger = require('../../src/execution/TradeLedger');
const PaperExecutionBridge = require('../../src/execution/PaperExecutionBridge');
const TrendConditionedRatioZScoreModel = require('../../src/strategy/models/TrendConditionedRatioZScoreModel');
const DatasetLoader = require('../../src/data/DatasetLoader');

// ─── CONFIGURATION ──────────────────────────────────────────────────────

const CANONICAL_CSV = path.join(
  __dirname, '..', '..', 'research', 'datasets', 'XAUXAG',
  '1m', '2025-06_08', 'canonical', 'XAUXAG_1m_canonical.csv'
);

const RAW_STREAM_PATH = path.join(
  __dirname, '..', '..', 'research', 'execution',
  'data_acquisition', 'raw', 'IQO_XAU_XAG_60s_raw.jsonl'
);

const SHADOW_LEDGER_PATH = path.join(
  __dirname, '..', '..', 'research', 'execution', 'shadow_trades_live.jsonl'
);

const SHADOW_REPORT_PATH = path.join(
  __dirname, '..', '..', 'research', 'reports', 'SHADOW_FORWARD_TEST_STATUS.json'
);

const POLL_INTERVAL_MS = 2000;   // Check for new candles every 2 seconds
const STATUS_REPORT_INTERVAL = 60_000; // Emit status every 60 seconds
const EXPIRY_BARS = 15;          // 15m = 15 x 1m bars
const PAYOUT_RATE = 0.88;
const DEMO_STAKE = 10.0;         // $10 demo unit

// ─── UTILITY ─────────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function parseClosedCandle(rec) {
  if (rec.candle_status !== 'CLOSED') return null;
  const p = rec.raw_payload;
  if (!p || typeof p.close !== 'number') return null;
  return {
    timestamp: p.from * 1000,
    open: p.open,
    high: p.max,
    low: p.min,
    close: p.close,
    volume: p.volume || 0,
    asset: 'XAUXAG',
    timeframe: '1m'
  };
}

function computeWilsonCI(wins, total, z = 1.95996) {
  if (total === 0) return { lower: 0, upper: 0, center: 0 };
  const p = wins / total;
  const d = 1 + (z * z) / total;
  const c = p + (z * z) / (2 * total);
  const r = Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
  return {
    lower: Math.max(0, (c - z * r) / d),
    upper: Math.min(1, (c + z * r) / d),
    center: p
  };
}

// ─── MAIN ────────────────────────────────────────────────────────────────

async function main() {
  log('================================================================');
  log('LIVE SHADOW EXECUTOR — MODEL_H006 FORWARD TEST');
  log(`Asset: XAUXAG | Expiry: ${EXPIRY_BARS * 60}s (${EXPIRY_BARS}m) | Payout: ${(PAYOUT_RATE * 100).toFixed(0)}%`);
  log(`Shadow Ledger: ${SHADOW_LEDGER_PATH}`);
  log('================================================================');

  // ── 1. PRE-WARM on Canonical Dataset ────────────────────────────────
  log('[WARM-UP] Loading canonical dataset for model pre-warming...');
  const dataset = DatasetLoader.loadCSV(CANONICAL_CSV, {
    datasetId: 'DATASET_XAUXAG_001',
    asset: 'XAUXAG',
    timeframe: '1m',
    source: 'DUKASCOPY_RECONSTRUCTED_SPOT'
  });

  const model = new TrendConditionedRatioZScoreModel(120, 1440, 2.0, EXPIRY_BARS * 60);

  // Feed all canonical candles to fill lookback windows (update only, no predict)
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

  const warmupBars = dataset.observations.length;
  log(`[WARM-UP] Fed ${warmupBars} canonical bars. Intraday window: ${model.intradayWindow.length}/${model.intradayLookback}, Macro window: ${model.macroWindow.length}/${model.macroLookback}.`);
  log(`[WARM-UP] Model is FULLY PRIMED and ready for live signal generation.`);

  // ── 2. INITIALIZE EXECUTION INFRASTRUCTURE ──────────────────────────
  const ledger = new TradeLedger(SHADOW_LEDGER_PATH);
  const bridge = new PaperExecutionBridge({
    ledger,
    maxLatencyMs: 250,
    payoutRate: PAYOUT_RATE,
    defaultStake: DEMO_STAKE
  });

  log(`[BRIDGE] Paper Execution Bridge initialized. Stake: \$${DEMO_STAKE} | Latency budget: <250ms.`);

  // ── 3. LOAD ALREADY-PROCESSED CANDLE TIMESTAMPS ─────────────────────
  const processedTimestamps = new Set();
  const pendingTrades = [];   // { tradeId, entryTimestamp, expiryTimestamp, direction, entryPrice }

  // Load prior shadow ledger events to restore state
  const priorEvents = ledger.readAllEvents();
  const restoredTradeIds = new Set();
  const settledTradeIds = new Set();
  for (const ev of priorEvents) {
    restoredTradeIds.add(ev.tradeId);
    if (ev.eventType === 'SETTLED') {
      settledTradeIds.add(ev.tradeId);
    }
  }
  log(`[RESTORE] Found ${restoredTradeIds.size} prior trade IDs in ledger (${settledTradeIds.size} already settled).`);

  // ── 4. INITIAL SCAN: Process existing closed candles ─────────────────
  let liveSignalCount = 0;
  let liveSettledCount = 0;

  function processCandle(candle) {
    if (processedTimestamps.has(candle.timestamp)) return;
    processedTimestamps.add(candle.timestamp);

    // Check settlements for pending trades
    for (let i = pendingTrades.length - 1; i >= 0; i--) {
      const pt = pendingTrades[i];
      if (candle.timestamp >= pt.expiryTimestamp) {
        try {
          const settleEvent = bridge.settlePosition(pt.tradeId, candle.close, candle.timestamp);
          liveSettledCount++;
          log(`[SETTLE] ${pt.tradeId} | ${settleEvent.direction} | Entry: ${settleEvent.entryPrice.toFixed(6)} → Exit: ${settleEvent.exitPrice.toFixed(6)} | ${settleEvent.outcome} | PnL: \$${settleEvent.payoutProfit.toFixed(2)}`);
        } catch (err) {
          log(`[SETTLE-ERR] ${pt.tradeId}: ${err.message}`);
        }
        pendingTrades.splice(i, 1);
      }
    }

    // Predict BEFORE update (strict causal ordering)
    const signal = model.predict(candle);

    if (signal && (signal.direction === 'CALL' || signal.direction === 'PUT')) {
      // Dispatch order with simulated 50ms latency
      const dispatchResult = bridge.dispatchOrder(signal, candle, candle.timestamp + 50);

      if (dispatchResult.status === 'FILLED') {
        liveSignalCount++;
        const expiryTimestamp = candle.timestamp + EXPIRY_BARS * 60_000;
        pendingTrades.push({
          tradeId: dispatchResult.tradeId,
          entryTimestamp: candle.timestamp,
          expiryTimestamp,
          direction: signal.direction,
          entryPrice: candle.close
        });
        log(`[SIGNAL] #${liveSignalCount} | ${signal.direction} | Price: ${candle.close.toFixed(6)} | Z: ${signal.zScore.toFixed(3)} | Reason: ${signal.reason} | Expires: ${new Date(expiryTimestamp).toISOString()}`);
      }
    }

    // Update model AFTER predict
    model.update(candle);
  }

  // Initial scan of existing file
  if (fs.existsSync(RAW_STREAM_PATH)) {
    const content = fs.readFileSync(RAW_STREAM_PATH, 'utf-8');
    const lines = content.trim().split('\n');
    let initialClosed = 0;

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const rec = JSON.parse(line);
        const candle = parseClosedCandle(rec);
        if (candle) {
          processCandle(candle);
          initialClosed++;
        }
      } catch (e) {}
    }
    log(`[INIT] Processed ${initialClosed} existing closed candles. Signals dispatched: ${liveSignalCount}. Pending: ${pendingTrades.length}.`);
  }

  // ── 5. TAIL-FOLLOW LOOP ────────────────────────────────────────────
  log('[TAIL] Entering live tail-follow mode. Watching for new candles...');
  let lastFileSize = fs.existsSync(RAW_STREAM_PATH) ? fs.statSync(RAW_STREAM_PATH).size : 0;
  let lastStatusTime = Date.now();
  let readOffset = lastFileSize; // Start reading from end of initial content

  function emitStatusReport() {
    const summary = ledger.getSummary();
    const nonPush = summary.wins + summary.losses;
    const wilson = computeWilsonCI(summary.wins, nonPush);
    const breakevenRate = 1 / (1 + PAYOUT_RATE);

    const report = {
      reportType: 'SHADOW_FORWARD_TEST_STATUS',
      modelId: 'MODEL_H006_XAUXAG_TREND_ZREVERT',
      generatedAt: new Date().toISOString(),
      warmupBars,
      liveSignalsDispatched: liveSignalCount,
      liveSettled: liveSettledCount,
      activePending: pendingTrades.length,
      wins: summary.wins,
      losses: summary.losses,
      pushes: summary.pushes,
      winRate: summary.winRate,
      wilsonCI: wilson,
      breakevenRate,
      wilsonGateMet: wilson.lower > breakevenRate,
      paperPnl: summary.totalPnl,
      totalProcessedCandles: processedTimestamps.size
    };

    try {
      fs.writeFileSync(SHADOW_REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
    } catch (e) {}

    log(`[STATUS] Live: ${liveSignalCount} signals | Settled: ${summary.settledTrades} (W:${summary.wins} L:${summary.losses} P:${summary.pushes}) | WR: ${(summary.winRate * 100).toFixed(2)}% | Wilson: [${(wilson.lower * 100).toFixed(2)}%, ${(wilson.upper * 100).toFixed(2)}%] | PnL: \$${summary.totalPnl.toFixed(2)} | Pending: ${pendingTrades.length}`);
  }

  // Continuous tail loop
  const tailLoop = setInterval(() => {
    try {
      if (!fs.existsSync(RAW_STREAM_PATH)) return;
      const currentSize = fs.statSync(RAW_STREAM_PATH).size;

      if (currentSize > readOffset) {
        // Read only new bytes
        const fd = fs.openSync(RAW_STREAM_PATH, 'r');
        const newBytes = Buffer.alloc(currentSize - readOffset);
        fs.readSync(fd, newBytes, 0, newBytes.length, readOffset);
        fs.closeSync(fd);
        readOffset = currentSize;

        const newContent = newBytes.toString('utf-8');
        const newLines = newContent.split('\n');

        for (const line of newLines) {
          if (!line.trim()) continue;
          try {
            const rec = JSON.parse(line);
            const candle = parseClosedCandle(rec);
            if (candle) {
              processCandle(candle);
            }
          } catch (e) {}
        }
      }

      // Periodic status report
      if (Date.now() - lastStatusTime >= STATUS_REPORT_INTERVAL) {
        emitStatusReport();
        lastStatusTime = Date.now();
      }
    } catch (err) {
      log(`[TAIL-ERR] ${err.message}`);
    }
  }, POLL_INTERVAL_MS);

  // Emit initial status
  emitStatusReport();

  // Graceful shutdown
  process.on('SIGINT', () => {
    log('[SHUTDOWN] Received SIGINT. Emitting final status...');
    clearInterval(tailLoop);
    emitStatusReport();
    log('[SHUTDOWN] Live Shadow Executor stopped gracefully.');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('[SHUTDOWN] Received SIGTERM. Emitting final status...');
    clearInterval(tailLoop);
    emitStatusReport();
    process.exit(0);
  });

  log('[LIVE] Shadow executor is now ACTIVE. Tailing recorder output in real-time.');
  log(`[LIVE] Model requires ${EXPIRY_BARS} bars (${EXPIRY_BARS}m) after signal for settlement.`);
}

main().catch(err => {
  log(`[FATAL] ${err.message}`);
  console.error(err);
  process.exit(1);
});
