"use strict";

const ExhaustionModel = require('../../src/strategy/models/ExhaustionModel');
const FeatureSnapshot = require('../../src/core/FeatureSnapshot');

describe('Adversarial 013-E: Feature Tampering & Exact Boundary Resistance', () => {
  const model = new ExhaustionModel(0.60, 0.60);

  test('FT-001: Micro-perturbation at exactly 1.999999 fails, 2.000000 passes', () => {
    const makeSnap = (bodyRatio, closeLocation, volumeRatio) => new FeatureSnapshot({
      asset: 'BTCUSDT', timestamp: 1000,
      features: { hasData: true, open: 100, close: 105, bodyRatio, closeLocation, volumeRatio },
      featureSetId: 'v1', featureSetVersion: '1.0', inputHash: 'hash'
    });

    // 1. bodyRatio tampering
    expect(model.predict(makeSnap(1.999999, 0.90, 2.0))).toBeNull();
    expect(model.predict(makeSnap(2.000000, 0.90, 2.0))).not.toBeNull();

    // 2. closeLocation tampering
    expect(model.predict(makeSnap(2.0, 0.899999, 2.0))).toBeNull();
    expect(model.predict(makeSnap(2.0, 0.900000, 2.0))).not.toBeNull();

    // 3. volumeRatio tampering
    expect(model.predict(makeSnap(2.0, 0.90, 1.999999))).toBeNull();
    expect(model.predict(makeSnap(2.0, 0.90, 2.000000))).not.toBeNull();
  });
});
