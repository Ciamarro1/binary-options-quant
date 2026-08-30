"use strict";

const ReplayEngine = require('../../src/replay/ReplayEngine');

describe('ReplayEngine Temporal Resolution', () => {
  it('should strictly resolve signals at exactly t + expiryMs and not earlier', () => {
    // We create a fake SignalEngine that just emits a CALL for the very first observation, and then null.
    class FakeSignalEngine {
      generateSignal(asset, timestamp, history, model) {
        if (history.length === 1) {
          return {
            signalId: 'sig1',
            timestamp,
            direction: 'CALL',
            expirySeconds: 60,
            probability: 0.55,
            inputHash: 'hash123'
          };
        }
        return null;
      }
    }

    const replayEngine = new ReplayEngine({ signalEngine: new FakeSignalEngine() });

    // We will supply observations at different timestamps.
    // Entry at 12:00:00 (1000000)
    // 12:00:01 (1000000 + 1000) -> unresolved
    // 12:00:30 (1000000 + 30000) -> unresolved
    // 12:00:59 (1000000 + 59000) -> unresolved
    // 12:01:00 (1000000 + 60000) -> resolved!
    const entryTime = 1000000;
    
    const obsList = [
      { timestamp: entryTime, close: 100 },
      { timestamp: entryTime + 1000, close: 101 },
      { timestamp: entryTime + 30000, close: 102 },
      { timestamp: entryTime + 59000, close: 103 },
      { timestamp: entryTime + 60000, close: 105 }, // Here it should resolve
      { timestamp: entryTime + 61000, close: 106 }
    ];

    const dataset = {
      observations: obsList,
      metadata: { asset: 'BTCUSDT', contentHash: 'testhash' }
    };

    const model = { id: 'dummy', version: '1' };

    const result = replayEngine.run(dataset, model, 0.8);

    expect(result.signals.length).toBe(1);
    expect(result.outcomes.length).toBe(1);
    expect(result.unresolvedCount).toBe(0);

    // The outcome should have been resolved at the 12:01:00 mark, 
    // where the close price was 105.
    // Entry was 100, direction CALL.
    const outcome = result.outcomes[0];
    expect(outcome.outcome).toBe('WIN');
    expect(outcome.expiryPrice).toBe(105);
    expect(outcome.expiryTimestamp).toBe(entryTime + 60000);
  });
});
