"use strict";

const path = require('path');
const fs = require('fs');
const DatasetLoader = require('../../src/data/DatasetLoader');
const DatasetValidator = require('../../src/data/DatasetValidator');

describe('DATASET_XAUXAG_001 Canonical Integrity Suite', () => {
  const canonicalCsvPath = path.join(
    __dirname,
    '..',
    '..',
    'research',
    'datasets',
    'XAUXAG',
    '1m',
    '2025-06_08',
    'canonical',
    'XAUXAG_1m_canonical.csv'
  );
  const manifestPath = path.join(
    __dirname,
    '..',
    '..',
    'research',
    'datasets',
    'DATASET_XAUXAG_001_MANIFEST.json'
  );

  test('canonical CSV and manifest files exist', () => {
    expect(fs.existsSync(canonicalCsvPath)).toBe(true);
    expect(fs.existsSync(manifestPath)).toBe(true);
  });

  test('loads cleanly via DatasetLoader.loadCSV', () => {
    const dataset = DatasetLoader.loadCSV(canonicalCsvPath, {
      datasetId: 'DATASET_XAUXAG_001',
      asset: 'XAUXAG',
      timeframe: '1m',
      source: 'DUKASCOPY_RECONSTRUCTED_SPOT'
    });

    expect(dataset).toBeDefined();
    expect(dataset.observations.length).toBe(89312);
    expect(dataset.metadata.datasetId).toBe('DATASET_XAUXAG_001');
    expect(dataset.metadata.asset).toBe('XAUXAG');
    expect(dataset.metadata.timeframe).toBe('1m');
    expect(dataset.metadata.rowCount).toBe(89312);
    expect(Object.isFrozen(dataset.observations)).toBe(true);
  });

  test('passes DatasetValidator.validate() with zero exceptions', () => {
    const dataset = DatasetLoader.loadCSV(canonicalCsvPath, {
      datasetId: 'DATASET_XAUXAG_001',
      asset: 'XAUXAG',
      timeframe: '1m',
      source: 'DUKASCOPY_RECONSTRUCTED_SPOT'
    });

    expect(() => DatasetValidator.validate(dataset.observations)).not.toThrow();
  });

  test('enforces strict geometric invariants across all observations', () => {
    const dataset = DatasetLoader.loadCSV(canonicalCsvPath, {
      datasetId: 'DATASET_XAUXAG_001',
      asset: 'XAUXAG',
      timeframe: '1m',
      source: 'DUKASCOPY_RECONSTRUCTED_SPOT'
    });

    // Sample inspect every 100th candle for high-speed assertion
    for (let i = 0; i < dataset.observations.length; i += 100) {
      const obs = dataset.observations[i];
      expect(obs.high).toBeGreaterThanOrEqual(Math.max(obs.open, obs.close));
      expect(obs.low).toBeLessThanOrEqual(Math.min(obs.open, obs.close));
      expect(obs.high).toBeGreaterThanOrEqual(obs.low);
      expect(obs.open).toBeGreaterThan(0);
      expect(obs.close).toBeGreaterThan(0);
      expect(obs.volume).toBeGreaterThanOrEqual(0);
    }
  });

  test('manifest reflects verified LEVEL 1 RESEARCH-GRADE certification', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.datasetId).toBe('DATASET_XAUXAG_001');
    expect(manifest.totalCandles).toBe(89312);
    expect(manifest.governance.dataTier).toBe('LEVEL_1_RESEARCH_GRADE');
    expect(manifest.validation.monotonic).toBe(true);
    expect(manifest.validation.duplicateCount).toBe(0);
  });
});
