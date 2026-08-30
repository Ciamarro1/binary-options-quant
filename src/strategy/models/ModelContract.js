"use strict";

class ModelContract {
  /**
   * Predicts a signal probability based on feature and regime snapshots.
   * Must return an object containing { probability, direction, expirySeconds }
   * or null if it refuses to predict.
   */
  predict(featureSnapshot, regimeSnapshot) {
    throw new Error('predict() not implemented');
  }

  get id() {
    throw new Error('id not implemented');
  }

  get version() {
    throw new Error('version not implemented');
  }
}

module.exports = ModelContract;
