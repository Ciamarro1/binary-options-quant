"use strict";

const WickConfirmedRatioModel = require('../models/WickConfirmedRatioModel');

class H007Runner {
  constructor(observations, options = {}) {
    this.observations = observations;
    this.intradayLookback = options.intradayLookback || 120;
    this.macroLookback = options.macroLookback || 1440;
    this.zThreshold = options.zThreshold || 2.0;
    this.minWickRatio = options.minWickRatio || 0.35;
    this.expiryBars = options.expiryBars || 15; // 15m (900s)
    this.payoutRate = options.payoutRate || 0.88;
    this.breakevenProbability = 1 / (1 + this.payoutRate); // 53.1915%
    this.modelClass = options.modelClass || WickConfirmedRatioModel;
  }

  static computeWilsonCI(wins, total, z = 1.95996) {
    if (total === 0) return { lower: 0, upper: 0, center: 0 };
    const p = wins / total;
    const denominator = 1 + (z * z) / total;
    const centerAdjusted = p + (z * z) / (2 * total);
    const rad = Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
    const lower = (centerAdjusted - z * rad) / denominator;
    const upper = (centerAdjusted + z * rad) / denominator;
    return {
      lower: Math.max(0, lower),
      upper: Math.min(1, upper),
      center: p
    };
  }

  resolveSignal(entryIdx, direction) {
    const exitIdx = entryIdx + this.expiryBars;
    if (exitIdx >= this.observations.length) return 'UNRESOLVED';

    const entryPrice = this.observations[entryIdx].close;
    const exitPrice = this.observations[exitIdx].close;

    if (exitPrice === entryPrice) return 'PUSH';
    if (direction === 'CALL') return exitPrice > entryPrice ? 'WIN' : 'LOSS';
    if (direction === 'PUT') return exitPrice < entryPrice ? 'WIN' : 'LOSS';
    return 'UNRESOLVED';
  }

  runSlice(startIndex, endIndex) {
    const model = new this.modelClass(
      this.intradayLookback,
      this.macroLookback,
      this.zThreshold,
      this.minWickRatio,
      this.expiryBars * 60
    );

    const trades = [];
    let callStats = { wins: 0, losses: 0, pushes: 0, total: 0 };
    let putStats = { wins: 0, losses: 0, pushes: 0, total: 0 };

    for (let i = startIndex; i < endIndex; i++) {
      const candle = this.observations[i];

      // Predict strictly BEFORE update
      const signal = model.predict(candle);

      if (signal && (signal.direction === 'CALL' || signal.direction === 'PUT')) {
        if (i + this.expiryBars < endIndex) {
          const outcome = this.resolveSignal(i, signal.direction);
          if (outcome !== 'UNRESOLVED') {
            const entryPrice = candle.close;
            const exitPrice = this.observations[i + this.expiryBars].close;

            const trade = {
              index: i,
              timestamp: candle.timestamp,
              timestampIso: new Date(candle.timestamp).toISOString(),
              direction: signal.direction,
              zScore: signal.zScore,
              entryPrice,
              exitPrice,
              outcome,
              returnPct: (exitPrice - entryPrice) / entryPrice
            };
            trades.push(trade);

            const targetStats = signal.direction === 'CALL' ? callStats : putStats;
            targetStats.total++;
            if (outcome === 'WIN') targetStats.wins++;
            else if (outcome === 'LOSS') targetStats.losses++;
            else if (outcome === 'PUSH') targetStats.pushes++;
          }
        }
      }

      // Update strictly AFTER predict
      model.update(candle);
    }

    const totalNonPush = (callStats.wins + callStats.losses) + (putStats.wins + putStats.losses);
    const totalWins = callStats.wins + putStats.wins;
    const totalLosses = callStats.losses + putStats.losses;
    const totalPushes = callStats.pushes + putStats.pushes;

    const winRate = totalNonPush > 0 ? totalWins / totalNonPush : 0;
    const callNonPush = callStats.wins + callStats.losses;
    const putNonPush = putStats.wins + putStats.losses;
    const callWinRate = callNonPush > 0 ? callStats.wins / callNonPush : 0;
    const putWinRate = putNonPush > 0 ? putStats.wins / putNonPush : 0;

    const wilsonCI = H007Runner.computeWilsonCI(totalWins, totalNonPush);
    const ev = (winRate * this.payoutRate) - (1 - winRate);

    let brierSum = 0;
    for (const t of trades) {
      if (t.outcome === 'PUSH') continue;
      const actual = t.outcome === 'WIN' ? 1 : 0;
      const predicted = 0.5319;
      brierSum += (predicted - actual) ** 2;
    }
    const brierScore = totalNonPush > 0 ? brierSum / totalNonPush : null;

    return {
      totalSignals: trades.length,
      resolvedTrades: totalNonPush,
      wins: totalWins,
      losses: totalLosses,
      pushes: totalPushes,
      winRate,
      callStats: { ...callStats, winRate: callWinRate },
      putStats: { ...putStats, winRate: putWinRate },
      directionalImbalance: Math.abs(callWinRate - putWinRate),
      wilsonCI,
      expectedValue: ev,
      brierScore,
      payoutRate: this.payoutRate,
      breakevenRate: this.breakevenProbability,
      trades
    };
  }

  runPartitioned(splitTimestamp = Date.parse('2025-07-21T00:00:00.000Z')) {
    let splitIndex = -1;
    for (let i = 0; i < this.observations.length; i++) {
      if (this.observations[i].timestamp >= splitTimestamp) {
        splitIndex = i;
        break;
      }
    }

    if (splitIndex === -1) {
      throw new Error(`Split timestamp ${splitTimestamp} not found within dataset bounds.`);
    }

    const inSample = this.runSlice(0, splitIndex);
    const outOfSample = this.runSlice(splitIndex, this.observations.length);

    return {
      splitTimestamp,
      splitIndex,
      inSample,
      outOfSample
    };
  }
}

module.exports = H007Runner;
