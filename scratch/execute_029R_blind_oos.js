const fs = require('fs');
const path = require('path');
const QuantileStateEngine = require('../src/strategy/models/QuantileStateEngine');
const crypto = require('crypto');

const DATASET_PATH = path.join(__dirname, 'DATASET_005.json');
const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));
const datasetHash = crypto.createHash('sha256').update(fs.readFileSync(DATASET_PATH)).digest('hex');

console.log("=== COMMIT 029R: FULL-SAMPLE BLIND OOS (H004) ===");
console.log(`DATASET_005 SHA256: ${datasetHash}`);

const TRAIN_SIZE = 4320;
const TEST_SIZE = 1440;
const STEP_SIZE = 1440;
const EXPIRY = 3;
const MIN_SETUPS = 30;
const WINDOWS = 180;
const P_BE = 0.555556;

const report = [];

function resolveSignal(idx, direction, entryPrice) {
    if (idx + EXPIRY >= dataset.length) return 'UNRESOLVED';
    const exitPrice = dataset[idx + EXPIRY].close;
    if (exitPrice === entryPrice) return 'PUSH';
    if (direction === 'CALL') return exitPrice > entryPrice ? 'WIN' : 'LOSS';
    if (direction === 'PUT') return exitPrice < entryPrice ? 'WIN' : 'LOSS';
    return 'UNRESOLVED';
}

function getReversedDirection(direction) {
    if (direction === 'CALL') return 'PUT';
    if (direction === 'PUT') return 'CALL';
    return null;
}

let primary = { signals: 0, wins: 0, losses: 0, pushes: 0, unresolved: 0, revWins: 0, revLosses: 0, revPushes: 0, eligibleCandles: 0 };
let diagGtBE = { signals: 0, wins: 0, losses: 0, pushes: 0, unresolved: 0 };
let diagLteBE = { signals: 0, wins: 0, losses: 0, pushes: 0, unresolved: 0 };

for (let w = 0; w < WINDOWS; w++) {
    const trainStart = w * STEP_SIZE;
    const trainEnd = trainStart + TRAIN_SIZE;
    const testStart = trainEnd;
    const testEnd = testStart + TEST_SIZE;
    
    if (testEnd > dataset.length) break;

    primary.eligibleCandles += TEST_SIZE;

    const engine = new QuantileStateEngine();
    let trainCallSetups = 0, trainCallWins = 0, trainCallLosses = 0;
    let trainPutSetups = 0, trainPutWins = 0, trainPutLosses = 0;

    // --- TRAIN PHASE ---
    for (let i = trainStart; i < trainEnd; i++) {
        const state = engine.predict(dataset[i]);
        if (state && state.direction !== 'NO_SIGNAL') {
            if (i + EXPIRY < trainEnd) {
                const res = resolveSignal(i, state.direction, dataset[i].close);
                if (state.direction === 'CALL') {
                    trainCallSetups++;
                    if (res === 'WIN') trainCallWins++;
                    if (res === 'LOSS') trainCallLosses++;
                } else if (state.direction === 'PUT') {
                    trainPutSetups++;
                    if (res === 'WIN') trainPutWins++;
                    if (res === 'LOSS') trainPutLosses++;
                }
            }
        }
        engine.update(dataset[i]);
    }

    // --- PROBABILITY FREEZE (No Filtering, Just N >= 30 validation) ---
    const pCall_train = trainCallSetups >= MIN_SETUPS ? trainCallWins / (trainCallWins + trainCallLosses) : null;
    const pPut_train = trainPutSetups >= MIN_SETUPS ? trainPutWins / (trainPutWins + trainPutLosses) : null;

    let w_signals = 0, w_wins = 0, w_losses = 0, w_pushes = 0, w_unresolved = 0;
    let w_rev_w = 0, w_rev_l = 0, w_rev_p = 0;

    let w_gt_signals = 0, w_gt_wins = 0, w_gt_losses = 0, w_gt_pushes = 0;
    let w_lte_signals = 0, w_lte_wins = 0, w_lte_losses = 0, w_lte_pushes = 0;

    // --- TEST PHASE ---
    for (let i = testStart; i < testEnd; i++) {
        const state = engine.predict(dataset[i]);
        
        let signalFired = false;
        let direction = null;
        let trainProb = null;

        // EMIT IF N >= 30 (pTrain !== null)
        if (state && state.direction === 'CALL' && pCall_train !== null) {
            signalFired = true;
            direction = 'CALL';
            trainProb = pCall_train;
        } else if (state && state.direction === 'PUT' && pPut_train !== null) {
            signalFired = true;
            direction = 'PUT';
            trainProb = pPut_train;
        }

        if (signalFired) {
            const res = resolveSignal(i, direction, dataset[i].close);
            w_signals++;
            if (res === 'WIN') w_wins++;
            else if (res === 'LOSS') w_losses++;
            else if (res === 'PUSH') w_pushes++;
            else w_unresolved++;

            // Reversed
            const revDirection = getReversedDirection(direction);
            const resRev = resolveSignal(i, revDirection, dataset[i].close);
            if (resRev === 'WIN') w_rev_w++;
            else if (resRev === 'LOSS') w_rev_l++;
            else if (resRev === 'PUSH') w_rev_p++;

            // Diagnostics split
            if (trainProb > P_BE) {
                w_gt_signals++;
                if (res === 'WIN') w_gt_wins++;
                else if (res === 'LOSS') w_gt_losses++;
                else if (res === 'PUSH') w_gt_pushes++;
            } else {
                w_lte_signals++;
                if (res === 'WIN') w_lte_wins++;
                else if (res === 'LOSS') w_lte_losses++;
                else if (res === 'PUSH') w_lte_pushes++;
            }
        }
        
        engine.update(dataset[i]);
    }

    primary.signals += w_signals;
    primary.wins += w_wins;
    primary.losses += w_losses;
    primary.pushes += w_pushes;
    primary.unresolved += w_unresolved;
    primary.revWins += w_rev_w;
    primary.revLosses += w_rev_l;
    primary.revPushes += w_rev_p;

    diagGtBE.signals += w_gt_signals;
    diagGtBE.wins += w_gt_wins;
    diagGtBE.losses += w_gt_losses;
    diagGtBE.pushes += w_gt_pushes;

    diagLteBE.signals += w_lte_signals;
    diagLteBE.wins += w_lte_wins;
    diagLteBE.losses += w_lte_losses;
    diagLteBE.pushes += w_lte_pushes;

    report.push({
        window: w + 1,
        pCall_train: pCall_train !== null ? parseFloat(pCall_train.toFixed(4)) : null,
        pPut_train: pPut_train !== null ? parseFloat(pPut_train.toFixed(4)) : null,
        Ncall_train: trainCallSetups,
        Nput_train: trainPutSetups,
        signals: w_signals,
        wins: w_wins,
        losses: w_losses,
        pushes: w_pushes,
        unresolved: w_unresolved
    });
}

function calcWilson(w, l) {
    const N = w + l;
    if (N === 0) return 0;
    const p = w / N;
    const z = 1.96;
    const den = 1 + z*z/N;
    const num = p + z*z/(2*N) - z * Math.sqrt((p*(1-p))/N + z*z/(4*N*N));
    return num / den;
}

function summarize(stats) {
    const N = stats.wins + stats.losses;
    const wr = N > 0 ? stats.wins / N : 0;
    const wl = calcWilson(stats.wins, stats.losses);
    const ev = (wr * 0.8) - ((1 - wr) * 1);
    return { signals: stats.signals, resolved: N, pushes: stats.pushes, wins: stats.wins, losses: stats.losses, winRate: wr, wilsonLower: wl, ev };
}

const primSum = summarize(primary);
const revSum = summarize({ wins: primary.revWins, losses: primary.revLosses, signals: primary.signals, pushes: primary.revPushes });
const gtSum = summarize(diagGtBE);
const lteSum = summarize(diagLteBE);

const signalRate = primary.signals / primary.eligibleCandles;

const finalJSON = {
    integrity: { datasetHash, windowsEvaluated: WINDOWS },
    metrics: {
        signalRate: signalRate
    },
    primary_ALL_180_WINDOWS: primSum,
    baseline_ALL_180_WINDOWS: {
        resolved: 255100,
        winRate: 0.497526,
        wilsonLower: 0.495586
    },
    reversed_ALL_180_WINDOWS: revSum,
    diagnostic_P_TRAIN_GT_PBE: gtSum,
    diagnostic_P_TRAIN_LTE_PBE: lteSum,
    windowLogs: report
};

const outPath = path.join(__dirname, 'BLIND_OOS_H004_R.json');
fs.writeFileSync(outPath, JSON.stringify(finalJSON, null, 2));

console.log(`\n=== 029R PRIMARY RESULTS (ALL 180 WINDOWS) ===`);
console.log(`Signals: ${primSum.signals} | Resolved: ${primSum.resolved} | Eligible Candles: ${primary.eligibleCandles}`);
console.log(`Signal Rate: ${(signalRate * 100).toFixed(4)}%`);
console.log(`Win Rate: ${(primSum.winRate * 100).toFixed(4)}%`);
console.log(`Wilson Lower: ${(primSum.wilsonLower * 100).toFixed(4)}%`);
console.log(`EV: ${primSum.ev.toFixed(4)}`);
console.log(`\nReversed Win Rate: ${(revSum.winRate * 100).toFixed(4)}%`);
console.log(`\nDiagnostic (P_train > P_BE) WR: ${(gtSum.winRate * 100).toFixed(4)}%`);
console.log(`Diagnostic (P_train <= P_BE) WR: ${(lteSum.winRate * 100).toFixed(4)}%`);
