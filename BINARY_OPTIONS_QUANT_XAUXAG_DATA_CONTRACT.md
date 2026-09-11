# DATA CONTRACT: XAU/XAG (OURO/PRATA — FUSION CFD)
**Contract Version:** 1.0.0-PROPOSED  
**Effective Target:** Binary Contract Research & Execution Fidelity  
**Asset Identifier:** `XAUXAG` (IQ Option / Fusion CFD)  
**Governance Status:** PENDING APPROVAL

---

## 1. Field Classification & Schema Definition

Every observation for the `XAU/XAG` instrument must strictly conform to this schema. No field shall be silently assumed, imputed, or coerced.

| Field Name | Type | Classification | Definition & Quantitative Rationale |
|---|---|:---:|---|
| `timestamp` | `Integer` | **REQUIRED** | Unix epoch milliseconds (UTC). Represents the exact candle opening boundary ($t_{\text{open}}$). Must be strictly positive and monotonic. |
| `open` | `Float` | **REQUIRED** | Price of the first quote within the candle interval. Must be finite, positive ($> 0$). |
| `high` | `Float` | **REQUIRED** | Maximum quoted price during the interval. Invariant: $high \ge \max(open, close)$ and $high \ge low$. |
| `low` | `Float` | **REQUIRED** | Minimum quoted price during the interval. Invariant: $low \le \min(open, close)$ and $low > 0$. |
| `close` | `Float` | **REQUIRED** | Final quoted price of the interval. Basis for signal evaluation and potential outcome resolution. |
| `volume` | `Float` | **DERIVED** | In OTC/CFD environments like IQ Option, true physical traded volume does not exist. This field records tick/quote count or synthetic broker volume. Default to $0.0$ if unquoted, but must be non-negative. |
| `asset` | `String` | **REQUIRED** | Canonical asset identifier within the lab: `"XAUXAG"`. Distinguishes from individual spot commodities (`XAUUSD`, `XAGUSD`). |
| `timeframe` | `String` | **REQUIRED** | Granularity identifier (e.g. `"1m"`, `"5m"`, `"15m"`). |
| `source` | `String` | **REQUIRED** | Exact origin identifier (e.g. `"IQ_OPTION_LIVE_STREAM"`, `"EXTERNAL_RECONSTRUCTED_DUKASCOPY"`, `"BINANCE_SYNTHETIC_RATIO"`). |
| `timezone` | `String` | **REQUIRED** | Must be strictly `"UTC"`. All incoming broker timestamps must be normalized to UTC without local daylight-saving offsets. |
| `market_type` | `String` | **REQUIRED** | Classification of price formation: `"CFD_FUSION"`, `"SPOT_RATIO"`, `"SYNTHETIC_DERIVED"`. Prevents cross-contamination. |
| `otc_flag` | `Boolean` | **REQUIRED** | `true` if captured during broker OTC hours or if the instrument feed is broker-internal; `false` during regular interbank market hours. |
| `server_time` | `Integer` | **OPTIONAL** | Broker server timestamp in milliseconds at the moment of packet receipt. Critical for clock-drift and network latency audits. |
| `source_symbol` | `String` | **REQUIRED** | Literal symbol name emitted by the data provider (e.g. `"XAU/XAG"`, `"Gold/Silver"`, `"Ouro/Prata"`). |
| `source_identifier` | `String/Int` | **REQUIRED** | Active ID or opcode assigned by the broker API (e.g. integer opcode in IQ Option). |
| `payout_rate` | `Float` | **OPTIONAL** | Observed payout rate $r_t \in (0, 1]$ active at the candle timestamp (e.g. $0.88$). |
| `settlement_price` | `Float` | **UNKNOWN** | Exact settlement price used by the broker to resolve binary contracts expiring at this timestamp. (Requires empirical reconciliation). |

---

## 2. Multi-Tier Data Architecture (Immutable Layers)

To prevent data contamination, retrospective editing, or silent cleaning, all data flows through 5 segregated, unidirectional layers:

```text
┌────────────────────────────────────────────────────────┐
│ 1. RAW LAYER (Immutable Raw Dumps)                     │
│ • Exact API payloads, raw websockets (JSONL / PCAP)     │
│ • Read-Only; Append-Only; Never modified or deleted   │
│ • Cryptographic SHA-256 manifest on ingest            │
└───────────────────────────┬────────────────────────────┘
                            │ (Deterministic Parser)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. VALIDATED LAYER (Structural Integrity)              │
│ • Rejection / Quarantine of corrupt records            │
│ • Zero Silent Cleaning: malformed records are dropped  │
│   into a QUARANTINE file with error annotations        │
└───────────────────────────┬────────────────────────────┘
                            │ (Normalization & UTC Alignment)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. CANONICAL LAYER (Lab Standard Dataset)               │
│ • Format: timestamp,open,high,low,close,volume         │
│ • Strict MarketObservation compliance                  │
│ • Deterministic contentHash generated & frozen         │
└───────────────────────────┬────────────────────────────┘
                            │ (Strict Causal Feature Extraction)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. DERIVED LAYER (Features & Indicators)               │
│ • Strict causality: Features at t use only obs <= t    │
│ • Zero look-ahead leakage                              │
└───────────────────────────┬────────────────────────────┘
                            │ (Out-of-Sample Partitioning)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 5. RESEARCH REPLAY LAYER (Blind Backtest / Walk-Fwd)   │
│ • ReplayEngine execution                               │
│ • Deterministic replayHash verification                │
└────────────────────────────────────────────────────────┘
```

---

## 3. Data Quality & Quarantine Invariants

Any record violating the following rules is immediately **REJECTED** or placed in **QUARANTINE**. In-place modification, linear interpolation, or synthetic imputation is strictly forbidden.

1. **Non-Monotonic / Duplicate Timestamps**:
   - Condition: $t_i \le t_{i-1}$.
   - Action: Immediate rejection of the entire batch. Duplicate timestamps indicate feed duplicate packets; out-of-order timestamps indicate network buffering.
2. **Geometric OHLC Inconsistencies**:
   - Condition: $high < \max(open, close)$ OR $low > \min(open, close)$ OR $high < low$.
   - Action: Quarantine record into `corrupted_records.jsonl`.
3. **Non-Finite / Negative Values**:
   - Condition: `isNaN`, `isInfinite`, $price \le 0$, $volume < 0$.
   - Action: Quarantine record. Zero prices are invalid for ratio assets.
4. **Timezone Inconsistencies**:
   - Condition: Any offset relative to UTC epoch milliseconds.
   - Action: Reject feed.
5. **OTC Contamination**:
   - Condition: Merging weekend OTC data into interbank weekday series without explicit regime labelling.
   - Action: Segregate into distinct datasets (`XAUXAG_WEEKDAY` vs `XAUXAG_WEEKEND_OTC`).

---

## 4. Strict Causality & Leakage Prevention

All downstream consumers of this dataset must abide by Constitutional Rules:
1. **At timestamp $t$**: Only information $obs \le t$ is accessible to feature extractors and signal models.
2. **Resolution Boundary**: Target resolution for an entry at $t_{\text{entry}}$ with expiry $k$ requires observation at $t_{\text{expiry}} \ge t_{\text{entry}} + k$. No intermediate or forward candle information may leak into the signal state at $t_{\text{entry}}$.
3. **Audit Verification Tests**:
   - `FUTURE_INJECTION_TEST`: Inject synthetic price anomalies at $t+1$; assert signal at $t$ is mathematically invariant.
   - `HISTORICAL_INVARIANCE_TEST`: Verify past feature values remain identical as new candles stream in.
   - `TEMPORAL_ORDER_TEST`: Assert $t_{\text{entry}} < t_{\text{expiry}}$ in all resolved outcomes.

---

## 5. Dataset Provenance Specification

Every dataset promoted to CANONICAL status must be accompanied by an immutable `manifest.json` containing:

```json
{
  "datasetId": "IQO_XAUXAG_1M_YYYY_MM",
  "asset": "XAUXAG",
  "source": "IQ_OPTION_LIVE_STREAM",
  "sourceSymbol": "XAU/XAG",
  "sourceIdentifier": "<ACTIVE_ID>",
  "marketType": "CFD_FUSION",
  "isOtc": false,
  "timeframe": "1m",
  "timezone": "UTC",
  "startTimestamp": "ISO-8601",
  "endTimestamp": "ISO-8601",
  "rowCount": 0,
  "rawFileSha256": "<SHA256_OF_RAW_DUMP>",
  "canonicalFileSha256": "<SHA256_OF_CANONICAL_CSV>",
  "datasetContentHash": "<SHA256_OF_DATASET_PAYLOAD>",
  "ingestionVersion": "1.0.0",
  "validationStatus": "PASSED",
  "audit": {
    "gapCount": 0,
    "duplicateCount": 0,
    "outOfOrderCount": 0,
    "invalidOHLCCount": 0,
    "quarantinedCount": 0
  }
}
```
