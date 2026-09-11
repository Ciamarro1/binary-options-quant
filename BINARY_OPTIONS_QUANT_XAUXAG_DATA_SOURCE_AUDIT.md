# DATA SOURCE AUDIT: XAU/XAG & IQ OPTION FUSION INSTRUMENT
**Audit Date:** 2026-09-10  
**Target Instrument:** XAU/XAG (Ouro/Prata — Fusion CFD)  
**Domain:** Research Operations & Execution Reconciliation  
**Audit Standard:** Strict Scientific Rigour (Zero Assumptions)

---

## 1. The 18-Point IQ Option / Fusion Forensic Investigation

Every assertion regarding the instrument must be backed by concrete empirical evidence. Each parameter is classified according to the epistemic scale: `VERIFIED`, `PLAUSIBLE`, `UNVERIFIED`, or `CONTRADICTED`.

| # | Investigation Dimension | Status | Empirical Evidence & Forensic Finding |
|---|---|:---:|---|
| 1 | **Internal API Symbol** | **UNVERIFIED** | The static mapping dictionary `iqoptionapi.constants.ACTIVES` contains only `XAUUSD` (ID 74) and `XAGUSD` (ID 75). The exact string key emitted by IQ Option's websocket channel (e.g. `"XAUXAG"`, `"fusion-xauxag"`, or `"gold-silver"`) is not registered in the static table and must be discovered via live API introspection (`get_all_init()` or `get_instruments('cfd')`). |
| 2 | **Active Identifier (Opcode)** | **UNVERIFIED** | The integer opcode required by the broker websocket protocol (`active_id`) is unknown. Calling `get_candles` with an unregistered string will trigger a dictionary lookup exception in `iqoptionapi`. |
| 3 | **Price Source / Mechanism** | **PLAUSIBLE** | Broker documentation describes "Fusion CFDs" as synthetic instruments tracking the relative performance between two underlyings (in this case, Gold and Silver). The quote engine computes a synthetic price $R_t \approx \frac{P_{\text{Gold}}}{P_{\text{Silver}}}$ adjusted by proprietary liquidity, bid/ask spreads, and internal dealer parameters. |
| 4 | **Instrument Definition** | **VERIFIED** | Documented on IQ Option's official platform documentation: "XAU/XAG" monitors the Gold-to-Silver ratio (the number of silver ounces required to buy one ounce of gold). Traded as a CFD and offered as an underlying for Binary Option contracts (payout observed: 88%). |
| 5 | **Historical Granularities** | **PLAUSIBLE** | IQ Option's candle architecture natively supports interval sizes in seconds: 1, 5, 10, 15, 30, 60 (1m), 120 (2m), 300 (5m), 900 (15m), etc. Availability for Fusion CFDs is plausible based on platform charting options. |
| 6 | **M1 (1-minute) Availability** | **VERIFIED** | 1-minute candlestick charting is explicitly visible and operable on the IQ Option trader client interface for XAU/XAG. |
| 7 | **Historical Data Limits** | **UNVERIFIED** | Unlike Binance (which provides unlimited historical archives via public S3 buckets), IQ Option's websocket `get-candles` API limits batch requests to 1,000 candles per call and restricts server-side historical lookback for synthetic/CFD instruments. The maximum achievable lookback depth for XAU/XAG has not been measured. |
| 8 | **Timezone Handling** | **VERIFIED** | All IQ Option websocket timestamps are formatted in UTC seconds (or milliseconds). System server time is synchronised via NTP (`get_server_timestamp()`). |
| 9 | **Timestamp Behavior** | **PLAUSIBLE** | Candles emitted by the broker are timestamped at the opening boundary ($t_{\text{open}}$). A candle is closed when server clock reaches $t \ge t_{\text{open}} + \text{interval}$. |
| 10 | **Gap Treatment** | **UNVERIFIED** | It is unknown whether the broker emits flat zero-volume candles or omits records entirely during periods of zero quote changes (e.g. low-liquidity periods or weekend transitions). |
| 11 | **OTC vs Non-OTC Regime** | **PLAUSIBLE** | Spot metals (Gold/Silver) trade Monday to Friday. Platform documentation notes that XAU/XAG options (Blitz/Binary) are available on weekends when underlying spot markets are closed. This confirms that weekend trading is operated under an **OTC / synthetic algorithmic regime**, which possesses fundamentally different statistical properties from interbank hours. |
| 12 | **Entry Price Semantics** | **UNVERIFIED** | Whether binary contract entry is executed at the exact instantaneous Bid, Ask, Mid, or last traded quote at the millisecond of click is unverified. Slippage parameters are unknown. |
| 13 | **Expiry Price Semantics** | **UNVERIFIED** | It is unverified whether binary contract resolution uses the candle close of the expiry timeframe or the instantaneous tick price at $t_{\text{entry}} + \text{expiry}$. |
| 14 | **Decimal Precision** | **UNVERIFIED** | The Gold/Silver ratio historically ranges between $70.0$ and $95.0$. Whether IQ Option quotes this instrument with 2, 3, 4, or 5 decimal places is unverified. |
| 15 | **Tick Size** | **UNVERIFIED** | Minimum price increment is unverified. |
| 16 | **Settlement Mechanism** | **PLAUSIBLE** | Standard binary option payout applies: $\text{CALL}$ wins if $P_{\text{expiry}} > P_{\text{entry}}$; $\text{PUT}$ wins if $P_{\text{expiry}} < P_{\text{entry}}$. PUSH ($P_{\text{expiry}} == P_{\text{entry}}$) returns $100\%$ stake. Observed payout rate is $88\%$ ($P_{BE} = 53.19\%$). |
| 17 | **Directly Recoverable History** | **UNVERIFIED** | IQ Option does not provide public bulk historical downloads. Historical retrieval is only possible programmatically through the websocket connection or via continuous live recording. |
| 18 | **Source Limitations** | **VERIFIED** | Known API limitations: aggressive websocket connection throttling, periodic reconnection requirements, lack of historical tick archives, and risk of dealer-specific price shading. |

---

## 2. Taxonomy of Candidate Data Sources

To maintain quantitative integrity, we must strictly separate **DATA SOURCES** (the actual price feed provider) from **DATA ACQUISITION TOOLS** (the software utility used to fetch the data). We must also distinguish **MARKET DATA** (the price of the underlying) from **BINARY OPTIONS TRADE HISTORY** (records of user bets).

```text
                               ┌────────────────────────────────────────┐
                               │       XAU/XAG DATA CANDIDATES          │
                               └───────────────────┬────────────────────┘
                                                   │
                ┌──────────────────────────────────┴──────────────────────────────────┐
                ▼                                                                     ▼
  ┌───────────────────────────┐                                         ┌───────────────────────────┐
  │ SOURCE A: DIRECT VENUE    │                                         │ SOURCE B: SYNTHETIC RATIO │
  │ (IQ Option Live / API)    │                                         │ (External Reconstructed)  │
  ├───────────────────────────┤                                         ├───────────────────────────┤
  │ • Ground truth for payout │                                         │ • Spot Gold / Spot Silver │
  │ • True execution prices   │                                         │ • Deep historical depth   │
  │ • Captures broker spread  │                                         │ • Interbank benchmark     │
  │ • Limited historical depth│                                         │ • ZERO EXECUTION FIDELITY │
  └───────────────────────────┘                                         └───────────────────────────┘
```

### 2.1 Source A: Direct IQ Option / Fusion Feed
- **Origin**: IQ Option WebSocket (`wss://ws.iqoption.com/echo/websocket`).
- **Nature**: Direct quote feed for the Fusion CFD instrument.
- **Historical Availability**: Very short to medium (via `get-candles` polling). Can be accumulated with zero-loss fidelity via a dedicated 24/7 live recorder.
- **Execution Grade**: **CANDIDATE FOR EXECUTION-GRADE** (subject to reconciliation).
- **Risks**: Rate limits, broker disconnections, undocumented OTC synthetic generation.

### 2.2 Source B: External Reconstructed Ratio ($XAU/USD \div XAG/USD$)
- **Origin**: Interbank spot feeds (e.g. Dukascopy, OANDA, Binance, Interactive Brokers, Metals-API).
- **Construction**:
  $$R_t^{\text{ext}} = \frac{P_{\text{Spot}}^{\text{XAU/USD}}(t)}{P_{\text{Spot}}^{\text{XAG/USD}}(t)}$$
- **Historical Availability**: Multi-year 1m tick and candle data readily available.
- **Execution Grade**: **RESEARCH-GRADE ONLY**.
- **Critical Risk**: **The Reconstruction Fallacy**. Assuming $P_{\text{IQO}} \equiv R_t^{\text{ext}}$ without proof violates Constitutional Rule 10. Broker markups, spread skew, latency, and OTC weekend mechanics may render external ratios completely decoupled from the actual binary contract resolution.

### 2.3 Source C: Third-Party Gold/Silver Ratio Feeds
- **Origin**: Specialized financial indices (e.g. TradingView `XAUUSD/XAGUSD`, Bloomberg `GOLDSILV`).
- **Classification**: Informational benchmark only. Unusable for execution replay.

### 2.4 Source D: Community Datasets / Unverified Scrapes
- **Origin**: GitHub repositories, Telegram trading groups, unofficial scrapers.
- **Classification**: **REJECTED (FAIL-CLOSED)**. Lacks cryptographic provenance, checksums, and audit trail. Violates Constitutional Rule 5.

---

## 3. Tool vs Source Demarcation

| Component | Category | Epistemic Role | Notes |
|---|---|:---:|---|
| `iqoptionapi` | **Acquisition Tool** | Programmatic client | Reverse-engineered Python wrapper for IQ Option websockets. Not a data provider. |
| IQ Option WebSocket | **Data Source** | Primary Execution Feed | Proprietary dealer quote engine. |
| Dukascopy Tick History | **Data Source** | Benchmark Spot Feed | Interbank spot liquidity provider. |
| Custom Live Recorder | **Acquisition Tool** | Infrastructure | Python daemon capturing raw packets into JSONL. |

---

## 4. Conclusion & Audit Veredict

1. **Direct Historical Data**: There is **no verified pre-existing historical archive** for IQ Option XAU/XAG in the repository.
2. **Reconstruction Feasibility**: External spot feeds can provide multi-year research data, but **cannot be used for economic verification** until the cross-venue divergence ($\Delta P_t$) is empirically tested.
3. **Execution-Price Fidelity**: Currently **UNVERIFIED**.
