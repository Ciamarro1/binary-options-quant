const fs = require('fs');
const path = require('path');
const QuantileStateEngine = require('../src/strategy/models/QuantileStateEngine');
const crypto = require('crypto');

const DATASET_PATH = path.join(__dirname, 'DATASET_005.json');
const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));
const datasetHash = crypto.createHash('sha256').update(fs.readFileSync(DATASET_PATH)).digest('hex');

console.log("=== COMMIT 029: BLIND OOS EXECUTION (H004) ===");
console.log(`DATASET_005 SHA256: ${datasetHash}`);
console.log(`Dataset Length: ${dataset.length} candles`);

const TRAIN_SIZE = 4320;
const TEST_SIZE = 1440;
const STEP_SIZE = 1440;
const EXPIRY = 3;
const MIN_SETUPS = 30;
const WINDOWS = 180;

let totalSignals = 0;
let totalWins = 0;
let totalLosses = 0;
let totalPushes = 0;
let totalUnresolved = 0;

let revWins = 0;
let revLosses = 0;
let revPushes = 0;

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

for (let w = 0; w < WINDOWS; w++) {
    const trainStart = w * STEP_SIZE;
    const trainEnd = trainStart + TRAIN_SIZE;
    const testStart = trainEnd;
    const testEnd = testStart + TEST_SIZE;
    
    if (testEnd > dataset.length) {
        console.warn(`Window ${w} exceeds dataset length.`);
        break;
    }

    const engine = new QuantileStateEngine();
    let trainCallSetups = 0, trainCallWins = 0, trainCallLosses = 0;
    let trainPutSetups = 0, trainPutWins = 0, trainPutLosses = 0;

    // --- TRAIN PHASE ---
    for (let i = trainStart; i < trainEnd; i++) {
        const state = engine.predict(dataset[i]);
        if (state && state.direction !== 'NO_SIGNAL') {
            const isResolvedInTrain = (i + EXPIRY < trainEnd);
            if (isResolvedInTrain) {
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

    // --- PROBABILITY FREEZE ---
    const pCall_train = trainCallSetups >= MIN_SETUPS ? trainCallWins / (trainCallWins + trainCallLosses) : null;
    const pPut_train = trainPutSetups >= MIN_SETUPS ? trainPutWins / (trainPutWins + trainPutLosses) : null;

    let w_signals = 0, w_wins = 0, w_losses = 0, w_pushes = 0, w_unresolved = 0;
    let w_rev_w = 0, w_rev_l = 0, w_rev_p = 0;

    // --- TEST PHASE ---
    for (let i = testStart; i < testEnd; i++) {
        const state = engine.predict(dataset[i]);
        
        let signalFired = false;
        let direction = null;

        if (state && state.direction === 'CALL' && pCall_train !== null && pCall_train > 0.555556) {
            signalFired = true;
            direction = 'CALL';
        } else if (state && state.direction === 'PUT' && pPut_train !== null && pPut_train > 0.555556) {
            signalFired = true;
            direction = 'PUT';
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
        }
        
        engine.update(dataset[i]);
    }

    totalSignals += w_signals;
    totalWins += w_wins;
    totalLosses += w_losses;
    totalPushes += w_pushes;
    totalUnresolved += w_unresolved;

    revWins += w_rev_w;
    revLosses += w_rev_l;
    revPushes += w_rev_p;

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

const N = totalWins + totalLosses;
const winRate = N > 0 ? totalWins / N : 0;
const wilsonLower = calcWilson(totalWins, totalLosses);
const ev = (winRate * 0.8) - ((1 - winRate) * 1);

const rev_N = revWins + revLosses;
const rev_winRate = rev_N > 0 ? revWins / rev_N : 0;
const rev_wilsonLower = calcWilson(revWins, revLosses);

const finalJSON = {
    integrity: {
        datasetHash,
        windowsEvaluated: WINDOWS
    },
    economicValidation: {
        signals: totalSignals,
        resolved: N,
        pushes: totalPushes,
        wins: totalWins,
        losses: totalLosses,
        winRate,
        wilsonLower,
        ev
    },
    reversedControl: {
        resolved: rev_N,
        wins: revWins,
        losses: revLosses,
        winRate: rev_winRate,
        wilsonLower: rev_wilsonLower
    },
    windowLogs: report
};

const outPath = path.join(__dirname, 'BLIND_OOS_H004.json');
fs.writeFileSync(outPath, JSON.stringify(finalJSON, null, 2));

console.log(`\n=== 029 EXECUTION COMPLETE ===`);
console.log(`Windows: ${WINDOWS}`);
console.log(`Signals: ${totalSignals} | Resolved: ${N}`);
console.log(`Win Rate: ${(winRate * 100).toFixed(4)}%`);
console.log(`Wilson Lower: ${(wilsonLower * 100).toFixed(4)}%`);
console.log(`EV: ${ev.toFixed(4)}`);
console.log(`Reversed Win Rate: ${(rev_winRate * 100).toFixed(4)}%`);
console.log(`Output saved to BLIND_OOS_H004.json`);
