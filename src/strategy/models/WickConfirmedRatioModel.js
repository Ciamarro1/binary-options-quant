"use strict";

const ModelContract = require('./ModelContract');

class WickConfirmedRatioModel extends ModelContract {
  constructor(intradayLookback = 120, macroLookback = 1440, zThreshold = 2.0, minWickRatio = 0.35, expirySeconds = 900) {
    super();
    this.intradayLookback = intradayLookback;
    this.macroLookback = macroLookback;
    this.zThreshold = zThreshold;
    this.minWickRatio = minWickRatio;
    this.expirySeconds = expirySeconds;

    this.intradayWindow = []; // log(close) of previous bars
    this.macroWindow = [];    // close price of previous bars
  }

  get id() {
    return 'WICK_CONFIRMED_RATIO_MODEL';
  }

  get version() {
    return '1.0.0';
  }

  predict(candle) {
    if (!candle || typeof candle.close !== 'number' || candle.close <= 0 || !isFinite(candle.close) ||
        typeof candle.open !== 'number' || typeof candle.high !== 'number' || typeof candle.low !== 'number') {
      return { direction: 'NO_SIGNAL', zScore: null, reason: 'INVALID_CANDLE' };
    }

    if (this.intradayWindow.length < this.intradayLookback || this.macroWindow.length < this.macroLookback) {
      return { direction: 'NO_SIGNAL', zScore: null, reason: 'INSUFFICIENT_LOOKBACK' };
    }

    const currentPrice = candle.close;
    const currentLogPrice = Math.log(currentPrice);

    // 1. Causal Intraday Z-Score
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

    // 2. Causal Macro Baseline (24h SMA)
    let sumMacro = 0;
    for (let i = 0; i < this.macroWindow.length; i++) {
      sumMacro += this.macroWindow[i];
    }
    const macroMean = sumMacro / this.macroWindow.length;
    const isMacroUptrend = currentPrice > macroMean;
    const isMacroDowntrend = currentPrice < macroMean;

    // 3. Candle Range & Wick Geometry
    const range = candle.high - candle.low;
    if (range <= 1e-10) {
      return { direction: 'NO_SIGNAL', zScore, reason: 'ZERO_CANDLE_RANGE' };
    }

    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    const lowerWickRatio = lowerWick / range;
    const upperWickRatio = upperWick / range;

    // 4. Conditional Signal Logic with Exhaustion Wick Gate
    // CALL: Oversold in macro uptrend + Lower Rejection Wick >= minWickRatio + Bullish Close
    if (zScore <= -this.zThreshold && isMacroUptrend) {
      if (lowerWickRatio >= this.minWickRatio && candle.close >= candle.open) {
        return {
          direction: 'CALL',
          zScore,
          lowerWickRatio,
          macroMean,
          expirySeconds: this.expirySeconds,
          reason: 'WICK_CONFIRMED_OVERSOLD_REBOUND'
        };
      } else {
        return {
          direction: 'NO_SIGNAL',
          zScore,
          lowerWickRatio,
          expirySeconds: this.expirySeconds,
          reason: 'REJECTION_WICK_NOT_CONFIRMED'
        };
      }
    }

    // PUT: Overbought in macro downtrend + Upper Rejection Wick >= minWickRatio + Bearish Close
    if (zScore >= this.zThreshold && isMacroDowntrend) {
      if (upperWickRatio >= this.minWickRatio && candle.close <= candle.open) {
        return {
          direction: 'PUT',
          zScore,
          upperWickRatio,
          macroMean,
          expirySeconds: this.expirySeconds,
          reason: 'WICK_CONFIRMED_OVERBOUGHT_REBOUND'
        };
      } else {
        return {
          direction: 'NO_SIGNAL',
          zScore,
          upperWickRatio,
          expirySeconds: this.expirySeconds,
          reason: 'REJECTION_WICK_NOT_CONFIRMED'
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

module.exports = WickConfirmedRatioModel;
