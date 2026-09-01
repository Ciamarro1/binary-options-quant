"use strict";
const ModelContract = require('../strategy/models/ModelContract');

class BaselineModel extends ModelContract {
  constructor(callFrequency = 0.5, expirySeconds = 60) {
    super();
    this.callFrequency = callFrequency;
    this.expirySeconds = expirySeconds;
    Object.freeze(this); // The model instance is strictly immutable after fit
  }

  get id() {
    return 'BASELINE_NAIVE';
  }

  get version() {
    return '1.0.1';
  }

  /**
   * Fits the naive model strictly on market observations.
   * Returns a NEW fitted model instance to prevent mutation.
   */
  static fit(historicalObservations, options = {}) {
    const expirySeconds = typeof options === 'object' && options.expirySeconds ? options.expirySeconds : 60;

    if (!Array.isArray(historicalObservations) || historicalObservations.length < 2) {
      return new BaselineModel(0.5, expirySeconds);
    }
    
    let ups = 0;
    let valid = 0;
    for (let i = 1; i < historicalObservations.length; i++) {
      const prev = historicalObservations[i-1];
      const curr = historicalObservations[i];
      if (curr.close > prev.close) ups++;
      if (curr.close !== prev.close) valid++;
    }
    
    const freq = valid > 0 ? ups / valid : 0.5;
    return new BaselineModel(freq, expirySeconds);
  }

  predict(featureSnapshot, regimeSnapshot) {
    const probCall = this.callFrequency;
    
    if (probCall > 0.5) {
      return { probability: probCall, direction: 'CALL', expirySeconds: this.expirySeconds };
    } else {
      return { probability: 1 - probCall, direction: 'PUT', expirySeconds: this.expirySeconds };
    }
  }
}
module.exports = BaselineModel;
