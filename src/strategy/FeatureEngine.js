"use strict";

const crypto = require('crypto');
const FeatureSnapshot = require('../core/FeatureSnapshot');

class FeatureEngine {
  constructor(featureSetId = 'v1', featureSetVersion = '1.0') {
    this.featureSetId = featureSetId;
    this.featureSetVersion = featureSetVersion;
  }

  extractFeatures(asset, targetTimestamp, marketObservations) {
    if (!Array.isArray(marketObservations) || marketObservations.length === 0) {
      const emptyHash = crypto.createHash('sha256')
        .update(JSON.stringify({ asset, targetTimestamp, obsCount: 0 }))
        .digest('hex');

      return new FeatureSnapshot({
        asset,
        timestamp: targetTimestamp,
        features: {
          hasData: false,
          lastClose: null,
          obsCount: 0,
          open: null,
          high: null,
          low: null,
          close: null,
          volume: null,
          atr: null,
          meanVolume: null,
          displacementRatio: null,
          bodyRatio: null,
          volumeRatio: null,
          closeLocation: null,
          r: null,
          signedReturn: null,
          body: null
        },
        featureSetId: this.featureSetId,
        featureSetVersion: this.featureSetVersion,
        inputHash: emptyHash
      });
    }

    const N = marketObservations.length;
    const lastObs = marketObservations[N - 1];

    if (lastObs.timestamp > targetTimestamp) {
      throw new Error('Causality violation: Observation timestamp > targetTimestamp');
    }

    for (let i = 0; i < N; i++) {
      if (marketObservations[i].timestamp > targetTimestamp) {
        throw new Error('Causality violation: Observation timestamp > targetTimestamp');
      }
    }

    const currOpen = lastObs.open;
    const currHigh = lastObs.high;
    const currLow = lastObs.low;
    const currClose = lastObs.close;
    const currVolume = lastObs.volume;

    const body = Math.abs(currClose - currOpen);
    const r = currOpen !== 0 ? (currClose / currOpen) - 1 : 0;
    const signedReturn = r;

    // closeLocation = (close - low) / (high - low)
    // If high === low -> closeLocation = null
    let closeLocation = null;
    if (currHigh !== currLow) {
      closeLocation = (currClose - currLow) / (currHigh - currLow);
    }

    // Wilder's RMA ATR(14)
    let atr = null;
    if (N >= 14) {
      let initialSum = 0;
      for (let i = 0; i < 14; i++) {
        const o = marketObservations[i];
        const prevClose = i > 0 ? marketObservations[i - 1].close : o.open;
        const tr = Math.max(o.high - o.low, Math.abs(o.high - prevClose), Math.abs(o.low - prevClose));
        initialSum += tr;
      }
      let runningAtr = initialSum / 14;

      for (let i = 14; i < N; i++) {
        const o = marketObservations[i];
        const prevClose = marketObservations[i - 1].close;
        const tr = Math.max(o.high - o.low, Math.abs(o.high - prevClose), Math.abs(o.low - prevClose));
        runningAtr = (runningAtr * 13 + tr) / 14;
      }
      atr = runningAtr;
    }

    // Volume SMA(20) strictly on prior 20 candles: [N-21 ... N-2]
    let meanVolume = null;
    let volumeRatio = null;
    if (N >= 21) {
      let sumVol = 0;
      for (let i = N - 21; i < N - 1; i++) {
        sumVol += marketObservations[i].volume;
      }
      meanVolume = sumVol / 20;
      if (meanVolume > 0) {
        volumeRatio = currVolume / meanVolume;
      }
    }

    let displacementRatio = null;
    if (atr !== null && atr > 0) {
      displacementRatio = body / atr;
    }
    const bodyRatio = displacementRatio;

    const features = {
      hasData: true,
      lastClose: currClose,
      obsCount: N,
      open: currOpen,
      high: currHigh,
      low: currLow,
      close: currClose,
      volume: currVolume,
      atr,
      meanVolume,
      displacementRatio,
      bodyRatio,
      volumeRatio,
      closeLocation,
      r,
      signedReturn,
      body
    };

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ asset, targetTimestamp, obsCount: marketObservations.length }))
      .digest('hex');

    return new FeatureSnapshot({
      asset,
      timestamp: targetTimestamp,
      features,
      featureSetId: this.featureSetId,
      featureSetVersion: this.featureSetVersion,
      inputHash: hash
    });
  }
}

module.exports = FeatureEngine;
