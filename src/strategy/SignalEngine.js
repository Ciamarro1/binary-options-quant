"use strict";

const Signal = require('../core/Signal');
const crypto = require('crypto');

class SignalEngine {
  constructor({ featureEngine, regimeEngine }) {
    if (!featureEngine) throw new Error('FeatureEngine required');
    if (!regimeEngine) throw new Error('RegimeEngine required');
    
    this.featureEngine = featureEngine;
    this.regimeEngine = regimeEngine;
  }

  generateSignal(asset, targetTimestamp, marketObservations, model) {
    if (!model) throw new Error('Model required');
    if (typeof model.predict !== 'function') throw new Error('Invalid model contract');

    const featureSnapshot = this.featureEngine.extractFeatures(asset, targetTimestamp, marketObservations);
    const regimeSnapshot = this.regimeEngine.classifyRegime(asset, targetTimestamp, marketObservations);

    if (regimeSnapshot.regime === 'UNKNOWN') {
      // "Se o sistema não consegue classificar o regime: UNKNOWN -> não operar"
      return null;
    }

    const prediction = model.predict(featureSnapshot, regimeSnapshot);
    
    if (!prediction) {
      return null;
    }

    const inputHash = crypto.createHash('sha256')
      .update(featureSnapshot.inputHash + regimeSnapshot.regime)
      .digest('hex');

    const signalId = crypto.randomUUID();

    return new Signal({
      signalId,
      asset,
      timestamp: targetTimestamp,
      direction: prediction.direction,
      expirySeconds: prediction.expirySeconds,
      modelId: model.id,
      modelVersion: model.version,
      featureSetId: featureSnapshot.featureSetId,
      regime: regimeSnapshot.regime,
      probability: prediction.probability,
      inputHash
    });
  }
}

module.exports = SignalEngine;
