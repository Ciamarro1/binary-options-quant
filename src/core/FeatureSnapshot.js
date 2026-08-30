"use strict";

function deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      deepFreeze(value);
    }
  }
  return Object.freeze(object);
}

class FeatureSnapshot {
  constructor({ asset, timestamp, features, featureSetId, featureSetVersion, inputHash }) {
    if (!asset || typeof asset !== 'string') throw new Error('Invalid asset');
    if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) throw new Error('Invalid timestamp');
    if (!features || typeof features !== 'object') throw new Error('Invalid features');
    if (!featureSetId || typeof featureSetId !== 'string') throw new Error('Invalid featureSetId');
    if (!featureSetVersion || typeof featureSetVersion !== 'string') throw new Error('Invalid featureSetVersion');
    if (!inputHash || typeof inputHash !== 'string') throw new Error('Invalid inputHash');

    this.asset = asset;
    this.timestamp = timestamp;
    this.features = { ...features };
    this.featureSetId = featureSetId;
    this.featureSetVersion = featureSetVersion;
    this.inputHash = inputHash;

    deepFreeze(this);
  }
}

module.exports = FeatureSnapshot;
