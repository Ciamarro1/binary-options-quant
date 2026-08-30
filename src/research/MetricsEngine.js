"use strict";

class MetricsEngine {
  static calculate(predictionsAndOutcomes, payout) {
    const valid = predictionsAndOutcomes.filter(x => x.outcome === 'WIN' || x.outcome === 'LOSS');
    const N = valid.length;
    
    if (N === 0) {
      return { status: 'INSUFFICIENT EVIDENCE', N: 0 };
    }

    let brierSum = 0;
    let logLossSum = 0;
    let wins = 0;

    for (const item of valid) {
      const actual = item.outcome === 'WIN' ? 1 : 0;
      const prob = item.prob;
      
      brierSum += Math.pow(prob - actual, 2);
      
      // limit prob to avoid log(0)
      const pClamped = Math.max(1e-15, Math.min(1 - 1e-15, prob));
      logLossSum += actual * Math.log(pClamped) + (1 - actual) * Math.log(1 - pClamped);
      
      if (actual === 1) wins++;
    }

    const brier = brierSum / N;
    const logLoss = -logLossSum / N;
    const winRate = wins / N;

    const breakEven = 1 / (1 + payout);
    const edge = winRate - breakEven;
    const ev = winRate * payout - (1 - winRate);

    // Confidence interval (95%) for P(win)
    // Z = 1.96 for 95%
    const se = Math.sqrt((winRate * (1 - winRate)) / N);
    const ciLower_P_win = winRate - 1.96 * se;
    const ciUpper_P_win = winRate + 1.96 * se;

    // Is edge detected? Edge must be positive AND lower bound of P_win CI must be > Break Even Probability
    let status = 'EDGE NOT DETECTED';
    if (edge > 0 && ciLower_P_win > breakEven) {
      status = 'EDGE DETECTED';
    }

    return {
      status,
      N,
      brier,
      logLoss,
      accuracy: winRate,
      winRate,
      breakEven,
      edge,
      ev,
      confidenceInterval: { lower: ciLower_P_win, upper: ciUpper_P_win },
      standardError: se
    };
  }
}

module.exports = MetricsEngine;
