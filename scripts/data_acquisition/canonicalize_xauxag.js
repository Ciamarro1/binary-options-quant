"use strict";

/**
 * scripts/data_acquisition/canonicalize_xauxag.js
 * 
 * Phase 5: Canonical Dataset Ingestion for XAU/XAG (Fusion CFD / Reconstructed Spot)
 * 
 * Ingests the reconstructed 1m ratio dataset (Jun-Aug 2025), executes full structural
 * validation via DatasetValidator, audits gap distribution, computes cryptographic hashes,
 * and publishes the canonical dataset to research/datasets/XAUXAG/1m/2025-06_08/
 * alongside DATASET_XAUXAG_001_MANIFEST.json.
 * 
 * Governance Tier Certification:
 *   Certified as LEVEL 1: RESEARCH-GRADE (Structural invariants verified; pending Level 2 Fidelity convergence).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DatasetLoader = require('../../src/data/DatasetLoader');
const DatasetValidator = require('../../src/data/DatasetValidator');

const DATASET_ID = 'DATASET_XAUXAG_001';
const ASSET = 'XAUXAG';
const TIMEFRAME = '1m';
const SOURCE_CSV = path.join(__dirname, '..', '..', 'research', 'datasets', 'EXTERNAL_XAUXAG_1M', 'EXTERNAL_XAUXAG_1M.csv');
const TARGET_DIR = path.join(__dirname, '..', '..', 'research', 'datasets', ASSET, TIMEFRAME, '2025-06_08', 'canonical');
const MANIFEST_DIR = path.join(__dirname, '..', '..', 'research', 'datasets', ASSET, TIMEFRAME, '2025-06_08');
const ROOT_MANIFEST_PATH = path.join(__dirname, '..', '..', 'research', 'datasets', 'DATASET_XAUXAG_001_MANIFEST.json');

function computeFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function computeSemanticHash(observations) {
  const hash = crypto.createHash('sha256');
  for (const obs of observations) {
    hash.update(`${obs.timestamp},${obs.open},${obs.high},${obs.low},${obs.close},${obs.volume}|`);
  }
  return hash.digest('hex');
}

async function main() {
  console.log('================================================================');
  console.log('PHASE 5: CANONICAL DATASET INGESTION — XAU/XAG');
  console.log('================================================================\n');

  if (!fs.existsSync(SOURCE_CSV)) {
    throw new Error(`Source CSV not found: ${SOURCE_CSV}. Ensure Phase 3 has run.`);
  }

  // 1. Prepare target directories
  [TARGET_DIR, MANIFEST_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  const targetCsvPath = path.join(TARGET_DIR, 'XAUXAG_1m_canonical.csv');

  console.log(`[SOURCE] Ingesting: ${SOURCE_CSV}`);
  console.log(`[TARGET] Publishing to: ${targetCsvPath}`);

  // 2. Load and parse source CSV via DatasetLoader to verify compliance
  console.log(`\n[LOADER] Executing DatasetLoader.loadCSV...`);
  const dataset = DatasetLoader.loadCSV(SOURCE_CSV, {
    datasetId: DATASET_ID,
    asset: ASSET,
    timeframe: TIMEFRAME,
    source: 'DUKASCOPY_RECONSTRUCTED_SPOT'
  });

  const observations = dataset.observations;
  const rowCount = observations.length;
  console.log(`[LOADER] Successfully loaded ${rowCount} observations.`);

  // 3. Structural validation via DatasetValidator
  console.log(`\n[VALIDATOR] Running DatasetValidator.validate()...`);
  DatasetValidator.validate(observations);
  console.log(`[VALIDATOR] PASSED: Monotonic timestamps, no duplicates, valid OHLC geometry.`);

  // 4. Copy / Write canonical CSV
  fs.copyFileSync(SOURCE_CSV, targetCsvPath);
  const canonicalFileSha256 = computeFileHash(targetCsvPath);
  const semanticHash = computeSemanticHash(observations);
  console.log(`[HASH] Canonical File SHA-256: ${canonicalFileSha256}`);
  console.log(`[HASH] Semantic Content Hash: ${semanticHash}`);

  // 5. Cadence and Gap Analysis (Commodity market hours audit)
  console.log(`\n[AUDIT] Analyzing temporal continuity and market cadence...`);
  let normalIntervals = 0;
  let weekendGaps = 0;
  let intradayGaps = 0;
  const monthBreakdown = {};

  for (let i = 0; i < rowCount; i++) {
    const obs = observations[i];
    const d = new Date(obs.timestamp);
    const monthKey = d.toISOString().slice(0, 7);
    monthBreakdown[monthKey] = (monthBreakdown[monthKey] || 0) + 1;

    if (i > 0) {
      const dtMs = obs.timestamp - observations[i - 1].timestamp;
      if (dtMs === 60000) {
        normalIntervals++;
      } else if (dtMs >= 40 * 3600 * 1000) {
        // >= 40h gap corresponds to standard forex/metal weekend market closure
        weekendGaps++;
      } else {
        intradayGaps++;
      }
    }
  }

  console.log(`[CADENCE] 60s Intervals: ${normalIntervals}`);
  console.log(`[CADENCE] Weekend Market Closures (Expected): ${weekendGaps}`);
  console.log(`[CADENCE] Intraday Gaps: ${intradayGaps}`);
  console.log(`[DISTRIBUTION] Monthly Breakdown:`, monthBreakdown);

  // 6. Formulate Manifest
  const manifest = {
    datasetId: DATASET_ID,
    asset: ASSET,
    timeframe: TIMEFRAME,
    source: 'DUKASCOPY_RECONSTRUCTED_SPOT',
    sourceType: 'EXTERNAL_SPOT_RECONSTRUCTION',
    reconstructionFormula: 'R_t = XAU/USD(t) / XAG/USD(t)',
    period: `${new Date(observations[0].timestamp).toISOString()} to ${new Date(observations[rowCount - 1].timestamp).toISOString()}`,
    firstTimestamp: observations[0].timestamp,
    lastTimestamp: observations[rowCount - 1].timestamp,
    totalCandles: rowCount,
    governance: {
      dataTier: 'LEVEL_1_RESEARCH_GRADE',
      status: 'VERIFIED_CANONICAL',
      promotionRequirement: 'Must undergo Phase 4 Fidelity Audit (rho >= 0.98, DAR >= 94%, BSIR <= 2%) against concurrent IQ Option feed before Level 2 promotion.',
      commercialUsePermitted: false,
      frozenAt: new Date().toISOString()
    },
    validation: {
      monotonic: true,
      duplicateCount: 0,
      invalidOhlcCount: 0,
      cadence: '60s',
      normalIntervalCount: normalIntervals,
      weekendMarketClosures: weekendGaps,
      intradayGaps: intradayGaps,
      monthBreakdown: monthBreakdown
    },
    hashes: {
      canonicalFileSha256,
      semanticContentHash: semanticHash,
      hashAlgorithm: 'SHA-256'
    },
    canonicalFile: 'canonical/XAUXAG_1m_canonical.csv',
    schema: 'timestamp,open,high,low,close,volume'
  };

  // 7. Write Manifests
  const manifestPath = path.join(MANIFEST_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  fs.writeFileSync(ROOT_MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`\n[MANIFEST] Saved to: ${manifestPath}`);
  console.log(`[MANIFEST] Saved to: ${ROOT_MANIFEST_PATH}`);

  console.log('\n================================================================');
  console.log('PHASE 5 COMPLETE: DATASET_XAUXAG_001 SUCCESSFULLY INGESTED');
  console.log('Certified as LEVEL 1: RESEARCH-GRADE');
  console.log('================================================================');
}

main().catch(err => {
  console.error('[FATAL ERROR IN PHASE 5 INGESTION]', err);
  process.exit(1);
});
