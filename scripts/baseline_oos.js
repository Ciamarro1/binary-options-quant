"use strict";

/**
 * BASELINE OOS EXPERIMENT — Commit 006B
 * =======================================
 * Pre-declared parameters (frozen before execution):
 *   Asset:      BTCUSDT
 *   Timeframe:  1m
 *   Expiry:     1 candle (60s)
 *   Payout:     0.80
 *   Model:      BASELINE_NAIVE v1.0.1
 *   Features:   N/A (naive frequency)
 *   Walk-Fwd:   Train=10080 (1 week), Test=1440 (1 day)
 *   
 *   P_BE = 1/(1+0.80) = 55.56%
 *   
 *   NO OPTIMIZATION. NO POST-HOC SELECTION.
 */

const path = require('path');
const fs = require('fs');
const DatasetLoader = require('../src/data/DatasetLoader');
const WalkForward = require('../src/validation/WalkForward');
const BaselineModel = require('../src/research/BaselineModel');
const ReplayEngine = require('../src/replay/ReplayEngine');
const MetricsEngine = require('../src/research/MetricsEngine');
const CalibrationEngine = require('../src/research/CalibrationEngine');
const FeatureEngine = require('../src/strategy/FeatureEngine');
const RegimeEngine = require('../src/strategy/RegimeEngine');
const SignalEngine = require('../src/strategy/SignalEngine');

// ═══════════════════════════════════════════════
// PRE-DECLARED EXPERIMENT PARAMETERS (FROZEN)
// ═══════════════════════════════════════════════
const EXPERIMENT = Object.freeze({
  experimentId: 'BASELINE_OOS_001',
  datasetId: 'BINANCE_SPOT_BTCUSDT_1M_2024_01',
  asset: 'BTCUSDT',
  timeframe: '1m',
  expiryCandles: 1,
  payout: 0.80,
  modelId: 'BASELINE_NAIVE',
  modelVersion: '1.0.1',
  trainSize: 10080,   // 7 days of 1m candles
  testSize: 1440,     // 1 day of 1m candles
  protocolVersion: '1.0.0'
});

const P_BE = 1 / (1 + EXPERIMENT.payout);

// ═══════════════════════════════════════════════
// LOAD DATASET
// ═══════════════════════════════════════════════
const csvPath = path.join(__dirname, '..', 'research', 'datasets', 'BTCUSDT', '1m', '2024-01', 'canonical', 'BTCUSDT_1m_2024_01.csv');
const manifestPath = path.join(__dirname, '..', 'research', 'datasets', 'BTCUSDT', '1m', '2024-01', 'manifest.json');

console.log('══════════════════════════════════════════════════════════');
console.log(' REAL MARKET BASELINE OOS REPORT');
console.log(' Binary Options Quant — Commit 006B');
console.log('══════════════════════════════════════════════════════════');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

console.log('\n──── Dataset ────');
console.log(`  Asset:          ${EXPERIMENT.asset}`);
console.log(`  Timeframe:      ${EXPERIMENT.timeframe}`);
console.log(`  Period:         ${manifest.startTimestamp} → ${manifest.endTimestamp}`);
console.log(`  Rows:           ${manifest.rowCount}`);
console.log(`  Content Hash:   ${manifest.canonicalContentHash}`);

console.log('\n──── Model ────');
console.log(`  ${EXPERIMENT.modelId}`);
console.log(`  Version:        ${EXPERIMENT.modelVersion}`);

console.log('\n──── Protocol ────');
console.log(`  Expiry:         ${EXPERIMENT.expiryCandles} candle(s)`);
console.log(`  Payout:         ${EXPERIMENT.payout}`);
console.log(`  P_BE:           ${(P_BE * 100).toFixed(2)}%`);
console.log(`  Train window:   ${EXPERIMENT.trainSize} (${(EXPERIMENT.trainSize / 1440).toFixed(1)} days)`);
console.log(`  Test window:    ${EXPERIMENT.testSize} (${(EXPERIMENT.testSize / 1440).toFixed(1)} days)`);

// ═══════════════════════════════════════════════
// LOAD & VALIDATE
// ═══════════════════════════════════════════════
const crypto = require('crypto');
const fileContent = fs.readFileSync(csvPath);
const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');

// Verify hash matches manifest
if (fileHash !== manifest.canonicalContentHash) {
  console.error(`🚨 DATASET HASH MISMATCH — ABORTING. Expected ${manifest.canonicalContentHash}, got ${fileHash}`);
  process.exit(1);
}
console.log('\n  ✓ Dataset hash verified against manifest');

const dataset = DatasetLoader.loadCSV(csvPath, {
  datasetId: EXPERIMENT.datasetId,
  asset: EXPERIMENT.asset,
  timeframe: EXPERIMENT.timeframe,
  source: 'Binance Public Data'
});

// ═══════════════════════════════════════════════
// SETUP ENGINES
// ═══════════════════════════════════════════════
const signalEngine = new SignalEngine({
  featureEngine: new FeatureEngine('v1', '1.0'),
  regimeEngine: new RegimeEngine()
});
const replayEngine = new ReplayEngine({ signalEngine });

// ═══════════════════════════════════════════════
// WALK-FORWARD EXECUTION
// ═══════════════════════════════════════════════
console.log('\n──── Walk Forward ────');

const splits = [...WalkForward.generateSplits(dataset.observations, EXPERIMENT.trainSize, EXPERIMENT.testSize)];
console.log(`  Total windows:  ${splits.length}`);

const windowResults = [];
const allOutcomes = [];

for (let w = 0; w < splits.length; w++) {
  const { train, test } = splits[w];
  
  // Fit baseline on train window only
  const model = BaselineModel.fit(train);
  
  // Build a mini-dataset from test window for replay
  const testDataset = {
    observations: test,
    metadata: {
      ...dataset.metadata,
      contentHash: dataset.metadata.contentHash + `_W${w}`
    }
  };
  
  // Replay
  const replay = replayEngine.run(testDataset, model, EXPERIMENT.payout);
  
  // Map outcomes for metrics
  const mapped = replay.outcomes.map(o => ({ prob: o.probability, outcome: o.outcome, direction: o.direction }));
  const windowMetrics = MetricsEngine.calculate(mapped, EXPERIMENT.payout);
  
  windowResults.push({
    window: w + 1,
    trainStart: new Date(train[0].timestamp).toISOString().slice(0, 10),
    trainEnd: new Date(train[train.length - 1].timestamp).toISOString().slice(0, 10),
    testStart: new Date(test[0].timestamp).toISOString().slice(0, 10),
    testEnd: new Date(test[test.length - 1].timestamp).toISOString().slice(0, 10),
    trainedP: model.callFrequency,
    signals: replay.signals.length,
    outcomes: replay.outcomes.length,
    unresolved: replay.unresolvedCount,
    pushes: replay.outcomes.filter(o => o.outcome === 'PUSH').length,
    metrics: windowMetrics
  });
  
  allOutcomes.push(...mapped);
}

// ═══════════════════════════════════════════════
// PER-WINDOW RESULTS
// ═══════════════════════════════════════════════
console.log('\n──── OOS Window Results ────');
console.log(`${'Win'.padStart(4)} | ${'N'.padStart(5)} | ${'WinRate'.padStart(8)} | ${'CI_Low'.padStart(8)} | ${'Edge'.padStart(8)} | ${'EV'.padStart(8)} | ${'Push'.padStart(4)} | Status`);
console.log('-'.repeat(80));

const winRates = [];
for (const wr of windowResults) {
  const m = wr.metrics;
  if (m.N > 0) {
    winRates.push(m.winRate);
    console.log(
      `${String(wr.window).padStart(4)} | ` +
      `${String(m.N).padStart(5)} | ` +
      `${(m.winRate * 100).toFixed(2).padStart(8)}% | ` +
      `${(m.confidenceInterval.lower * 100).toFixed(2).padStart(7)}% | ` +
      `${(m.edge * 100).toFixed(2).padStart(7)}pp | ` +
      `${m.ev.toFixed(4).padStart(8)} | ` +
      `${String(wr.pushes).padStart(4)} | ` +
      `${m.status}`
    );
  } else {
    console.log(`${String(wr.window).padStart(4)} | INSUFFICIENT DATA`);
  }
}

// ═══════════════════════════════════════════════
// AGGREGATE METRICS
// ═══════════════════════════════════════════════
console.log('\n──── Aggregate OOS Metrics ────');

const aggregateMetrics = MetricsEngine.calculate(allOutcomes, EXPERIMENT.payout);
const totalPushes = allOutcomes.filter(o => o.outcome === 'PUSH').length;
const totalCalls = allOutcomes.filter(o => o.direction === 'CALL').length;
const totalPuts = allOutcomes.filter(o => o.direction === 'PUT').length;

console.log(`  Total Predictions:  ${allOutcomes.length}`);
console.log(`    CALL:             ${totalCalls}`);
console.log(`    PUT:              ${totalPuts}`);
console.log(`  Outcomes:`);
console.log(`    WIN:              ${allOutcomes.filter(o => o.outcome === 'WIN').length}`);
console.log(`    LOSS:             ${allOutcomes.filter(o => o.outcome === 'LOSS').length}`);
console.log(`    PUSH:             ${totalPushes}`);

if (aggregateMetrics.N > 0) {
  console.log(`\n  Statistics:`);
  console.log(`    Win Rate:         ${(aggregateMetrics.winRate * 100).toFixed(4)}%`);
  console.log(`    Wilson 95% CI:    [${(aggregateMetrics.confidenceInterval.lower * 100).toFixed(4)}%, ${(aggregateMetrics.confidenceInterval.upper * 100).toFixed(4)}%]`);
  console.log(`    Break-even:       ${(aggregateMetrics.breakEven * 100).toFixed(4)}%`);
  console.log(`    Edge:             ${(aggregateMetrics.edge * 100).toFixed(4)}pp`);
  console.log(`    EV:               ${aggregateMetrics.ev.toFixed(6)}`);
  console.log(`    Brier Score:      ${aggregateMetrics.brier.toFixed(6)}`);
  console.log(`    Log Loss:         ${aggregateMetrics.logLoss.toFixed(6)}`);
  console.log(`    Sample Size:      ${aggregateMetrics.N}`);
}

// ═══════════════════════════════════════════════
// OOS STABILITY
// ═══════════════════════════════════════════════
console.log('\n──── OOS Stability ────');

if (winRates.length > 1) {
  const mean = winRates.reduce((a, b) => a + b, 0) / winRates.length;
  const variance = winRates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / winRates.length;
  const std = Math.sqrt(variance);
  const min = Math.min(...winRates);
  const max = Math.max(...winRates);
  const range = max - min;
  
  console.log(`  Windows:            ${winRates.length}`);
  console.log(`  Mean Win Rate:      ${(mean * 100).toFixed(4)}%`);
  console.log(`  Std Dev:            ${(std * 100).toFixed(4)}pp`);
  console.log(`  Min:                ${(min * 100).toFixed(4)}%`);
  console.log(`  Max:                ${(max * 100).toFixed(4)}%`);
  console.log(`  Range:              ${(range * 100).toFixed(4)}pp`);
  
  // Stability: how many windows individually showed edge?
  const edgeWindows = windowResults.filter(wr => wr.metrics.status === 'EDGE DETECTED').length;
  console.log(`  Edge in window:     ${edgeWindows}/${winRates.length}`);
}

// ═══════════════════════════════════════════════
// CALIBRATION
// ═══════════════════════════════════════════════
console.log('\n──── Calibration ────');
const calibration = CalibrationEngine.analyze(allOutcomes.map(o => ({ prob: o.prob, outcome: o.outcome })), 10);
for (const bin of calibration) {
  if (bin.count > 0) {
    console.log(`  [${(bin.rangeStart * 100).toFixed(0)}%-${(bin.rangeEnd * 100).toFixed(0)}%] ` +
      `N=${String(bin.count).padStart(6)} | ` +
      `Predicted=${(bin.expected * 100).toFixed(2)}% | ` +
      `Empirical=${(bin.empirical * 100).toFixed(2)}%`);
  }
}

// ═══════════════════════════════════════════════
// FINAL STATUS
// ═══════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════════');
console.log(` FINAL STATUS: ${aggregateMetrics.status}`);
console.log('══════════════════════════════════════════════════════════');

console.log('\n──── Provenance ────');
console.log(`  Dataset Hash:       ${manifest.canonicalContentHash}`);
console.log(`  Model ID:           ${EXPERIMENT.modelId}`);
console.log(`  Model Version:      ${EXPERIMENT.modelVersion}`);
console.log(`  Protocol Version:   ${EXPERIMENT.protocolVersion}`);
console.log(`  Experiment ID:      ${EXPERIMENT.experimentId}`);
console.log(`  Executed At:        ${new Date().toISOString()}`);

// ═══════════════════════════════════════════════
// SAVE REPORT
// ═══════════════════════════════════════════════
const report = {
  experimentId: EXPERIMENT.experimentId,
  experiment: EXPERIMENT,
  dataset: {
    datasetId: manifest.datasetId,
    contentHash: manifest.canonicalContentHash,
    rowCount: manifest.rowCount,
    startTimestamp: manifest.startTimestamp,
    endTimestamp: manifest.endTimestamp
  },
  windowResults: windowResults.map(wr => ({
    window: wr.window,
    testPeriod: `${wr.testStart} → ${wr.testEnd}`,
    trainedP: wr.trainedP,
    N: wr.metrics.N,
    winRate: wr.metrics.winRate,
    ciLower: wr.metrics.confidenceInterval ? wr.metrics.confidenceInterval.lower : null,
    edge: wr.metrics.edge,
    ev: wr.metrics.ev,
    pushes: wr.pushes,
    status: wr.metrics.status
  })),
  aggregate: aggregateMetrics,
  stability: winRates.length > 1 ? {
    windows: winRates.length,
    mean: winRates.reduce((a, b) => a + b, 0) / winRates.length,
    std: Math.sqrt(winRates.reduce((a, b) => a + Math.pow(b - winRates.reduce((x, y) => x + y, 0) / winRates.length, 2), 0) / winRates.length),
    min: Math.min(...winRates),
    max: Math.max(...winRates)
  } : null,
  executedAt: new Date().toISOString()
};

const reportDir = path.join(__dirname, '..', 'research', 'reports', 'baseline_oos');
fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, 'BASELINE_OOS_001.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');
console.log(`\n  Report saved: ${reportPath}`);
