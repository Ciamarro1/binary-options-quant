"use strict";

const ExhaustionModel = require('../../src/strategy/models/ExhaustionModel');
const FeatureSnapshot = require('../../src/core/FeatureSnapshot');

describe('ExhaustionModel Unit Certification', () => {
  const fittedModel = new ExhaustionModel(0.60, 0.65, {
    bodyThreshold: 2.0,
    upperCloseLocation: 0.90,
    lowerCloseLocation: 0.10,
    volumeThreshold: 2.0,
    expirySeconds: 180
  });

  test('EM-001: UP exhaustion emits PUT', () => {
    const snapshot = new FeatureSnapshot({
      asset: 'BTCUSDT',
      timestamp: 1000,
      features: {
        hasData: true,
        open: 100,
        close: 105, // Bullish candle
        bodyRatio: 2.0,
        closeLocation: 0.90,
        volumeRatio: 2.0
      },
      featureSetId: 'v1',
      featureSetVersion: '1.0',
      inputHash: 'dummy'
    });

    const pred = fittedModel.predict(snapshot);
    expect(pred).not.toBeNull();
    expect(pred.direction).toBe('PUT');
    expect(pred.probability).toBe(0.65);
    expect(pred.expirySeconds).toBe(180);
  });

  test('EM-002: DOWN exhaustion emits CALL', () => {
    const snapshot = new FeatureSnapshot({
      asset: 'BTCUSDT',
      timestamp: 1000,
      features: {
        hasData: true,
        open: 105,
        close: 100, // Bearish candle
        bodyRatio: 2.0,
        closeLocation: 0.10,
        volumeRatio: 2.0
      },
      featureSetId: 'v1',
      featureSetVersion: '1.0',
      inputHash: 'dummy'
    });

    const pred = fittedModel.predict(snapshot);
    expect(pred).not.toBeNull();
    expect(pred.direction).toBe('CALL');
    expect(pred.probability).toBe(0.60);
    expect(pred.expirySeconds).toBe(180);
  });

  test('EM-003: Strict boundary checks (floating point precision)', () => {
    const baseFeatures = {
      hasData: true,
      open: 100,
      close: 105,
      bodyRatio: 2.0,
      closeLocation: 0.90,
      volumeRatio: 2.0
    };

    // 1. bodyRatio = 1.999999 -> NO SIGNAL
    const s1 = new FeatureSnapshot({
      asset: 'BTCUSDT', timestamp: 1000,
      features: { ...baseFeatures, bodyRatio: 1.999999 },
      featureSetId: 'v1', featureSetVersion: '1.0', inputHash: 'd'
    });
    expect(fittedModel.predict(s1)).toBeNull();

    // 2. closeLocation = 0.899999 -> NO SIGNAL
    const s2 = new FeatureSnapshot({
      asset: 'BTCUSDT', timestamp: 1000,
      features: { ...baseFeatures, closeLocation: 0.899999 },
      featureSetId: 'v1', featureSetVersion: '1.0', inputHash: 'd'
    });
    expect(fittedModel.predict(s2)).toBeNull();

    // 3. volumeRatio = 1.999999 -> NO SIGNAL
    const s3 = new FeatureSnapshot({
      asset: 'BTCUSDT', timestamp: 1000,
      features: { ...baseFeatures, volumeRatio: 1.999999 },
      featureSetId: 'v1', featureSetVersion: '1.0', inputHash: 'd'
    });
    expect(fittedModel.predict(s3)).toBeNull();
  });

  test('EM-004: closeLocation = null yields NO SIGNAL', () => {
    const s = new FeatureSnapshot({
      asset: 'BTCUSDT', timestamp: 1000,
      features: {
        hasData: true,
        open: 100, close: 105,
        bodyRatio: 2.5,
        closeLocation: null,
        volumeRatio: 2.5
      },
      featureSetId: 'v1', featureSetVersion: '1.0', inputHash: 'd'
    });
    expect(fittedModel.predict(s)).toBeNull();
  });
});
