"use strict";

const VALID_REGIMES = new Set(['TREND', 'RANGE', 'VOLATILE', 'QUIET', 'UNKNOWN']);

class RegimeSnapshot {
  constructor({ asset, timestamp, regime }) {
    if (!asset || typeof asset !== 'string') throw new Error('Invalid asset');
    if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) throw new Error('Invalid timestamp');
    if (!VALID_REGIMES.has(regime)) throw new Error('Invalid regime');

    this.asset = asset;
    this.timestamp = timestamp;
    this.regime = regime;

    Object.freeze(this);
  }
}

module.exports = RegimeSnapshot;
