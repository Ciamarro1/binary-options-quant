"use strict";

const crypto = require('crypto');
const FeatureSnapshot = require('../core/FeatureSnapshot');

class MTFFeatureEngine {
  constructor(featureSetId = 'MTF_v1', featureSetVersion = '1.0') {
    this.featureSetId = featureSetId;
    this.featureSetVersion = featureSetVersion;
  }

  extractFeatures(asset, targetTimestamp, marketObservations) {
    if (!Array.isArray(marketObservations) || marketObservations.length === 0) {
      return this._emptySnapshot(asset, targetTimestamp);
    }

    const N = marketObservations.length;
    const current1m = marketObservations[N - 1];

    if (current1m.timestamp > targetTimestamp) {
      throw new Error('Causality violation: Observation timestamp > targetTimestamp');
    }

    // HTF_CANDLE_CLOSED_BEFORE(t) Contract implementation
    const targetTimeMs = current1m.timestamp;

    const m15_candles = new Map();
    const h1_candles = new Map();

    // Build aggregations using strict causal boundaries
    for (let i = 0; i < N; i++) {
      const obs = marketObservations[i];
      const tMs = obs.timestamp;

      // 15m bucket
      const b15 = Math.floor(tMs / 900000) * 900000;
      // 1h bucket
      const b60 = Math.floor(tMs / 3600000) * 3600000;

      // Update 15m
      if (!m15_candles.has(b15)) {
        m15_candles.set(b15, { timestamp: b15, open: obs.open, high: obs.high, low: obs.low, close: obs.close, volume: obs.volume });
      } else {
        const c = m15_candles.get(b15);
        c.high = Math.max(c.high, obs.high);
        c.low = Math.min(c.low, obs.low);
        c.close = obs.close;
        c.volume += obs.volume;
      }

      // Update 1h
      if (!h1_candles.has(b60)) {
        h1_candles.set(b60, { timestamp: b60, open: obs.open, high: obs.high, low: obs.low, close: obs.close, volume: obs.volume });
      } else {
        const c = h1_candles.get(b60);
        c.high = Math.max(c.high, obs.high);
        c.low = Math.min(c.low, obs.low);
        c.close = obs.close;
        c.volume += obs.volume;
      }
    }

    // The dataset timestamp represents the OPEN time of the 1m candle.
    // The signal is evaluated at the EXACT CLOSE of the candle: timestamp + 60_000 ms.
    const signalTimeMs = targetTimeMs + 60000;

    // Filter strictly closed candles based on the requested matrix:
    // 15m is available if signalTime >= B + 15 minutes
    // 1h is available if signalTime >= B + 60 minutes
    const closed15m = [];
    for (const [b15, c] of m15_candles.entries()) {
      if (signalTimeMs >= b15 + 15 * 60000) {
        closed15m.push(c);
      }
    }
    closed15m.sort((a, b) => a.timestamp - b.timestamp);

    const closed1h = [];
    for (const [b60, c] of h1_candles.entries()) {
      if (signalTimeMs >= b60 + 60 * 60000) {
        closed1h.push(c);
      }
    }
    closed1h.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate SMA1h_50
    let SMA1h_50 = null;
    if (closed1h.length >= 50) {
      let sum = 0;
      for (let i = closed1h.length - 50; i < closed1h.length; i++) {
        sum += closed1h[i].close;
      }
      SMA1h_50 = sum / 50;
    }

    // Calculate SwingHigh15m_96 and SwingLow15m_96
    let SwingHigh15m_96 = null;
    let SwingLow15m_96 = null;
    if (closed15m.length >= 96) {
      let maxH = -Infinity;
      let minL = Infinity;
      for (let i = closed15m.length - 96; i < closed15m.length; i++) {
        if (closed15m[i].high > maxH) maxH = closed15m[i].high;
        if (closed15m[i].low < minL) minL = closed15m[i].low;
      }
      SwingHigh15m_96 = maxH;
      SwingLow15m_96 = minL;
    }

    const features = {
      hasData: true,
      lastClose: current1m.close,
      obsCount: N,
      open: current1m.open,
      high: current1m.high,
      low: current1m.low,
      close: current1m.close,
      volume: current1m.volume,
      SMA1h_50,
      SwingHigh15m_96,
      SwingLow15m_96,
      // Metadata for invariant tests
      _last15mTimestamp: closed15m.length > 0 ? closed15m[closed15m.length - 1].timestamp : null,
      _last1hTimestamp: closed1h.length > 0 ? closed1h[closed1h.length - 1].timestamp : null
    };

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ asset, targetTimestamp, obsCount: N }))
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

  _emptySnapshot(asset, targetTimestamp) {
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
        SMA1h_50: null,
        SwingHigh15m_96: null,
        SwingLow15m_96: null
      },
      featureSetId: this.featureSetId,
      featureSetVersion: this.featureSetVersion,
      inputHash: emptyHash
    });
  }
}

module.exports = MTFFeatureEngine;
