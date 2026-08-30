"use strict";

const crypto = require('crypto');
const FeatureSnapshot = require('../core/FeatureSnapshot');

class FeatureEngine {
  constructor(featureSetId, featureSetVersion) {
    this.featureSetId = featureSetId;
    this.featureSetVersion = featureSetVersion;
  }

  /**
   * Extract features strictly up to targetTimestamp.
   * Enforces CAUSALITY: throws if any observation is > targetTimestamp.
   */
  extractFeatures(asset, targetTimestamp, marketObservations) {
    // Validate causality
    for (const obs of marketObservations) {
      if (obs.timestamp > targetTimestamp) {
        throw new Error('Causality violation: Observation timestamp > targetTimestamp');
      }
    }

    // In a real V1, we would compute something here.
    // For now, we return a deterministic, purely causal baseline.
    const lastObs = marketObservations.length > 0 ? marketObservations[marketObservations.length - 1] : null;

    const features = {
      hasData: lastObs !== null,
      lastClose: lastObs ? lastObs.close : null,
      obsCount: marketObservations.length
    };

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ asset, targetTimestamp, obsCount: marketObservations.length }))
      .digest('hex');

    return new FeatureSnapshot({
      asset,
      timestamp: targetTimestamp,
      features,
      featureSetId: this.featureSetId,
      featureSetVersion: this.featureSetVersion,
      inputHash: hash
    });
  }
}

module.exports = FeatureEngine;
