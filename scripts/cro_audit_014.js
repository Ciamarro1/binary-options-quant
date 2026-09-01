const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.resolve('C:/Users/WDAGUtilityAccount/Documents/Nova pasta/research/reports/EXP_014');
const EXPERIMENT_ID = 'EXP_014_EXHAUSTION_BTC1M_2024_06_09';
const P_BE = 1 / (1 + 0.80); // 0.555556

console.log('══════════════════════════════════════════════════════════════════');
console.log(' CHIEF RISK OFFICER (CRO) — TRI-PROOF AUDIT GATE (Commit 014)');
console.log('══════════════════════════════════════════════════════════════════');

// 1. Load Proofs
const statsProofPath = path.join(REPORT_DIR, 'VALIDATION_REPORT.json');
const advProofPath = path.join(REPORT_DIR, 'ADVERSARIAL_AUDIT.json');
const provProofPath = path.join(REPORT_DIR, 'PROVENANCE_RECEIPT.json');

if (!fs.existsSync(statsProofPath) || !fs.existsSync(advProofPath) || !fs.existsSync(provProofPath)) {
  throw new Error('Tri-Proof Dossier Incomplete: One or more proof artifacts missing!');
}

const statsProof = JSON.parse(fs.readFileSync(statsProofPath, 'utf8'));
const advProof = JSON.parse(fs.readFileSync(advProofPath, 'utf8'));
const provProof = JSON.parse(fs.readFileSync(provProofPath, 'utf8'));

console.log('\n[PROOF 1/3] Auditing Statistical & Economic Proof (Validation Analyst)...');
const N = statsProof.aggregateMetrics.N;
const winRate = statsProof.aggregateMetrics.winRate;
const ciLower = statsProof.aggregateMetrics.confidenceInterval ? statsProof.aggregateMetrics.confidenceInterval.lower : 0;
const ciUpper = statsProof.aggregateMetrics.confidenceInterval ? statsProof.aggregateMetrics.confidenceInterval.upper : 0;
const ev = statsProof.aggregateMetrics.ev;

console.log(`  Sample Size (N):        ${N} (Requirement: >= 30)`);
console.log(`  OOS Win Rate:           ${(winRate * 100).toFixed(4)}%`);
console.log(`  95% Wilson CI:          [${(ciLower * 100).toFixed(4)}%, ${(ciUpper * 100).toFixed(4)}%]`);
console.log(`  Break-even (P_BE):      ${(P_BE * 100).toFixed(4)}%`);
console.log(`  Expected Value (EV):    ${ev.toFixed(6)}`);

const statsProofPass = (N >= 30) && (ciLower > P_BE) && (ev > 0);
console.log(`  --> Stats Proof Verdict: ${statsProofPass ? 'PASS' : 'FAIL'}`);

console.log('\n[PROOF 2/3] Auditing Adversarial & Robustness Proof (Adversarial QA)...');
const advProofPass = advProof.overallVerdict === 'PASS' && advProof.tests.labelPermutation.falsePositiveCount === 0;
console.log(`  Adversarial Status:     ${advProof.overallVerdict}`);
console.log(`  Label Permutations FP:  ${advProof.tests.labelPermutation.falsePositiveCount}/1000`);
console.log(`  Reversed Mirror:        ${advProof.tests.reversedControl.status}`);
console.log(`  --> Adv Proof Verdict:   ${advProofPass ? 'PASS' : 'FAIL'}`);

console.log('\n[PROOF 3/3] Auditing Lineage & Provenance Proof (Experiment Controller)...');
const provProofPass = provProof.triProofStatus.provenanceVerified === true && provProof.certifiedBy === 'EXPERIMENT_CONTROLLER';
console.log(`  Provenance Certified:   ${provProof.certifiedBy}`);
console.log(`  Hypothesis SHA-256:     ${provProof.hypothesisSha256}`);
console.log(`  Dataset Content Hash:   ${provProof.datasetContentHash}`);
console.log(`  --> Prov Proof Verdict:  ${provProofPass ? 'PASS' : 'FAIL'}`);

// CRO Sovereign Decision
console.log('\n══════════════════════════════════════════════════════════════════');
console.log(' CRO SOVEREIGN DELIBERATION');
console.log('══════════════════════════════════════════════════════════════════');

const reasons = [];
if (N < 30) reasons.push('INSUFFICIENT_SAMPLE_SIZE');
if (ciLower <= P_BE) reasons.push('WILSON_CI_LOWER_BOUND_BELOW_BREAK_EVEN');
if (ev <= 0) reasons.push('NEGATIVE_OR_ZERO_EXPECTED_VALUE');
if (!advProofPass) reasons.push('ADVERSARIAL_ROBUSTNESS_FAILURE');
if (!provProofPass) reasons.push('PROVENANCE_INTEGRITY_FAILURE');

const verdict = (statsProofPass && advProofPass && provProofPass) ? 'PASS' : 'VETO';

console.log(`  Final CRO Verdict:      ${verdict}`);
if (reasons.length > 0) {
  console.log(`  Veto Reasons:           ${reasons.join(', ')}`);
}

// Write RISK_DECISION.json
const riskDecision = {
  experimentId: EXPERIMENT_ID,
  hypothesisId: 'HYPOTHESIS_002',
  verdict,
  reasons,
  deliberationDetails: {
    n: N,
    winRate,
    wilsonCi: [ciLower, ciUpper],
    breakEven: P_BE,
    ev,
    statsProofStatus: statsProofPass ? 'PASS' : 'FAIL',
    adversarialProofStatus: advProofPass ? 'PASS' : 'FAIL',
    provenanceProofStatus: provProofPass ? 'PASS' : 'FAIL'
  },
  governanceRuleEnforced: 'ZERO_PARAMETER_TWEAKING_NO_CURVE_FITTING',
  croSignature: 'CHIEF_RISK_OFFICER_SOVEREIGN_GATE_SIGNED',
  timestamp: new Date().toISOString()
};
fs.writeFileSync(path.join(REPORT_DIR, 'RISK_DECISION.json'), JSON.stringify(riskDecision, null, 2) + '\n', 'utf8');

// Write CRO_VERDICT.md
const verdictMd = `# Chief Risk Officer (CRO) Sovereign Audit Report

## 1. Experiment Overview
- **Experiment ID**: \`${EXPERIMENT_ID}\`
- **Hypothesis**: \`HYPOTHESIS_002\` (Short-Horizon Mean-Reversion / Exhaustion Anomaly, v1.0.0)
- **Dataset**: \`DATASET_003\` (BTCUSDT Spot 1m Jun–Sep 2024, 175,680 rows, 115 OOS Windows)
- **Target**: 3-candle expiry (180s), Payout r = 0.80 -> P_BE = 55.5556%

---

## 2. Tri-Proof Audit Gate Evaluation

### Proof 1: Statistical & Economic Evidence (Validation Analyst)
- **Sample Size (N)**: **2,049 resolved trades** (N >= 30 -> PASS)
- **Empirical Win Rate**: **52.2206%**
- **95% Wilson Score CI**: **[50.0556%, 54.3773%]**
- **Break-even Barrier (P_BE)**: **55.5556%**
- **Expected Value (EV)**: **-0.060029**
- **Verdict**: FAIL (Lower bound 50.06% <= 55.56%, negative expected value)

### Proof 2: Adversarial Stress & Robustness (Adversarial QA / Red Team)
- **Label Permutations (1,000 runs)**: 0 false positives (0.0%)
- **Reversed Directional Mirror**: Successfully verified
- **Synthetic Null**: Win rate 51.88% (Edge not detected)
- **Verdict**: PASS

### Proof 3: Cryptographic Provenance & Lineage (Experiment Controller)
- **Hypothesis Hash**: \`72a91dda6919e30665c98ea5c259dcb6ccfa03ce8d38ce326c5b53f5393e548a\`
- **Dataset Content Hash**: \`3ed2064690b63516a559d10c4d8e7d8de60795f380668bc9c2d1544ad5c53638\`
- **Protocol Lock**: 115 windows, zero gap contamination
- **Verdict**: PASS

---

## 3. Sovereign CRO Verdict: **VETO**

### Formal Reason Codes:
1. \`WILSON_CI_LOWER_BOUND_BELOW_BREAK_EVEN\`
2. \`NEGATIVE_OR_ZERO_EXPECTED_VALUE\`

### Comparative Findings for the Research Record:
- **HYPOTHESIS_002 (Mean-Reversion)**: **52.2206%** Win Rate (EV = -0.0600)
- **BASELINE_003_CONTROL (Naive Market)**: **49.8922%** Win Rate (EV = -0.1019)
- **REVERSED_CONTROL (Momentum Continuation)**: **47.3787%** Win Rate (EV = -0.1472)

> **Epistemic Finding**: The exhaustion setup demonstrated directional superiority over both the naive baseline (+2.33 pp) and the momentum mirror (+4.84 pp). However, a 52.22% win rate is economically insufficient to clear the 55.56% payout hurdle.

### Final Action:
Model rejected for shadow/live deployment. Hypothesis permanently classified as **\`FALSIFIED & ARCHIVED\`**. Zero parameter tweaking allowed.
`;
fs.writeFileSync(path.join(REPORT_DIR, 'CRO_VERDICT.md'), verdictMd.trim() + '\n', 'utf8');

// Copy script to scripts/cro_audit_014.js
fs.writeFileSync(path.resolve('C:/Users/WDAGUtilityAccount/Documents/Nova pasta/scripts/cro_audit_014.js'), fs.readFileSync(__filename, 'utf8'), 'utf8');

console.log(`\n✓ CRO Verdict and Risk Decision emitted to ${REPORT_DIR}`);
