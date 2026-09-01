const fs = require('fs');
const path = require('path');

const h004Path = path.join(__dirname, 'BLIND_OOS_H004_R.json');
const basePath = path.join(__dirname, 'BASELINE_005_REPORT.json');

const h004Data = JSON.parse(fs.readFileSync(h004Path, 'utf8'));
const baseData = JSON.parse(fs.readFileSync(basePath, 'utf8'));

// Sanity check
if (h004Data.windowLogs.length !== 180 || baseData.windows.length !== 180) {
    throw new Error("Window count mismatch");
}

const B = 10000;
const N_WINDOWS = 180;
const deltas = new Float64Array(B);

let observedH004Wins = 0;
let observedH004Resolved = 0;
let observedBaseWins = 0;
let observedBaseResolved = 0;

for (let i = 0; i < N_WINDOWS; i++) {
    observedH004Wins += h004Data.windowLogs[i].wins;
    observedH004Resolved += (h004Data.windowLogs[i].wins + h004Data.windowLogs[i].losses);
    
    observedBaseWins += baseData.windows[i].wins;
    observedBaseResolved += (baseData.windows[i].wins + baseData.windows[i].losses);
}

const observedDelta = (observedH004Wins / observedH004Resolved) - (observedBaseWins / observedBaseResolved);

// Pseudo-random number generator for reproducibility
function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}
const random = mulberry32(42);

let countLessOrEqualZero = 0;

for (let b = 0; b < B; b++) {
    let bH004Wins = 0;
    let bH004Resolved = 0;
    let bBaseWins = 0;
    let bBaseResolved = 0;

    for (let i = 0; i < N_WINDOWS; i++) {
        // Sample with replacement
        const idx = Math.floor(random() * N_WINDOWS);
        
        bH004Wins += h004Data.windowLogs[idx].wins;
        bH004Resolved += (h004Data.windowLogs[idx].wins + h004Data.windowLogs[idx].losses);
        
        bBaseWins += baseData.windows[idx].wins;
        bBaseResolved += (baseData.windows[idx].wins + baseData.windows[idx].losses);
    }

    const wrH004 = bH004Resolved > 0 ? bH004Wins / bH004Resolved : 0;
    const wrBase = bBaseResolved > 0 ? bBaseWins / bBaseResolved : 0;
    const delta = wrH004 - wrBase;

    deltas[b] = delta;
    if (delta <= 0) {
        countLessOrEqualZero++;
    }
}

deltas.sort();

const p2_5 = deltas[Math.floor(B * 0.025)];
const p97_5 = deltas[Math.floor(B * 0.975)];
const pValue = countLessOrEqualZero / B;
const isSignificant = p2_5 > 0;

const report = {
    hypothesis: "H004",
    baseline: "BASELINE_005_CONTROL",
    methodology: "Temporal Block Bootstrap (N=10,000 resamples of non-overlapping 1-day OOS test windows)",
    results: {
        observedDelta_pp: parseFloat((observedDelta * 100).toFixed(4)),
        bootstrapIterations: B,
        confidenceInterval_95_Lower_pp: parseFloat((p2_5 * 100).toFixed(4)),
        confidenceInterval_95_Upper_pp: parseFloat((p97_5 * 100).toFixed(4)),
        pValue: pValue,
        isSignificant
    },
    conclusion: isSignificant ? "ROBUST DIRECTIONAL ASSOCIATION CONFIRMED" : "NOISE (ASSOCIATION DID NOT SURVIVE TEMPORAL BLOCKING)",
    governanceRecommendation: isSignificant ? "AUTHORIZE_FAMILY_04_SIGNAL_TO_PAYOFF" : "CLOSE_RESEARCH_LINE"
};

fs.writeFileSync(path.join(__dirname, '../research/reports/EXP_031/TEMPORAL_ASSOCIATION_AUDIT.json'), JSON.stringify(report, null, 2));

console.log("=== COMMIT 031A: TEMPORAL ASSOCIATION AUDIT ===");
console.log(`Observed Delta: ${(observedDelta * 100).toFixed(4)}%`);
console.log(`95% CI: [${(p2_5 * 100).toFixed(4)}%, ${(p97_5 * 100).toFixed(4)}%]`);
console.log(`p-value: ${pValue.toFixed(4)}`);
console.log(`Significant? ${isSignificant ? 'YES' : 'NO'}`);
console.log(`Conclusion: ${report.conclusion}`);
