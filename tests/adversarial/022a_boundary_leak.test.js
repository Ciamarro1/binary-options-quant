const { expect } = require('@jest/globals');

// Helper to simulate the exact logic to be used in execute_021_genuine_oos.js
function calculateTrainStats(candles, trainBoundaryIdx, expiryCandles) {
    let trainCandidates = 0;
    
    // We iterate up to trainBoundaryIdx (exclusive). 
    // This represents all candles that closed strictly INSIDE the train window.
    for (let i = 0; i < trainBoundaryIdx; i++) {
        const hasSetup = candles[i].setup;
        
        if (hasSetup) {
            // THE FIX: The resolution must complete strictly before the boundary.
            // If setup is at i, and expiry is 3, resolution is at i + 3.
            // For resolution to be inside train, i + 3 must be < trainBoundaryIdx.
            const isResolvedInTrain = (i + expiryCandles < trainBoundaryIdx);
            
            if (isResolvedInTrain) {
                trainCandidates++;
            }
        }
    }
    
    return trainCandidates;
}

describe('022A: Train/Target Boundary Leak Fix (IS/OOS Boundary Isolation)', () => {

    test('Setup at T-2 with Expiry 3 MUST NOT contribute to train probability (Leaks into OOS)', () => {
        const expiry = 3;
        const trainBoundaryIdx = 10; // boundary is exclusive (candles 0-9 are TRAIN, 10+ is TEST)
        
        // Setup at index 8 (T-2, because 10-2 = 8).
        // Resolution will be at 8 + 3 = 11.
        // 11 is >= 10, so it resolves in TEST.
        const candles = Array(15).fill().map((_, idx) => ({
            setup: idx === 8
        }));
        
        const validTrainSetups = calculateTrainStats(candles, trainBoundaryIdx, expiry);
        
        expect(validTrainSetups).toBe(0); // Should be completely discarded
    });

    test('Setup at T-4 with Expiry 3 MAY contribute to train probability (Resolves IS)', () => {
        const expiry = 3;
        const trainBoundaryIdx = 10;
        
        // Setup at index 6 (T-4, because 10-4 = 6).
        // Resolution will be at 6 + 3 = 9.
        // 9 is < 10, so it resolves in TRAIN.
        const candles = Array(15).fill().map((_, idx) => ({
            setup: idx === 6
        }));
        
        const validTrainSetups = calculateTrainStats(candles, trainBoundaryIdx, expiry);
        
        expect(validTrainSetups).toBe(1); // Properly counted
    });
    
    test('Boundary Edge Case: Setup at T-3 with Expiry 3 MUST NOT contribute (Resolves exactly at T)', () => {
        const expiry = 3;
        const trainBoundaryIdx = 10;
        
        // Setup at index 7.
        // Resolution at 7 + 3 = 10.
        // 10 === trainBoundaryIdx, meaning it resolves exactly on the first candle of TEST.
        // It must NOT contribute.
        const candles = Array(15).fill().map((_, idx) => ({
            setup: idx === 7
        }));
        
        const validTrainSetups = calculateTrainStats(candles, trainBoundaryIdx, expiry);
        
        expect(validTrainSetups).toBe(0); 
    });

    test('Invariance: Train Only vs Train+Test data must yield identical train probabilities', () => {
        const expiry = 3;
        const trainBoundaryIdx = 10;
        
        // Setups at 2, 5 (resolves in train), and 8, 12 (resolves in test)
        const setupIndices = [2, 5, 8, 12];
        const fullCandles = Array(20).fill().map((_, idx) => ({
            setup: setupIndices.includes(idx)
        }));
        
        // Train only dataset
        const trainOnlyCandles = fullCandles.slice(0, trainBoundaryIdx);
        
        const probTrainOnly = calculateTrainStats(trainOnlyCandles, trainBoundaryIdx, expiry);
        const probFullDataset = calculateTrainStats(fullCandles, trainBoundaryIdx, expiry);
        
        // The presence of future data in the array MUST NOT change the IS statistic
        expect(probFullDataset).toBe(probTrainOnly);
        expect(probFullDataset).toBe(2); // Setups at 2 and 5 are valid
    });

});
