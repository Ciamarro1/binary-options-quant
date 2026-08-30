"use strict";
const Dataset = require('../../src/data/Dataset');
const MarketObservation = require('../../src/core/MarketObservation');

describe('Dataset Immutability & Hashing', () => {
  it('creates stable content hash and prevents mutation', () => {
    const obs = [
      new MarketObservation({ asset: 'BTC', timestamp: 1, open: 1, high: 2, low: 0, close: 1.5, volume: 10, timeframe: 'M1' }),
      new MarketObservation({ asset: 'BTC', timestamp: 2, open: 1.5, high: 2, low: 1, close: 1.8, volume: 15, timeframe: 'M1' })
    ];

    const dataset = new Dataset({
      datasetId: 'TEST_01',
      asset: 'BTC',
      timeframe: 'M1',
      source: 'TEST',
      observations: obs
    });

    expect(dataset.metadata.rowCount).toBe(2);
    expect(dataset.metadata.startTimestamp).toBe(1);
    expect(dataset.metadata.endTimestamp).toBe(2);
    expect(dataset.metadata.contentHash).toBeDefined();

    // Prevent mutation
    expect(() => { dataset.observations.push(new MarketObservation({ asset: 'BTC', timestamp: 3, open: 1, high: 1, low: 1, close: 1, volume: 1, timeframe: 'M1' })) }).toThrow();

    // Recreate same dataset, hash must be stable
    const dataset2 = new Dataset({
      datasetId: 'TEST_02',
      asset: 'BTC',
      timeframe: 'M1',
      source: 'TEST',
      observations: obs
    });

    expect(dataset.metadata.contentHash).toBe(dataset2.metadata.contentHash);
  });
});
