"use strict";
const crypto = require('crypto');

class ReplayEngine {
  constructor({ signalEngine }) {
    if (!signalEngine) throw new Error('SignalEngine required');
    this.signalEngine = signalEngine;
  }

  /**
   * Deterministically replays the dataset, producing signals without future leakage.
   */
  run(dataset, model) {
    if (!dataset || !dataset.observations) throw new Error('Valid dataset required');
    if (!model) throw new Error('Model required');

    const signals = [];
    const history = [];

    for (const obs of dataset.observations) {
      // 1. Reveal current observation to history
      history.push(obs);

      // 2. Generate signal at exactly timestamp t (model only sees up to t)
      const signal = this.signalEngine.generateSignal(
        dataset.metadata.asset, 
        obs.timestamp, 
        history, 
        model
      );
      
      if (signal) {
        signals.push(signal);
      }
    }

    // 3. Compute deterministic replay hash
    const hashPayload = signals.map(s => s.inputHash).join('|');
    const replayHash = crypto.createHash('sha256')
      .update(dataset.metadata.contentHash + model.id + model.version + hashPayload)
      .digest('hex');

    return {
      signals: Object.freeze(signals),
      replayHash,
      datasetMetadata: dataset.metadata
    };
  }
}
module.exports = ReplayEngine;
