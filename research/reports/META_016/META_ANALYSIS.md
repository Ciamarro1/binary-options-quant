# Commit 016: Cross-Hypothesis Meta-Analysis Report

## 1. Executive Mandate & Epistemic Scope

This meta-analysis synthesizes the empirical findings of the **`SHORT_HORIZON_BTCUSDT_1M`** research family (`HYPOTHESIS_001` and `HYPOTHESIS_002`).

### 🏛️ Epistemic Guardrails Enforced:
1. **No Mega-Sample Pooling**: The observations of H001 ($N = 12,808$) and H002 ($N = 2,049$) are **not** pooled into an aggregate sample. They represent distinct pre-registered contracts executed on distinct time slices and distinct target horizons.
2. **No Conflation of Horizon as Pure Cause**: The performance difference between H001 ($47.88\%$) and H002 ($52.22\%$) is described as an **empirical observation under different contracts**, not a proven isolated causal property of the time horizon.
3. **Strict Separation of Metrics**:
   - **Absolute Economic Shortfall**: $\hat{p}_{H2} - P_{BE} = 52.22\% - 55.56\% = \mathbf{-3.34\text{ pp}}$ (Fatal).
   - **Relative Information Observed**: $\hat{p}_{H2} - \hat{p}_{\text{baseline}} = 52.22\% - 49.89\% = \mathbf{+2.33\text{ pp}}$.
   - **Directional Asymmetry Observed**: $\hat{p}_{H2} - \hat{p}_{\text{reversed}} = 52.22\% - 47.38\% = \mathbf{+4.84\text{ pp}}$.

---

## 2. Cross-Hypothesis Empirical Comparison

| Dimension | HYPOTHESIS_001 (EXP_008) | HYPOTHESIS_002 (EXP_014) | BASELINE_003_CONTROL |
|---|:---:|:---:|:---:|
| **Mechanism** | Momentum Continuation | Exhaustion Reversal | Pure Market Frequency |
| **Cadence / Asset** | $1\text{m}$ BTCUSDT Spot | $1\text{m}$ BTCUSDT Spot | $1\text{m}$ BTCUSDT Spot |
| **Target Expiry** | $1\text{ candle } (60\text{s})$ | $3\text{ candles } (180\text{s})$ | $3\text{ candles } (180\text{s})$ |
| **Dataset Slice** | Feb–May 2024 ($174,240\text{ rows}$) | Jun–Sep 2024 ($175,680\text{ rows}$) | Jun–Sep 2024 ($175,680\text{ rows}$) |
| **Resolved Sample ($N$)** | **12,808** | **2,049** | **163,675** |
| **OOS Win Rate (\hat{p})** | **47.88%** | **52.22%** | **49.89%** |
| **95% Wilson Score CI** | **[47.01%, 48.74%]** | **[50.06%, 54.38%]** | **[49.65%, 50.13%]** |
| **Breakeven ($P_{BE}$)** | $55.56\%$ | $55.56\%$ | $55.56\%$ |
| **Absolute Edge vs $P_{BE}$** | **-7.68 pp** | **-3.34 pp** | **-5.66 pp** |
| **Expected Value ($EV$)** | **-0.1382** | **-0.0600** | **-0.1019** |
| **CRO Deliberation** | **VETO** | **VETO** | **BASELINE ZERO** |
| **Status** | **FALSIFIED & ARCHIVED** | **FALSIFIED & ARCHIVED** | **FROZEN CONTROL** |

---

## 3. Four Central Scientific Inquiries

### Inquiry 1: Does single-candle displacement contain directional information?
- In H001 ($1\text{m}$ expiry), displacement continuation resulted in **$47.88\%$ win rate**, which is **below** random drift ($50.43\%$ baseline in Jan-24).
- In H002 ($3\text{m}$ expiry), extreme displacement exhaustion resulted in **$52.22\%$ win rate**, which is **above** random drift ($49.89\%$ baseline in Jun-Sep 24).
- **Synthesis**: Displacement on 1-minute BTCUSDT spot acts as a local liquidity exhaustion event. It penalizes momentum continuation ($47.88\%$) and exhibits mild mean-reverting tendency ($52.22\%$).

### Inquiry 2: Does directional asymmetry hold across long and short setups?
- **H001**: CALL WR = $48.06\%$, PUT WR = $47.70\%$ (Symmetric drag).
- **H002**: CALL WR = $51.25\%$, PUT WR = $51.48\%$ (Symmetric mean-reversion).
- **Synthesis**: Both long and short extremes behave identically. The market structure of 1m liquidity exhaustion is directionally neutral.

### Inquiry 3: What is the formal statistical significance of H002 relative differences?
Under 10,000 paired block bootstrap resamples across the 115 OOS windows:
- **H002 vs Baseline 003 Control**: Mean difference per window = $\mathbf{+1.35\text{ pp}}$ (95% CI: $[-2.68\text{ pp}, +5.24\text{ pp}]$, $p = 0.2434$).
- **H002 vs Reversed Mirror**: Mean difference per window = $\mathbf{+2.73\text{ pp}}$ (95% CI: $[-5.33\text{ pp}, +10.59\text{ pp}]$, $p = 0.2443$).
- **Statistical Verdict**: Under window-level block resampling, neither the difference vs baseline ($p = 0.2434$) nor vs reversed control ($p = 0.2443$) clears the $\alpha = 0.05$ significance threshold. Thus, the relative difference is **empirically observed**, but **not statistically confirmed** as distinct from window-to-window noise under temporal clustering. The hypothesis remains doubly non-viable (lacking both confirmed statistical significance and economic edge).

### Inquiry 4: What is the surviving institutional knowledge?
1. Simple price displacement rules on 1-minute Bitcoin binary options **cannot clear the 55.56% payout hurdle**.
2. Adding indicator complexity or parameter tuning post-hoc would violate causal governance and lead to curve-fitted illusions.
3. The research family **`SHORT_HORIZON_BTCUSDT_1M`** has reached a natural scientific conclusion.
