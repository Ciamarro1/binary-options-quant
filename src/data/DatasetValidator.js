"use strict";
const MarketObservation = require('../core/MarketObservation');

class DatasetValidator {
  static validate(observations) {
    if (!Array.isArray(observations) || observations.length === 0) {
      throw new Error('DATA QUALITY ERROR: Empty dataset or invalid observations array');
    }

    let lastTimestamp = -1;

    for (let i = 0; i < observations.length; i++) {
      const obs = observations[i];
      
      // Ensures structural integrity and OHLC logic
      if (!(obs instanceof MarketObservation)) {
         throw new Error(`DATA QUALITY ERROR: Observation at index ${i} is not a MarketObservation instance`);
      }

      // Check chronological integrity
      if (obs.timestamp <= lastTimestamp) {
         if (obs.timestamp === lastTimestamp) {
            throw new Error(`DATA QUALITY ERROR: Duplicate timestamp detected at ${obs.timestamp}`);
         } else {
            throw new Error(`DATA QUALITY ERROR: Out-of-order timestamp detected. ${obs.timestamp} after ${lastTimestamp}`);
         }
      }
      
      lastTimestamp = obs.timestamp;
    }

    return true;
  }
}
module.exports = DatasetValidator;
