"use strict";

const ExhaustionModel = require('../../src/strategy/models/ExhaustionModel');
const FeatureSnapshot = require('../../src/core/FeatureSnapshot');

describe('Exhaustion Overlap & Coexistence Certification', () => {
  test('EO-001: Consecutive signals at t, t+1, t+2 are emitted without cooldown', () => {
    const model = new ExhaustionModel(0.60, 0.60, {
      bodyThreshold: 2.0,
      upperCloseLocation: 0.90,
      volumeThreshold: 2.0,
      expirySeconds: 180
    });

    const snapshots = [1000, 1060, 1120].map(ts => new FeatureSnapshot({
      asset: 'BTCUSDT',
      timestamp: ts,
      features: {
        hasData: true,
        open: 100,
        close: 105,
        bodyRatio: 2.5,
        closeLocation: 0.95,
        volumeRatio: 2.5
      },
      featureSetId: 'v1',
      featureSetVersion: '1.0',
      inputHash: `hash_${ts}`
    }));

    const predictions = snapshots.map(s => model.predict(s));
    expect(predictions.length).toBe(3);
    expect(predictions[0].direction).toBe('PUT');
    expect(predictions[1].direction).toBe('PUT');
    expect(predictions[2].direction).toBe('PUT');
  });
});
