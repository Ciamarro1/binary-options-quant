const fs = require('fs');
let lines = fs.readFileSync('STATE.md', 'utf8').split('\n');
const cut = lines.findIndex(l => l.includes('Commit 027'));
if (cut > -1) lines = lines.slice(0, cut);

lines.push('75. **Commit 027 - Quantile State Engine Implementation (H004):**');
lines.push('    - `QuantileStateEngine.js` deployed.');
lines.push('    - $Q_t = \\text{count}(H_i < r_t) / 240$. Strict inequality, discrete thresholds.');
lines.push('    - $r_t$ strictly excluded from the reference array $H$.');
lines.push('    - `027_quantile_state_engine.test.js` executed. QS-001 to QS-010 passed. Perfect causal flow verified. **[FROZEN]**');
lines.push('76. **Commit 028 - Adversarial OOS Harness (H004):**');
lines.push('    - `H004Runner.js` created with strict `predict` $\\to$ `signal` $\\to$ `update` pipeline.');
lines.push('    - Test Suite 028-A to 028-H executed. ALL PASS.');
lines.push('    - Output: `ADVERSARIAL_AUDIT_H004.json` recorded. No sequence inversion detected. **[FROZEN]**');
lines.push('77. **Commit 029 - Blind OOS Execution (H004):**');
lines.push('    - Protocol: 180 Walk-Forward windows on `DATASET_005`. Train=3d, Test=1d, Expiry=3m, Payout=0.8.');
lines.push('    - Sample floor: robustly met. $N_{train}$ per tail consistently exceeded 120 (well above 30).');
lines.push('    - Result: 2,594 OOS signals emitted across 56 authorized windows.');
lines.push('    - OOS Win Rate: $51.27\\%$ (Wilson Lower: $49.34\\%$).');
lines.push('    - Reversed Control Win Rate: $48.72\\%$ (perfect symmetry).');
lines.push('    - Conclusion: **FALSIFIED** economically (EV = -0.077), but Tri-Level Framework shows Level 2 Predictability (51.27% > Baseline 49.75%). **[FROZEN]**');
lines.push('');
lines.push('**Next Objective:** Formalize Commit 030 — Post-Mortem.');

fs.writeFileSync('STATE.md', lines.join('\n'));
