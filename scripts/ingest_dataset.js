"use strict";

/**
 * DATASET INGESTION SCRIPT v1.0.0
 * ================================
 * Pipeline: DOWNLOAD → CHECKSUM → RAW FREEZE → DECOMPRESS → VALIDATE SOURCE → 
 *           CANONICALIZE → VALIDATE CANONICAL → CONTINUITY CHECK → HASH → MANIFEST
 * 
 * Pre-declared parameters (frozen before execution):
 *   Source:    Binance Public Data Archive
 *   Market:   Spot
 *   Symbol:   BTCUSDT
 *   Interval: 1m
 *   Period:   2024-01
 *   Timezone: UTC
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// ═══════════════════════════════════════════════
// PRE-DECLARED PARAMETERS (FROZEN)
// ═══════════════════════════════════════════════
const PARAMS = Object.freeze({
  datasetId: 'BINANCE_SPOT_BTCUSDT_1M_2024_01',
  source: 'Binance Public Data',
  market: 'spot',
  symbol: 'BTCUSDT',
  timeframe: '1m',
  period: '2024-01',
  timezone: 'UTC',
  baseUrl: 'https://data.binance.vision/data/spot/monthly/klines/BTCUSDT/1m',
  zipFilename: 'BTCUSDT-1m-2024-01.zip',
  checksumFilename: 'BTCUSDT-1m-2024-01.zip.CHECKSUM',
  expectedFirstTimestamp: Date.UTC(2024, 0, 1, 0, 0, 0),   // 2024-01-01T00:00:00.000Z
  expectedLastTimestamp: Date.UTC(2024, 0, 31, 23, 59, 0),  // 2024-01-31T23:59:00.000Z
  expectedRowCount: 44640,
  intervalMs: 60000,
  canonicalSchema: ['timestamp', 'open', 'high', 'low', 'close', 'volume'],
  ingestionVersion: '1.0.0'
});

// ═══════════════════════════════════════════════
// DIRECTORY SETUP
// ═══════════════════════════════════════════════
const BASE_DIR = path.join(__dirname, '..', 'research', 'datasets', 'BTCUSDT', '1m', '2024-01');
const RAW_DIR = path.join(BASE_DIR, 'raw');
const CANONICAL_DIR = path.join(BASE_DIR, 'canonical');

function ensureDirs() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(CANONICAL_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════
// STEP 1: DOWNLOAD
// ═══════════════════════════════════════════════
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`  Downloading: ${url}`);
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        console.log(`  Redirect → ${response.headers.location}`);
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${response.statusCode} for ${url}`));
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });
    
    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
    
    request.setTimeout(60000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

// ═══════════════════════════════════════════════
// STEP 2: CHECKSUM VALIDATION
// ═══════════════════════════════════════════════
function validateChecksum(zipPath, checksumPath) {
  console.log('\n[STEP 2] SHA-256 CHECKSUM VALIDATION');
  
  const checksumContent = fs.readFileSync(checksumPath, 'utf-8').trim();
  // Binance format: "<hash>  <filename>"
  const expectedHash = checksumContent.split(/\s+/)[0].toLowerCase();
  
  const fileBuffer = fs.readFileSync(zipPath);
  const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex').toLowerCase();
  
  console.log(`  Expected: ${expectedHash}`);
  console.log(`  Actual:   ${actualHash}`);
  
  if (actualHash !== expectedHash) {
    throw new Error(`CHECKSUM MISMATCH. Expected ${expectedHash}, got ${actualHash}. ABORTING.`);
  }
  
  console.log('  ✓ CHECKSUM VALID');
  return { expectedHash, actualHash };
}

// ═══════════════════════════════════════════════
// STEP 3: DECOMPRESS
// ═══════════════════════════════════════════════
function decompressZip(zipPath, outputDir) {
  console.log('\n[STEP 3] DECOMPRESS');
  
  // Use PowerShell's Expand-Archive
  const cmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${outputDir}' -Force"`;
  execSync(cmd, { stdio: 'pipe' });
  
  // Find the CSV file inside
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.csv'));
  if (files.length !== 1) {
    throw new Error(`Expected exactly 1 CSV in ZIP, found ${files.length}`);
  }
  
  const csvPath = path.join(outputDir, files[0]);
  console.log(`  ✓ Extracted: ${files[0]}`);
  return csvPath;
}

// ═══════════════════════════════════════════════
// STEP 4: VALIDATE 12-COLUMN SOURCE
// ═══════════════════════════════════════════════
function validateSource(csvPath) {
  console.log('\n[STEP 4] SOURCE VALIDATION (12-column Binance format)');
  
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim().length > 0);
  
  console.log(`  Total lines: ${lines.length}`);
  
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 6) {
      throw new Error(`SOURCE VALIDATION FAILED: Line ${i + 1} has ${cols.length} columns, expected >= 6`);
    }
    
    const timestamp = parseInt(cols[0], 10);
    const open = parseFloat(cols[1]);
    const high = parseFloat(cols[2]);
    const low = parseFloat(cols[3]);
    const close = parseFloat(cols[4]);
    const volume = parseFloat(cols[5]);
    
    // Basic sanity: all must be finite numbers
    if (!Number.isFinite(timestamp) || !Number.isFinite(open) || !Number.isFinite(high) ||
        !Number.isFinite(low) || !Number.isFinite(close) || !Number.isFinite(volume)) {
      throw new Error(`SOURCE VALIDATION FAILED: Non-finite value at line ${i + 1}`);
    }
    
    rows.push({ timestamp, open, high, low, close, volume });
  }
  
  console.log(`  ✓ All ${rows.length} rows parsed as valid numeric data`);
  return rows;
}

// ═══════════════════════════════════════════════
// STEP 5: CANONICALIZE
// ═══════════════════════════════════════════════
function canonicalize(rows, outputPath) {
  console.log('\n[STEP 5] CANONICALIZE TO 6-COLUMN FORMAT');
  
  const header = PARAMS.canonicalSchema.join(',');
  const lines = [header];
  
  for (const row of rows) {
    lines.push(`${row.timestamp},${row.open},${row.high},${row.low},${row.close},${row.volume}`);
  }
  
  fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf-8');
  console.log(`  ✓ Written ${rows.length} rows to canonical CSV`);
  return outputPath;
}

// ═══════════════════════════════════════════════
// STEP 6: VALIDATE CANONICAL DATA
// ═══════════════════════════════════════════════
function validateCanonical(rows) {
  console.log('\n[STEP 6] SEMANTIC VALIDATION');
  
  const audit = {
    totalRows: rows.length,
    duplicateTimestamps: 0,
    outOfOrderTimestamps: 0,
    invalidOHLC: 0,
    nonFiniteValues: 0,
    negativeValues: 0,
    gapCount: 0,
    gaps: []
  };
  
  let prevTimestamp = -1;
  const seenTimestamps = new Set();
  
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    
    // Finite check
    if (!Number.isFinite(r.open) || !Number.isFinite(r.high) || 
        !Number.isFinite(r.low) || !Number.isFinite(r.close) || !Number.isFinite(r.volume)) {
      audit.nonFiniteValues++;
      console.log(`  ⚠ Non-finite value at row ${i}`);
    }
    
    // Positive check
    if (r.open <= 0 || r.high <= 0 || r.low <= 0 || r.close <= 0) {
      audit.negativeValues++;
      console.log(`  ⚠ Non-positive price at row ${i}`);
    }
    if (r.volume < 0) {
      audit.negativeValues++;
      console.log(`  ⚠ Negative volume at row ${i}`);
    }
    
    // OHLC integrity
    const maxOC = Math.max(r.open, r.close);
    const minOC = Math.min(r.open, r.close);
    if (r.high < maxOC - 1e-10 || r.low > minOC + 1e-10 || r.high < r.low) {
      audit.invalidOHLC++;
      if (audit.invalidOHLC <= 5) {
        console.log(`  ⚠ Invalid OHLC at row ${i}: O=${r.open} H=${r.high} L=${r.low} C=${r.close}`);
      }
    }
    
    // Duplicate timestamp
    if (seenTimestamps.has(r.timestamp)) {
      audit.duplicateTimestamps++;
      console.log(`  ⚠ Duplicate timestamp at row ${i}: ${r.timestamp}`);
    }
    seenTimestamps.add(r.timestamp);
    
    // Out of order
    if (r.timestamp <= prevTimestamp && i > 0) {
      audit.outOfOrderTimestamps++;
      console.log(`  ⚠ Out-of-order timestamp at row ${i}: ${r.timestamp} after ${prevTimestamp}`);
    }
    
    // Continuity check (60-second intervals)
    if (i > 0) {
      const delta = r.timestamp - prevTimestamp;
      if (delta !== PARAMS.intervalMs) {
        audit.gapCount++;
        audit.gaps.push({
          index: i,
          prevTimestamp,
          currTimestamp: r.timestamp,
          deltaMs: delta,
          expectedMs: PARAMS.intervalMs
        });
        if (audit.gaps.length <= 10) {
          console.log(`  ⚠ GAP at row ${i}: delta=${delta}ms, expected=${PARAMS.intervalMs}ms (${new Date(prevTimestamp).toISOString()} → ${new Date(r.timestamp).toISOString()})`);
        }
      }
    }
    
    prevTimestamp = r.timestamp;
  }
  
  // Summary
  console.log(`\n  ──── VALIDATION SUMMARY ────`);
  console.log(`  Total rows:            ${audit.totalRows}`);
  console.log(`  Duplicate timestamps:  ${audit.duplicateTimestamps}`);
  console.log(`  Out-of-order:          ${audit.outOfOrderTimestamps}`);
  console.log(`  Invalid OHLC:          ${audit.invalidOHLC}`);
  console.log(`  Non-finite values:     ${audit.nonFiniteValues}`);
  console.log(`  Negative values:       ${audit.negativeValues}`);
  console.log(`  Gap count:             ${audit.gapCount}`);
  
  // First and last timestamp
  const firstTs = rows[0].timestamp;
  const lastTs = rows[rows.length - 1].timestamp;
  console.log(`  First timestamp:       ${new Date(firstTs).toISOString()} (${firstTs})`);
  console.log(`  Last timestamp:        ${new Date(lastTs).toISOString()} (${lastTs})`);
  
  // Check expected boundaries
  if (firstTs !== PARAMS.expectedFirstTimestamp) {
    console.log(`  ⚠ FIRST TIMESTAMP MISMATCH: expected ${PARAMS.expectedFirstTimestamp}, got ${firstTs}`);
  } else {
    console.log(`  ✓ First timestamp matches expected`);
  }
  
  if (lastTs !== PARAMS.expectedLastTimestamp) {
    console.log(`  ⚠ LAST TIMESTAMP MISMATCH: expected ${PARAMS.expectedLastTimestamp}, got ${lastTs}`);
  } else {
    console.log(`  ✓ Last timestamp matches expected`);
  }
  
  if (audit.totalRows !== PARAMS.expectedRowCount) {
    console.log(`  ⚠ ROW COUNT MISMATCH: expected ${PARAMS.expectedRowCount}, got ${audit.totalRows}`);
  } else {
    console.log(`  ✓ Row count matches expected`);
  }
  
  // Fatal errors
  const fatal = audit.duplicateTimestamps > 0 || audit.outOfOrderTimestamps > 0 ||
                audit.nonFiniteValues > 0 || audit.negativeValues > 0;
  
  if (fatal) {
    throw new Error('DATASET REJECTED: Fatal validation errors detected. See audit above.');
  }
  
  // Gaps are warnings, not fatal — but we report them prominently
  if (audit.gapCount > 0) {
    console.log(`\n  ⚠ DATASET HAS ${audit.gapCount} TEMPORAL GAP(S)`);
    console.log(`  Decision required: gaps must be explicitly acknowledged before dataset enters the laboratory.`);
  }
  
  // Invalid OHLC are warnings (Binance data sometimes has minor floating-point issues)
  if (audit.invalidOHLC > 0) {
    console.log(`\n  ⚠ DATASET HAS ${audit.invalidOHLC} OHLC INTEGRITY WARNING(S)`);
  }
  
  return audit;
}

// ═══════════════════════════════════════════════
// STEP 7: HASH
// ═══════════════════════════════════════════════
function hashCanonical(csvPath) {
  console.log('\n[STEP 7] CANONICAL CONTENT HASH');
  
  const content = fs.readFileSync(csvPath);
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  
  console.log(`  ✓ SHA-256: ${hash}`);
  return hash;
}

// ═══════════════════════════════════════════════
// STEP 8: MANIFEST
// ═══════════════════════════════════════════════
function writeManifest(rows, rawSha256, canonicalSha256, audit) {
  console.log('\n[STEP 8] WRITE MANIFEST');
  
  const manifest = {
    datasetId: PARAMS.datasetId,
    source: PARAMS.source,
    sourceUrl: `${PARAMS.baseUrl}/${PARAMS.zipFilename}`,
    market: PARAMS.market,
    symbol: PARAMS.symbol,
    timeframe: PARAMS.timeframe,
    timezone: PARAMS.timezone,
    sourceFile: PARAMS.zipFilename,
    sourceSha256: rawSha256,
    canonicalSchema: PARAMS.canonicalSchema,
    rowCount: rows.length,
    startTimestamp: new Date(rows[0].timestamp).toISOString(),
    endTimestamp: new Date(rows[rows.length - 1].timestamp).toISOString(),
    canonicalContentHash: canonicalSha256,
    ingestionVersion: PARAMS.ingestionVersion,
    ingestedAt: new Date().toISOString(),
    scriptVersion: '1.0.0',
    nodeVersion: process.version,
    audit: {
      gapCount: audit.gapCount,
      invalidOHLC: audit.invalidOHLC,
      duplicateTimestamps: audit.duplicateTimestamps,
      outOfOrderTimestamps: audit.outOfOrderTimestamps,
      nonFiniteValues: audit.nonFiniteValues,
      negativeValues: audit.negativeValues,
      gaps: audit.gaps.slice(0, 20) // first 20 gaps for reference
    }
  };
  
  const manifestPath = path.join(BASE_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  console.log(`  ✓ Manifest written to: ${manifestPath}`);
  return manifest;
}

// ═══════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════
async function main() {
  console.log('══════════════════════════════════════════════════════');
  console.log(' DATASET INGESTION PIPELINE v1.0.0');
  console.log(' Binary Options Quant — Commit 006B');
  console.log('══════════════════════════════════════════════════════');
  console.log(`\n Parameters:`);
  console.log(`   Dataset ID:  ${PARAMS.datasetId}`);
  console.log(`   Symbol:      ${PARAMS.symbol}`);
  console.log(`   Timeframe:   ${PARAMS.timeframe}`);
  console.log(`   Period:      ${PARAMS.period}`);
  console.log(`   Source:      ${PARAMS.source}`);
  
  ensureDirs();
  
  const zipPath = path.join(RAW_DIR, PARAMS.zipFilename);
  const checksumPath = path.join(RAW_DIR, PARAMS.checksumFilename);
  
  // ── STEP 1: DOWNLOAD ──
  console.log('\n[STEP 1] DOWNLOAD');
  
  if (!fs.existsSync(zipPath)) {
    await downloadFile(`${PARAMS.baseUrl}/${PARAMS.zipFilename}`, zipPath);
    console.log('  ✓ ZIP downloaded');
  } else {
    console.log('  ✓ ZIP already exists (cached)');
  }
  
  if (!fs.existsSync(checksumPath)) {
    await downloadFile(`${PARAMS.baseUrl}/${PARAMS.checksumFilename}`, checksumPath);
    console.log('  ✓ CHECKSUM downloaded');
  } else {
    console.log('  ✓ CHECKSUM already exists (cached)');
  }
  
  // ── STEP 2: CHECKSUM ──
  const { actualHash: rawSha256 } = validateChecksum(zipPath, checksumPath);
  
  // ── STEP 3: DECOMPRESS ──
  const tempDir = path.join(RAW_DIR, '_temp');
  fs.mkdirSync(tempDir, { recursive: true });
  const sourceCsvPath = decompressZip(zipPath, tempDir);
  
  // ── STEP 4: VALIDATE SOURCE ──
  const rows = validateSource(sourceCsvPath);
  
  // Clean up temp dir
  fs.rmSync(tempDir, { recursive: true, force: true });
  
  // ── STEP 5: CANONICALIZE ──
  const canonicalPath = path.join(CANONICAL_DIR, 'BTCUSDT_1m_2024_01.csv');
  canonicalize(rows, canonicalPath);
  
  // ── STEP 6: VALIDATE CANONICAL ──
  const audit = validateCanonical(rows);
  
  // ── STEP 7: HASH ──
  const canonicalSha256 = hashCanonical(canonicalPath);
  
  // ── STEP 8: MANIFEST ──
  const manifest = writeManifest(rows, rawSha256, canonicalSha256, audit);
  
  // ── FINAL REPORT ──
  console.log('\n══════════════════════════════════════════════════════');
  console.log(' INGESTION COMPLETE');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Dataset ID:         ${manifest.datasetId}`);
  console.log(`  Rows:               ${manifest.rowCount}`);
  console.log(`  Period:             ${manifest.startTimestamp} → ${manifest.endTimestamp}`);
  console.log(`  Source SHA-256:      ${manifest.sourceSha256}`);
  console.log(`  Canonical SHA-256:   ${manifest.canonicalContentHash}`);
  console.log(`  Gaps:               ${audit.gapCount}`);
  console.log(`  Invalid OHLC:       ${audit.invalidOHLC}`);
  console.log(`  Node Version:       ${process.version}`);
  console.log(`  Ingestion Version:  ${PARAMS.ingestionVersion}`);
  console.log('══════════════════════════════════════════════════════');
  
  if (audit.gapCount === 0 && audit.invalidOHLC === 0 && audit.duplicateTimestamps === 0) {
    console.log('\n  ✅ DATASET APPROVED FOR LABORATORY INGESTION');
  } else if (audit.duplicateTimestamps === 0 && audit.outOfOrderTimestamps === 0 && audit.nonFiniteValues === 0) {
    console.log('\n  ⚠️  DATASET CONDITIONALLY APPROVED — review gaps and OHLC warnings before use');
  } else {
    console.log('\n  🚫 DATASET REJECTED');
  }
}

main().catch(err => {
  console.error(`\n🚨 PIPELINE FAILED: ${err.message}`);
  process.exit(1);
});
