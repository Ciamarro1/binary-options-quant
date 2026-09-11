"use strict";

const TrendConditionedRatioZScoreModel = require('./TrendConditionedRatioZScoreModel');

class ReversedTrendConditionedModel extends TrendConditionedRatioZScoreModel {
  get id() {
    return 'REVERSED_TREND_CONDITIONED_MODEL';
  }

  get version() {
    return '1.0.0';
  }

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

module.exports = ReversedTrendConditionedModel;
