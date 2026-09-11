"use strict";

const ModelContract = require('./ModelContract');

class TrendConditionedRatioZScoreModel extends ModelContract {
  constructor(intradayLookback = 120, macroLookback = 1440, threshold = 2.0, expirySeconds = 900) {
    super();
    this.intradayLookback = intradayLookback;
    this.macroLookback = macroLookback;
    this.threshold = threshold;
    this.expirySeconds = expirySeconds;

    this.intradayWindow = []; // log(close) of last 120 bars
    this.macroWindow = [];    // close price of last 1440 bars (24h)
  }

  get id() {
    return 'TREND_CONDITIONED_RATIO_ZSCORE_MODEL';
  }

  get version() {
    return '1.0.0';
  }

  predict(candle) {
    if (!candle || typeof candle.close !== 'number' || candle.close <= 0 || !isFinite(candle.close)) {
      return { direction: 'NO_SIGNAL', zScore: null, reason: 'INVALID_CANDLE' };
    }

    if (this.intradayWindow.length < this.intradayLookback || this.macroWindow.length < this.macroLookback) {
      return { direction: 'NO_SIGNAL', zScore: null, reason: 'INSUFFICIENT_LOOKBACK' };
    }

    const currentPrice = candle.close;
    const currentLogPrice = Math.log(currentPrice);

    // 1. Intraday Z-Score calculation
    let sumLog = 0;
    for (let i = 0; i < this.intradayWindow.length; i++) {
      sumLog += this.intradayWindow[i];
    }
    const meanLog = sumLog / this.intradayWindow.length;

    let sumSqDiff = 0;
    for (let i = 0; i < this.intradayWindow.length; i++) {
      const diff = this.intradayWindow[i] - meanLog;
      sumSqDiff += diff * diff;
    }
    const variance = sumSqDiff / (this.intradayWindow.length - 1);
    const stdDev = Math.sqrt(variance);

    if (stdDev <= 1e-12 || !isFinite(stdDev)) {
      return { direction: 'NO_SIGNAL', zScore: null, reason: 'ZERO_OR_INVALID_VARIANCE' };
    }

    const zScore = (currentLogPrice - meanLog) / stdDev;

    // 2. Macro Baseline (SMA 24h)
    let sumMacro = 0;
    for (let i = 0; i < this.macroWindow.length; i++) {
      sumMacro += this.macroWindow[i];
    }
    const macroMean = sumMacro / this.macroWindow.length;
    const isMacroUptrend = currentPrice > macroMean;
    const isMacroDowntrend = currentPrice < macroMean;

    // 3. Conditional Trigger Matrix
    // CALL: Oversold dip in a macro uptrend (dip-buying)
    if (zScore <= -this.threshold) {
      if (isMacroUptrend) {
        return {
          direction: 'CALL',
          zScore,
          expirySeconds: this.expirySeconds,
          macroMean,
          currentPrice,
          reason: 'TREND_ALIGNED_OVERSOLD_BOUNCE'
        };
      } else {
        return {
          direction: 'NO_SIGNAL',
          zScore,
          expirySeconds: this.expirySeconds,
          reason: 'COUNTER_TREND_FILTERED_DOWNTREND_DIP'
        };
      }
    }

    // PUT: Overbought spike in a macro downtrend (rally-fading)
    if (zScore >= this.threshold) {
      if (isMacroDowntrend) {
        return {
          direction: 'PUT',
          zScore,
          expirySeconds: this.expirySeconds,
          macroMean,
          currentPrice,
          reason: 'TREND_ALIGNED_OVERBOUGHT_FADE'
        };
      } else {
        return {
          direction: 'NO_SIGNAL',
          zScore,
          expirySeconds: this.expirySeconds,
          reason: 'COUNTER_TREND_FILTERED_UPTREND_SPIKE'
        };
      }
    }

    return {
      direction: 'NO_SIGNAL',
      zScore,
      expirySeconds: this.expirySeconds,
      reason: 'WITHIN_NORMAL_BOUNDS'
    };
  }

  update(candle) {
    if (!candle || typeof candle.close !== 'number' || candle.close <= 0) return;
    this.intradayWindow.push(Math.log(candle.close));
    if (this.intradayWindow.length > this.intradayLookback) {
      this.intradayWindow.shift();
    }

    this.macroWindow.push(candle.close);
    if (this.macroWindow.length > this.macroLookback) {
      this.macroWindow.shift();
    }
  }

  reset() {
    this.intradayWindow = [];
    this.macroWindow = [];
  }
}

module.exports = TrendConditionedRatioZScoreModel;
