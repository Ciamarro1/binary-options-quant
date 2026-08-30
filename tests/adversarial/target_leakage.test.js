"use strict";

const TargetEngine = require('../../src/research/TargetEngine');
const BinaryOutcome = require('../../src/research/BinaryOutcome');

describe('Target Engine & Binary Outcome (Adversarial)', () => {
  it('prevents temporal leakage in target resolution', () => {
    const signal = { signalId: '1', timestamp: 100, direction: 'CALL', probability: 0.5 };
    const entryObs = { timestamp: 100, close: 1.0 };
    const expiryObsInvalid = { timestamp: 50, close: 1.1 };
    
    // expiry is before entry -> throw
    expect(() => TargetEngine.resolve(signal, entryObs, expiryObsInvalid, 0.8)).toThrow(/Causality violation/);
  });

  it('evaluates CALL correctly', () => {
    const signal = { signalId: '1', timestamp: 100, direction: 'CALL', probability: 0.6 };
    const entryObs = { timestamp: 100, close: 1.0 };
    
    const winObs = { timestamp: 160, close: 1.1 };
    const winOutcome = TargetEngine.resolve(signal, entryObs, winObs, 0.85);
    expect(winOutcome.outcome).toBe('WIN');
    expect(winOutcome.returnVal).toBe(0.85);
    expect(winOutcome.probability).toBe(0.6);

    const lossObs = { timestamp: 160, close: 0.9 };
    const lossOutcome = TargetEngine.resolve(signal, entryObs, lossObs, 0.85);
    expect(lossOutcome.outcome).toBe('LOSS');
    expect(lossOutcome.returnVal).toBe(-1);

    const pushObs = { timestamp: 160, close: 1.0 };
    const pushOutcome = TargetEngine.resolve(signal, entryObs, pushObs, 0.85);
    expect(pushOutcome.outcome).toBe('PUSH');
    expect(pushOutcome.returnVal).toBe(0);
  });

  it('evaluates PUT correctly', () => {
    const signal = { signalId: '1', timestamp: 100, direction: 'PUT', probability: 0.5 };
    const entryObs = { timestamp: 100, close: 1.0 };
    
    const winObs = { timestamp: 160, close: 0.9 };
    const winOutcome = TargetEngine.resolve(signal, entryObs, winObs, 0.85);
    expect(winOutcome.outcome).toBe('WIN');
    expect(winOutcome.returnVal).toBe(0.85);

    const lossObs = { timestamp: 160, close: 1.1 };
    const lossOutcome = TargetEngine.resolve(signal, entryObs, lossObs, 0.85);
    expect(lossOutcome.outcome).toBe('LOSS');
    expect(lossOutcome.returnVal).toBe(-1);
  });
});
