/**
 * Phase 4: Cross-Venue Fidelity & Divergence Audit
 *
 * Implements the Fidelity Protocol defined in BINARY_OPTIONS_QUANT_XAUXAG_FIDELITY_PROTOCOL.md.
 * Computes ΔP, ρ_h, DAR_h, and BSIR_h across multiple horizons to evaluate
 * whether the IQ Option XAU/XAG feed is statistically coherent with the
 * Dukascopy-reconstructed external spot ratio.
 *
 * Usage:
 *   node scripts/data_acquisition/fidelity_audit_xauxag.js
 *
 * Prerequisites:
 *   - Phase 3 output: research/datasets/EXTERNAL_XAUXAG_1M/EXTERNAL_XAUXAG_1M.csv
 *   - IQ Option raw capture: research/execution/data_acquisition/raw/IQO_XAU_XAG_60s_raw.jsonl
 *
 * Output:
 *   research/reports/XAUXAG_FIDELITY_AUDIT_REPORT.json
 *
 * Metrics (per Fidelity Protocol v1.0.0):
 *   - Price Level Divergence: μ(ΔP), σ(ΔP), PTE
 *   - Return Correlation: ρ_h for h ∈ {1m, 2m, 3m, 5m, 15m}
 *   - Directional Agreement Rate: DAR_h
 *   - Binary Settlement Inversion Rate: BSIR_h
 *
 * Promotion Gates:
 *   Level 1→2: ρ_15m ≥ 0.98, ρ_1m ≥ 0.95, DAR_15m ≥ 94%, DAR_1m ≥ 90%, BSIR_15m ≤ 2%, BSIR_1m ≤ 3.5%
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// ─── Configuration ──────────────────────────────────────────────────────────
const HORIZONS = [1, 2, 3, 5, 15]; // in minutes
const PROMOTION_GATES = {
  rho_15m: 0.98,
  rho_1m: 0.95,
  dar_15m: 0.94,
  dar_1m: 0.90,
  bsir_15m: 0.02,
  bsir_1m: 0.035
};

// ─── Load External (Dukascopy) Dataset ──────────────────────────────────────
function loadExternalCSV() {
  const csvPath = path.join(PROJECT_ROOT, 'research', 'datasets', 'EXTERNAL_XAUXAG_1M', 'EXTERNAL_XAUXAG_1M.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`External dataset not found: ${csvPath}\nRun Phase 3 first.`);
  }
  const lines = fs.readFileSync(csvPath, 'utf-8').trim().split('\n');
  const header = lines[0]; // timestamp,open,high,low,close,volume
  if (!header.startsWith('timestamp,')) {
    throw new Error('Unexpected CSV header format');
  }

  const data = new Map();
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const ts = parseInt(parts[0], 10);
    data.set(ts, {
      timestamp: ts,
      open: parseFloat(parts[1]),
      high: parseFloat(parts[2]),
      low: parseFloat(parts[3]),
      close: parseFloat(parts[4]),
      volume: parseFloat(parts[5])
    });
  }
  return data;
}

// ─── Load IQ Option Raw Data ────────────────────────────────────────────────
function loadIQOptionData() {
  const rawDir = path.join(PROJECT_ROOT, 'research', 'execution', 'data_acquisition', 'raw');
  const files = fs.readdirSync(rawDir).filter(f => f.startsWith('IQO_XAU_XAG_') && f.endsWith('.jsonl'));
  if (files.length === 0) {
    throw new Error(`No IQ Option XAU/XAG raw data found in ${rawDir}`);
  }

  const data = new Map();
  for (const file of files) {
    const content = fs.readFileSync(path.join(rawDir, file), 'utf-8').trim().split('\n');
    for (const line of content) {
      if (!line.trim()) continue;
      const record = JSON.parse(line);
      // Only use CLOSED candles for fidelity comparison
      if (record.candle_status !== 'CLOSED') continue;

      const payload = record.raw_payload;
      // IQ Option: 'from' is epoch seconds, convert to milliseconds
      const tsMs = payload.from * 1000;

      // IQ Option uses min/max instead of low/high
      data.set(tsMs, {
        timestamp: tsMs,
        open: payload.open,
        high: payload.max,
        low: payload.min,
        close: payload.close,
        volume: payload.volume || 0
      });
    }
  }
  return data;
}

// ─── Statistical Helpers ────────────────────────────────────────────────────
function mean(arr) {
  if (arr.length === 0) return NaN;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr) {
  if (arr.length < 2) return NaN;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function pearsonCorrelation(x, y) {
  if (x.length !== y.length || x.length < 3) return NaN;
  const mx = mean(x);
  const my = mean(y);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? NaN : num / denom;
}

// ─── Align Contemporary Timestamps ─────────────────────────────────────────
function alignDatasets(extData, iqoData) {
  const aligned = [];
  for (const [ts, ext] of extData) {
    const iqo = iqoData.get(ts);
    if (iqo) {
      aligned.push({ timestamp: ts, ext, iqo });
    }
  }
  // Sort by timestamp
  aligned.sort((a, b) => a.timestamp - b.timestamp);
  return aligned;
}

// ─── Price Level Divergence ─────────────────────────────────────────────────
function computePriceDivergence(aligned) {
  const deltas = aligned.map(a => a.iqo.close - a.ext.close);
  const ptes = aligned.map(a =>
    a.ext.close !== 0 ? (Math.abs(a.iqo.close - a.ext.close) / a.ext.close) * 100 : NaN
  ).filter(v => !isNaN(v));

  return {
    N: deltas.length,
    mean_delta_P: mean(deltas),
    stddev_delta_P: stddev(deltas),
    mean_PTE_percent: mean(ptes),
    max_PTE_percent: ptes.length > 0 ? Math.max(...ptes) : NaN,
    median_PTE_percent: ptes.length > 0 ? ptes.sort((a, b) => a - b)[Math.floor(ptes.length / 2)] : NaN
  };
}

// ─── Horizon Metrics ────────────────────────────────────────────────────────
function computeHorizonMetrics(aligned, horizonMinutes) {
  const horizonMs = horizonMinutes * 60 * 1000;

  // Build lookup for quick access
  const iqoMap = new Map();
  const extMap = new Map();
  for (const a of aligned) {
    iqoMap.set(a.timestamp, a.iqo);
    extMap.set(a.timestamp, a.ext);
  }

  const iqoReturns = [];
  const extReturns = [];
  const darPairs = [];
  const bsirPairs = [];

  for (const a of aligned) {
    const futureTs = a.timestamp + horizonMs;
    const iqoFuture = iqoMap.get(futureTs);
    const extFuture = extMap.get(futureTs);

    if (!iqoFuture || !extFuture) continue;

    // Returns
    const rIqo = (iqoFuture.close - a.iqo.close) / a.iqo.close;
    const rExt = (extFuture.close - a.ext.close) / a.ext.close;

    iqoReturns.push(rIqo);
    extReturns.push(rExt);

    // DAR: exclude pushes (zero returns)
    if (rIqo !== 0 && rExt !== 0) {
      darPairs.push({
        iqoSign: Math.sign(rIqo),
        extSign: Math.sign(rExt)
      });
    }

    // BSIR: For a CALL signal, WIN on ext means rExt > 0
    // Check if WIN on ext but LOSS on IQO
    // We check both directions (CALL and PUT)
    if (rExt > 0) {
      // External says WIN (for a CALL)
      bsirPairs.push({
        extOutcome: 'WIN',
        iqoOutcome: rIqo > 0 ? 'WIN' : (rIqo < 0 ? 'LOSS' : 'PUSH')
      });
    } else if (rExt < 0) {
      // External says WIN (for a PUT)
      bsirPairs.push({
        extOutcome: 'WIN',
        iqoOutcome: rIqo < 0 ? 'WIN' : (rIqo > 0 ? 'LOSS' : 'PUSH')
      });
    }
  }

  // Pearson correlation
  const rho = pearsonCorrelation(iqoReturns, extReturns);

  // DAR
  const darAgreed = darPairs.filter(p => p.iqoSign === p.extSign).length;
  const dar = darPairs.length > 0 ? darAgreed / darPairs.length : NaN;

  // BSIR: P(IQO=LOSS | EXT=WIN)
  const extWins = bsirPairs.filter(p => p.extOutcome === 'WIN');
  const inversions = extWins.filter(p => p.iqoOutcome === 'LOSS').length;
  const bsir = extWins.length > 0 ? inversions / extWins.length : NaN;

  return {
    horizon: `${horizonMinutes}m`,
    horizonMs,
    N_pairs: iqoReturns.length,
    rho,
    dar,
    dar_N: darPairs.length,
    bsir,
    bsir_N_ext_wins: extWins.length,
    bsir_inversions: inversions
  };
}

// ─── Evaluate Promotion Gates ───────────────────────────────────────────────
function evaluatePromotionGates(horizonResults) {
  const m1 = horizonResults.find(h => h.horizon === '1m');
  const m15 = horizonResults.find(h => h.horizon === '15m');

  const gates = {
    rho_15m: { required: PROMOTION_GATES.rho_15m, actual: m15 ? m15.rho : NaN, pass: false },
    rho_1m: { required: PROMOTION_GATES.rho_1m, actual: m1 ? m1.rho : NaN, pass: false },
    dar_15m: { required: PROMOTION_GATES.dar_15m, actual: m15 ? m15.dar : NaN, pass: false },
    dar_1m: { required: PROMOTION_GATES.dar_1m, actual: m1 ? m1.dar : NaN, pass: false },
    bsir_15m: { required: `≤ ${PROMOTION_GATES.bsir_15m}`, actual: m15 ? m15.bsir : NaN, pass: false },
    bsir_1m: { required: `≤ ${PROMOTION_GATES.bsir_1m}`, actual: m1 ? m1.bsir : NaN, pass: false }
  };

  if (m15) {
    gates.rho_15m.pass = m15.rho >= PROMOTION_GATES.rho_15m;
    gates.dar_15m.pass = m15.dar >= PROMOTION_GATES.dar_15m;
    gates.bsir_15m.pass = m15.bsir <= PROMOTION_GATES.bsir_15m;
  }
  if (m1) {
    gates.rho_1m.pass = m1.rho >= PROMOTION_GATES.rho_1m;
    gates.dar_1m.pass = m1.dar >= PROMOTION_GATES.dar_1m;
    gates.bsir_1m.pass = m1.bsir <= PROMOTION_GATES.bsir_1m;
  }

  const allPass = Object.values(gates).every(g => g.pass);

  return {
    gates,
    verdict: allPass ? 'PROMOTED_TO_LEVEL_2_FIDELITY_VALIDATED' : 'REMAINS_LEVEL_1_RESEARCH_GRADE',
    allGatesPass: allPass
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────
function main() {
  console.log('=== Phase 4: Cross-Venue Fidelity & Divergence Audit ===');
  console.log('Protocol: BINARY_OPTIONS_QUANT_XAUXAG_FIDELITY_PROTOCOL v1.0.0');
  console.log('');

  // Load datasets
  console.log('[LOAD] Loading External (Dukascopy) dataset...');
  const extData = loadExternalCSV();
  console.log(`[LOAD] External: ${extData.size} candles`);

  console.log('[LOAD] Loading IQ Option raw data...');
  const iqoData = loadIQOptionData();
  console.log(`[LOAD] IQ Option: ${iqoData.size} candles`);

  // Align
  console.log('[ALIGN] Aligning contemporary timestamps...');
  const aligned = alignDatasets(extData, iqoData);
  console.log(`[ALIGN] Aligned pairs: ${aligned.length}`);

  if (aligned.length === 0) {
    console.log('');
    console.log('[RESULT] Zero aligned pairs found.');
    console.log('[RESULT] This means the IQ Option captured data does NOT overlap with the External dataset period.');
    console.log('[RESULT] IQ Option data period and Dukascopy data period must overlap for fidelity comparison.');
    console.log('');

    // Show date ranges
    const iqoTimestamps = [...iqoData.keys()].sort((a, b) => a - b);
    const extTimestamps = [...extData.keys()].sort((a, b) => a - b);

    console.log(`[INFO] IQ Option range: ${new Date(iqoTimestamps[0]).toISOString()} to ${new Date(iqoTimestamps[iqoTimestamps.length - 1]).toISOString()}`);
    console.log(`[INFO] External range: ${new Date(extTimestamps[0]).toISOString()} to ${new Date(extTimestamps[extTimestamps.length - 1]).toISOString()}`);
    console.log('');
    console.log('[ACTION] Run the IQ Option recorder for a prolonged period during market hours,');
    console.log('[ACTION] then re-run Phase 3 with --from and --to matching the IQ Option capture period.');
    console.log('[ACTION] Target: N ≥ 10,000 contemporary M1 observations.');

    // Still emit a partial report
    const report = {
      protocolVersion: '1.0.0',
      status: 'INSUFFICIENT_OVERLAP',
      iqoRange: {
        first: new Date(iqoTimestamps[0]).toISOString(),
        last: new Date(iqoTimestamps[iqoTimestamps.length - 1]).toISOString(),
        count: iqoData.size
      },
      extRange: {
        first: new Date(extTimestamps[0]).toISOString(),
        last: new Date(extTimestamps[extTimestamps.length - 1]).toISOString(),
        count: extData.size
      },
      alignedPairs: 0,
      minimumRequired: 10000,
      createdAt: new Date().toISOString()
    };

    const reportDir = path.join(PROJECT_ROOT, 'research', 'reports');
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'XAUXAG_FIDELITY_AUDIT_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`[EXPORT] Report: ${reportPath}`);
    return;
  }

  // Minimum sample check
  if (aligned.length < 10000) {
    console.log(`[WARN] Aligned pairs (${aligned.length}) < minimum required (10,000).`);
    console.log('[WARN] Results will be computed but marked as PRELIMINARY.');
    console.log('');
  }

  // Price Level Divergence
  console.log('[COMPUTE] Price Level Divergence...');
  const priceDivergence = computePriceDivergence(aligned);
  console.log(`  μ(ΔP) = ${priceDivergence.mean_delta_P.toFixed(6)}`);
  console.log(`  σ(ΔP) = ${priceDivergence.stddev_delta_P.toFixed(6)}`);
  console.log(`  Mean PTE = ${priceDivergence.mean_PTE_percent.toFixed(4)}%`);

  // Horizon Metrics
  console.log('[COMPUTE] Horizon metrics...');
  const horizonResults = [];
  for (const h of HORIZONS) {
    const result = computeHorizonMetrics(aligned, h);
    horizonResults.push(result);
    console.log(`  [${h}m] ρ=${result.rho.toFixed(4)} | DAR=${(result.dar * 100).toFixed(2)}% | BSIR=${(result.bsir * 100).toFixed(2)}% (N=${result.N_pairs})`);
  }

  // Promotion Gate Evaluation
  console.log('');
  console.log('[GATES] Evaluating Promotion Gates (Level 1 → Level 2)...');
  const promotion = evaluatePromotionGates(horizonResults);
  for (const [gate, result] of Object.entries(promotion.gates)) {
    const status = result.pass ? '✓ PASS' : '✗ FAIL';
    const actual = typeof result.actual === 'number' ?
      (result.actual < 1 ? (result.actual * 100).toFixed(2) + '%' : result.actual.toFixed(4)) : 'N/A';
    console.log(`  ${status} | ${gate}: required=${result.required}, actual=${actual}`);
  }
  console.log(`  Verdict: ${promotion.verdict}`);

  // Build report
  const report = {
    protocolVersion: '1.0.0',
    status: aligned.length >= 10000 ? 'CONCLUSIVE' : 'PRELIMINARY',
    alignedPairs: aligned.length,
    minimumRequired: 10000,
    dateRange: {
      first: new Date(aligned[0].timestamp).toISOString(),
      last: new Date(aligned[aligned.length - 1].timestamp).toISOString()
    },
    priceDivergence,
    horizonMetrics: horizonResults,
    promotionGates: promotion,
    createdAt: new Date().toISOString()
  };

  const reportDir = path.join(PROJECT_ROOT, 'research', 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'XAUXAG_FIDELITY_AUDIT_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log('');
  console.log(`[EXPORT] Report: ${reportPath}`);
  console.log('=== Phase 4 Complete ===');
}

main();
