"use strict";

const MTFSetupDetector = require('./MTFSetupDetector');

class MTFSweepModel {
  constructor(id = 'MTF_SWEEP_v1', version = '1.0.1') {
    this.id = id;
    this.version = version;
    // Probabilities are injected during walk-forward training.
    // Must be null if N_train < 30 per direction to enforce fail-closed.
    this.probCall = null;
    this.probPut = null;
  }

  setProbabilities(probCall, probPut) {
    this.probCall = probCall;
    this.probPut = probPut;
  }

  predict(featureSnapshot, regimeSnapshot) {
    const { setupUp, setupDown } = MTFSetupDetector.detect(featureSnapshot.features);

    // Setup 1: MTF SWEEP-UP -> PUT (Short)
    if (setupUp) {
      if (this.probPut === null) return null;
      return {
        direction: 'PUT',
        expirySeconds: 180,
        probability: this.probPut
      };
    }

    // Setup 2: MTF SWEEP-DOWN -> CALL (Long)
    if (setupDown) {
      if (this.probCall === null) return null;
      return {
        direction: 'CALL',
        expirySeconds: 180,
        probability: this.probCall
      };
    }

    return null;
  }
}

module.exports = MTFSweepModel;
