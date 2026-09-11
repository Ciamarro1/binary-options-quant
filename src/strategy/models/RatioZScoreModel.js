"use strict";

const ModelContract = require('./ModelContract');

class RatioZScoreModel extends ModelContract {
  constructor(lookback = 120, threshold = 2.0, expirySeconds = 900) {
    super();
    this.lookback = lookback;
    this.threshold = threshold;
    this.expirySeconds = expirySeconds;
    this.window = []; // contains log-close of previous closed candles: [y_{t-L} ... y_{t-1}]
  }

  get id() {
    return 'RATIO_ZSCORE_MODEL';
  }

  get version() {
    return '1.0.0';
  }

  /**
   * Evaluates signal strictly causally BEFORE candle is ingested into the historical window.
   * @param {Object} candle - Current closed candle { timestamp, open, high, low, close, volume }
   * @returns {Object} { direction, zScore, probability, expirySeconds }
   */
  predict(candle) {
    if (!candle || typeof candle.close !== 'number' || candle.close <= 0 || !isFinite(candle.close)) {
      return { direction: 'NO_SIGNAL', zScore: null, reason: 'INVALID_CANDLE' };
    }

    if (this.window.length < this.lookback) {
      return { direction: 'NO_SIGNAL', zScore: null, reason: 'INSUFFICIENT_LOOKBACK' };
    }

    const currentLogPrice = Math.log(candle.close);

    // Compute mean
    let sum = 0;
    for (let i = 0; i < this.window.length; i++) {
      sum += this.window[i];
    }
    const mean = sum / this.window.length;

    // Compute sample variance (Bessel's correction: N - 1)
    let sumSqDiff = 0;
    for (let i = 0; i < this.window.length; i++) {
      const diff = this.window[i] - mean;
      sumSqDiff += diff * diff;
    }
    const variance = sumSqDiff / (this.window.length - 1);
    const stdDev = Math.sqrt(variance);

    if (stdDev <= 1e-12 || !isFinite(stdDev)) {
      return { direction: 'NO_SIGNAL', zScore: null, reason: 'ZERO_OR_INVALID_VARIANCE' };
    }

    const zScore = (currentLogPrice - mean) / stdDev;

    if (zScore <= -this.threshold) {
      return {
        direction: 'CALL',
        zScore,
        expirySeconds: this.expirySeconds,
        mean,
        stdDev,
        reason: 'OVERSOLD_THRESHOLD_BREACH'
      };
    }

    if (zScore >= this.threshold) {
      return {
        direction: 'PUT',
        zScore,
        expirySeconds: this.expirySeconds,
        mean,
        stdDev,
        reason: 'OVERBOUGHT_THRESHOLD_BREACH'
      };
    }

    return {
      direction: 'NO_SIGNAL',
      zScore,
      expirySeconds: this.expirySeconds,
      reason: 'WITHIN_NORMAL_BOUNDS'
    };
  }

  /**
   * Updates historical window with closed candle. Strictly called AFTER predict(candle).
   * @param {Object} candle 
   */
  update(candle) {
    if (!candle || typeof candle.close !== 'number' || candle.close <= 0) return;
    this.window.push(Math.log(candle.close));
    if (this.window.length > this.lookback) {
      this.window.shift();
    }
  }

  reset() {
    this.window = [];
  }
}

module.exports = RatioZScoreModel;
