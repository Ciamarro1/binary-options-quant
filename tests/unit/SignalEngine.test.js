"use strict";
const SignalEngine = require('../../src/strategy/SignalEngine');
const FeatureEngine = require('../../src/strategy/FeatureEngine');
const RegimeEngine = require('../../src/strategy/RegimeEngine');
const MarketObservation = require('../../src/core/MarketObservation');

describe('SignalEngine', () => {
  it('generates a signal', () => {
    const sEngine = new SignalEngine({ 
      featureEngine: new FeatureEngine('v1', '1.0'), 
      regimeEngine: new RegimeEngine() 
    });
    
    const obs = [
      new MarketObservation({ asset: 'BTC', timestamp: 1, open: 1, high: 2, low: 0, close: 1, volume: 1, timeframe: 'M1' }),
      new MarketObservation({ asset: 'BTC', timestamp: 2, open: 1, high: 2, low: 0, close: 1.5, volume: 1, timeframe: 'M1' })
    ];

    const mockModel = {
      id: 'm1', version: 'v1',
      predict: () => ({ probability: 0.8, direction: 'PUT', expirySeconds: 300 })
    };

    const signal = sEngine.generateSignal('BTC', 2, obs, mockModel);
    expect(signal.probability).toBe(0.8);
    expect(signal.direction).toBe('PUT');
    expect(signal.expirySeconds).toBe(300);
    expect(signal.asset).toBe('BTC');
  });
});
