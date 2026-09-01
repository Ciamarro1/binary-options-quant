"use strict";

/**
 * CRO SOVEREIGN TRI-PROOF AUDIT GATE
 * ===================================
 * Audits the 3 Independent Proofs for Experiment 008 against QUANT_CONTRACT.md
 */

const fs = require('fs');
const path = require('path');

const reportDir = path.join(__dirname, '..', 'research', 'reports', 'EXP_008');

const valPath = path.join(reportDir, 'VALIDATION_REPORT.json');
const advPath = path.join(reportDir, 'ADVERSARIAL_AUDIT.json');
const provPath = path.join(reportDir, 'PROVENANCE_RECEIPT.json');

if (!fs.existsSync(valPath) || !fs.existsSync(advPath) || !fs.existsSync(provPath)) {
  console.error('🚨 CRO AUDIT ERROR: Missing one or more required independent proofs!');
  process.exit(1);
}

const valReport = JSON.parse(fs.readFileSync(valPath, 'utf8'));
const advReport = JSON.parse(fs.readFileSync(advPath, 'utf8'));
const provReport = JSON.parse(fs.readFileSync(provPath, 'utf8'));

console.log('══════════════════════════════════════════════════════════');
console.log(' CHIEF RISK OFFICER (CRO) — SOVEREIGN AUDIT GATE');
console.log(` Experiment: ${valReport.experimentId}`);
console.log('══════════════════════════════════════════════════════════');

let verdict = 'PASS';
const reasons = [];

// 1. STATS PROOF AUDIT
console.log('\n[1. STATISTICAL PROOF AUDIT]');
const agg = valReport.aggregate;
const N = agg.N;
const winRate = agg.winRate;
const ciLow = agg.confidenceInterval ? agg.confidenceInterval.lower : 0;
const pBe = 1 / (1 + 0.80);
const ev = agg.ev;

console.log(`  Sample Size (N):    ${N} (Required: >= 30)`);
console.log(`  Win Rate:           ${(winRate * 100).toFixed(2)}%`);
console.log(`  95% Wilson Low:     ${(ciLow * 100).toFixed(2)}% (Required: > ${(pBe * 100).toFixed(2)}%)`);
console.log(`  Expected Value:     ${ev.toFixed(4)} (Required: > 0)`);

if (N < 30) {
  verdict = 'VETO';
  reasons.push('INSUFFICIENT_SAMPLE_SIZE_N_LESS_THAN_30');
}

if (ciLow <= pBe) {
  verdict = 'VETO';
  reasons.push('WILSON_CI_LOWER_BOUND_BELOW_BREAK_EVEN');
}

if (ev <= 0) {
  verdict = 'VETO';
  reasons.push('NEGATIVE_OR_ZERO_EXPECTED_VALUE');
}

// 2. ADVERSARIAL PROOF AUDIT
console.log('\n[2. ADVERSARIAL PROOF AUDIT]');
console.log(`  Adversarial Status: ${advReport.status}`);
if (advReport.status !== 'PASSED') {
  verdict = 'VETO';
  reasons.push('ADVERSARIAL_STRESS_TEST_FAILED');
}

// 3. PROVENANCE PROOF AUDIT
console.log('\n[3. PROVENANCE PROOF AUDIT]');
console.log(`  Lineage Status:     ${provReport.status}`);
console.log(`  Blind OOS State:    ${provReport.oosExecution}`);
if (provReport.status !== 'VERIFIED_UNBROKEN_LINEAGE' || provReport.oosExecution !== 'BLIND_COMPLIANT') {
  verdict = 'VETO';
  reasons.push('PROVENANCE_OR_BLIND_OOS_VIOLATION');
}

// FINAL DECISION
console.log('\n══════════════════════════════════════════════════════════');
console.log(` CRO FINAL DELIBERATION: [ ${verdict} ]`);
if (reasons.length > 0) {
  console.log(` Reasons for Veto: ${reasons.join(', ')}`);
}
console.log('══════════════════════════════════════════════════════════');

const riskDecision = {
  experimentId: valReport.experimentId,
  hypothesisId: valReport.hypothesisId,
  verdict,
  reasons: reasons.length > 0 ? reasons : ['ALL_CONSTITUTIONAL_INVARIANTS_SATISFIED'],
  auditedStats: {
    N,
    winRate,
    wilsonCiLower: ciLow,
    breakEven: pBe,
    ev
  },
  adversarialVerified: advReport.status === 'PASSED',
  provenanceVerified: provReport.status === 'VERIFIED_UNBROKEN_LINEAGE',
  deliberatedAt: new Date().toISOString(),
  croSignature: `CRO_DECISION_${verdict}_TIMESTAMP_${Date.now()}`
};

const decPath = path.join(reportDir, 'RISK_DECISION.json');
fs.writeFileSync(decPath, JSON.stringify(riskDecision, null, 2) + '\n', 'utf8');
console.log(`\n  Decision recorded: ${decPath}`);
