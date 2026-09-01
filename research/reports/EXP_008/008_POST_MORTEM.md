# Post-Mortem Report: Experiment 008 (HYPOTHESIS_001)

## 1. Executive Summary & Status
- **Experiment ID**: `EXP_008_DISPLACEMENT_BTC1M_2024_02_05`
- **Hypothesis**: `HYPOTHESIS_001` (Short-Horizon Momentum / Volatility Displacement, v1.0.2)
- **Dataset**: `DATASET_002` (BTCUSDT 1m Feb–May 2024, 174,240 rows)
- **Experimental Outcome**: **FALSIFIED & ARCHIVED** 🛑
- **CRO Sovereign Verdict**: **VETO** (Wilson Lower Bound 47.01% < Break-even 55.56%, EV -0.1382)
- **Governance Action**: Strategy permanently rejected. No parameter tweaking, no post-hoc subset filtering.

---

## 2. Empirical Findings

| Metric | Benchmark / Requirement | Empirical OOS Result | Variance |
|---|:---:|:---:|:---:|
| **Sample Size (N)** | $\ge 30$ | **12,808 resolved trades** | $+12,778$ |
| **Win Rate (\hat{p})** | $> 55.56\%$ | **47.88\%** | $-7.68\text{ pp}$ |
| **95\% Wilson Score CI** | Lower Bound $> 55.56\%$ | **[47.01\%, 48.74\%]** | 🛑 Statistically below $P_{BE}$ |
| **Expected Value (EV)** | $> 0.0000$ | **-0.1382** | 🛑 Negative expectancy |
| **Brier Score** | $< 0.2500$ | **0.2503** | 🛑 Uninformative / no resolution |
| **Window Stability** | $\ge 50\%$ of windows | **0 / 114 windows (0.0\%)** | 🛑 Unanimously non-performing |

### Directional Breakdown:
- **CALL Signals**: $6,463$ trades $\implies 48.06\%$ win rate
- **PUT Signals**: $6,503$ trades $\implies 47.70\%$ win rate
- **Symmetry Observation**: Performance degradation is symmetric across both long and short displacement setups.

---

## 3. What Was Tested vs What Was NOT Proven

### What WAS Formally Tested and Falsified:
- **Tested**: Whether an abnormally large 1-minute candle ($\text{Displacement} \ge 1.0 \times \text{ATR}_{14}$) accompanied by volume expansion ($\text{Volume} \ge 1.5 \times \text{SMA}_{20}$) produces directional momentum over the subsequent 1-minute candle ($t+1$).
- **Finding**: This specific rule on 1-minute BTCUSDT spot data yielded $47.88\%$ win rate, performing **statistically worse than the naive market baseline (50.43%)**.

### What Was NOT Proven (Epistemic Boundaries):
- **NOT Proven**: This does **NOT** prove that BTC universally exhibits mean-reversion.
- **NOT Proven**: This does **NOT** prove that momentum fails on higher timeframes (e.g., 5m, 15m, 1h).
- **NOT Proven**: This does **NOT** prove that volume expansion has no predictive utility in other indicator compositions.
- **Scope Limitation**: The conclusion is strictly bounded to the pre-declared model, parameters, and time horizon.

---

## 4. Qualitative Insights & Analytical Hypotheses

1. **Symmetric Drag**: The fact that both CALL ($48.06\%$) and PUT ($47.70\%$) performed nearly identically below $50\%$ suggests that the setup acted as a counter-productive filter on 1-minute data—entering right at the point of local liquidity depletion.
2. **Microstructural Dynamics**: At the 1-minute cadence in liquid crypto pairs, aggressive market orders causing sudden price displacement often hit opposing resting limit orders (icebergs/order book depth), resulting in immediate pullbacks (tick-level mean reversion).
3. **Horizon Inadequacy**: A 60-second binary expiry provides zero time for an organic trend to develop, forcing the contract to settle entirely within the bid-ask bounce and microstructural noise.

---

## 5. Non-Negotiable Governance Invariants Enforced

1. **No Parameter Rescue**: No attempts were made to test alternative thresholds (e.g., $1.2 \times \text{ATR}$, $2.0 \times \text{Volume}$, or 300s expiry) on the same dataset slice.
2. **Clean Lineage**: The failure is permanently recorded in the laboratory's historical registry to prevent repeated testing of equivalent anomalies.
3. **Research Information Barrier**: The quantitative research team will not receive raw OOS trade arrays for parameter fitting in subsequent research cycles.
