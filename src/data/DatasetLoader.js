"use strict";
const fs = require('fs');
const MarketObservation = require('../core/MarketObservation');
const Dataset = require('./Dataset');

class DatasetLoader {
  /**
   * Loads a canonical CSV file into a Dataset object.
   * Expected schema: timestamp,open,high,low,close,volume
   */
  static loadCSV(csvPath, { datasetId, asset, timeframe, source }) {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');
    
    // Skip header
    const header = lines[0].trim().toLowerCase();
    const expectedHeader = 'timestamp,open,high,low,close,volume';
    if (header !== expectedHeader) {
      throw new Error(`Schema mismatch. Expected "${expectedHeader}", got "${header}"`);
    }
    
    const observations = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].trim().split(',');
      if (cols.length < 6) continue;
      
      observations.push(new MarketObservation({
        asset,
        timestamp: parseInt(cols[0], 10),
        open: parseFloat(cols[1]),
        high: parseFloat(cols[2]),
        low: parseFloat(cols[3]),
        close: parseFloat(cols[4]),
        volume: parseFloat(cols[5]),
        timeframe
      }));
    }
    
    return new Dataset({ datasetId, asset, timeframe, source, observations });
  }
}

module.exports = DatasetLoader;
