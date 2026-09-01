"use strict";

const ModelContract = require('./ModelContract');

/**
 * Negative Control Model for HYPOTHESIS_002
 * Inverts directional prediction on identical triggers:
 *   EXHAUSTION-UP   -> CALL (Negative Control)
 *   EXHAUSTION-DOWN -> PUT  (Negative Control)
 */
class ReversedExhaustionModel extends ModelContract {
  constructor(probCall = 0.50, probPut = 0.50, options = {}) {
    super();
    this.probCall = probCall;
    this.probPut = probPut;
    this.bodyThreshold = options.bodyThreshold !== undefined ? options.bodyThreshold : 2.0;
    this.upperCloseLocation = options.upperCloseLocation !== undefined ? options.upperCloseLocation : 0.90;
    this.lowerCloseLocation = options.lowerCloseLocation !== undefined ? options.lowerCloseLocation : 0.10;
    this.volumeThreshold = options.volumeThreshold !== undefined ? options.volumeThreshold : 2.0;
    this.expirySeconds = options.expirySeconds !== undefined ? options.expirySeconds : 180;
    this.minTrainSamples = options.minTrainSamples !== undefined ? options.minTrainSamples : 30;

    Object.freeze(this);
  }

  get id() {
    return 'REVERSED_EXHAUSTION_CONTROL';
  }

  get version() {
    return '1.0.0';
  }

  predict(featureSnapshot, regimeSnapshot) {
    if (!featureSnapshot) return null;
    const f = featureSnapshot.features || featureSnapshot.values;
    if (!f) return null;

    if (!f.hasData || f.bodyRatio === null || f.closeLocation === null || f.volumeRatio === null) {
      return null;
    }

    // INVERTED DIRECTION:
    // EXHAUSTION-UP (close > open) -> CALL (instead of PUT)
    if (f.close > f.open && f.bodyRatio >= this.bodyThreshold && f.closeLocation >= this.upperCloseLocation && f.volumeRatio >= this.volumeThreshold) {
      if (this.probCall === null) return null;
      return {
        probability: this.probCall,
        direction: 'CALL',
        expirySeconds: this.expirySeconds
      };
    }

    // EXHAUSTION-DOWN (close < open) -> PUT (instead of CALL)
    if (f.close < f.open && f.bodyRatio >= this.bodyThreshold && f.closeLocation <= this.lowerCloseLocation && f.volumeRatio >= this.volumeThreshold) {
      if (this.probPut === null) return null;
      return {
        probability: this.probPut,
        direction: 'PUT',
        expirySeconds: this.expirySeconds
      };
    }

    return null;
  }
}

module.exports = ReversedExhaustionModel;
