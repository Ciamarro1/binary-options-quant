"use strict";

class Signal {
  constructor({
    signalId, asset, timestamp, direction, expirySeconds,
    modelId, modelVersion, featureSetId, regime, probability, inputHash
  }) {
    if (!signalId || typeof signalId !== 'string') throw new Error('Invalid signalId');
    if (!asset || typeof asset !== 'string') throw new Error('Invalid asset');
    if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) throw new Error('Invalid timestamp');
    if (direction !== 'CALL' && direction !== 'PUT') throw new Error('Invalid direction');
    if (typeof expirySeconds !== 'number' || expirySeconds <= 0) throw new Error('Invalid expirySeconds');
    if (!modelId || typeof modelId !== 'string') throw new Error('Invalid modelId');
    if (!modelVersion || typeof modelVersion !== 'string') throw new Error('Invalid modelVersion');
    if (!featureSetId || typeof featureSetId !== 'string') throw new Error('Invalid featureSetId');
    if (!regime || typeof regime !== 'string') throw new Error('Invalid regime');
    if (typeof probability !== 'number' || probability < 0 || probability > 1) throw new Error('Invalid probability');
    if (!inputHash || typeof inputHash !== 'string') throw new Error('Invalid inputHash');

    this.signalId = signalId;
    this.asset = asset;
    this.timestamp = timestamp;
    this.direction = direction;
    this.expirySeconds = expirySeconds;
    this.modelId = modelId;
    this.modelVersion = modelVersion;
    this.featureSetId = featureSetId;
    this.regime = regime;
    this.probability = probability;
    this.inputHash = inputHash;

    Object.freeze(this);
  }
}

module.exports = Signal;
