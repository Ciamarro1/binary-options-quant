"use strict";

const RegimeSnapshot = require('../core/RegimeSnapshot');

class RegimeEngine {
  /**
   * Classifies regime up to targetTimestamp.
   * Enforces CAUSALITY.
   */
  classifyRegime(asset, targetTimestamp, marketObservations) {
    for (const obs of marketObservations) {
      if (obs.timestamp > targetTimestamp) {
        throw new Error('Causality violation: Observation timestamp > targetTimestamp');
      }
    }

    // In a real system, compute regime (e.g., ADX for TREND/RANGE, ATR for VOLATILE)
    // For now, if no obs, UNKNOWN. Otherwise let's default to RANGE unless we do something else.
    // For causality test, we will just return UNKNOWN if length < 2, else RANGE.
    let regime = 'UNKNOWN';
    if (marketObservations.length >= 2) {
      regime = 'RANGE'; // stub implementation
    }

    return new RegimeSnapshot({
      asset,
      timestamp: targetTimestamp,
      regime
    });
  }
}

module.exports = RegimeEngine;
