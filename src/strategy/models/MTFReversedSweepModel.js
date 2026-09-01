"use strict";

const MTFSetupDetector = require('./MTFSetupDetector');

class MTFReversedSweepModel {
  constructor(id = 'MTF_REVERSED_SWEEP_v1', version = '1.0.1') {
    this.id = id;
    this.version = version;
    this.probCall = null;
    this.probPut = null;
  }

  setProbabilities(probCall, probPut) {
    this.probCall = probCall;
    this.probPut = probPut;
  }

  predict(featureSnapshot, regimeSnapshot) {
    const { setupUp, setupDown } = MTFSetupDetector.detect(featureSnapshot.features);

    // Reversed Setup 1: MTF SWEEP-UP -> CALL (Long instead of Short)
    if (setupUp) {
      if (this.probCall === null) return null;
      return {
        direction: 'CALL',
        expirySeconds: 180,
        probability: this.probCall
      };
    }

    // Reversed Setup 2: MTF SWEEP-DOWN -> PUT (Short instead of Long)
    if (setupDown) {
      if (this.probPut === null) return null;
      return {
        direction: 'PUT',
        expirySeconds: 180,
        probability: this.probPut
      };
    }

    return null;
  }
}

module.exports = MTFReversedSweepModel;
