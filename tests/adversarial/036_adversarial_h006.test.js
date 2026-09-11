"use strict";

const TrendConditionedRatioZScoreModel = require('../../src/strategy/models/TrendConditionedRatioZScoreModel');
const ReversedTrendConditionedModel = require('../../src/strategy/models/ReversedTrendConditionedModel');

// Deterministic Mulberry32 PRNG
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('036 Adversarial Red Team Suite: HYPOTHESIS_006', () => {

  test('036-A: Causal Invariant — Zero Lookahead on Multi-Horizon Windows', () => {
    const model = new TrendConditionedRatioZScoreModel(120, 1440, 2.0, 900);

    for (let i = 0; i < 1440; i++) {
      const c = { timestamp: i * 60000, open: 100, high: 101, low: 99, close: 100, volume: 10 };
      model.predict(c);
      model.update(c);
    }

    expect(model.intradayWindow.length).toBe(120);
    expect(model.macroWindow.length).toBe(1440);

    const testCandle = { timestamp: 1440 * 60000, open: 100, high: 102, low: 98, close: 100, volume: 10 };
    const p1 = model.predict(testCandle);
    const p2 = model.predict(testCandle);

    expect(p1.direction).toBe(p2.direction);
    expect(p1.zScore).toBe(p2.zScore);
  });

  test('036-B: Macro-Trend Filter Mechanics', () => {
    const model = new TrendConditionedRatioZScoreModel(10, 20, 2.0, 900);

    // Feed 20 candles with descending drift (macro downtrend: mean is ~105)
    for (let i = 0; i < 20; i++) {
      const price = 110 - i;
      model.update({ timestamp: i * 60000, open: price, high: price + 1, low: price - 1, close: price, volume: 10 });
    }

    // Now current price is 80 (oversold dip Z < -2.0, but macro mean is ~100 > 80 => macro is downtrend)
    const dipInDowntrend = { timestamp: 20 * 60000, open: 80, high: 81, low: 79, close: 80, volume: 10 };
    const predDip = model.predict(dipInDowntrend);

    // Counter-trend CALL must be FILTERED
    expect(predDip.direction).toBe('NO_SIGNAL');
    expect(predDip.reason).toBe('COUNTER_TREND_FILTERED_DOWNTREND_DIP');

    // Feed 20 candles with ascending drift (macro uptrend: mean is ~95)
    model.reset();
    for (let i = 0; i < 20; i++) {
      const price = 90 + i;
      model.update({ timestamp: i * 60000, open: price, high: price + 1, low: price - 1, close: price, volume: 10 });
    }

    // Now current price is 120 (overbought spike Z > +2.0, but macro mean is ~100 < 120 => macro is uptrend)
    const spikeInUptrend = { timestamp: 20 * 60000, open: 120, high: 121, low: 119, close: 120, volume: 10 };
    const predSpike = model.predict(spikeInUptrend);

    // Counter-trend PUT must be FILTERED
    expect(predSpike.direction).toBe('NO_SIGNAL');
    expect(predSpike.reason).toBe('COUNTER_TREND_FILTERED_UPTREND_SPIKE');
  });

  test('036-C: Reversed Control Invariance', () => {
    const stdModel = new TrendConditionedRatioZScoreModel(10, 20, 1.5, 900);
    const revModel = new ReversedTrendConditionedModel(10, 20, 1.5, 900);

    for (let i = 0; i < 20; i++) {
      const price = 100 + (i % 2 === 0 ? 0.2 : -0.2);
      const c = { timestamp: i * 60000, open: price, high: price + 1, low: price - 1, close: price, volume: 10 };
      stdModel.update(c);
      revModel.update(c);
    }

    // Test extreme candle
    const testCandle = { timestamp: 20 * 60000, open: 95, high: 96, low: 90, close: 92, volume: 10 };
    const pStd = stdModel.predict(testCandle);
    const pRev = revModel.predict(testCandle);

    if (pStd.direction !== 'NO_SIGNAL') {
      expect(pRev.direction).not.toBe(pStd.direction);
      expect(pRev.control).toBe('NEGATIVE_REVERSED');
    }
  });

  test('036-D: Insufficient Lookback Protection', () => {
    const model = new TrendConditionedRatioZScoreModel(120, 1440, 2.0, 900);

    // Only 500 candles (< 1440)
    for (let i = 0; i < 500; i++) {
      model.update({ timestamp: i * 60000, open: 100, high: 101, low: 99, close: 100, volume: 10 });
    }

    const pred = model.predict({ timestamp: 500 * 60000, open: 100, high: 101, low: 99, close: 100, volume: 10 });
    expect(pred.direction).toBe('NO_SIGNAL');
    expect(pred.reason).toBe('INSUFFICIENT_LOOKBACK');
  });
});
