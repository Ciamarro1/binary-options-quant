"use strict";

const ModelContract = require('../strategy/models/ModelContract');

class BaselineModel extends ModelContract {
  constructor() {
    super();
    this.callFrequency = 0.5; // Naive 50/50 prior
  }

  get id() {
    return 'BASELINE_NAIVE';
  }

  get version() {
    return '1.0.0';
  }

  /**
   * Fit the naive model on historical data.
   */
  fit(historicalOutcomes) {
    if (!Array.isArray(historicalOutcomes) || historicalOutcomes.length === 0) {
      this.callFrequency = 0.5;
      return;
    }
    
    let callWins = 0;
    let validOutcomes = 0;
    for (const outcome of historicalOutcomes) {
      if (outcome.outcome !== 'INVALID' && outcome.outcome !== 'PUSH') {
        validOutcomes++;
        // If it was a CALL and it won, or PUT and it lost -> it means the market went up
        const up = (outcome.direction === 'CALL' && outcome.outcome === 'WIN') ||
                   (outcome.direction === 'PUT' && outcome.outcome === 'LOSS');
        if (up) callWins++;
      }
    }
    if (validOutcomes > 0) {
      this.callFrequency = callWins / validOutcomes;
    }
  }

  predict(featureSnapshot, regimeSnapshot) {
    // Naive model uses only frequency
    const probCall = this.callFrequency;
    
    if (probCall > 0.5) {
      return { probability: probCall, direction: 'CALL', expirySeconds: 60 };
    } else {
      return { probability: 1 - probCall, direction: 'PUT', expirySeconds: 60 };
    }
  }
}

module.exports = BaselineModel;
