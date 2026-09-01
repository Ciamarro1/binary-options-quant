const fs = require('fs');
const path = require('path');

const h004Path = path.join(__dirname, 'BLIND_OOS_H004_R.json');
const basePath = path.join(__dirname, 'BASELINE_005_REPORT.json');

const h004Data = JSON.parse(fs.readFileSync(h004Path, 'utf8'));
const baseData = JSON.parse(fs.readFileSync(basePath, 'utf8'));

const MIN_N = 10; // Require at least 10 signals in a window to compute a valid proportion

let sumWD = 0;
let sumW = 0;
let activeWindows = 0;
let positiveDiffs = 0;
let negativeDiffs = 0;

const windowStats = [];

for (let i = 0; i < 180; i++) {
    const hw = h004Data.windowLogs[i];
    const bw = baseData.windows[i];

    if (hw.window !== bw.window) {
        throw new Error("Window mismatch!");
    }

    const nH = hw.wins + hw.losses;
    const nB = bw.wins + bw.losses;

    if (nH >= MIN_N && nB >= MIN_N) {
        const pH = hw.wins / nH;
        const pB = bw.wins / nB;

        const varH = (pH * (1 - pH)) / nH;
        const varB = (pB * (1 - pB)) / nB;
        
        // Add a small epsilon to variance to prevent division by zero if win rate is exactly 1 or 0
        const varD = varH + varB + 1e-8;
        const W = 1 / varD;
        const D = pH - pB;

        sumWD += W * D;
        sumW += W;
        activeWindows++;

        if (D > 0) positiveDiffs++;
        if (D < 0) negativeDiffs++;

        windowStats.push({
            window: hw.window,
            N_H004: nH,
            WR_H004: parseFloat(pH.toFixed(4)),
            N_Base: nB,
            WR_Base: parseFloat(pB.toFixed(4)),
            diff: parseFloat(D.toFixed(4)),
            weight: parseFloat(W.toFixed(2))
        });
    }
}

const weightedMeanDiff = sumWD / sumW;
const standardError = Math.sqrt(1 / sumW);
const zScore = weightedMeanDiff / standardError;

// 2-tailed p-value calculation using normal approximation
// CDF of Standard Normal
function normalCDF(x) {
    let t = 1 / (1 + 0.2316419 * Math.abs(x));
    let d = 0.3989423 * Math.exp(-x * x / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (x > 0) p = 1 - p;
    return p;
}

const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
const isSignificant = pValue < 0.05;

const report = {
    hypothesis: "H004",
    baseline: "BASELINE_005_CONTROL",
    methodology: "Inverse-Variance Weighted Paired Window Meta-Analysis",
    threshold_N: MIN_N,
    results: {
        activeWindows,
        positiveDiffs,
        negativeDiffs,
        weightedMeanDiff_pp: parseFloat((weightedMeanDiff * 100).toFixed(4)),
        standardError_pp: parseFloat((standardError * 100).toFixed(4)),
        zScore: parseFloat(zScore.toFixed(4)),
        pValue: parseFloat(pValue.toFixed(6)),
        isSignificant
    },
    conclusion: isSignificant ? "STATISTICALLY CONFIRMED DIRECTIONAL ASSOCIATION" : "NOISE (NOT SIGNIFICANT)",
    governanceDecision: isSignificant ? "NEW_RESEARCH_FAMILY_AUTHORIZED" : "FAMILY_CLOSED"
};

fs.writeFileSync(path.join(__dirname, '../research/reports/EXP_031/STATISTICAL_ASSOCIATION_AUDIT.json'), JSON.stringify(report, null, 2));

console.log("=== COMMIT 031: STATISTICAL ASSOCIATION AUDIT ===");
console.log(`Active Windows Evaluated: ${activeWindows}`);
console.log(`Positive Diffs: ${positiveDiffs} | Negative Diffs: ${negativeDiffs}`);
console.log(`Weighted Mean Diff: ${(weightedMeanDiff * 100).toFixed(4)}%`);
console.log(`Standard Error: ${(standardError * 100).toFixed(4)}%`);
console.log(`Z-Score: ${zScore.toFixed(4)}`);
console.log(`p-value (2-tailed): ${pValue.toFixed(6)}`);
console.log(`Significant at 5%? ${isSignificant ? 'YES' : 'NO'}`);
console.log(`Governance Action: ${report.governanceDecision}`);
