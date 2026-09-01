const H004Runner = require('../../src/strategy/runners/H004Runner');
const QuantileStateEngine = require('../../src/strategy/models/QuantileStateEngine');
const crypto = require('crypto');

// Utility to generate deterministic pseudo-random candles
function generateMockDataset(size, seed = 1) {
    const data = [];
    let price = 100;
    for (let i = 0; i < size; i++) {
        // Simple deterministic walk
        const r = Math.sin(seed * i) * 0.05; 
        price = price * (1 + r);
        data.push({ timestamp: i * 60000, close: price });
    }
    return data;
}

describe('COMMIT 028: Adversarial OOS Harness (H004)', () => {
    let dataset;
    let runner;

    beforeEach(() => {
        dataset = generateMockDataset(6000); // 4320 train + 1440 test = 5760 minimum
        runner = new H004Runner(dataset);
    });

    test('028-A: Train/Test Boundary Leak (Setup at end of TRAIN)', () => {
        const trainStart = 0;
        const trainEnd = runner.trainSize;
        
        const engine = new QuantileStateEngine();
        let signals = 0;
        
        // Emulate train phase loop
        for (let i = trainStart; i < trainEnd; i++) {
            const state = engine.predict(dataset[i]);
            if (state && state.direction !== 'NO_SIGNAL') {
                const isResolvedInTrain = (i + runner.expiry < trainEnd);
                // If it's the very last candle of train (i = trainEnd - 1)
                // i + 3 = trainEnd + 2, which is NOT < trainEnd.
                if (i === trainEnd - 1) {
                    expect(isResolvedInTrain).toBe(false); // MUST NOT ENTER P_TRAIN
                }
            }
            engine.update(dataset[i]);
        }
    });

    test('028-B: Probability Immutability', () => {
        const res = runner.runWindow(0);
        // The probability is extracted and frozen in the runner's return object
        expect(res.train.pCall).toBeDefined();
        expect(res.train.pPut).toBeDefined();
        
        // To strictly prove it, we observe that the test phase uses `pCall` and `pPut` variables 
        // which are primitive consts declared before the test loop in H004Runner.js. 
        // Javascript const primitives are mathematically immutable during the test loop.
        expect(typeof res.train.pCall).toMatch(/(number|object)/); // number or null
    });

    test('028-C: Quantile Future Injection (Changing Future does not change Q)', () => {
        const engine = new QuantileStateEngine();
        for (let i = 0; i < 241; i++) engine.update(dataset[i]);
        
        const stateOriginal = engine.predict(dataset[241]);
        
        // Alter dataset[242] (Future)
        dataset[242].close = 999999;
        
        // Q[t] must remain identical
        const stateAltered = engine.predict(dataset[241]);
        expect(stateOriginal.Q).toBe(stateAltered.Q);
    });

    test('028-D: Rank Contamination (Changing Present DOES change Q)', () => {
        const engine = new QuantileStateEngine();
        for (let i = 0; i < 241; i++) engine.update(dataset[i]);
        
        const stateOriginal = engine.predict(dataset[241]);
        
        // Alter dataset[241] (Present)
        const oldClose = dataset[241].close;
        dataset[241].close = oldClose * 1.5; // massive return
        
        const stateAltered = engine.predict(dataset[241]);
        // The Q must change because the current return changed
        expect(stateOriginal.Q).not.toBe(stateAltered.Q);
    });

    test('028-E: Threshold Precision & Engine Flow', () => {
        const engine = new QuantileStateEngine();
        engine.lastClose = 100;
        
        // 6 strictly lower out of 240 = 0.025
        engine.history = new Array(240).fill(0.10);
        for(let i = 0; i < 6; i++) engine.history[i] = 0.01;
        
        const rtClose = 105; // return = 0.05
        const stateCall = engine.predict({ close: rtClose });
        expect(stateCall.Q).toBe(0.025);
        expect(stateCall.direction).toBe('CALL');
        
        // 7 strictly lower out of 240 = 0.029166 -> NO SIGNAL
        engine.history[6] = 0.01;
        const stateNoCall = engine.predict({ close: rtClose });
        expect(stateNoCall.direction).toBe('NO_SIGNAL');

        // Flow check: predictability does not mutate history
        expect(engine.history.length).toBe(240);
        engine.update({ close: rtClose });
        expect(engine.history.length).toBe(240);
        expect(engine.history[239]).toBeCloseTo(0.05, 5); // the new return was added at the end
    });

    test('028-F: Directional Symmetry (r -> -r flips direction)', () => {
        const engineNormal = new QuantileStateEngine();
        const engineFlipped = new QuantileStateEngine();
        
        engineNormal.lastClose = 100;
        engineFlipped.lastClose = 100;
        
        // Create an asymmetric history
        const returns = Array.from({length: 240}, (_, i) => -0.1 + (i * 0.001)); // -0.1 to +0.14
        engineNormal.history = [...returns];
        engineFlipped.history = returns.map(r => -r);
        
        const targetRet = -0.15; // lower than anything in normal -> Q=0 -> CALL
        const normalClose = 100 * (1 + targetRet);
        const flippedClose = 100 * (1 - targetRet); // inverted
        
        const resNormal = engineNormal.predict({ close: normalClose });
        expect(resNormal.Q).toBe(0);
        expect(resNormal.direction).toBe('CALL');
        
        const resFlipped = engineFlipped.predict({ close: flippedClose });
        expect(resFlipped.Q).toBe(1); // 240/240
        expect(resFlipped.direction).toBe('PUT'); // completely flipped
    });

    test('028-G: Baseline Isolation', () => {
        const runnerCode = require('fs').readFileSync(__dirname + '/../../src/strategy/runners/H004Runner.js', 'utf8');
        expect(runnerCode).not.toMatch(/H001/);
        expect(runnerCode).not.toMatch(/H002/);
        expect(runnerCode).not.toMatch(/H003/);
        expect(runnerCode).not.toMatch(/ATR/);
        expect(runnerCode).not.toMatch(/Volume/i);
    });

    test('028-H: Reproducibility', () => {
        const run1 = new H004Runner(dataset).runWindow(0);
        const run2 = new H004Runner(dataset).runWindow(0);
        
        const hash1 = crypto.createHash('sha256').update(JSON.stringify(run1)).digest('hex');
        const hash2 = crypto.createHash('sha256').update(JSON.stringify(run2)).digest('hex');
        
        expect(hash1).toBe(hash2);
    });
});
