"use strict";

const ModelContract = require('./ModelContract');

class ExhaustionModel extends ModelContract {
  constructor(probCall = null, probPut = null, options = {}) {
    super();
    this.probCall = probCall;
    this.probPut = probPut;
    this.bodyThreshold = options.bodyThreshold !== undefined ? options.bodyThreshold : 2.0;
    this.upperCloseLocation = options.upperCloseLocation !== undefined ? options.upperCloseLocation : 0.90;
    this.lowerCloseLocation = options.lowerCloseLocation !== undefined ? options.lowerCloseLocation : 0.10;
    this.volumeThreshold = options.volumeThreshold !== undefined ? options.volumeThreshold : 2.0;
    this.expirySeconds = options.expirySeconds !== undefined ? options.expirySeconds : 180; // 3 candles
    this.minTrainSamples = options.minTrainSamples !== undefined ? options.minTrainSamples : 30;

    Object.freeze(this); // Model instance is strictly immutable after construction
  }

  get id() {
    return 'EXHAUSTION_MODEL';
  }

  get version() {
    return '1.0.0';
  }

  /**
   * Fits conditional probability strictly on In-Sample observations.
   * Estimates P(WIN | resolved, non-PUSH) separately for CALL and PUT.
   * If N_dir < 30 in Train -> prob = null -> NO SIGNAL.
   */
  static fit(historicalObservations, options = {}) {
    const expiryCandles = typeof options.expiryCandles === 'number' ? options.expiryCandles : 3;
    const expirySeconds = expiryCandles * 60; // 180s
    const bodyThreshold = options.bodyThreshold !== undefined ? options.bodyThreshold : 2.0;
    const upperCloseLocation = options.upperCloseLocation !== undefined ? options.upperCloseLocation : 0.90;
    const lowerCloseLocation = options.lowerCloseLocation !== undefined ? options.lowerCloseLocation : 0.10;
    const volumeThreshold = options.volumeThreshold !== undefined ? options.volumeThreshold : 2.0;
    const minTrainSamples = options.minTrainSamples !== undefined ? options.minTrainSamples : 30;

    if (!Array.isArray(historicalObservations) || historicalObservations.length < 21 + expiryCandles) {
      return new ExhaustionModel(null, null, {
        expirySeconds,
        bodyThreshold,
        upperCloseLocation,
        lowerCloseLocation,
        volumeThreshold,
        minTrainSamples
      });
    }

    const FeatureEngine = require('../FeatureEngine');
    const fe = new FeatureEngine('exhaustion_fit', '1.0');

    let callWins = 0, callLosses = 0;
    let putWins = 0, putLosses = 0;

    const N = historicalObservations.length;
    for (let i = 20; i < N - expiryCandles; i++) {
      const obsSlice = historicalObservations.slice(0, i + 1);
      const targetTs = historicalObservations[i].timestamp;
      const snapshot = fe.extractFeatures(historicalObservations[i].asset || 'BTCUSDT', targetTs, obsSlice);
      const f = snapshot.features || snapshot.values;

      if (!f || !f.hasData || f.bodyRatio === null || f.closeLocation === null || f.volumeRatio === null) {
        continue;
      }

      const entryClose = historicalObservations[i].close;
      const expiryClose = historicalObservations[i + expiryCandles].close;

      if (expiryClose === entryClose) continue; // PUSH excluded

      // EXHAUSTION-UP -> PUT (close_t > open_t)
      if (f.close > f.open && f.bodyRatio >= bodyThreshold && f.closeLocation >= upperCloseLocation && f.volumeRatio >= volumeThreshold) {
        if (expiryClose < entryClose) {
          putWins++;
        } else {
          putLosses++;
        }
      }

      // EXHAUSTION-DOWN -> CALL (close_t < open_t)
      if (f.close < f.open && f.bodyRatio >= bodyThreshold && f.closeLocation <= lowerCloseLocation && f.volumeRatio >= volumeThreshold) {
        if (expiryClose > entryClose) {
          callWins++;
        } else {
          callLosses++;
        }
      }
    }

    const totalCallResolved = callWins + callLosses;
    const totalPutResolved = putWins + putLosses;

    const probCall = totalCallResolved >= minTrainSamples ? callWins / totalCallResolved : null;
    const probPut = totalPutResolved >= minTrainSamples ? putWins / totalPutResolved : null;

    return new ExhaustionModel(probCall, probPut, {
      expirySeconds,
      bodyThreshold,
      upperCloseLocation,
      lowerCloseLocation,
      volumeThreshold,
      minTrainSamples
    });
  }

  predict(featureSnapshot, regimeSnapshot) {
    if (!featureSnapshot) return null;
    const f = featureSnapshot.features || featureSnapshot.values;
    if (!f) return null;

    if (!f.hasData || f.bodyRatio === null || f.closeLocation === null || f.volumeRatio === null) {
      return null;
    }

    // EXHAUSTION-UP -> PUT
    if (f.close > f.open && f.bodyRatio >= this.bodyThreshold && f.closeLocation >= this.upperCloseLocation && f.volumeRatio >= this.volumeThreshold) {
      if (this.probPut === null) return null; // Fail-closed: insufficient train samples
      return {
        probability: this.probPut,
        direction: 'PUT',
        expirySeconds: this.expirySeconds
      };
    }

    // EXHAUSTION-DOWN -> CALL
    if (f.close < f.open && f.bodyRatio >= this.bodyThreshold && f.closeLocation <= this.lowerCloseLocation && f.volumeRatio >= this.volumeThreshold) {
      if (this.probCall === null) return null; // Fail-closed: insufficient train samples
      return {
        probability: this.probCall,
        direction: 'CALL',
        expirySeconds: this.expirySeconds
      };
    }

    return null; // NO SIGNAL
  }
}

module.exports = ExhaustionModel;
