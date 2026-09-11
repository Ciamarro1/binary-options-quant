/**
 * Phase 3: External Ratio Reconstruction Pipeline
 * 
 * Downloads concurrent XAU/USD and XAG/USD 1-minute candles from Dukascopy,
 * aligns timestamps, computes the reconstructed ratio R_t = XAU/XAG,
 * validates OHLC geometric invariants, and exports canonical CSV with SHA-256 manifest.
 *
 * Usage:
 *   node scripts/data_acquisition/fetch_dukascopy_xauxag.js --from 2025-01-01 --to 2025-01-31
 *
 * Output:
 *   research/datasets/EXTERNAL_XAUXAG_1M/EXTERNAL_XAUXAG_1M.csv
 *   research/datasets/EXTERNAL_XAUXAG_1M/MANIFEST.json
 *
 * Constitutional Invariants Enforced:
 *   - Strict timestamp alignment (both instruments must have matching M1 bars)
 *   - Zero division guard (XAG/USD close > 0)
 *   - OHLC geometric validation: high >= max(open, close) && low <= min(open, close)
 *   - No forward-looking data (causal ordering enforced via monotonic timestamps)
 *   - SHA-256 content hash for provenance
 */

const { getHistoricalRates } = require('dukascopy-node');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── CLI argument parsing ───────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    parsed[key] = args[i + 1];
  }
  if (!parsed.from || !parsed.to) {
    console.error('Usage: node fetch_dukascopy_xauxag.js --from YYYY-MM-DD --to YYYY-MM-DD');
    process.exit(1);
  }
  return parsed;
}

// ─── Download M1 candles from Dukascopy ─────────────────────────────────────
async function fetchInstrument(instrument, from, to) {
  console.log(`[FETCH] ${instrument} M1 from ${from} to ${to}...`);
  const data = await getHistoricalRates({
    instrument,
    dates: {
      from: new Date(from),
      to: new Date(to)
    },
    timeframe: 'm1',
    format: 'json'
  });
  console.log(`[FETCH] ${instrument}: ${data.length} candles received`);
  return data;
}

// ─── OHLC Geometric Validation ──────────────────────────────────────────────
function validateOHLC(candle, source) {
  const { open, high, low, close } = candle;
  if (high < Math.max(open, close)) {
    return `[${source}] high < max(open, close) at ${new Date(candle.timestamp).toISOString()}`;
  }
  if (low > Math.min(open, close)) {
    return `[${source}] low > min(open, close) at ${new Date(candle.timestamp).toISOString()}`;
  }
  if (high < low) {
    return `[${source}] high < low at ${new Date(candle.timestamp).toISOString()}`;
  }
  return null;
}

// ─── Ratio Reconstruction ───────────────────────────────────────────────────
function reconstructRatio(xauCandles, xagCandles) {
  // Build lookup map for XAG by timestamp
  const xagMap = new Map();
  for (const candle of xagCandles) {
    xagMap.set(candle.timestamp, candle);
  }

  const aligned = [];
  const quarantined = [];
  const violations = [];
  let lastTimestamp = -Infinity;

  for (const xau of xauCandles) {
    const ts = xau.timestamp;

    // Monotonic timestamp check
    if (ts <= lastTimestamp) {
      quarantined.push({ reason: 'NON_MONOTONIC_XAU', timestamp: ts, value: xau });
      continue;
    }

    // Alignment check: must have matching XAG candle
    const xag = xagMap.get(ts);
    if (!xag) {
      quarantined.push({ reason: 'NO_MATCHING_XAG', timestamp: ts, value: xau });
      continue;
    }

    // Validate OHLC geometry for both
    const xauViolation = validateOHLC(xau, 'XAUUSD');
    if (xauViolation) {
      violations.push(xauViolation);
      quarantined.push({ reason: 'OHLC_VIOLATION_XAU', timestamp: ts, value: xau });
      continue;
    }
    const xagViolation = validateOHLC(xag, 'XAGUSD');
    if (xagViolation) {
      violations.push(xagViolation);
      quarantined.push({ reason: 'OHLC_VIOLATION_XAG', timestamp: ts, value: xag });
      continue;
    }

    // Zero division guard
    if (xag.open <= 0 || xag.high <= 0 || xag.low <= 0 || xag.close <= 0) {
      quarantined.push({ reason: 'XAG_ZERO_DIVISION', timestamp: ts, value: xag });
      continue;
    }

    // Compute ratio OHLCV
    const ratioOpen = xau.open / xag.open;
    const ratioHigh = xau.high / xag.high;
    const ratioLow = xau.low / xag.low;
    const ratioClose = xau.close / xag.close;
    // Volume: take minimum of both (conservative) — or 0 if either is missing
    const ratioVolume = Math.min(xau.volume || 0, xag.volume || 0);

    // Validate reconstructed ratio OHLC (ratio high/low may not preserve geometric ordering)
    // Compute actual high/low from the 4 ratio values
    const allRatioValues = [ratioOpen, ratioHigh, ratioLow, ratioClose];
    const actualHigh = Math.max(...allRatioValues);
    const actualLow = Math.min(...allRatioValues);

    aligned.push({
      timestamp: ts,
      open: ratioOpen,
      high: actualHigh,
      low: actualLow,
      close: ratioClose,
      volume: ratioVolume,
      // Preserve component prices for fidelity audit (Phase 4)
      _xau_close: xau.close,
      _xag_close: xag.close,
      _xau_open: xau.open,
      _xag_open: xag.open
    });

    lastTimestamp = ts;
  }

  return { aligned, quarantined, violations };
}

// ─── Export canonical CSV ───────────────────────────────────────────────────
function exportCSV(records, outputPath) {
  const header = 'timestamp,open,high,low,close,volume';
  const lines = records.map(r =>
    `${r.timestamp},${r.open.toFixed(6)},${r.high.toFixed(6)},${r.low.toFixed(6)},${r.close.toFixed(6)},${r.volume}`
  );
  const content = [header, ...lines].join('\n') + '\n';
  fs.writeFileSync(outputPath, content, 'utf-8');
  return content;
}

// ─── Compute SHA-256 ────────────────────────────────────────────────────────
function sha256(content) {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs();

  console.log('=== Phase 3: External Ratio Reconstruction Pipeline ===');
  console.log(`Date range: ${args.from} to ${args.to}`);
  console.log('');

  // Step 1: Fetch both instruments
  const [xauCandles, xagCandles] = await Promise.all([
    fetchInstrument('xauusd', args.from, args.to),
    fetchInstrument('xagusd', args.from, args.to)
  ]);

  console.log('');
  console.log(`[ALIGN] XAU/USD candles: ${xauCandles.length}`);
  console.log(`[ALIGN] XAG/USD candles: ${xagCandles.length}`);

  // Step 2: Reconstruct ratio
  const { aligned, quarantined, violations } = reconstructRatio(xauCandles, xagCandles);

  console.log(`[ALIGN] Aligned ratio candles: ${aligned.length}`);
  console.log(`[ALIGN] Quarantined: ${quarantined.length}`);
  if (violations.length > 0) {
    console.log(`[WARN] OHLC violations: ${violations.length}`);
    violations.slice(0, 5).forEach(v => console.log(`  - ${v}`));
  }

  if (aligned.length === 0) {
    console.error('[FATAL] Zero aligned candles. Cannot proceed.');
    process.exit(1);
  }

  // Step 3: Export canonical CSV
  const outputDir = path.join(__dirname, '..', '..', 'research', 'datasets', 'EXTERNAL_XAUXAG_1M');
  fs.mkdirSync(outputDir, { recursive: true });

  const csvPath = path.join(outputDir, 'EXTERNAL_XAUXAG_1M.csv');
  const csvContent = exportCSV(aligned, csvPath);
  const contentHash = sha256(csvContent);

  console.log('');
  console.log(`[EXPORT] CSV written: ${csvPath}`);
  console.log(`[EXPORT] SHA-256: ${contentHash}`);

  // Step 4: Export component prices for Phase 4 fidelity audit
  const componentsPath = path.join(outputDir, 'EXTERNAL_XAUXAG_1M_COMPONENTS.jsonl');
  const componentsLines = aligned.map(r => JSON.stringify({
    timestamp: r.timestamp,
    ratio_close: r.close,
    xau_close: r._xau_close,
    xag_close: r._xag_close,
    xau_open: r._xau_open,
    xag_open: r._xag_open
  }));
  fs.writeFileSync(componentsPath, componentsLines.join('\n') + '\n', 'utf-8');
  console.log(`[EXPORT] Component prices: ${componentsPath}`);

  // Step 5: Export quarantine log (if any)
  if (quarantined.length > 0) {
    const quarantinePath = path.join(outputDir, 'QUARANTINE.jsonl');
    const qLines = quarantined.map(q => JSON.stringify(q));
    fs.writeFileSync(quarantinePath, qLines.join('\n') + '\n', 'utf-8');
    console.log(`[EXPORT] Quarantine log: ${quarantinePath}`);
  }

  // Step 6: Generate manifest
  const firstTs = aligned[0].timestamp;
  const lastTs = aligned[aligned.length - 1].timestamp;

  const manifest = {
    datasetId: 'EXTERNAL_XAUXAG_1M',
    version: '1.0.0',
    source: 'DUKASCOPY',
    sourceType: 'EXTERNAL_SPOT_RECONSTRUCTION',
    description: 'Reconstructed XAU/XAG ratio from Dukascopy spot XAU/USD and XAG/USD M1 candles',
    construction: 'R_t = XAU/USD(t) / XAG/USD(t)',
    dateRange: {
      from: args.from,
      to: args.to,
      firstTimestamp: firstTs,
      lastTimestamp: lastTs,
      firstISO: new Date(firstTs).toISOString(),
      lastISO: new Date(lastTs).toISOString()
    },
    statistics: {
      totalXAUCandles: xauCandles.length,
      totalXAGCandles: xagCandles.length,
      alignedCandles: aligned.length,
      quarantinedCandles: quarantined.length,
      ohlcViolations: violations.length,
      alignmentRate: ((aligned.length / Math.max(xauCandles.length, xagCandles.length)) * 100).toFixed(2) + '%'
    },
    contentHash: contentHash,
    hashAlgorithm: 'SHA-256',
    csvFile: 'EXTERNAL_XAUXAG_1M.csv',
    csvFormat: 'timestamp,open,high,low,close,volume',
    timestampFormat: 'UNIX_MILLISECONDS',
    ratioPrecision: 6,
    createdAt: new Date().toISOString(),
    dataLevel: 'LEVEL_0_UNVERIFIED',
    promotionPath: 'Must pass Fidelity Protocol (Phase 4) to reach LEVEL_1_RESEARCH_GRADE'
  };

  const manifestPath = path.join(outputDir, 'MANIFEST.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`[EXPORT] Manifest: ${manifestPath}`);

  // Summary
  console.log('');
  console.log('=== Phase 3 Summary ===');
  console.log(`Total aligned candles: ${aligned.length}`);
  console.log(`Quarantined: ${quarantined.length}`);
  console.log(`Content Hash: ${contentHash}`);
  console.log(`Data Level: LEVEL_0_UNVERIFIED`);
  console.log(`Next Step: Phase 4 (Cross-Venue Fidelity Audit) requires concurrent IQ Option data`);
  console.log('=== Done ===');
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
