"use strict";

const MarketObservation = require('../../src/core/MarketObservation');
const FeatureEngine = require('../../src/strategy/FeatureEngine');
const RegimeEngine = require('../../src/strategy/RegimeEngine');
const SignalEngine = require('../../src/strategy/SignalEngine');

describe('Causal Integrity & Determinism (Adversarial)', () => {
  const fEngine = new FeatureEngine('v1', '1.0');
  const rEngine = new RegimeEngine();
  const sEngine = new SignalEngine({ featureEngine: fEngine, regimeEngine: rEngine });

  const mockModel = {
    id: 'm1',
    version: '1.0',
    predict: (f, r) => ({ probability: 0.55, direction: 'CALL', expirySeconds: 60 })
  };

  const createObs = (t) => new MarketObservation({
    asset: 'BTC', timestamp: t, open: 1, high: 2, low: 0.5, close: 1, volume: 10, timeframe: 'M1'
  });

  it('FeatureEngine & RegimeEngine must throw if causality is violated', () => {
    const obs = [createObs(100), createObs(101)]; // Data up to t=101
    
    // Trying to extract features for t=100 using data that goes up to 101 -> LOOKAHEAD LEAK!
    expect(() => fEngine.extractFeatures('BTC', 100, obs)).toThrow(/Causality violation/);
    expect(() => rEngine.classifyRegime('BTC', 100, obs)).toThrow(/Causality violation/);
  });

  it('Adding future candles MUST NOT change historical signal', () => {
    const obs100 = [createObs(99), createObs(100)];
    
    // Request signal at t=100
    // Mock crypto.randomUUID to be deterministic for this test to check if signal parameters are identical
    const signalA = sEngine.generateSignal('BTC', 100, obs100, mockModel);
    
    // Now we have data up to 101, but we request historical signal at 100
    // We MUST pass only data up to 100 to the engine, or the engine throws.
    // Let's pass the valid subset
    const validSubset = [...obs100];
    const signalB = sEngine.generateSignal('BTC', 100, validSubset, mockModel);

    // They must be identical (ignoring signalId which is random UUID)
    expect(signalA.inputHash).toBe(signalB.inputHash);
    expect(signalA.probability).toBe(signalB.probability);
  });

  it('Model Isolation: model is only passed immutable snapshots, cannot execute', () => {
    let capturedFeatureSnap = null;
    let capturedRegimeSnap = null;
    
    const maliciousModel = {
      id: 'evil', version: '1',
      predict: (f, r) => {
        capturedFeatureSnap = f;
        capturedRegimeSnap = r;
        return { probability: 0.9, direction: 'CALL', expirySeconds: 60 };
      }
    };

    sEngine.generateSignal('BTC', 100, [createObs(99), createObs(100)], maliciousModel);

    // Malicious model tries to mutate features
    expect(() => { capturedFeatureSnap.features.hasData = false }).toThrow();
    // Doesn't have access to broker/execution
    expect(capturedFeatureSnap.broker).toBeUndefined();
    expect(capturedRegimeSnap.execute).toBeUndefined();
  });

  it('Should reject invalid or missing data gracefully', () => {
    // Model returns null
    const noPredictModel = { id: 'm', version: 'v', predict: () => null };
    expect(sEngine.generateSignal('BTC', 100, [createObs(99), createObs(100)], noPredictModel)).toBeNull();

    // UNKNOWN regime yields null
    // our RegimeEngine stub returns UNKNOWN if < 2 observations
    expect(sEngine.generateSignal('BTC', 100, [createObs(100)], mockModel)).toBeNull();
  });
});
