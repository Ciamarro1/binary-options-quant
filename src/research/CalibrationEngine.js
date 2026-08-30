"use strict";

class CalibrationEngine {
  /**
   * Evaluates how well probabilities align with actual empirical win rates.
   */
  static analyze(predictionsAndOutcomes, bins = 10) {
    // predictionsAndOutcomes: [{ prob: 0.6, outcome: 'WIN'|'LOSS' }]
    const binSize = 1.0 / bins;
    const results = Array.from({ length: bins }, () => ({ count: 0, wins: 0, sumProb: 0 }));

    for (const item of predictionsAndOutcomes) {
      if (item.outcome === 'PUSH' || item.outcome === 'INVALID') continue;
      
      const prob = item.prob;
      let binIndex = Math.floor(prob / binSize);
      if (binIndex >= bins) binIndex = bins - 1;

      results[binIndex].count++;
      results[binIndex].sumProb += prob;
      if (item.outcome === 'WIN') {
        results[binIndex].wins++;
      }
    }

    return results.map((b, index) => {
      const empirical = b.count > 0 ? b.wins / b.count : 0;
      const expected = b.count > 0 ? b.sumProb / b.count : 0;
      return {
        rangeStart: index * binSize,
        rangeEnd: (index + 1) * binSize,
        count: b.count,
        expected,
        empirical,
        error: b.count > 0 ? Math.abs(expected - empirical) : 0
      };
    });
  }
}

module.exports = CalibrationEngine;
