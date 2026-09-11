# FORENSIC REPOSITORY AUDIT: BINARY OPTIONS QUANT
**Asset Focus:** XAU/XAG (Ouro/Prata — Fusion CFD)  
**Audit Date:** 2026-09-10  
**Domain:** Quantitative Architecture & Repository Forensics  
**Status:** COMPLETE (Zero Code Modifications Performed)

---

## 1. Executive Overview & Repository Structure

An exhaustive forensic inspection of the `binary-options-quant` repository was conducted to assess architectural readiness, data schemas, validation invariants, replay determinism, and execution hooks prior to any integration of the `XAU/XAG` instrument.

### 1.1 Directory Tree Mapping
```text
binary-options-quant/
├── .agents/                        # Multi-agent charters, skills, and runbooks
├── artifacts/                      # Execution outputs and historical runs
├── docs/                           # System documentation and quantitative contracts
│   ├── ARCHITECTURE.md             # System architecture specification
│   ├── DATA_CONTRACT.md            # Canonical data specification
│   ├── EXECUTION_CONTRACT.md       # Execution bridge & broker guidelines
│   ├── GOVERNANCE.md               # Governance, permissions, and roles
│   ├── QUANT_CONTRACT.md           # Mathematical and statistical boundaries
│   └── RESEARCH_PROTOCOL.md        # Experimental lifecycle rules
├── research/
│   ├── datasets/                   # Canonical and audited datasets (e.g. BTCUSDT 1m)
│   ├── execution/                  # Venue alignment and execution research
│   │   ├── VENUE_ALIGNMENT_032.md  # Mandate 032: Market Signal vs Venue Signal
│   │   ├── IQ_OPTION_CONTRACT_SPEC_033.md # Mandate 033: 4-phase acquisition protocol
│   │   ├── CONTRACT_DISCOVERY_034.md      # Mandate 034: 15m Binary Option contract
│   │   └── data_acquisition/
│   │       └── recorder/           # Python live observation recorder (iqoptionapi)
│   ├── experiments/                # Experiment manifests and audit traces
│   ├── governance/                 # Hypothesis registries and research family ledgers
│   ├── hypotheses/                 # Formal hypothesis declarations (H001, H002, H003, H004)
│   └── reports/                    # Validation, adversarial, post-mortem, and CRO reports
├── scripts/                        # Ingestion, replay, baseline, and audit CLI scripts
├── src/
│   ├── core/                       # Constitutional types (MarketObservation, BinaryContract, etc.)
│   ├── data/                       # Dataset, DatasetLoader, DatasetMetadata, DatasetValidator
│   ├── governance/                 # OrchestratorGate, AuditLogger, Constants
│   ├── probability/                # EVEngine (Expected value and breakeven math)
│   ├── replay/                     # ReplayEngine (Strict chronological replay and resolution)
│   ├── research/                   # TargetEngine, BinaryOutcome, BaselineModel, CalibrationEngine
│   ├── strategy/                   # FeatureEngine, MTFFeatureEngine, RegimeEngine, SignalEngine
│   │   ├── models/                 # DisplacementModel, ExhaustionModel, QuantileStateEngine
│   │   └── runners/                # H004Runner (Execution harness)
│   └── validation/                 # WalkForward cross-validation engine
└── tests/                          # 60 suites / 197 tests (100% PASS)
    ├── adversarial/                # Temporal boundaries, data corruption, null controls
    ├── integration/                # Replay determinism, synthetic edge/null
    ├── orchestrator/               # Governance, fail-closed, permission gates
    └── unit/                       # Component unit tests
```

---

## 2. Core Architectural Components & Schemas

### 2.1 Market Observation Schema (`src/core/MarketObservation.js`)
The constitutional data unit for all price feeds is `MarketObservation`. It enforces strict geometric invariants:
- `asset`: non-empty string.
- `timeframe`: non-empty string.
- `timestamp`: strictly positive finite integer (epoch milliseconds).
- `open`, `high`, `low`, `close`: strictly finite numbers.
- `volume`: finite number $\ge 0$.
- **Geometric Invariants**:
  - $high \ge \max(open, close)$
  - $low \le \min(open, close)$
  - $high \ge low$
- **Immutability**: Sealed via `Object.freeze(this)`. Any field alteration throws at runtime.

### 2.2 Dataset Ingestion & Validation (`src/data/`)
- **`DatasetLoader.js`**:
  - Parses canonical CSV format with header: `timestamp,open,high,low,close,volume`.
  - Removes UTF-8 BOM automatically.
  - Rejects empty lines and validates column counts (= 6).
  - Validates numerical finiteness for all records.
- **`DatasetValidator.js`**:
  - Rejects empty datasets.
  - Asserts that every element is an instance of `MarketObservation`.
  - **Monotonicity Enforcement**: Checks $obs[i].timestamp > obs[i-1].timestamp$.
  - Fails closed on any duplicate timestamp ($obs[i].timestamp == obs[i-1].timestamp$) or out-of-order sequence.
- **`Dataset.js`**:
  - Encapsulates observations in an immutable array.
  - Generates deterministic `contentHash` using SHA-256 over the entire observation series:
    $$\text{Payload} = \sum_i \text{timestamp}_i : \text{open}_i : \text{high}_i : \text{low}_i : \text{close}_i : \text{volume}_i$$
  - Instantiates `DatasetMetadata` (id, asset, timeframe, source, rowCount, start/end timestamps, contentHash).

### 2.3 Chronological Replay Engine (`src/replay/ReplayEngine.js`)
- Enforces strict chronological traversal:
  1. Resolves pending outcomes *first* when $obs.timestamp \ge pending.signal.timestamp + expiryMs$.
  2. Generates new signals at timestamp $t$ passing *only* historical observations up to $t$.
  3. Computes deterministic `replayHash` over dataset content hash, model metadata, and signal hashes.

### 2.4 Binary Contract & Outcome Engine (`src/core/BinaryContract.js`, `src/research/TargetEngine.js`)
- **`BinaryContract.js`**: Validates direction (`CALL` | `PUT`), positive finite `expirySeconds`, `payout` ($> 0$), and `stake` ($> 0$).
- **`TargetEngine.js`**:
  - Entry price: $P_{\text{entry}} = \text{entryObs.close}$.
  - Expiry price: $P_{\text{expiry}} = \text{expiryObs.close}$.
  - Causality check: enforces $\text{entryObs.timestamp} < \text{expiryObs.timestamp}$ and $\text{signal.timestamp} == \text{entryObs.timestamp}$.
  - Settlement:
    - $P_{\text{expiry}} == P_{\text{entry}} \implies \text{PUSH}$ ($\text{returnVal} = 0$).
    - $\text{CALL} \implies (P_{\text{expiry}} > P_{\text{entry}} ? \text{WIN } (+payout) : \text{LOSS } (-1))$.
    - $\text{PUT} \implies (P_{\text{expiry}} < P_{\text{entry}} ? \text{WIN } (+payout) : \text{LOSS } (-1))$.
- **`EVEngine.js`**: Computes breakeven win rate $P_{BE} = \frac{1}{1+r}$ and expected value $EV(p) = p \cdot r - (1-p)$.

---

## 3. Data Acquisition & Execution Infrastructure Forensics

### 3.1 Existing Python Bridge (`research/execution/data_acquisition/recorder/`)
- **`iqoption_adapter.py`**:
  - Wraps `iqoptionapi.stable_api.IQ_Option`.
  - Enforces observation-only operation: no buy/order methods are exposed.
  - Automatically asserts practice mode: `self.api.change_balance("PRACTICE")`.
- **`recorder.py`**:
  - Subscribes to live candles via `adapter.start_candles(ASSET, INTERVAL, maxdict=100)`.
  - Appends raw stream captures to `research/execution/data_acquisition/raw/IQO_{ASSET}_{INTERVAL}s_raw.jsonl`.
  - Stores `source`, `asset`, `interval_requested`, `candle_status` (`CLOSED` vs `FORMING`), `local_timestamp`, `server_timestamp_original`, and `raw_payload`.

### 3.2 Critical Forensic Findings in Existing Code
1. **Deduplication Leak in `recorder.py`**:
   - Line 56-57: `if candle_ts in last_seen: continue`
   - Line 76: `last_seen.add(candle_ts)`
   - *Impact*: When a forming candle is first observed, its timestamp is added to `last_seen`. When the candle closes at $t + INTERVAL$, it is skipped because its timestamp is already in `last_seen`. As a result, closed candle snapshots are systematically missing. (Documented under Zero Silent Patching rule; no code altered).
2. **Missing Active Mapping in `iqoptionapi`**:
   - `iqoptionapi.constants.ACTIVES` contains static historical mappings (372 assets).
   - Only `XAUUSD` (ID 74) and `XAGUSD` (ID 75) exist in the static table.
   - `XAU/XAG`, `Ouro/Prata`, and Fusion CFDs are **not present** in the static dictionary.
   - `iqoptionapi.ws.client.WebsocketClient.on_message` performs reverse lookup `OP_code.ACTIVES.values().index(active_id)` when handling `candle-generated` and `candles-generated`. If the active ID is missing from `OP_code.ACTIVES`, this causes a runtime `ValueError`.

---

## 4. Architectural Compatibility Matrix for XAU/XAG

| Component | Current State | Compatible with XAU/XAG? | Required Action |
|---|---|:---:|---|
| `MarketObservation` | Asset string, OHLCV numbers | **YES** | Compatible as-is. Volume for XAU/XAG will represent tick/quote count. |
| `DatasetValidator` | Timestamp strictly increasing, finite | **YES** | Compatible as-is. Strict rejection of duplicates and non-monotonic rows. |
| `DatasetLoader` | Canonical CSV (6 columns) | **YES** | Compatible as-is. |
| `ReplayEngine` | Chronological replay, no lookahead | **YES** | Compatible as-is. |
| `TargetEngine` | Entry/Expiry close, PUSH = 0 | **PARTIAL** | Must empirically confirm whether IQ Option settles at candle close or at tick expiry. |
| `EVEngine` | Payout math, $P_{BE}$ | **YES** | Fully compatible. For payout 88%: $P_{BE} = 53.1915\%$. |
| `recorder.py` | Hardcoded asset / interval | **NO** | Needs redesign for dynamic active ID discovery, forming/closed tracking, and payout capture. |
| `iqoptionapi` | Hardcoded opcode dictionary | **NO** | Requires runtime active opcode resolution via `get_all_init()` or `get_instruments('cfd')`. |

---

## 5. Repository Forensics Conclusion

The core TypeScript/JavaScript infrastructure (`src/core`, `src/data`, `src/replay`, `src/research`, `src/governance`) is **100% agnostic to asset class** and enforces exemplary quantitative rigour (immutability, determinism, causal separation, SHA-256 hashing). 

However, the **Data Acquisition Layer** (`research/execution/data_acquisition/`) is currently in an incomplete prototype state and cannot capture XAU/XAG without dynamic instrument discovery and recorder refactoring.
