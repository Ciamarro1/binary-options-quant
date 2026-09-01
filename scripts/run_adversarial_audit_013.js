"use strict";

/**
 * scripts/run_adversarial_audit_013.js
 * 
 * Executes the complete Adversarial Stress Battery for HYPOTHESIS_002
 * Emits research/reports/ADVERSARIAL_AUDIT_002.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const MetricsEngine = require('../src/research/MetricsEngine');
const SyntheticDataGenerator = require('../src/research/SyntheticDataGenerator');
const ExhaustionModel = require('../src/strategy/models/ExhaustionModel');
const ReversedExhaustionModel = require('../src/strategy/models/ReversedExhaustionModel');

function mulberry32(seed) {
  return function() {
    var t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

async function main() {
  console.log('══════════════════════════════════════════════════════════');
  console.log(' ADVERSARIAL STRESS AUDIT — HYPOTHESIS_002 (Commit 013)');
  console.log('══════════════════════════════════════════════════════════');

  const report = {
    hypothesisId: 'HYPOTHESIS_002',
    hypothesisVersion: '1.0.0',
    batteryVersion: '2.0.0',
    auditedAt: new Date().toISOString(),
    tests: {},
    overallVerdict: 'PASS'
  };

  // 1. Reversed Control Mirror Verification
  console.log('\n[1/5] Testing 013-A: Reversed Control Mirror...');
  const h002 = new ExhaustionModel(0.60, 0.60);
  const rev = new ReversedExhaustionModel(0.60, 0.60);
  
  const mockSnapUp = {
    features: { hasData: true, open: 100, close: 105, bodyRatio: 2.5, closeLocation: 0.95, volumeRatio: 2.5 }
  };
  const mockSnapDown = {
    features: { hasData: true, open: 105, close: 100, bodyRatio: 2.5, closeLocation: 0.05, volumeRatio: 2.5 }
  };

  const upOk = h002.predict(mockSnapUp).direction === 'PUT' && rev.predict(mockSnapUp).direction === 'CALL';
  const downOk = h002.predict(mockSnapDown).direction === 'CALL' && rev.predict(mockSnapDown).direction === 'PUT';

  report.tests.reversedControl = {
    status: (upOk && downOk) ? 'PASS' : 'FAIL',
    upExhaustionMirror: upOk,
    downExhaustionMirror: downOk
  };
  console.log(`  ✓ Reversed Control Mirror: ${report.tests.reversedControl.status}`);

  // 2. 1,000 Label Permutations Test
  console.log('\n[2/5] Testing 013-B: 1,000 Label Permutations (Mulberry32 Seed 42)...');
  const N = 1000;
  const baseOutcomes = [];
  for (let i = 0; i < N; i++) {
    baseOutcomes.push({
      prob: 0.55,
      outcome: i < N / 2 ? 'WIN' : 'LOSS',
      direction: 'PUT'
    });
  }

  const rng = mulberry32(42);
  let falsePositives = 0;
  const iterations = 1000;

  for (let iter = 0; iter < iterations; iter++) {
    const shuffled = [...baseOutcomes];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = shuffled[i].outcome;
      shuffled[i] = { ...shuffled[i], outcome: shuffled[j].outcome };
      shuffled[j] = { ...shuffled[j], outcome: temp };
    }
    const m = MetricsEngine.calculate(shuffled, 0.80);
    if (m.status === 'EDGE DETECTED') falsePositives++;
  }

  report.tests.labelPermutation = {
    iterations,
    seed: 42,
    falsePositiveCount: falsePositives,
    falsePositiveRate: falsePositives / iterations,
    status: falsePositives === 0 ? 'PASS' : 'FAIL'
  };
  console.log(`  ✓ Label Permutations: ${iterations} iterations, ${falsePositives} false positives (${report.tests.labelPermutation.status})`);

  // 3. Synthetic Null Control (Drift = 0)
  console.log('\n[3/5] Testing 013-C: Synthetic Null Control (Random Walk)...');
  const synDataset = SyntheticDataGenerator.generate({
    seed: 1337,
    asset: 'BTCUSDT',
    timeframe: '1m',
    numObservations: 2000,
    initialPrice: 60000,
    upProbability: 0.50,
    volatility: 0.001
  });
  const synObs = synDataset.observations;
  const synOutcomes = [];
  for (let i = 0; i < synObs.length - 3; i++) {
    const entry = synObs[i].close;
    const exit = synObs[i + 3].close;
    if (entry === exit) continue;
    synOutcomes.push({
      prob: 0.50,
      outcome: exit < entry ? 'WIN' : 'LOSS',
      direction: 'PUT'
    });
  }
  const synMetrics = MetricsEngine.calculate(synOutcomes, 0.80);
  const nullPassed = synMetrics.status === 'EDGE NOT DETECTED';
  report.tests.nullControl = {
    sampleSize: synMetrics.N,
    winRate: synMetrics.winRate,
    ev: synMetrics.ev,
    status: nullPassed ? 'PASS' : 'FAIL'
  };
  console.log(`  ✓ Synthetic Null: Win Rate ${(synMetrics.winRate * 100).toFixed(2)}%, Status: ${synMetrics.status}`);

  // 4. Feature Fuzzing & Degeneracy
  console.log('\n[4/5] Testing 013-D: Numerical Fuzzing & Flat Candles...');
  const flatSnap = { features: { hasData: true, closeLocation: null, bodyRatio: null, volumeRatio: null } };
  const fuzzPassed = h002.predict(flatSnap) === null;
  report.tests.numericalFuzzing = {
    flatCandleHandled: fuzzPassed,
    status: fuzzPassed ? 'PASS' : 'FAIL'
  };
  console.log(`  ✓ Numerical Fuzzing: ${report.tests.numericalFuzzing.status}`);

  // 5. Governance & Immutability
  console.log('\n[5/5] Testing 013-F: Chinese Wall Immutability...');
  const immutOk = Object.isFrozen(h002) && Object.isFrozen(rev);
  report.tests.governanceIntegrity = {
    immutabilityVerified: immutOk,
    status: immutOk ? 'PASS' : 'FAIL'
  };
  console.log(`  ✓ Governance Integrity: ${report.tests.governanceIntegrity.status}`);

  const allPassed = Object.values(report.tests).every(t => t.status === 'PASS');
  report.overallVerdict = allPassed ? 'PASS' : 'FAIL';
  report.status = allPassed ? 'CLEAR_FOR_BLIND_OOS' : 'BLOCKED';

  const outDir = path.join(__dirname, '..', 'research', 'reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'ADVERSARIAL_AUDIT_002.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`\n✓ Complete Adversarial Report saved to: ${outPath}`);
}

main().catch(err => {
  console.error('Adversarial Audit Error:', err);
  process.exit(1);
});
