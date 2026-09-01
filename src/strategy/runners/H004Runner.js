const QuantileStateEngine = require('../models/QuantileStateEngine');

class H004Runner {
    constructor(dataset, trainSize = 4320, testSize = 1440, expiry = 3, minSetups = 30) {
        this.dataset = dataset;
        this.trainSize = trainSize;
        this.testSize = testSize;
        this.expiry = expiry;
        this.minSetups = minSetups;
    }

    resolveSignal(idx, direction, entryPrice) {
        if (idx + this.expiry >= this.dataset.length) return 'UNRESOLVED';
        const exitPrice = this.dataset[idx + this.expiry].close;
        if (exitPrice === entryPrice) return 'PUSH';
        if (direction === 'CALL') return exitPrice > entryPrice ? 'WIN' : 'LOSS';
        if (direction === 'PUT') return exitPrice < entryPrice ? 'WIN' : 'LOSS';
        return 'UNRESOLVED';
    }

    runWindow(trainStart) {
        const trainEnd = trainStart + this.trainSize;
        const testStart = trainEnd;
        const testEnd = testStart + this.testSize;

        if (testEnd > this.dataset.length) return null;

        const engine = new QuantileStateEngine();
        let trainCall = { w: 0, l: 0, p: 0, signals: 0 };
        let trainPut = { w: 0, l: 0, p: 0, signals: 0 };

        // 028-E: Flow correctness. Predict -> Signal -> Update
        // Train Phase
        for (let i = trainStart; i < trainEnd; i++) {
            const candle = this.dataset[i];
            const state = engine.predict(candle);
            
            if (state && state.direction !== 'NO_SIGNAL') {
                // 028-A: BOUNDARY LEAK PREVENTION: i + expiry < trainEnd
                const isResolvedInTrain = (i + this.expiry < trainEnd);
                if (isResolvedInTrain) {
                    const res = this.resolveSignal(i, state.direction, candle.close);
                    if (state.direction === 'CALL') {
                        trainCall.signals++;
                        if (res === 'WIN') trainCall.w++;
                        if (res === 'LOSS') trainCall.l++;
                    } else if (state.direction === 'PUT') {
                        trainPut.signals++;
                        if (res === 'WIN') trainPut.w++;
                        if (res === 'LOSS') trainPut.l++;
                    }
                }
            }
            // Update happens strictly AFTER predict
            engine.update(candle);
        }

        // Probability calculation and Sample Floor
        const pCall = trainCall.signals >= this.minSetups ? trainCall.w / (trainCall.w + trainCall.l) : null;
        const pPut = trainPut.signals >= this.minSetups ? trainPut.w / (trainPut.w + trainPut.l) : null;

        let testCall = { w: 0, l: 0, p: 0, signals: 0 };
        let testPut = { w: 0, l: 0, p: 0, signals: 0 };

        // Test Phase
        // 028-B: Probability Immutability. pCall and pPut are explicitly frozen for the test loop.
        for (let i = testStart; i < testEnd; i++) {
            const candle = this.dataset[i];
            const state = engine.predict(candle);

            if (state && state.direction === 'CALL' && pCall !== null && pCall > 0.555556) {
                const res = this.resolveSignal(i, 'CALL', candle.close);
                testCall.signals++;
                if (res === 'WIN') testCall.w++;
                if (res === 'LOSS') testCall.l++;
            } else if (state && state.direction === 'PUT' && pPut !== null && pPut > 0.555556) {
                const res = this.resolveSignal(i, 'PUT', candle.close);
                testPut.signals++;
                if (res === 'WIN') testPut.w++;
                if (res === 'LOSS') testPut.l++;
            }
            engine.update(candle);
        }

        return {
            windowIndex: trainStart,
            train: { pCall, pPut, callSignals: trainCall.signals, putSignals: trainPut.signals },
            test: { call: testCall, put: testPut }
        };
    }
}
module.exports = H004Runner;
