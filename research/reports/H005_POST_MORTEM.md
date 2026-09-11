# SCIENTIFIC POST-MORTEM: HYPOTHESIS_005
**Document Version:** 1.0.0  
**Research Family:** `FAMILY_04_COMMODITY_RATIO_MICROSTRUCTURE`  
**Instrument:** `XAUXAG` (IQ Option / Fusion CFD)  
**Execution Cycle:** `EXP_035_XAUXAG_RATIO_ZREVERT_001`  
**Deliberation Status:** **`FALSIFIED & ARCHIVED`** (Sovereign CRO VETO)  
**Date:** 2026-09-11  

---

## 1. Executive Summary & Epistemic Finding

`HYPOTHESIS_005` investigated short-horizon intraday mean reversion in the Gold/Silver ratio ($R_t = \text{XAU}/\text{XAG}$) using a causal rolling log-ratio deviation model ($L = 120\text{m}$, threshold $|Z_t| \ge 2.0$) evaluated on $1\text{m}$ candles with a $15\text{m}$ ($900\text{s}$) binary contract expiry ($r = 0.88$, $P_{\text{BE}} = 53.1915\%$).

The blind Out-of-Sample replay against 38,912 candles of `DATASET_XAUXAG_001` yielded:
- **Sample Size:** $N = 6,210$ resolved non-PUSH observations.
- **Realized Win Rate:** **$54.3639\%$** ($EV = +0.0220$).
- **Reversed Negative Control:** **$45.6361\%$** ($100.0\% - 54.36\%$).
- **95% Wilson Confidence Interval:** **$[53.1228\%, 55.5997\%]$**.
- **Wilson Lower Bound Deficit:** $W_{\text{low}} = 53.1228\% \le P_{\text{BE}} = 53.1915\%$ (Deficit of **$-0.0687\text{ pp}$** / **$-6.87\text{ bps}$**).

Pursuant to Constitutional Invariant 4 ($W_{\text{low}} > P_{\text{BE}}$), the Chief Risk Officer issued an irrevocable **SOVEREIGN VETO**.

---

## 2. Quantitative Diagnostic & Root Cause Analysis

### 2.1 The Statistical Significance Paradox
Unlike previous hypotheses on BTC/USDT (H001: 47.88%, H002: 52.22%), `HYPOTHESIS_005` demonstrated **genuine non-random statistical alpha**:
1. Outperformed the Fair Market Baseline ($50.0\%$) by **$+4.36\text{ pp}$**.
2. Outperformed the Reversed Control ($45.64\%$) by **$+8.72\text{ pp}$**.
3. Outperformed the Breakeven Hurdle ($53.19\%$) nominally by **$+1.17\text{ pp}$**.
4. Generated positive realized economic expectancy: $+0.0220$ units per contract.

### 2.2 Why Did the Model Fail the Wilson Gate?
The model failed exclusively due to **excessive sample dispersion near the hurdle boundary**:
- Although $N = 6,210$ is substantial, the margin of empirical outperformance ($54.36\% - 53.19\% = 1.17\%$) was insufficient to push the entire 95% Wilson confidence band above the breakeven floor.
- The 95% half-width of the Wilson CI for $N=6,210$ is $\approx \pm 1.24\%$.
- Because $1.17\% < 1.24\%$, the lower boundary dipped to $53.1228\%$, missing the threshold by less than 7 basis points.

### 2.3 Directional Asymmetry Analysis
A deeper breakdown revealed significant structural asymmetry between contract directions:
- **PUT Signals (Overbought Reversion, $Z_t \ge +2.0$):**
  - $N_{\text{PUT}} = 3,178$
  - Win Rate: **$56.6079\%$**
  - 95% Wilson CI: $[54.88\%, 58.32\%]$ $\implies W_{\text{low}} = 54.88\% > P_{\text{BE}} = 53.19\%$ (**WOULD PASS CONSTITUTIONAL GATE IN ISOLATION**).
- **CALL Signals (Oversold Reversion, $Z_t \le -2.0$):**
  - $N_{\text{CALL}} = 3,032$
  - Win Rate: **$52.0119\%$**
  - 95% Wilson CI: $[50.23\%, 53.79\%]$ $\implies$ Underperformed breakeven hurdle ($52.01\% < 53.19\%$).

**Microstructural Explanation:**
During the summer 2025 period, the Gold/Silver ratio exhibited an overall secular downward drift (silver outperforming gold), resulting in faster and more aggressive downward mean-reversions (PUT wins) while upward recoveries (CALL wins) suffered from macro trend drag.

---

## 3. Governance Boundaries & Prohibited Actions

1. **PROHIBITED: Parameter Search on OOS:**
   Under Constitutional Rule 9, the research team is strictly forbidden from selectively disabling CALL signals or testing $Z_{\text{threshold}} \in [2.1, 2.5]$ on this dataset. Doing so constitutes classical **post-hoc data snooping / p-hacking**.
2. **PROHIBITED: Retroactive Hypothesis Editing:**
   `HYPOTHESIS_005` remains permanently frozen and classified as **`FALSIFIED_FOR_PRODUCTION_ARCHIVED`**.

---

## 4. Remediation Architecture & Epistemic Recommendations

To achieve institutional promotion in Family 04, a future hypothesis (`HYPOTHESIS_006`) must be specified ex-ante with:
1. **Trend/Drift Conditioning:** Aligning mean-reversion entries with higher-timeframe EMA/SMA slope to filter out counter-trend drag.
2. **Dynamic Volatility Bands:** Utilizing ATR-normalized bands or Percentile Ranks ($Q_t$) rather than fixed standard deviations to avoid entry during low-liquidity drifts.
3. **Pre-Registered Asymmetric Floors:** Defining direction-specific entry criteria ex-ante before blind OOS replay.
