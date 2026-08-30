"use strict";

const FeatureSnapshot = require('../../src/core/FeatureSnapshot');
const RegimeSnapshot = require('../../src/core/RegimeSnapshot');
const Signal = require('../../src/core/Signal');

describe('Signal Core Immutability & Validation', () => {
  it('FeatureSnapshot should be deeply immutable', () => {
    const snap = new FeatureSnapshot({
      asset: 'BTCUSD', timestamp: 1, features: { a: 1, b: { c: 2 } },
      featureSetId: 'v1', featureSetVersion: '1.0', inputHash: 'hash'
    });
    
    expect(() => { snap.asset = 'ETHUSD' }).toThrow();
    expect(() => { snap.features.a = 2 }).toThrow();
    expect(() => { snap.features.b.c = 3 }).toThrow();
  });

  it('RegimeSnapshot should be immutable and validate regimes', () => {
    expect(() => new RegimeSnapshot({ asset: 'BTC', timestamp: 1, regime: 'MAGIC' })).toThrow();
    
    const snap = new RegimeSnapshot({ asset: 'BTC', timestamp: 1, regime: 'TREND' });
    expect(() => { snap.regime = 'RANGE' }).toThrow();
  });

  it('Signal should be immutable and strict', () => {
    expect(() => new Signal({
      signalId: '1', asset: 'BTC', timestamp: 1, direction: 'UP', // invalid direction
      expirySeconds: 60, modelId: 'm', modelVersion: 'v', featureSetId: 'f',
      regime: 'TREND', probability: 0.5, inputHash: 'h'
    })).toThrow();

    const sig = new Signal({
      signalId: '1', asset: 'BTC', timestamp: 1, direction: 'CALL',
      expirySeconds: 60, modelId: 'm', modelVersion: 'v', featureSetId: 'f',
      regime: 'TREND', probability: 0.5, inputHash: 'h'
    });

    expect(() => { sig.probability = 0.99 }).toThrow();
    expect(() => { sig.direction = 'PUT' }).toThrow();
  });
});
