"use strict";

const ExhaustionModel = require('../../src/strategy/models/ExhaustionModel');
const ReversedExhaustionModel = require('../../src/strategy/models/ReversedExhaustionModel');
const FeatureSnapshot = require('../../src/core/FeatureSnapshot');

describe('Adversarial 013-A: Reversed Control Mirror Certification', () => {
  const model = new ExhaustionModel(0.60, 0.60);
  const reversed = new ReversedExhaustionModel(0.60, 0.60);

  test('RC-001: Up exhaustion gives PUT on H002 and CALL on Reversed Control', () => {
    const s = new FeatureSnapshot({
      asset: 'BTCUSDT', timestamp: 1000,
      features: { hasData: true, open: 100, close: 105, bodyRatio: 2.5, closeLocation: 0.95, volumeRatio: 2.5 },
      featureSetId: 'v1', featureSetVersion: '1.0', inputHash: 'd1'
    });

    const predH002 = model.predict(s);
    const predRev = reversed.predict(s);

    expect(predH002.direction).toBe('PUT');
    expect(predRev.direction).toBe('CALL');
    expect(predH002.expirySeconds).toBe(predRev.expirySeconds);
  });

  test('RC-002: Down exhaustion gives CALL on H002 and PUT on Reversed Control', () => {
    const s = new FeatureSnapshot({
      asset: 'BTCUSDT', timestamp: 1000,
      features: { hasData: true, open: 105, close: 100, bodyRatio: 2.5, closeLocation: 0.05, volumeRatio: 2.5 },
      featureSetId: 'v1', featureSetVersion: '1.0', inputHash: 'd2'
    });

    const predH002 = model.predict(s);
    const predRev = reversed.predict(s);

    expect(predH002.direction).toBe('CALL');
    expect(predRev.direction).toBe('PUT');
    expect(predH002.expirySeconds).toBe(predRev.expirySeconds);
  });
});
