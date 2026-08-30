"use strict";
class DatasetMetadata {
  constructor({ datasetId, asset, timeframe, source, startTimestamp, endTimestamp, rowCount, schemaVersion, contentHash }) {
    this.datasetId = datasetId;
    this.asset = asset;
    this.timeframe = timeframe;
    this.source = source;
    this.startTimestamp = startTimestamp;
    this.endTimestamp = endTimestamp;
    this.rowCount = rowCount;
    this.schemaVersion = schemaVersion;
    this.contentHash = contentHash;
    
    Object.freeze(this);
  }
}
module.exports = DatasetMetadata;
