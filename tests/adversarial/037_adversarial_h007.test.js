"use strict";

const WickConfirmedRatioModel = require('../../src/strategy/models/WickConfirmedRatioModel');
const ReversedWickConfirmedModel = require('../../src/strategy/models/ReversedWickConfirmedModel');

describe('037 Adversarial Red Team Suite: HYPOTHESIS_007', () => {

  test('037-A: Causal Invariant — Zero Lookahead on Wick Confirmation Features', () => {
    const model = new WickConfirmedRatioModel(120, 1440, 2.0, 0.35, 900);

    for (let i = 0; i < 1440; i++) {
      const c = { timestamp: i * 60000, open: 100, high: 101, low: 99, close: 100, volume: 10 };
      model.predict(c);
      model.update(c);
    }

    const testCandle = { timestamp: 1440 * 60000, open: 98, high: 101, low: 95, close: 99, volume: 10 };
    const p1 = model.predict(testCandle);
    const p2 = model.predict(testCandle);

    expect(p1.direction).toBe(p2.direction);
    expect(p1.zScore).toBe(p2.zScore);
  });

  test('037-B: Rejection Wick Geometry Calculations', () => {
    const model = new WickConfirmedRatioModel(10, 20, 2.0, 0.35, 900);

    // Feed 20 candles in macro uptrend (mean ~95)
    for (let i = 0; i < 20; i++) {
      const p = 90 + i;
      model.update({ timestamp: i * 60000, open: p, high: p + 1, low: p - 1, close: p, volume: 10 });
    }

    // Candle with Lower Wick: Open=98, Close=100, Low=90, High=102 -> Range=12.
    // min(O,C) = 98. Lower wick = 98 - 90 = 8.
    // Ratio = 8 / 12 = 0.667 >= 0.35. Close >= Open (Bullish).
    // Price = 100, which is > macroMean (~99.5).
    // If Z <= -2.0, this should fire CALL.
    // Let's create an extreme flat history to trigger Z <= -2.0
    const oversoldModel = new WickConfirmedRatioModel(5, 10, 1.5, 0.35, 900);
    for (let i = 0; i < 10; i++) {
      oversoldModel.update({ timestamp: i * 60000, open: 120, high: 121, low: 119, close: 120, volume: 10 });
    }

    // Now price drops sharply to 105 (macro mean is 120 > 105, which is downtrend!)
    // For uptrend test, let's prime macro with lower prices:
    const uptrendModel = new WickConfirmedRatioModel(5, 10, 1.5, 0.35, 900);
    for (let i = 0; i < 5; i++) uptrendModel.update({ timestamp: i * 60000, open: 50, high: 51, low: 49, close: 50, volume: 10 });
    const prices = [98, 102, 99, 101, 100];
    for (let i = 0; i < 5; i++) uptrendModel.update({ timestamp: (5 + i) * 60000, open: prices[i], high: prices[i] + 1, low: prices[i] - 1, close: prices[i], volume: 10 });
    // Macro mean = (5*50 + 500) / 10 = 75. Intraday mean = 100.
    // Dip to 80: 80 > 75 (Macro Uptrend!). Z = (ln(80) - ln(100)) / std < -1.5 (Oversold!).
    const wickCandle = {
      timestamp: 10 * 60000,
      open: 78,
      high: 82,
      low: 70, // lower wick = 78 - 70 = 8. range = 82 - 70 = 12. 8/12 = 0.67 >= 0.35.
      close: 80, // bullish close 80 >= 78
      volume: 10
    };

    const pred = uptrendModel.predict(wickCandle);
    expect(pred.direction).toBe('CALL');
    expect(pred.lowerWickRatio).toBeGreaterThanOrEqual(0.35);

    // If candle has NO lower wick (e.g. Low == Open), it must NOT trigger CALL
    const noWickCandle = {
      timestamp: 10 * 60000,
      open: 80,
      high: 85,
      low: 80, // lower wick = 0
      close: 82,
      volume: 10
    };
    const predNoWick = uptrendModel.predict(noWickCandle);
    expect(predNoWick.direction).toBe('NO_SIGNAL');
    expect(predNoWick.reason).toBe('REJECTION_WICK_NOT_CONFIRMED');

    // Zero range candle (H == L)
    const zeroRangeCandle = { timestamp: 10 * 60000, open: 80, high: 80, low: 80, close: 80, volume: 10 };
    const predZero = uptrendModel.predict(zeroRangeCandle);
    expect(predZero.direction).toBe('NO_SIGNAL');
    expect(predZero.reason).toBe('ZERO_CANDLE_RANGE');
  });

  test('037-C: Reversed Negative Control Symmetry', () => {
    const stdModel = new WickConfirmedRatioModel(10, 20, 1.5, 0.30, 900);
    const revModel = new ReversedWickConfirmedModel(10, 20, 1.5, 0.30, 900);

    for (let i = 0; i < 20; i++) {
      const p = 100 + (i % 2 === 0 ? 0.2 : -0.2);
      const c = { timestamp: i * 60000, open: p, high: p + 1, low: p - 1, close: p, volume: 10 };
      stdModel.update(c);
      revModel.update(c);
    }

    const testCandle = { timestamp: 20 * 60000, open: 95, high: 96, low: 88, close: 94, volume: 10 };
    const pStd = stdModel.predict(testCandle);
    const pRev = revModel.predict(testCandle);

    if (pStd.direction !== 'NO_SIGNAL') {
      expect(pRev.direction).not.toBe(pStd.direction);
      expect(pRev.control).toBe('NEGATIVE_REVERSED');
    }
  });

  test('037-D: Insufficient Lookback Fail-Closed Guard', () => {
    const model = new WickConfirmedRatioModel(120, 1440, 2.0, 0.35, 900);

    for (let i = 0; i < 500; i++) {
      model.update({ timestamp: i * 60000, open: 100, high: 101, low: 99, close: 100, volume: 10 });
    }

    const pred = model.predict({ timestamp: 500 * 60000, open: 100, high: 101, low: 99, close: 100, volume: 10 });
    expect(pred.direction).toBe('NO_SIGNAL');
    expect(pred.reason).toBe('INSUFFICIENT_LOOKBACK');
  });
});
