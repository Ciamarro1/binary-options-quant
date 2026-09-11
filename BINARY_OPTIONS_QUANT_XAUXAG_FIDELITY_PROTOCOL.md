# CROSS-VENUE FIDELITY AUDIT PROTOCOL: XAU/XAG
**Protocol Version:** 1.0.0  
**Target Comparison:** Direct IQ Option XAU/XAG vs External Reconstructed Spot ($XAU/USD \div XAG/USD$)  
**Domain:** Quantitative Reconciliation Engineering  
**Primary Goal:** Measure Cross-Venue Divergence to Prevent the "Reconstruction Fallacy"

---

## 1. Scientific Motivation

A quantitative binary options model trained on an external reference feed ($XAU/USD \div XAG/USD$) can only achieve positive economic expectancy on IQ Option if the broker's settlement price is statistically and directionally coherent with that reference feed.

If the broker injects proprietary markups, spreads, quote delays, or synthetic OTC deviations, a predicted edge on the external dataset will dissolve into bankruptcy at execution:
$$Market\ Signal \neq Venue\ Signal \neq Contract\ Outcome \neq Economic\ Edge$$

This protocol establishes the exact mathematical methodology to test feed fidelity **before any strategy research is authorized**.

---

## 2. Mathematical Definition of Divergence Metrics

Let $P_{\text{IQO}}(t)$ be the close price of XAU/XAG on IQ Option at timestamp $t$.  
Let $P_{\text{ext}}(t) = \frac{P_{\text{XAU/USD}}(t)}{P_{\text{XAG/USD}}(t)}$ be the contemporaneous reconstructed ratio from an interbank spot provider at timestamp $t$.

### 2.1 Price Level Divergence ($\Delta P_t$)
$$\Delta P_t = P_{\text{IQO}}(t) - P_{\text{ext}}(t)$$
- **Mean Spread Bias**: $\mu_{\Delta P} = \frac{1}{N} \sum_{t=1}^N \Delta P_t$
- **Tracking Volatility**: $\sigma_{\Delta P} = \sqrt{\frac{1}{N-1} \sum_{t=1}^N (\Delta P_t - \mu_{\Delta P})^2}$
- **Percentage Tracking Error**: $\text{PTE}_t = \frac{|P_{\text{IQO}}(t) - P_{\text{ext}}(t)|}{P_{\text{ext}}(t)} \times 100\%$

### 2.2 Relative Returns & Horizon Coherence
For horizon $h \in \{1\text{m}, 2\text{m}, 3\text{m}, 5\text{m}, 15\text{m}\}$:
$$r_{\text{IQO}}(t, h) = \frac{P_{\text{IQO}}(t+h) - P_{\text{IQO}}(t)}{P_{\text{IQO}}(t)}$$
$$r_{\text{ext}}(t, h) = \frac{P_{\text{ext}}(t+h) - P_{\text{ext}}(t)}{P_{\text{ext}}(t)}$$

1. **Pearson Return Correlation**:
   $$\rho_h = \text{Corr}\left(r_{\text{IQO}}(t, h), r_{\text{ext}}(t, h)\right)$$
2. **Directional Agreement Rate (Sign Coherence)**:
   $$\text{DAR}_h = \frac{1}{N_h} \sum_{t=1}^{N_h} \mathbb{I}\left[\text{sign}(r_{\text{IQO}}(t, h)) == \text{sign}(r_{\text{ext}}(t, h))\right]$$
   *(excluding pushes / zero-return candles)*.

### 2.3 Binary Settlement Inversion Rate (BSIR)
For a simulated trade entered at $t$ expiring at $t+h$:
- Outcome on IQ Option: $\Omega_{\text{IQO}}(t, h) \in \{\text{WIN}, \text{LOSS}, \text{PUSH}\}$
- Outcome on External: $\Omega_{\text{ext}}(t, h) \in \{\text{WIN}, \text{LOSS}, \text{PUSH}\}$

The **Binary Settlement Inversion Rate** measures the probability that a winning bet on the reference market would lose on the venue due purely to feed divergence:
$$\text{BSIR}_h = P\left(\Omega_{\text{IQO}} == \text{LOSS} \mid \Omega_{\text{ext}} == \text{WIN}\right)$$

---

## 3. The 4-Tier Dataset Promotion Governance

No dataset may be used beyond its earned certification level:

```text
┌────────────────────────────────────────────────────────┐
│ LEVEL 0: UNVERIFIED                                    │
│ • Raw downloads, unverified scrapes, untested APIs     │
│ • Usage: Quarantine only. Zero research access.        │
└───────────────────────────┬────────────────────────────┘
                            │ Pass: Structural Invariants + Hash
                            ▼
┌────────────────────────────────────────────────────────┐
│ LEVEL 1: RESEARCH-GRADE                                │
│ • Validated external spot dataset (e.g. Dukascopy)     │
│ • Strict MarketObservation compliance, 0 gaps, 0 leaks │
│ • Usage: Stylized facts, feature distributions         │
│ • PROHIBITED: Model promotion & final EV calculation   │
└───────────────────────────┬────────────────────────────┘
                            │ Pass: Fidelity Protocol Thresholds
                            ▼
┌────────────────────────────────────────────────────────┐
│ LEVEL 2: FIDELITY-VALIDATED                            │
│ • External dataset with proven statistical convergence │
│   to IQ Option feed (ρ_h > 0.98, DAR_h > 92%, BSIR < 2%)
│ • Usage: Strategy pre-training & Walk-Forward research │
└───────────────────────────┬────────────────────────────┘
                            │ Pass: Direct Broker Settlement Audit
                            ▼
┌────────────────────────────────────────────────────────┐
│ LEVEL 3: EXECUTION-GRADE                               │
│ • Direct IQ Option live stream or verified broker data │
│ • Identical to the settlement price engine             │
│ • Usage: Final CRO Approval, EV verification, Registry │
└────────────────────────────────────────────────────────┘
```

### Quantitative Promotion Gates:

| Promotion Gate | Target Metrics Across Horizons (1m, 2m, 3m, 5m, 15m) |
|---|---|
| **Level 0 $\to$ Level 1 (Research-Grade)** | Gap count $= 0$; Duplicate count $= 0$; Invalid OHLC $= 0$; Timestamp monotonicity $= 100\%$; Deterministic SHA-256 manifest. |
| **Level 1 $\to$ Level 2 (Fidelity-Validated)** | Sample size $N \ge 10,000$ concurrent 1m observations.<br>$\rho_{15\text{m}} \ge 0.98$ and $\rho_{1\text{m}} \ge 0.95$.<br>$\text{DAR}_{15\text{m}} \ge 94\%$ and $\text{DAR}_{1\text{m}} \ge 90\%$.<br>$\text{BSIR}_{15\text{m}} \le 2.0\%$ and $\text{BSIR}_{1\text{m}} \le 3.5\%$. |
| **Level 2 $\to$ Level 3 (Execution-Grade)** | Direct capture of IQ Option feed matching real platform settlement prices with zero tick discrepancy on random audited trades. |

---

## 4. Binary Outcome Contract Specification for XAU/XAG

### 4.1 Directional Payoff Structure
For a contract with unit stake ($1.00$) and reference payout $r = 0.88$:

$$\text{Outcome}(t, h) = \begin{cases} 
\text{WIN} \implies +0.88, & \text{if } P_{\text{expiry}} > P_{\text{entry}} \text{ (CALL)} \text{ or } P_{\text{expiry}} < P_{\text{entry}} \text{ (PUT)} \\
\text{LOSS} \implies -1.00, & \text{if } P_{\text{expiry}} < P_{\text{entry}} \text{ (CALL)} \text{ or } P_{\text{expiry}} > P_{\text{entry}} \text{ (PUT)} \\
\text{PUSH} \implies 0.00, & \text{if } P_{\text{expiry}} == P_{\text{entry}} \text{ (100\% stake refunded)}
\end{cases}$$

### 4.2 Economic Breakeven Boundary
$$P_{\text{BE}} = \frac{1}{1 + 0.88} = 53.1915\%$$
$$EV(p) = p \cdot 0.88 - (1 - p) = 1.88p - 1.00$$

### 4.3 Separation from Underlying Dataset
The Binary Outcome Engine (`TargetEngine.js`) remains completely segregated from the raw and canonical datasets. Prices are queried causally at entry and expiry without modifying historical observations.
