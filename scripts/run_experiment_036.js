"use strict";

/**
 * scripts/run_experiment_036.js
 * 
 * Execution of HYPOTHESIS_006 Blind Walk-Forward Replay on DATASET_XAUXAG_001.
 * Macro-trend conditioned ratio mean reversion (120m Z-score filtered by 24h SMA).
 */

const fs = require('fs');
const path = require('path');
const DatasetLoader = require('../src/data/DatasetLoader');
const H006Runner = require('../src/strategy/runners/H006Runner');
const TrendConditionedRatioZScoreModel = require('../src/strategy/models/TrendConditionedRatioZScoreModel');
const ReversedTrendConditionedModel = require('../src/strategy/models/ReversedTrendConditionedModel');

const CANONICAL_CSV = path.join(
  __dirname,
  '..',
  'research',
  'datasets',
  'XAUXAG',
  '1m',
  '2025-06_08',
  'canonical',
  'XAUXAG_1m_canonical.csv'
);

const REPORT_OUTPUT = path.join(__dirname, '..', 'research', 'reports', 'VALIDATION_REPORT_006.json');

async function main() {
  console.log('================================================================');
  console.log('EXPERIMENT 036: BLIND WALK-FORWARD REPLAY (HYPOTHESIS_006)');
  console.log('Hypothesis: Macro-Trend Conditioned Intraday Ratio Mean Reversion');
  console.log('Target Instrument: XAUXAG (IQ Option regular feed)');
  console.log('Dataset: DATASET_XAUXAG_001 (89,312 candles)');
  console.log('Breakeven Hurdle: P_BE = 53.1915% (Payout = 88.0%)');
  console.log('================================================================\n');

  // 1. Ingest Canonical Dataset
  console.log('[DATA] Ingesting canonical dataset via DatasetLoader...');
  const dataset = DatasetLoader.loadCSV(CANONICAL_CSV, {
    datasetId: 'DATASET_XAUXAG_001',
    asset: 'XAUXAG',
    timeframe: '1m',
    source: 'DUKASCOPY_RECONSTRUCTED_SPOT'
  });
  console.log(`[DATA] Loaded ${dataset.observations.length} observations.`);

  const splitTimestamp = Date.parse('2025-07-21T00:00:00.000Z');
  console.log(`[SPLIT] In-Sample / Out-of-Sample Boundary: ${new Date(splitTimestamp).toISOString()}`);

  // 2. Standard Model Runner
  console.log('\n[RUN] Executing Standard HYPOTHESIS_006 Model...');
  const runner = new H006Runner(dataset.observations, {
    intradayLookback: 120,
    macroLookback: 1440,
    threshold: 2.0,
    expiryBars: 15,
    payoutRate: 0.88,
    modelClass: TrendConditionedRatioZScoreModel
  });
  const standardResults = runner.runPartitioned(splitTimestamp);

  // 3. Reversed Negative Control Runner
  console.log('\n[RUN] Executing Reversed Negative Control Model...');
  const reversedRunner = new H006Runner(dataset.observations, {
    intradayLookback: 120,
    macroLookback: 1440,
    threshold: 2.0,
    expiryBars: 15,
    payoutRate: 0.88,
    modelClass: ReversedTrendConditionedModel
  });
  const reversedResults = reversedRunner.runPartitioned(splitTimestamp);

  const oos = standardResults.outOfSample;
  const is = standardResults.inSample;
  const revOos = reversedResults.outOfSample;

  console.log('\n================================================================');
  console.log('OUT-OF-SAMPLE (BLIND EVALUATION) RESULTS — HYPOTHESIS_006');
  console.log('================================================================');
  console.log(`Total Signals:        ${oos.totalSignals}`);
  console.log(`Resolved Trades:      ${oos.resolvedTrades} (Wins: ${oos.wins}, Losses: ${oos.losses}, Pushes: ${oos.pushes})`);
  console.log(`Realized Win Rate:    ${(oos.winRate * 100).toFixed(4)}%`);
  console.log(`95% Wilson CI:        [${(oos.wilsonCI.lower * 100).toFixed(4)}%, ${(oos.wilsonCI.upper * 100).toFixed(4)}%]`);
  console.log(`Breakeven Hurdle:     ${(oos.breakevenRate * 100).toFixed(4)}%`);
  console.log(`Wilson Lower vs P_BE: ${oos.wilsonCI.lower > oos.breakevenRate ? 'PASS (EDGE DETECTED)' : 'FAIL (NO EDGE / VETO)'}`);
  console.log(`Expected Value (EV):  ${oos.expectedValue.toFixed(4)}`);
  console.log(`CALL Win Rate:        ${(oos.callStats.winRate * 100).toFixed(2)}% (N=${oos.callStats.wins + oos.callStats.losses})`);
  console.log(`PUT Win Rate:         ${(oos.putStats.winRate * 100).toFixed(2)}% (N=${oos.putStats.wins + oos.putStats.losses})`);
  console.log(`Directional Delta:    ${(oos.directionalImbalance * 100).toFixed(2)} pp`);
  console.log(`Brier Score:          ${oos.brierScore ? oos.brierScore.toFixed(4) : 'N/A'}`);
  console.log(`Reversed Ctrl WR:     ${(revOos.winRate * 100).toFixed(4)}%`);
  console.log('================================================================\n');

  const report = {
    experimentId: 'EXP_036_XAUXAG_TREND_ZREVERT_001',
    hypothesisId: 'HYPOTHESIS_006',
    asset: 'XAUXAG',
    executionDate: new Date().toISOString(),
    dataset: {
      datasetId: 'DATASET_XAUXAG_001',
      totalCandles: dataset.observations.length,
      splitTimestampIso: new Date(splitTimestamp).toISOString(),
      inSampleCandles: standardResults.splitIndex,
      outOfSampleCandles: dataset.observations.length - standardResults.splitIndex
    },
    inSampleResults: {
      totalSignals: is.totalSignals,
      resolvedTrades: is.resolvedTrades,
      wins: is.wins,
      losses: is.losses,
      pushes: is.pushes,
      winRate: is.winRate,
      wilsonCI: is.wilsonCI,
      expectedValue: is.expectedValue,
      callWinRate: is.callStats.winRate,
      putWinRate: is.putStats.winRate
    },
    outOfSampleResults: {
      totalSignals: oos.totalSignals,
      resolvedTrades: oos.resolvedTrades,
      wins: oos.wins,
      losses: oos.losses,
      pushes: oos.pushes,
      winRate: oos.winRate,
      wilsonCI: oos.wilsonCI,
      expectedValue: oos.expectedValue,
      breakevenRate: oos.breakevenRate,
      edgeDetected: oos.wilsonCI.lower > oos.breakevenRate,
      callStats: oos.callStats,
      putStats: oos.putStats,
      directionalImbalance: oos.directionalImbalance,
      brierScore: oos.brierScore,
      reversedControlWinRate: revOos.winRate
    },
    validationGates: {
      sampleFloor: {
        required: 100,
        actual: oos.resolvedTrades,
        pass: oos.resolvedTrades >= 100
      },
      statisticalEvidence: {
        required: `W_low > ${(oos.breakevenRate * 100).toFixed(4)}%`,
        actual: `W_low = ${(oos.wilsonCI.lower * 100).toFixed(4)}%`,
        pass: oos.wilsonCI.lower > oos.breakevenRate
      },
      directionalSymmetry: {
        required: `<= 6.0 pp`,
        actual: `${(oos.directionalImbalance * 100).toFixed(2)} pp`,
        pass: oos.directionalImbalance <= 0.06
      }
    },
    verdict: oos.wilsonCI.lower > oos.breakevenRate ? 'PASS_STATISTICAL_GATE' : 'FAIL_STATISTICAL_GATE'
  };

  fs.writeFileSync(REPORT_OUTPUT, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`[REPORT] Written to: ${REPORT_OUTPUT}`);
}

main().catch(err => {
  console.error('[FATAL ERROR IN EXPERIMENT 036]', err);
  process.exit(1);
});
