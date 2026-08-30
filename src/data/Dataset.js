"use strict";
const crypto = require('crypto');
const DatasetValidator = require('./DatasetValidator');
const DatasetMetadata = require('./DatasetMetadata');

class Dataset {
  constructor({ datasetId, asset, timeframe, source, observations }) {
    DatasetValidator.validate(observations);
    
    this.observations = Object.freeze([...observations]);

    const startTimestamp = this.observations[0].timestamp;
    const endTimestamp = this.observations[this.observations.length - 1].timestamp;
    const rowCount = this.observations.length;

    // Deterministic hash based on all data points
    const hashPayload = this.observations.map(o => `${o.timestamp}:${o.open}:${o.high}:${o.low}:${o.close}:${o.volume}`).join('|');
    const contentHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    this.metadata = new DatasetMetadata({
      datasetId,
      asset,
      timeframe,
      source,
      startTimestamp,
      endTimestamp,
      rowCount,
      schemaVersion: '1.0.0',
      contentHash
    });

    Object.freeze(this);
  }
}
module.exports = Dataset;
