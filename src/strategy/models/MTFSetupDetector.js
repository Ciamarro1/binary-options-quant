"use strict";

class MTFSetupDetector {
  static detect(f) {
    if (!f.hasData || f.SMA1h_50 === null || f.SwingHigh15m_96 === null || f.SwingLow15m_96 === null) {
      return { setupUp: false, setupDown: false };
    }

    const isDowntrend = f.close < f.SMA1h_50;
    const sweepsHigh = f.high > f.SwingHigh15m_96;
    const reclaimsHigh = f.close < f.SwingHigh15m_96;
    const setupUp = isDowntrend && sweepsHigh && reclaimsHigh;

    const isUptrend = f.close > f.SMA1h_50;
    const sweepsLow = f.low < f.SwingLow15m_96;
    const reclaimsLow = f.close > f.SwingLow15m_96;
    const setupDown = isUptrend && sweepsLow && reclaimsLow;

    return { setupUp, setupDown };
  }
}

module.exports = MTFSetupDetector;
