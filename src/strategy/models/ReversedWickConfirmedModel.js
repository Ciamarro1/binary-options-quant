"use strict";

const WickConfirmedRatioModel = require('./WickConfirmedRatioModel');

class ReversedWickConfirmedModel extends WickConfirmedRatioModel {
  get id() {
    return 'REVERSED_WICK_CONFIRMED_MODEL';
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

module.exports = ReversedWickConfirmedModel;
