# IMPLEMENTATION PLAN: XAU/XAG DATA INFRASTRUCTURE
**Plan Version:** 1.0.0  
**Domain:** Research Operations & Engineering  
**Guiding Mandate:** DATA FIRST. STRATEGY LATER.  
**Execution Condition:** Requires Explicit User Authorization Before Execution

---

## 1. Principles & Constitutional Boundaries

This implementation plan is strictly limited to **data infrastructure, instrument introspection, and fidelity verification**. Under no circumstances does this plan authorize:
- Strategy formulation or backtesting
- Indicator mining or threshold tuning
- Martingale, position sizing, or order execution
- Silent data patching or automated dataset manipulation

All code produced in this plan must obey:
- Zero Silent Patching (all dropped/corrupted data must be quarantined with logs)
- Determinism & Provenance (cryptographic SHA-256 hashes on raw and canonical files)
- Separation of Duties (Research vs Execution segregation)

---

## 2. Phased Architecture & Execution Roadmap

```text
┌────────────────────────────────────────────────────────┐
│ PHASE 1: ACTIVE DISCOVERY & METRIC INTROSPECTION       │
│ • Probe IQ Option API for XAU/XAG active opcode        │
│ • Output: XAUXAG_INSTRUMENT_DISCOVERY.json             │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ PHASE 2: OBSERVATION RECORDER UPGRADE                  │
│ • Fix closed-candle deduplication bug in recorder.py   │
│ • Stream 1m candles + server timestamp + live payout  │
│ • Output: research/execution/data_acquisition/raw/     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ PHASE 3: EXTERNAL RATIO RECONSTRUCTION PIPELINE        │
│ • Acquire contemporaneous Spot XAU/USD & XAG/USD 1m    │
│ • Build deterministic ratio: R_t = XAU / XAG           │
│ • Output: research/datasets/EXTERNAL_XAUXAG_1M/        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ PHASE 4: CROSS-VENUE FIDELITY & DIVERGENCE AUDIT       │
│ • Execute Fidelity Protocol (ΔP, Corr, DAR, BSIR)      │
│ • Output: XAUXAG_FIDELITY_AUDIT_REPORT.json            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ PHASE 5: CANONICAL DATASET INGESTION                   │
│ • Ingest into Lab standard DatasetLoader format        │
│ • Generate manifest.json & datasetContentHash          │
│ • Pass all 60 Jest test suites                         │
└────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Phase Breakdown

### Phase 1: Instrument Active Discovery (`scripts/execution/discover_actives.py`)
- **Objective**: Programmatically query IQ Option's initialization channels (`get_all_init()`, `instruments_input_to_ACTIVES("cfd")`, `get_ALL_Binary_ACTIVES_OPCODE`) to locate the exact instrument identifier for XAU/XAG / Ouro/Prata.
- **Actions**:
  1. Authenticate in PRACTICE mode with read-only credentials from `.env`.
  2. Search all instrument dictionaries (`cfd`, `binary`, `turbo`, `digital-option`) for keywords `["xau", "xag", "gold", "silver", "ouro", "prata", "fusion"]`.
  3. Extract:
     - `active_id` (numeric opcode)
     - `name` / `ticker`
     - `precision` (decimal places)
     - `min_strike` / `max_strike` / `spread`
     - `is_open` / `trading_schedule`
     - Current binary payout rate ($r_t$)
  4. Test historical lookback limits via isolated `get_candles` test call ($count = 10$).
  5. Emit `research/execution/XAUXAG_INSTRUMENT_DISCOVERY.json`.

### Phase 2: Live Observation Recorder Upgrade
- **Objective**: Harden `research/execution/data_acquisition/recorder/recorder.py` for continuous, fault-tolerant capture.
- **Actions**:
  1. Fix deduplication logic: Track `last_closed_ts` separately from `forming_ts` so that finalized `CLOSED` candles are accurately recorded with their official closing values.
  2. Record live payout snapshot alongside each candle.
  3. Format output as append-only JSONL with UTC ISO timestamps.

### Phase 3: External Ratio Reconstruction
- **Objective**: Establish an interbank spot benchmark for the Gold/Silver ratio.
- **Actions**:
  1. Ingest clean 1-minute historical klines for `XAU/USD` and `XAG/USD` from a certified institutional spot provider (e.g. Dukascopy or Binance).
  2. Align timestamps to identical millisecond boundaries.
  3. Compute $R_t = \frac{P_{\text{XAU}}}{P_{\text{XAG}}}$ and validate $high \ge \max(open, close)$ and $low \le \min(open, close)$.
  4. Export canonical CSV with SHA-256 manifest.

### Phase 4: Cross-Venue Fidelity & Divergence Audit
- **Objective**: Execute the test defined in `BINARY_OPTIONS_QUANT_XAUXAG_FIDELITY_PROTOCOL.md`.
- **Actions**:
  1. Align contemporaneous samples ($N \ge 10,000$ minutes).
  2. Calculate $\mu_{\Delta P}$, $\sigma_{\Delta P}$, $\text{PTE}$, $\rho_h$, $\text{DAR}_h$, and $\text{BSIR}_h$ across 1m, 2m, 3m, 5m, and 15m.
  3. Evaluate against promotion gates (Research-Grade vs Fidelity-Validated).
  4. Emit `research/reports/XAUXAG_FIDELITY_AUDIT_REPORT.json`.

### Phase 5: Canonical Dataset Ingestion
- **Objective**: Convert the verified dataset into the lab's official `Dataset` format.
- **Actions**:
  1. Produce canonical CSV conforming to `DatasetLoader.js` (`timestamp,open,high,low,close,volume`).
  2. Compute `datasetContentHash` via SHA-256.
  3. Verify via `DatasetValidator.validate()` and run `npm test`.

---

## 4. Verification Plan

1. **Automated Verification**:
   - `npm test`: Ensure all 60 test suites continue to pass with 0 regressions.
   - New unit tests for `XAUXAG` observation validation.
   - Future-injection adversarial tests on canonical ratio data.
2. **Manual Verification**:
   - Inspect JSON discovery receipt for exact broker opcode and decimal precision.
   - Verify that no trading orders or unauthorized account calls were executed.
