"use strict";
const ReplayEngine = require('../../src/replay/ReplayEngine');
const Dataset = require('../../src/data/Dataset');
const MarketObservation = require('../../src/core/MarketObservation');
const FeatureEngine = require('../../src/strategy/FeatureEngine');
const RegimeEngine = require('../../src/strategy/RegimeEngine');
const SignalEngine = require('../../src/strategy/SignalEngine');
const ModelContract = require('../../src/strategy/models/ModelContract');

describe('Replay Determinism & Future Injection (Adversarial)', () => {
  let signalEngine;
  let mockModel;

  beforeEach(() => {
    signalEngine = new SignalEngine({
      featureEngine: new FeatureEngine('v1', '1.0'),
      regimeEngine: new RegimeEngine()
    });
    
    class TestModel extends ModelContract {
      get id() { return 'TEST'; }
      get version() { return '1.0'; }
      predict(f, r) { return { probability: 0.6, direction: 'CALL', expirySeconds: 60 }; }
    }
    mockModel = new TestModel();
  });

  const createDataset = (n) => {
    const obs = [];
    for (let i = 1; i <= n; i++) {
      obs.push(new MarketObservation({ asset: 'BTC', timestamp: i, open: 1, high: 2, low: 1, close: 1.5, volume: 10, timeframe: 'M1' }));
    }
    return new Dataset({ datasetId: 'D1', asset: 'BTC', timeframe: 'M1', source: 'X', observations: obs });
  };

  it('determines exactly the same signals for two identical replays', () => {
    const engine = new ReplayEngine({ signalEngine });
    const dataset = createDataset(5); // 5 candles

    const replay1 = engine.run(dataset, mockModel);
    const replay2 = engine.run(dataset, mockModel);

    expect(replay1.signals.length).toBe(replay2.signals.length);
    expect(replay1.replayHash).toBe(replay2.replayHash);
  });

  it('FUTURE INJECTION TEST: adding future data does not alter history', () => {
    const engine = new ReplayEngine({ signalEngine });
    
    const datasetOriginal = createDataset(3);
    const replayOriginal = engine.run(datasetOriginal, mockModel);

    const datasetFuture = createDataset(5); // candles 1 to 5
    const replayFuture = engine.run(datasetFuture, mockModel);

    // The signals generated at t=1, t=2, t=3 MUST be identical in both replays
    for (let i = 0; i < replayOriginal.signals.length; i++) {
      expect(replayOriginal.signals[i].inputHash).toBe(replayFuture.signals[i].inputHash);
      expect(replayOriginal.signals[i].probability).toBe(replayFuture.signals[i].probability);
    }
  });

  it('HISTORICAL INVARIANCE TEST: completely different futures must not alter historical signals', () => {
    const engine = new ReplayEngine({ signalEngine });
    
    // Base data up to t=3
    const baseObs = [];
    for (let i = 1; i <= 3; i++) {
      baseObs.push(new MarketObservation({ asset: 'BTC', timestamp: i, open: 1, high: 2, low: 1, close: 1.5, volume: 10, timeframe: 'M1' }));
    }

    // Run A: Future goes up
    const futureA = [
      new MarketObservation({ asset: 'BTC', timestamp: 4, open: 1.5, high: 2.5, low: 1.5, close: 2.0, volume: 10, timeframe: 'M1' })
    ];
    const datasetA = new Dataset({ datasetId: 'DA', asset: 'BTC', timeframe: 'M1', source: 'X', observations: [...baseObs, ...futureA] });
    
    // Run B: Future goes down wildly
    const futureB = [
      new MarketObservation({ asset: 'BTC', timestamp: 4, open: 1.5, high: 3, low: 0.1, close: 0.2, volume: 999, timeframe: 'M1' }),
      new MarketObservation({ asset: 'BTC', timestamp: 5, open: 0.2, high: 1, low: 0.1, close: 0.5, volume: 50, timeframe: 'M1' })
    ];
    const datasetB = new Dataset({ datasetId: 'DB', asset: 'BTC', timeframe: 'M1', source: 'X', observations: [...baseObs, ...futureB] });

    const replayA = engine.run(datasetA, mockModel);
    const replayB = engine.run(datasetB, mockModel);

    // Signals up to t=3 MUST be identical
    for (let i = 0; i < 3; i++) {
      expect(replayA.signals[i].inputHash).toBe(replayB.signals[i].inputHash);
      expect(replayA.signals[i].probability).toBe(replayB.signals[i].probability);
    }
  });
});
