"use strict";
const crypto = require('crypto');
const TargetEngine = require('../research/TargetEngine');

class ReplayEngine {
  constructor({ signalEngine }) {
    if (!signalEngine) throw new Error('SignalEngine required');
    this.signalEngine = signalEngine;
  }

  /**
   * Deterministically replays the dataset chronologically.
   * Emits signals at t, and resolves outcomes precisely when obs.timestamp >= t + expiry.
   */
  run(dataset, model, payout = 0.85) {
    if (!dataset || !dataset.observations) throw new Error('Valid dataset required');
    if (!model) throw new Error('Model required');

    const signals = [];
    const outcomes = [];
    const history = [];
    const pendingSignals = [];

    for (const obs of dataset.observations) {
      history.push(obs);

      // 1. Resolve pending outcomes FIRST (avoids looking into the future by resolving exactly at target time)
      for (let i = pendingSignals.length - 1; i >= 0; i--) {
        const pending = pendingSignals[i];
        if (obs.timestamp >= pending.signal.timestamp + pending.signal.expirySeconds) {
          const outcome = TargetEngine.resolve(pending.signal, pending.entryObs, obs, payout);
          outcomes.push(outcome);
          pendingSignals.splice(i, 1);
        }
      }

      // 2. Generate signal at exactly timestamp t
      const signal = this.signalEngine.generateSignal(
        dataset.metadata.asset, 
        obs.timestamp, 
        history, 
        model
      );
      
      if (signal) {
        signals.push(signal);
        pendingSignals.push({ signal, entryObs: obs });
      }
    }

    const hashPayload = signals.map(s => s.inputHash).join('|');
    const replayHash = crypto.createHash('sha256')
      .update(dataset.metadata.contentHash + model.id + model.version + hashPayload)
      .digest('hex');

    return {
      signals: Object.freeze(signals),
      outcomes: Object.freeze(outcomes),
      unresolvedCount: pendingSignals.length,
      replayHash,
      datasetMetadata: dataset.metadata
    };
  }
}
module.exports = ReplayEngine;
