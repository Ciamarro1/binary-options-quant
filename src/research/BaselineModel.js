"use strict";
const ModelContract = require('../strategy/models/ModelContract');

class BaselineModel extends ModelContract {
  constructor(callFrequency = 0.5) {
    super();
    this.callFrequency = callFrequency;
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
  static fit(historicalObservations) {
    if (!Array.isArray(historicalObservations) || historicalObservations.length < 2) {
      return new BaselineModel(0.5);
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
    return new BaselineModel(freq);
  }

  predict(featureSnapshot, regimeSnapshot) {
    const probCall = this.callFrequency;
    
    if (probCall > 0.5) {
      return { probability: probCall, direction: 'CALL', expirySeconds: 60 };
    } else {
      return { probability: 1 - probCall, direction: 'PUT', expirySeconds: 60 };
    }
  }
}
module.exports = BaselineModel;
