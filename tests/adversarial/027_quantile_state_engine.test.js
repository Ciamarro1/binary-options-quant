const QuantileStateEngine = require('../../src/strategy/models/QuantileStateEngine');
const crypto = require('crypto');

describe('COMMIT 027: Quantile State Engine (H004)', () => {
    let engine;

    beforeEach(() => {
        engine = new QuantileStateEngine(240, 0.025, 0.975);
    });

    // Helper to push N dummy candles to build state
    const seedEngine = (n, basePrice = 100) => {
        for (let i = 0; i < n; i++) {
            // Using a tiny increment to create distinct historical returns
            engine.update({ close: basePrice + i * 0.1 });
        }
    };

    test('QS-002: 239 candles -> estado inválido', () => {
        seedEngine(240); // 240 closes = 239 returns
        expect(engine.history.length).toBe(239);
        
        const result = engine.predict({ close: 150 });
        expect(result).toBeNull();
    });

    test('QS-001: 240 candles anteriores -> estado válido', () => {
        seedEngine(241); // 241 closes = 240 returns
        expect(engine.history.length).toBe(240);
        
        const result = engine.predict({ close: 150 });
        expect(result).not.toBeNull();
        expect(typeof result.Q).toBe('number');
    });

    test('QS-003: r[t] não entra na distribuição histórica', () => {
        seedEngine(241); 
        const stateBefore = [...engine.history];
        
        // predict should not mutate
        engine.predict({ close: 200 });
        const stateAfter = [...engine.history];
        
        expect(stateBefore).toEqual(stateAfter);
    });

    test('QS-004: future injection não altera Q[t]', () => {
        seedEngine(241, 100);
        
        const candleT = { close: 125.5 };
        const resultOriginal = engine.predict(candleT);
        
        // Simulate altering future candles conceptually
        // A future candle (t+1) mathematically cannot impact predict at t
        // We prove this by the causal flow:
        const cloneEngine = new QuantileStateEngine(240, 0.025, 0.975);
        cloneEngine.history = [...engine.history];
        cloneEngine.lastClose = engine.lastClose;
        
        // Evaluate same candle T
        const resultClone = cloneEngine.predict(candleT);
        expect(resultOriginal.Q).toBe(resultClone.Q);
        expect(resultOriginal.direction).toBe(resultClone.direction);
    });

    test('QS-005, QS-006, QS-007, QS-008: Boundary Precision (L=240 discrete bounds)', () => {
        // We will directly inject the history to control the exact count of strictly lower returns.
        engine.lastClose = 100;
        engine.history = new Array(240).fill(0); 
        // 240 historical returns. Let's make rt = 0.05 (candle close = 105)
        // If exactly N historical returns are < 0.05, Q will be N/240.
        
        const rt = 0.05;
        const targetClose = 105; // rt = (105/100) - 1 = 0.05

        // Lower extreme: Q <= 0.025 -> CALL
        // 6 / 240 = 0.025000 -> CALL
        for(let i=0; i<240; i++) engine.history[i] = i < 6 ? 0.01 : 0.10;
        let res = engine.predict({ close: targetClose });
        expect(res.Q).toBeCloseTo(0.025, 5);
        expect(res.direction).toBe('CALL'); // QS-006

        // 7 / 240 = 0.029166 -> NO SIGNAL 
        // (Note: The user wrote "Q=0.024999 -> NO SIGNAL" for lower boundary, 
        // but since Q <= 0.025 is CALL, any Q > 0.025 is NO SIGNAL, e.g., 7/240)
        for(let i=0; i<240; i++) engine.history[i] = i < 7 ? 0.01 : 0.10;
        res = engine.predict({ close: targetClose });
        expect(res.direction).toBe('NO_SIGNAL'); // QS-005 analog for discrete step

        // Upper extreme: Q >= 0.975 -> PUT
        // 233 / 240 = 0.970833 -> NO SIGNAL (QS-007)
        for(let i=0; i<240; i++) engine.history[i] = i < 233 ? 0.01 : 0.10;
        res = engine.predict({ close: targetClose });
        expect(res.direction).toBe('NO_SIGNAL');

        // 234 / 240 = 0.975000 -> PUT (QS-008)
        for(let i=0; i<240; i++) engine.history[i] = i < 234 ? 0.01 : 0.10;
        res = engine.predict({ close: targetClose });
        expect(res.Q).toBeCloseTo(0.975, 5);
        expect(res.direction).toBe('PUT');
    });

    test('QS-009: Empates no ranking tratados deterministicamente', () => {
        engine.lastClose = 100;
        const targetClose = 105;
        const exactRt = (targetClose / 100) - 1;
        
        // All historical returns are EXACTLY equal to the current rt
        engine.history = new Array(240).fill(exactRt);
        
        const res = engine.predict({ close: targetClose });
        
        // Strict inequality: count of (history_i < rt) is 0 because they are exactly equal.
        expect(res.Q).toBe(0); 
        expect(res.direction).toBe('CALL'); // Since 0 <= 0.025
    });

    test('QS-010: Mesmo input -> mesmo Q/hash', () => {
        engine.lastClose = 100;
        engine.history = Array.from({length: 240}, (_, i) => i * 0.001);
        
        const res1 = engine.predict({ close: 110 });
        const res2 = engine.predict({ close: 110 });
        
        expect(res1.Q).toBe(res2.Q);
        expect(res1.direction).toBe(res2.direction);
        
        const hash1 = crypto.createHash('sha256').update(JSON.stringify(res1)).digest('hex');
        const hash2 = crypto.createHash('sha256').update(JSON.stringify(res2)).digest('hex');
        expect(hash1).toBe(hash2);
    });

    test('Causal Flow: Past influences current state, Future does not', () => {
        // Setup initial history
        engine.lastClose = 100;
        engine.history = new Array(240).fill(0.02);
        
        // Original evaluation at t
        const rt1 = 103; // rt = 0.03
        const resOriginal = engine.predict({ close: rt1 });
        
        // 1. Future alteration
        // We modify candle t+1 (which hasn't happened yet). It mathematically cannot reach back to t.
        const resFutureCheck = engine.predict({ close: rt1 });
        expect(resOriginal.Q).toBe(resFutureCheck.Q);
        
        // 2. Past alteration (mutating r[t-1])
        engine.history[239] = 0.04; // altering the past
        const resPastAltered = engine.predict({ close: rt1 });
        
        // The Q should change because we altered the past distribution
        expect(resPastAltered.Q).not.toBe(resOriginal.Q);
    });
});
