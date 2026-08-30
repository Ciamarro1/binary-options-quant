"use strict";

/**
 * scripts/ingest_dataset_002.js
 * 
 * Ingests BTCUSDT 1m data for Feb, Mar, Apr, May 2024.
 * Produces Dataset_002.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { execSync } = require('child_process');
const DatasetLoader = require('../src/data/DatasetLoader');
const DatasetValidator = require('../src/data/DatasetValidator');

const DATASET_ID = 'DATASET_002';
const ASSET = 'BTCUSDT';
const TIMEFRAME = '1m';
const MONTHS = ['2024-02', '2024-03', '2024-04', '2024-05'];
const BASE_URL = `https://data.binance.vision/data/spot/monthly/klines/${ASSET}/${TIMEFRAME}`;

const BASE_DIR = path.join(__dirname, '..', 'research', 'datasets', ASSET, TIMEFRAME, '2024-02_05');
const RAW_DIR = path.join(BASE_DIR, 'raw');
const CANONICAL_DIR = path.join(BASE_DIR, 'canonical');

// Ensure directories exist
[BASE_DIR, RAW_DIR, CANONICAL_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Helper: Download file
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`[SKIP] Already downloaded: ${path.basename(dest)}`);
      return resolve(dest);
    }
    console.log(`[DOWNLOADING] ${url}`);
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download: ${response.statusCode} - ${url}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(dest);
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

// Helper: Compute SHA-256 of file
function computeFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Helper: Canonicalize CSV
// Binance structure: open_time, open, high, low, close, volume, close_time, quote_asset_volume, trades, taker_buy_base, taker_buy_quote, ignore
// We need: timestamp, open, high, low, close, volume
function canonicalizeCSV(rawCsvPath, canonicalCsvPath) {
  const rawData = fs.readFileSync(rawCsvPath, 'utf-8');
  const lines = rawData.split('\n').filter(line => line.trim() !== '');
  
  let validLines = [];
  for (const line of lines) {
    const cols = line.split(',');
    if (cols.length < 6) continue;
    // Attempt to parse open_time
    const timestamp = parseInt(cols[0], 10);
    if (isNaN(timestamp)) continue; // skip header if exists
    
    // We only keep the first 6 columns
    validLines.push({
      timestamp,
      line: `${cols[0]},${cols[1]},${cols[2]},${cols[3]},${cols[4]},${cols[5]}`
    });
  }

  // Sort strictly by timestamp just in case
  validLines.sort((a, b) => a.timestamp - b.timestamp);

  const header = 'timestamp,open,high,low,close,volume';
  const outLines = [header];
  for (const item of validLines) {
    outLines.push(item.line);
  }

  fs.writeFileSync(canonicalCsvPath, outLines.join('\n'), 'utf-8');
  return validLines.length;
}

// Computes the semantic semantic datasetContentHash from observations
function computeSemanticHash(observations) {
  const hash = crypto.createHash('sha256');
  for (const obs of observations) {
    hash.update(`${obs.timestamp},${obs.open},${obs.high},${obs.low},${obs.close},${obs.volume}|`);
  }
  return hash.digest('hex');
}

async function main() {
  const manifest = {
    datasetId: DATASET_ID,
    asset: ASSET,
    timeframe: TIMEFRAME,
    period: '2024-02 to 2024-05',
    months: {},
    aggregate: {}
  };

  let allObservations = [];

  for (const month of MONTHS) {
    console.log(`\n=== Processing ${month} ===`);
    const zipName = `${ASSET}-${TIMEFRAME}-${month}.zip`;
    const checksumName = `${zipName}.CHECKSUM`;
    const csvName = `${ASSET}-${TIMEFRAME}-${month}.csv`;
    const canonicalName = `${ASSET}_${TIMEFRAME}_${month.replace('-', '_')}.csv`;

    const zipPath = path.join(RAW_DIR, zipName);
    const checksumPath = path.join(RAW_DIR, checksumName);
    const rawCsvPath = path.join(RAW_DIR, csvName);
    const canonicalCsvPath = path.join(CANONICAL_DIR, canonicalName);

    // 1. Download ZIP & CHECKSUM
    await downloadFile(`${BASE_URL}/${zipName}`, zipPath);
    await downloadFile(`${BASE_URL}/${checksumName}`, checksumPath);

    // 2. Verify CHECKSUM
    const expectedHash = fs.readFileSync(checksumPath, 'utf-8').split(/\s+/)[0].trim();
    const actualHash = computeFileHash(zipPath);
    if (actualHash !== expectedHash) {
      throw new Error(`Checksum mismatch for ${month}! Expected ${expectedHash}, got ${actualHash}`);
    }
    console.log(`[VERIFIED] Source ZIP SHA-256: ${actualHash}`);

    // 3. Unzip
    if (!fs.existsSync(rawCsvPath)) {
      console.log(`[EXTRACTING] ${zipName}`);
      execSync(`tar -xf ${zipPath} -C ${RAW_DIR}`);
    }

    // 4. Canonicalize
    console.log(`[CANONICALIZING] to ${canonicalName}`);
    const rowCount = canonicalizeCSV(rawCsvPath, canonicalCsvPath);
    const canonicalSha256 = computeFileHash(canonicalCsvPath);
    console.log(`[WRITTEN] ${rowCount} rows. Canonical SHA-256: ${canonicalSha256}`);

    // 5. Load into Memory
    const dataset = DatasetLoader.loadCSV(canonicalCsvPath, { datasetId: `${DATASET_ID}_${month}`, asset: ASSET, timeframe: TIMEFRAME, source: 'Binance' });
    allObservations.push(...dataset.observations);

    manifest.months[month] = {
      rowCount,
      sourceSha256: actualHash,
      canonicalFileSha256: canonicalSha256
    };
  }

  console.log(`\n=== Aggregating Dataset ===`);
  // Sort global observations
  allObservations.sort((a, b) => a.timestamp - b.timestamp);

  // Structural Validation
  console.log(`[VALIDATING] Structural Integrity...`);
  DatasetValidator.validate(allObservations);
  console.log(`[VALIDATED] Structural integrity passed (no dupes, strictly ordered, valid OHLC).`);

  // Cadence/Gap Analysis
  console.log(`[ANALYZING] Cadence and Gaps...`);
  let gapCount = 0;
  let minGap = Infinity;
  let maxGap = 0;

  for (let i = 1; i < allObservations.length; i++) {
    const dt = allObservations[i].timestamp - allObservations[i-1].timestamp;
    if (dt !== 60000) {
      gapCount++;
    }
    if (dt < minGap) minGap = dt;
    if (dt > maxGap) maxGap = dt;
  }

  console.log(`[GAPS] Gap count (dt != 60s): ${gapCount}`);
  if (gapCount > 0) {
    console.log(`[GAPS] Min gap: ${minGap} ms, Max gap: ${maxGap} ms`);
  }

  // Semantic Hash
  console.log(`[HASHING] Computing datasetContentHash...`);
  const aggregateContentHash = computeSemanticHash(allObservations);
  console.log(`[HASH] datasetContentHash: ${aggregateContentHash}`);

  manifest.aggregate = {
    rowCount: allObservations.length,
    firstTimestamp: allObservations[0].timestamp,
    firstTimestampIso: new Date(allObservations[0].timestamp).toISOString(),
    lastTimestamp: allObservations[allObservations.length - 1].timestamp,
    lastTimestampIso: new Date(allObservations[allObservations.length - 1].timestamp).toISOString(),
    gapCount,
    datasetContentHash: aggregateContentHash
  };

  const manifestPath = path.join(BASE_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`\n=== INGESTION COMPLETE ===`);
  console.log(JSON.stringify(manifest.aggregate, null, 2));
  console.log(`Manifest saved to ${manifestPath}`);
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
