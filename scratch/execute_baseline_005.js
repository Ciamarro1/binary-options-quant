const fs = require('fs');
const path = require('path');

const DATASET_PATH = path.join(__dirname, 'DATASET_005.json');
const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));

console.log(`Loaded ${dataset.length} candles from DATASET_005.`);

const WINDOWS = 180;
const TRAIN_DAYS = 3;
const TEST_DAYS = 1;
const CANDLES_PER_DAY = 1440;
const EXPIRY = 3;

let totalWins = 0;
let totalLosses = 0;
let totalPushes = 0;
let totalSignals = 0;

const baselineReport = [];

function resolveSignal(idx, direction, entryPrice) {
    if (idx + EXPIRY >= dataset.length) return 'UNRESOLVED';
    const exitPrice = dataset[idx + EXPIRY].close;
    if (exitPrice === entryPrice) return 'PUSH';
    if (direction === 'CALL') return exitPrice > entryPrice ? 'WIN' : 'LOSS';
    if (direction === 'PUT') return exitPrice < entryPrice ? 'WIN' : 'LOSS';
    return 'UNRESOLVED';
}

for (let w = 0; w < WINDOWS; w++) {
    const trainStart = w * CANDLES_PER_DAY;
    const trainEnd = trainStart + (TRAIN_DAYS * CANDLES_PER_DAY);
    const testStart = trainEnd;
    const testEnd = testStart + (TEST_DAYS * CANDLES_PER_DAY);
    
    // Safety check
    if (testEnd > dataset.length) break;

    // Train Phase: Evaluate empirical probability over ALL candles
    let trainCallWins = 0, trainCallLosses = 0;
    let trainPutWins = 0, trainPutLosses = 0;
    
    for (let i = trainStart; i < trainEnd; i++) {
        const isResolvedInTrain = (i + EXPIRY < trainEnd);
        if (isResolvedInTrain) {
            const entryPrice = dataset[i].close;
            
            // Assume we played CALL
            const resCall = resolveSignal(i, 'CALL', entryPrice);
            if (resCall === 'WIN') trainCallWins++;
            if (resCall === 'LOSS') trainCallLosses++;
            
            // Assume we played PUT
            const resPut = resolveSignal(i, 'PUT', entryPrice);
            if (resPut === 'WIN') trainPutWins++;
            if (resPut === 'LOSS') trainPutLosses++;
        }
    }
    
    const pCall = trainCallWins / (trainCallWins + trainCallLosses);
    const pPut = trainPutWins / (trainPutWins + trainPutLosses);
    
    // Decision logic
    let direction = null;
    let pPredicted = null;
    if (pCall > pPut && pCall > 0.5) {
        direction = 'CALL';
        pPredicted = pCall;
    } else if (pPut > pCall && pPut > 0.5) {
        direction = 'PUT';
        pPredicted = pPut;
    }
    
    // Test Phase
    let w_wins = 0, w_losses = 0, w_pushes = 0;
    if (direction) {
        for (let i = testStart; i < testEnd; i++) {
            // Emitting signal on EVERY candle according to the baseline model
            const res = resolveSignal(i, direction, dataset[i].close);
            if (res === 'WIN') w_wins++;
            else if (res === 'LOSS') w_losses++;
            else if (res === 'PUSH') w_pushes++;
        }
    }
    
    totalSignals += (w_wins + w_losses + w_pushes);
    totalWins += w_wins;
    totalLosses += w_losses;
    totalPushes += w_pushes;
    
    baselineReport.push({
        window: w + 1,
        trainStart: new Date(dataset[trainStart].timestamp).toISOString(),
        testStart: new Date(dataset[testStart].timestamp).toISOString(),
        testEnd: new Date(dataset[testEnd - 1].timestamp).toISOString(),
        pCall: parseFloat(pCall.toFixed(4)),
        pPut: parseFloat(pPut.toFixed(4)),
        predictedDirection: direction,
        predictedP: direction ? parseFloat(pPredicted.toFixed(4)) : null,
        signals: w_wins + w_losses + w_pushes,
        wins: w_wins,
        losses: w_losses,
        pushes: w_pushes
    });
}

const N = totalWins + totalLosses;
const winRate = N > 0 ? totalWins / N : 0;
const z = 1.96;
const denominator = 1 + z * z / N;
const centerProb = winRate + z * z / (2 * N);
const errorMargin = z * Math.sqrt((winRate * (1 - winRate)) / N + z * z / (4 * N * N));
const wilsonLower = denominator > 0 ? (centerProb - errorMargin) / denominator : 0;

console.log("=== BASELINE_005_CONTROL EXECUTED ===");
console.log(`Windows: ${baselineReport.length}`);
console.log(`Signals: ${totalSignals}`);
console.log(`Resolved (N): ${N}`);
console.log(`Wins: ${totalWins}`);
console.log(`Losses: ${totalLosses}`);
console.log(`Win Rate: ${(winRate * 100).toFixed(4)}%`);
console.log(`Wilson Lower (95% CI): ${(wilsonLower * 100).toFixed(4)}%`);

fs.writeFileSync(path.join(__dirname, 'BASELINE_005_REPORT.json'), JSON.stringify({
    summary: {
        windows: baselineReport.length,
        signals: totalSignals,
        resolved: N,
        wins: totalWins,
        losses: totalLosses,
        winRate,
        wilsonLower
    },
    windows: baselineReport
}, null, 2));
