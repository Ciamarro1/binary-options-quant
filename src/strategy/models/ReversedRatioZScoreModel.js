"use strict";

const RatioZScoreModel = require('./RatioZScoreModel');

class ReversedRatioZScoreModel extends RatioZScoreModel {
  get id() {
    return 'REVERSED_RATIO_ZSCORE_MODEL';
  }

  get version() {
    return '1.0.0';
  }

  /**
   * Negative Directional Control: Inverts signal direction.
   */
  predict(candle) {
    const parentPrediction = super.predict(candle);
    if (parentPrediction.direction === 'CALL') {
      return { ...parentPrediction, direction: 'PUT', control: 'NEGATIVE_REVERSED' };
    }
    if (parentPrediction.direction === 'PUT') {
      return { ...parentPrediction, direction: 'CALL', control: 'NEGATIVE_REVERSED' };
    }
    return parentPrediction;
  }
}

module.exports = ReversedRatioZScoreModel;
