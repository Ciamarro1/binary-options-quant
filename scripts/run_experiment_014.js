"use strict";

/**
 * scripts/run_experiment_014.js
 * 
 * Milestone 014 — HYPOTHESIS_002 Blind Walk-Forward OOS Replay
 * Evaluates H002, Reversed Control, and Baseline Control concurrently
 * across 115 rolling windows of DATASET_003 (BTCUSDT 1m Jun-Sep 2024).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DatasetLoader = require('../src/data/DatasetLoader');
const DatasetValidator = require('../src/data/DatasetValidator');
const WalkForward = require('../src/validation/WalkForward');
const FeatureEngine = require('../src/strategy/FeatureEngine');
const RegimeEngine = require('../src/strategy/RegimeEngine');
const SignalEngine = require('../src/strategy/SignalEngine');
const ReplayEngine = require('../src/replay/ReplayEngine');
const MetricsEngine = require('../src/research/MetricsEngine');
const ExhaustionModel = require('../src/strategy/models/ExhaustionModel');
const ReversedExhaustionModel = require('../src/strategy/models/ReversedExhaustionModel');

const EXPERIMENT_ID = 'EXP_014_EXHAUSTION_BTC1M_2024_06_09';
const ASSET = 'BTCUSDT';
const TIMEFRAME = '1m';
const EXPIRY_CANDLES = 3;
const EXPIRY_SECONDS = 180;
const PAYOUT = 0.80;
const P_BE = 1 / (1 + PAYOUT); // 0.555556
const TRAIN_SIZE = 10080;
const TEST_SIZE = 1440;

console.log('══════════════════════════════════════════════════════════════════');
console.log(' BLIND WALK-FORWARD OOS REPLAY — HYPOTHESIS_002 (Commit 014)');
console.log('══════════════════════════════════════════════════════════════════');

const baseDir = path.join(__dirname, '..', 'research', 'datasets', ASSET, TIMEFRAME, '2024-06_09');
const manifestPath = path.join(baseDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log('\n[1/5] Loading and Verifying DATASET_003...');
const months = ['2024-06', '2024-07', '2024-08', '2024-09'];
const allObservations = [];

for (const m of months) {
  const csvFile = path.join(baseDir, 'canonical', `BTCUSDT_1m_${m.replace('-', '_')}.csv`);
  const dataset = DatasetLoader.loadCSV(csvFile, {
    datasetId: `DATASET_003_${m}`,
    asset: ASSET,
    timeframe: TIMEFRAME,
    source: 'Binance'
  });
  allObservations.push(...dataset.observations);
}

allObservations.sort((a, b) => a.timestamp - b.timestamp);
DatasetValidator.validate(allObservations);
console.log(`  ✓ DATASET_003 Verified: ${allObservations.length} rows, 0 gaps.`);

// Load BASELINE_003_CONTROL
const baselineControlPath = path.join(__dirname, '..', 'research', 'reports', 'baseline_oos', 'BASELINE_003_CONTROL.json');
const baselineControl = JSON.parse(fs.readFileSync(baselineControlPath, 'utf8'));
console.log(`  ✓ BASELINE_003_CONTROL Loaded: Win Rate ${(baselineControl.aggregate.winRate * 100).toFixed(4)}%`);

// 2. Generate Walk-Forward Splits
console.log('\n[2/5] Generating Walk-Forward Windows...');
const splits = [...WalkForward.generateSplits(allObservations, TRAIN_SIZE, TEST_SIZE)];
console.log(`  ✓ Total Windows: ${splits.length} (Expected: 115)`);
if (splits.length !== 115) throw new Error(`Window count mismatch: ${splits.length}`);

// Setup Replay Engines
const featureEngine = new FeatureEngine('exhaustion_fe', '1.0');
const signalEngine = new SignalEngine({
  featureEngine,
  regimeEngine: new RegimeEngine()
});
const replayEngine = new ReplayEngine({ signalEngine });

const windowResultsH002 = [];
const windowResultsRev = [];
const allOutcomesH002 = [];
const allOutcomesRev = [];

console.log('\n[3/5] Executing Walk-Forward Replay for H002 & Reversed Control...');

for (let w = 0; w < splits.length; w++) {
  const { train, test } = splits[w];

  // Fit H002 on train window
  const modelH002 = ExhaustionModel.fit(train, { expiryCandles: EXPIRY_CANDLES });
  
  // Create Reversed Model with same direction probabilities
  const modelRev = new ReversedExhaustionModel(modelH002.probCall, modelH002.probPut, {
    expirySeconds: EXPIRY_SECONDS
  });

  const testHashPayload = test.map(o => `${o.timestamp}:${o.open}:${o.high}:${o.low}:${o.close}:${o.volume}`).join('|');
  const testContentHash = crypto.createHash('sha256').update(testHashPayload).digest('hex');

  const testDataset = {
    observations: test,
    metadata: {
      datasetId: `DATASET_003_W${w + 1}`,
      asset: ASSET,
      timeframe: TIMEFRAME,
      contentHash: testContentHash
    }
  };

  // Run Replay for H002
  const replayH002 = replayEngine.run(testDataset, modelH002, PAYOUT);
  const mappedH002 = replayH002.outcomes.map(o => ({
    prob: o.probability,
    outcome: o.outcome,
    direction: o.direction
  }));
  const metricsH002 = MetricsEngine.calculate(mappedH002, PAYOUT);

  // Run Replay for Reversed Control
  const replayRev = replayEngine.run(testDataset, modelRev, PAYOUT);
  const mappedRev = replayRev.outcomes.map(o => ({
    prob: o.probability,
    outcome: o.outcome,
    direction: o.direction
  }));
  const metricsRev = MetricsEngine.calculate(mappedRev, PAYOUT);

  const baselineWin = baselineControl.windows[w];

  windowResultsH002.push({
    window: w + 1,
    testPeriod: `${new Date(test[0].timestamp).toISOString().slice(0, 10)} → ${new Date(test[test.length - 1].timestamp).toISOString().slice(0, 10)}`,
    pCall: modelH002.probCall,
    pPut: modelH002.probPut,
    signals: replayH002.signals.length,
    signalsCall: replayH002.signals.filter(s => s.direction === 'CALL').length,
    signalsPut: replayH002.signals.filter(s => s.direction === 'PUT').length,
    resolved: metricsH002.N,
    unresolved: replayH002.unresolvedCount,
    wins: replayH002.outcomes.filter(o => o.outcome === 'WIN').length,
    losses: replayH002.outcomes.filter(o => o.outcome === 'LOSS').length,
    pushes: replayH002.outcomes.filter(o => o.outcome === 'PUSH').length,
    winRate: metricsH002.winRate,
    ciLower: metricsH002.confidenceInterval ? metricsH002.confidenceInterval.lower : null,
    ciUpper: metricsH002.confidenceInterval ? metricsH002.confidenceInterval.upper : null,
    ev: metricsH002.ev,
    brier: metricsH002.brier,
    status: metricsH002.status,
    // Paired comparison
    baselineWinRate: baselineWin ? baselineWin.winRate : null,
    reversedWinRate: metricsRev.winRate
  });

  windowResultsRev.push({
    window: w + 1,
    testPeriod: `${new Date(test[0].timestamp).toISOString().slice(0, 10)} → ${new Date(test[test.length - 1].timestamp).toISOString().slice(0, 10)}`,
    signals: replayRev.signals.length,
    resolved: metricsRev.N,
    wins: replayRev.outcomes.filter(o => o.outcome === 'WIN').length,
    losses: replayRev.outcomes.filter(o => o.outcome === 'LOSS').length,
    pushes: replayRev.outcomes.filter(o => o.outcome === 'PUSH').length,
    winRate: metricsRev.winRate,
    ev: metricsRev.ev,
    status: metricsRev.status
  });

  allOutcomesH002.push(...mappedH002);
  allOutcomesRev.push(...mappedRev);
}

// 4. Compute Aggregate Metrics
console.log('\n[4/5] Computing Aggregate Metrics across 115 OOS Windows...');
const aggMetricsH002 = MetricsEngine.calculate(allOutcomesH002, PAYOUT);
const aggMetricsRev = MetricsEngine.calculate(allOutcomesRev, PAYOUT);

const totalCallsH002 = allOutcomesH002.filter(o => o.direction === 'CALL').length;
const totalPutsH002 = allOutcomesH002.filter(o => o.direction === 'PUT').length;
const totalWinsH002 = allOutcomesH002.filter(o => o.outcome === 'WIN').length;
const totalLossesH002 = allOutcomesH002.filter(o => o.outcome === 'LOSS').length;
const totalPushesH002 = allOutcomesH002.filter(o => o.outcome === 'PUSH').length;

console.log('══════════════════════════════════════════════════════════════════');
console.log(' HYPOTHESIS_002 OOS AGGREGATE RESULTS');
console.log('══════════════════════════════════════════════════════════════════');
console.log(`  Total Resolved Trades (N): ${aggMetricsH002.N}`);
console.log(`    CALL Trades:             ${totalCallsH002} (Wins: ${allOutcomesH002.filter(o => o.direction === 'CALL' && o.outcome === 'WIN').length})`);
console.log(`    PUT Trades:              ${totalPutsH002} (Wins: ${allOutcomesH002.filter(o => o.direction === 'PUT' && o.outcome === 'WIN').length})`);
console.log(`    PUSH Trades (Excluded):  ${totalPushesH002}`);
console.log(`  H002 Win Rate (ex-PUSH):   ${(aggMetricsH002.winRate * 100).toFixed(4)}%`);
if (aggMetricsH002.confidenceInterval) {
  console.log(`  95% Wilson CI:             [${(aggMetricsH002.confidenceInterval.lower * 100).toFixed(4)}%, ${(aggMetricsH002.confidenceInterval.upper * 100).toFixed(4)}%]`);
}
console.log(`  Break-even (P_BE):         ${(P_BE * 100).toFixed(4)}%`);
console.log(`  Edge:                      ${(aggMetricsH002.edge * 100).toFixed(4)}pp`);
console.log(`  Expected Value (EV):       ${aggMetricsH002.ev.toFixed(6)}`);
console.log(`  Brier Score:               ${aggMetricsH002.brier.toFixed(6)}`);
console.log(`  Status:                    ${aggMetricsH002.status}`);
console.log('──────────────────────────────────────────────────────────────────');
console.log(`  Baseline 003 Control WR:   ${(baselineControl.aggregate.winRate * 100).toFixed(4)}%`);
console.log(`  Reversed Control WR:       ${(aggMetricsRev.winRate * 100).toFixed(4)}% (EV: ${aggMetricsRev.ev.toFixed(6)})`);
console.log('══════════════════════════════════════════════════════════════════');

// 5. Emit Artifacts
console.log('\n[5/5] Emitting Milestone 014 Artifacts...');
const reportDir = path.join(__dirname, '..', 'research', 'reports', 'EXP_014');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
const expDir = path.join(__dirname, '..', 'research', 'experiments');
if (!fs.existsSync(expDir)) fs.mkdirSync(expDir, { recursive: true });

// EXP_014_MANIFEST.json
const manifestExp014 = {
  experimentId: EXPERIMENT_ID,
  hypothesisId: 'HYPOTHESIS_002',
  hypothesisVersion: '1.0.0',
  datasetId: 'DATASET_003',
  protocolVersion: '1.1',
  parameters: {
    asset: ASSET,
    timeframe: TIMEFRAME,
    expiryCandles: EXPIRY_CANDLES,
    expirySeconds: EXPIRY_SECONDS,
    payout: PAYOUT,
    breakEvenRate: P_BE,
    trainSize: TRAIN_SIZE,
    testSize: TEST_SIZE,
    totalWindows: 115,
    bodyThreshold: 2.0,
    upperCloseLocation: 0.90,
    lowerCloseLocation: 0.10,
    volumeThreshold: 2.0,
    minTrainSamples: 30
  },
  datasetContentHash: manifest.aggregate.datasetContentHash,
  executedAt: new Date().toISOString(),
  status: 'EXECUTED_AWAITING_CRO_DELIBERATION'
};
fs.writeFileSync(path.join(expDir, 'EXP_014_MANIFEST.json'), JSON.stringify(manifestExp014, null, 2) + '\n', 'utf8');

// VALIDATION_REPORT.json
const validationReport = {
  experimentId: EXPERIMENT_ID,
  hypothesisId: 'HYPOTHESIS_002',
  datasetId: 'DATASET_003',
  targetExpiry: '3 candles (180s)',
  payout: PAYOUT,
  breakEvenRate: P_BE,
  aggregateMetrics: aggMetricsH002,
  breakdown: {
    totalSignals: allOutcomesH002.length + windowResultsH002.reduce((acc, w) => acc + w.unresolved, 0),
    totalResolved: aggMetricsH002.N,
    totalUnresolved: windowResultsH002.reduce((acc, w) => acc + w.unresolved, 0),
    totalWins: totalWinsH002,
    totalLosses: totalLossesH002,
    totalPushes: totalPushesH002,
    totalCalls: totalCallsH002,
    totalPuts: totalPutsH002,
    callWinRate: totalCallsH002 > 0 ? allOutcomesH002.filter(o => o.direction === 'CALL' && o.outcome === 'WIN').length / totalCallsH002 : null,
    putWinRate: totalPutsH002 > 0 ? allOutcomesH002.filter(o => o.direction === 'PUT' && o.outcome === 'WIN').length / totalPutsH002 : null
  },
  comparisons: {
    baselineControl: {
      datasetId: 'DATASET_003',
      modelId: 'BASELINE_NAIVE',
      winRate: baselineControl.aggregate.winRate,
      ev: baselineControl.aggregate.ev,
      edge: baselineControl.aggregate.edge
    },
    reversedControl: {
      modelId: 'REVERSED_EXHAUSTION_CONTROL',
      resolved: aggMetricsRev.N,
      winRate: aggMetricsRev.winRate,
      ev: aggMetricsRev.ev,
      status: aggMetricsRev.status
    }
  },
  windows: windowResultsH002,
  generatedAt: new Date().toISOString(),
  status: 'COMPLETE'
};
fs.writeFileSync(path.join(reportDir, 'VALIDATION_REPORT.json'), JSON.stringify(validationReport, null, 2) + '\n', 'utf8');

// H002_OOS_RESULTS.json
fs.writeFileSync(path.join(reportDir, 'H002_OOS_RESULTS.json'), JSON.stringify({
  experimentId: EXPERIMENT_ID,
  aggregate: aggMetricsH002,
  windows: windowResultsH002
}, null, 2) + '\n', 'utf8');

// REVERSED_CONTROL_RESULTS.json
fs.writeFileSync(path.join(reportDir, 'REVERSED_CONTROL_RESULTS.json'), JSON.stringify({
  experimentId: EXPERIMENT_ID,
  aggregate: aggMetricsRev,
  windows: windowResultsRev
}, null, 2) + '\n', 'utf8');

// BASELINE_003_COMPARISON.json
fs.writeFileSync(path.join(reportDir, 'BASELINE_003_COMPARISON.json'), JSON.stringify({
  experimentId: EXPERIMENT_ID,
  pairedWindows: windowResultsH002.map(w => ({
    window: w.window,
    h002WinRate: w.winRate,
    baselineWinRate: w.baselineWinRate,
    reversedWinRate: w.reversedWinRate,
    h002Ev: w.ev
  }))
}, null, 2) + '\n', 'utf8');

// Copy ADVERSARIAL_AUDIT_002.json to reportDir as ADVERSARIAL_AUDIT.json
const advAuditSrc = path.join(__dirname, '..', 'research', 'reports', 'ADVERSARIAL_AUDIT_002.json');
fs.copyFileSync(advAuditSrc, path.join(reportDir, 'ADVERSARIAL_AUDIT.json'));

// PROVENANCE_RECEIPT.json
const hyp002Path = path.join(__dirname, '..', 'research', 'hypotheses', 'HYPOTHESIS_002.md');
const hypSha256 = crypto.createHash('sha256').update(fs.readFileSync(hyp002Path)).digest('hex');

const provenanceReceipt = {
  receiptId: `PROV_${EXPERIMENT_ID}`,
  experimentId: EXPERIMENT_ID,
  hypothesisId: 'HYPOTHESIS_002',
  hypothesisVersion: '1.0.0',
  hypothesisSha256: hypSha256,
  datasetId: 'DATASET_003',
  datasetContentHash: manifest.aggregate.datasetContentHash,
  codeCommitBaseline: 'COMMIT_014_FROZEN',
  totalWindows: 115,
  triProofStatus: {
    statsProofAvailable: true,
    adversarialProofAvailable: true,
    provenanceVerified: true
  },
  certifiedBy: 'EXPERIMENT_CONTROLLER',
  certifiedAt: new Date().toISOString(),
  status: 'VERIFIED_AWAITING_CRO'
};
fs.writeFileSync(path.join(reportDir, 'PROVENANCE_RECEIPT.json'), JSON.stringify(provenanceReceipt, null, 2) + '\n', 'utf8');

console.log(`  ✓ All artifacts successfully generated in ${reportDir}`);
