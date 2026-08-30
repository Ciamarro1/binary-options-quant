"use strict";

class WalkForward {
  /**
   * Generates strictly causal Walk-Forward train/test splits.
   * Assumes data is sorted temporally.
   */
  static *generateSplits(data, trainSize, testSize) {
    if (!Array.isArray(data)) throw new Error('Data must be an array');
    if (data.length === 0) return;
    if (trainSize <= 0 || testSize <= 0) throw new Error('Sizes must be positive');

    let start = 0;
    while (start + trainSize + testSize <= data.length) {
      const train = data.slice(start, start + trainSize);
      const test = data.slice(start + trainSize, start + trainSize + testSize);
      
      // Causality validation
      const maxTrainTime = train[train.length - 1].timestamp;
      const minTestTime = test[0].timestamp;
      if (maxTrainTime >= minTestTime) {
         throw new Error('Temporal leak detected: train overlaps with test');
      }

      yield { train, test };
      start += testSize;
    }
  }
}

module.exports = WalkForward;
