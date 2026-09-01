"use strict";

/**
 * BASELINE_003_CONTROL — Commit 011
 * ===================================
 * Pre-declared parameters (frozen before execution):
 *   Asset:          BTCUSDT Spot
 *   Timeframe:      1m
 *   Dataset:        DATASET_003 (2024-06-01 to 2024-09-30, 175,680 rows)
 *   Expiry:         3 candles (180s)
 *   Payout:         0.80
 *   Model:          BASELINE_NAIVE v1.0.1
 *   Walk-Forward:   Train=10080 (7 days), Test=1440 (1 day), Step=1440
 *   Total Windows:  115 OOS windows
 *   
 *   P_BE = 1/(1+0.80) = 55.5556%
 *   
 *   NO H002 FEATURE KNOWLEDGE. PURE CONTROL EXPERIMENT.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DatasetLoader = require('../src/data/DatasetLoader');
const DatasetValidator = require('../src/data/DatasetValidator');
const WalkForward = require('../src/validation/WalkForward');
const BaselineModel = require('../src/research/BaselineModel');
const FeatureEngine = require('../src/strategy/FeatureEngine');
const RegimeEngine = require('../src/strategy/RegimeEngine');
const SignalEngine = require('../src/strategy/SignalEngine');
const ReplayEngine = require('../src/replay/ReplayEngine');
const MetricsEngine = require('../src/research/MetricsEngine');
const CalibrationEngine = require('../src/research/CalibrationEngine');

const EXPERIMENT = Object.freeze({
  experimentId: 'BASELINE_003_CONTROL_OOS_001',
  datasetId: 'DATASET_003',
  asset: 'BTCUSDT',
  timeframe: '1m',
  expiryCandles: 3,
  expirySeconds: 180,
  payout: 0.80,
  modelId: 'BASELINE_NAIVE',
  modelVersion: '1.0.1',
  trainSize: 10080,   // 7 days
  testSize: 1440,     // 1 day
  protocolVersion: '1.1'
});

const P_BE = 1 / (1 + EXPERIMENT.payout);

console.log('══════════════════════════════════════════════════════════');
console.log(' BASELINE 003 CONTROL OOS REPORT');
console.log(' Binary Options Quant — Commit 011');
console.log('══════════════════════════════════════════════════════════');

const baseDir = path.join(__dirname, '..', 'research', 'datasets', 'BTCUSDT', '1m', '2024-06_09');
const manifestPath = path.join(baseDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

console.log('\n──── 1. Dataset Verification ────');
console.log(`  Asset:          ${EXPERIMENT.asset}`);
console.log(`  Timeframe:      ${EXPERIMENT.timeframe}`);
console.log(`  Period:         ${manifest.period}`);
console.log(`  Rows:           ${manifest.aggregate.rowCount}`);
console.log(`  Semantic Hash:  ${manifest.aggregate.datasetContentHash}`);

// Load all monthly canonical CSV files
const months = ['2024-06', '2024-07', '2024-08', '2024-09'];
const allObservations = [];

for (const m of months) {
  const csvFile = path.join(baseDir, 'canonical', `BTCUSDT_1m_${m.replace('-', '_')}.csv`);
  const dataset = DatasetLoader.loadCSV(csvFile, {
    datasetId: `DATASET_003_${m}`,
    asset: EXPERIMENT.asset,
    timeframe: EXPERIMENT.timeframe,
    source: 'Binance'
  });
  allObservations.push(...dataset.observations);
}

allObservations.sort((a, b) => a.timestamp - b.timestamp);
DatasetValidator.validate(allObservations);
console.log('  ✓ Structural integrity verified (no dupes, strictly ordered, 0 gaps)');

// 2. Setup Engines (Baseline feature engine)
const signalEngine = new SignalEngine({
  featureEngine: new FeatureEngine('baseline', '1.0'),
  regimeEngine: new RegimeEngine()
});
const replayEngine = new ReplayEngine({ signalEngine });

// 3. Walk-Forward Splits
console.log('\n──── 2. Walk-Forward Splits ────');
const splits = [...WalkForward.generateSplits(allObservations, EXPERIMENT.trainSize, EXPERIMENT.testSize)];
console.log(`  Total Windows:  ${splits.length} (Expected: 115)`);

if (splits.length !== 115) {
  throw new Error(`Window count mismatch! Expected 115, got ${splits.length}`);
}

const windowResults = [];
const allOutcomes = [];

console.log('\n──── 3. Executing Walk-Forward Control Replay ────');

for (let w = 0; w < splits.length; w++) {
  const { train, test } = splits[w];

  // Fit baseline on train with 3-candle expiry
  const model = BaselineModel.fit(train, { expirySeconds: EXPERIMENT.expirySeconds });

  const testHashPayload = test.map(o => `${o.timestamp}:${o.open}:${o.high}:${o.low}:${o.close}:${o.volume}`).join('|');
  const testContentHash = crypto.createHash('sha256').update(testHashPayload).digest('hex');

  const testDataset = {
    observations: test,
    metadata: {
      datasetId: `DATASET_003_W${w + 1}`,
      asset: EXPERIMENT.asset,
      timeframe: EXPERIMENT.timeframe,
      contentHash: testContentHash
    }
  };

  const replay = replayEngine.run(testDataset, model, EXPERIMENT.payout);
  const mapped = replay.outcomes.map(o => ({
    prob: o.probability,
    outcome: o.outcome,
    direction: o.direction
  }));

  const windowMetrics = MetricsEngine.calculate(mapped, EXPERIMENT.payout);

  const wins = replay.outcomes.filter(o => o.outcome === 'WIN').length;
  const losses = replay.outcomes.filter(o => o.outcome === 'LOSS').length;
  const pushes = replay.outcomes.filter(o => o.outcome === 'PUSH').length;

  windowResults.push({
    window: w + 1,
    trainStart: new Date(train[0].timestamp).toISOString().slice(0, 10),
    trainEnd: new Date(train[train.length - 1].timestamp).toISOString().slice(0, 10),
    testStart: new Date(test[0].timestamp).toISOString().slice(0, 10),
    testEnd: new Date(test[test.length - 1].timestamp).toISOString().slice(0, 10),
    trainedP: model.callFrequency,
    signals: replay.signals.length,
    resolved: windowMetrics.N,
    unresolved: replay.unresolvedCount,
    wins,
    losses,
    pushes,
    metrics: windowMetrics
  });

  allOutcomes.push(...mapped);
}

// 4. Aggregate OOS Metrics
console.log('\n──── 4. Aggregate OOS Control Metrics ────');
const aggregateMetrics = MetricsEngine.calculate(allOutcomes, EXPERIMENT.payout);
const totalPushes = allOutcomes.filter(o => o.outcome === 'PUSH').length;
const totalWins = allOutcomes.filter(o => o.outcome === 'WIN').length;
const totalLosses = allOutcomes.filter(o => o.outcome === 'LOSS').length;
const totalCalls = allOutcomes.filter(o => o.direction === 'CALL').length;
const totalPuts = allOutcomes.filter(o => o.direction === 'PUT').length;

console.log(`  Total Predictions:  ${allOutcomes.length}`);
console.log(`  Total Resolved (N): ${aggregateMetrics.N}`);
console.log(`    CALL:             ${totalCalls}`);
console.log(`    PUT:              ${totalPuts}`);
console.log(`  Outcomes:`);
console.log(`    WIN:              ${totalWins}`);
console.log(`    LOSS:             ${totalLosses}`);
console.log(`    PUSH:             ${totalPushes}`);

if (aggregateMetrics.N > 0) {
  console.log(`\n  Statistics:`);
  console.log(`    Win Rate (ex-PUSH): ${(aggregateMetrics.winRate * 100).toFixed(4)}%`);
  console.log(`    Wilson 95% CI:      [${(aggregateMetrics.confidenceInterval.lower * 100).toFixed(4)}%, ${(aggregateMetrics.confidenceInterval.upper * 100).toFixed(4)}%]`);
  console.log(`    Break-even (P_BE):  ${(P_BE * 100).toFixed(4)}%`);
  console.log(`    Edge:               ${(aggregateMetrics.edge * 100).toFixed(4)}pp`);
  console.log(`    Expected Value (EV):${aggregateMetrics.ev.toFixed(6)}`);
  console.log(`    Brier Score:        ${aggregateMetrics.brier.toFixed(6)}`);
  console.log(`    Status:             ${aggregateMetrics.status}`);
}

// 5. Window Stability
const winRates = windowResults.map(w => w.metrics.winRate);
const edgeWindows = windowResults.filter(w => w.metrics.status === 'EDGE DETECTED').length;

console.log(`\n──── 5. Window Stability ────`);
console.log(`  Total Windows:        ${windowResults.length}`);
console.log(`  Windows with Edge:    ${edgeWindows}/${windowResults.length}`);

// 6. Save Frozen Control Report
const reportDir = path.join(__dirname, '..', 'research', 'reports', 'baseline_oos');
fs.mkdirSync(reportDir, { recursive: true });

const controlReport = {
  experimentId: EXPERIMENT.experimentId,
  datasetId: EXPERIMENT.datasetId,
  protocolVersion: EXPERIMENT.protocolVersion,
  parameters: EXPERIMENT,
  aggregate: aggregateMetrics,
  totals: {
    signals: allOutcomes.length + windowResults.reduce((acc, w) => acc + w.unresolved, 0),
    resolved: aggregateMetrics.N,
    unresolved: windowResults.reduce((acc, w) => acc + w.unresolved, 0),
    wins: totalWins,
    losses: totalLosses,
    pushes: totalPushes,
    calls: totalCalls,
    puts: totalPuts
  },
  windows: windowResults.map(wr => ({
    window: wr.window,
    testPeriod: `${wr.testStart} → ${wr.testEnd}`,
    trainedP: wr.trainedP,
    signals: wr.signals,
    resolved: wr.resolved,
    unresolved: wr.unresolved,
    wins: wr.wins,
    losses: wr.losses,
    pushes: wr.pushes,
    winRate: wr.metrics.winRate,
    ciLower: wr.metrics.confidenceInterval ? wr.metrics.confidenceInterval.lower : null,
    ciUpper: wr.metrics.confidenceInterval ? wr.metrics.confidenceInterval.upper : null,
    edge: wr.metrics.edge,
    ev: wr.metrics.ev,
    status: wr.metrics.status
  })),
  executedAt: new Date().toISOString(),
  status: "FROZEN"
};

const controlReportPath = path.join(reportDir, 'BASELINE_003_CONTROL.json');
fs.writeFileSync(controlReportPath, JSON.stringify(controlReport, null, 2) + '\n', 'utf8');
console.log(`\n  ✓ Control Report saved and frozen: ${controlReportPath}`);
