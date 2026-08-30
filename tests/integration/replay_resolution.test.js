"use strict";
const ReplayEngine = require('../../src/replay/ReplayEngine');
const Dataset = require('../../src/data/Dataset');
const MarketObservation = require('../../src/core/MarketObservation');
const FeatureEngine = require('../../src/strategy/FeatureEngine');
const RegimeEngine = require('../../src/strategy/RegimeEngine');
const SignalEngine = require('../../src/strategy/SignalEngine');
const ModelContract = require('../../src/strategy/models/ModelContract');

describe('Replay Signal Resolution', () => {
  it('strictly resolves signals at expiry without leaking future', () => {
    const signalEngine = new SignalEngine({
      featureEngine: new FeatureEngine('v1', '1.0'),
      regimeEngine: new RegimeEngine()
    });

    class TestModel extends ModelContract {
      get id() { return 'TEST'; }
      get version() { return '1.0'; }
      // Emits a 2-second expiry signal
      predict(f, r) { return { probability: 0.6, direction: 'CALL', expirySeconds: 2 }; }
    }

    const engine = new ReplayEngine({ signalEngine });
    
    // Dataset: t=1000 to t=5000 (1s intervals)
    // t=1000: emits signal expiring at t=3000. resolved at t=3000
    // t=2000: emits signal expiring at t=4000. resolved at t=4000
    // t=3000: emits signal expiring at t=5000. resolved at t=5000
    // t=4000: emits signal expiring at t=6000. UNRESOLVED
    // t=5000: emits signal expiring at t=7000. UNRESOLVED
    
    const obs = [
      new MarketObservation({ asset: 'BTC', timestamp: 1000, open: 1, high: 2, low: 0.1, close: 1.0, volume: 10, timeframe: 'M1' }),
      new MarketObservation({ asset: 'BTC', timestamp: 2000, open: 1, high: 2, low: 0.1, close: 1.2, volume: 10, timeframe: 'M1' }),
      new MarketObservation({ asset: 'BTC', timestamp: 3000, open: 1, high: 2, low: 0.1, close: 1.5, volume: 10, timeframe: 'M1' }),
      new MarketObservation({ asset: 'BTC', timestamp: 4000, open: 1, high: 2, low: 0.1, close: 0.5, volume: 10, timeframe: 'M1' }),
      new MarketObservation({ asset: 'BTC', timestamp: 5000, open: 1, high: 2, low: 0.1, close: 1.5, volume: 10, timeframe: 'M1' })
    ];
    
    const dataset = new Dataset({ datasetId: 'D1', asset: 'BTC', timeframe: 'M1', source: 'X', observations: obs });
    
    const replay = engine.run(dataset, new TestModel(), 0.85);

    expect(replay.signals.length).toBe(4); // t=1 yields NO SIGNAL because RegimeEngine requires >= 2 observations to avoid UNKNOWN
    expect(replay.outcomes.length).toBe(2);
    expect(replay.unresolvedCount).toBe(2);

    // t=2000 (close=1.2) CALL expires at t=4000 (close=0.5). LOSS.
    expect(replay.outcomes[0].entryTimestamp).toBe(2000);
    expect(replay.outcomes[0].expiryTimestamp).toBe(4000);
    expect(replay.outcomes[0].outcome).toBe('LOSS');

    // t=3000 (close=1.5) CALL expires at t=5000 (close=1.5). PUSH.
    expect(replay.outcomes[1].entryTimestamp).toBe(3000);
    expect(replay.outcomes[1].expiryTimestamp).toBe(5000);
    expect(replay.outcomes[1].outcome).toBe('PUSH');
  });
});
