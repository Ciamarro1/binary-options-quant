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
    // Remove UTF-8 BOM if present
    const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
    const lines = cleanContent.split('\n');
    
    // Find last non-empty line
    let lastIndex = lines.length - 1;
    while (lastIndex >= 0 && lines[lastIndex].trim() === '') {
      lastIndex--;
    }
    
    if (lastIndex < 0) throw new Error('Empty CSV file');
    
    // Check header
    const header = lines[0].trim().toLowerCase();
    const expectedHeader = 'timestamp,open,high,low,close,volume';
    if (header !== expectedHeader) {
      throw new Error(`Schema mismatch. Expected "${expectedHeader}", got "${header}"`);
    }
    
    const observations = [];
    for (let i = 1; i <= lastIndex; i++) {
      const line = lines[i].trim();
      if (line === '') throw new Error(`Invalid empty line at index ${i}`);
      
      const cols = line.split(',');
      if (cols.length !== 6) {
        throw new Error(`Invalid column count at line ${i}: expected 6, got ${cols.length}`);
      }
      
      const timestamp = parseInt(cols[0], 10);
      const open = parseFloat(cols[1]);
      const high = parseFloat(cols[2]);
      const low = parseFloat(cols[3]);
      const close = parseFloat(cols[4]);
      const volume = parseFloat(cols[5]);
      
      if (!Number.isFinite(timestamp) || !Number.isFinite(open) || !Number.isFinite(high) ||
          !Number.isFinite(low) || !Number.isFinite(close) || !Number.isFinite(volume)) {
        throw new Error(`Non-finite value at line ${i}`);
      }
      
      observations.push(new MarketObservation({
        asset,
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        timeframe
      }));
    }
    
    return new Dataset({ datasetId, asset, timeframe, source, observations });
  }
}

module.exports = DatasetLoader;
