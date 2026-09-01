# Scientific Post-Mortem Report: HYPOTHESIS-002 (Commit 015)

> **Experiment ID**: `EXP_014_EXHAUSTION_BTC1M_2024_06_09`  
> **Hypothesis**: `HYPOTHESIS_002` (Short-Horizon Mean-Reversion / Exhaustion Anomaly, v1.0.0)  
> **Dataset**: `DATASET_003` (BTCUSDT Spot 1m Jun–Sep 2024, 175,680 rows, 115 OOS Windows)  
> **Status**: **FALSIFIED & ARCHIVED** 🛑  
> **CRO Verdict**: **VETO** (Wilson Lower Bound 50.06% <= 55.56%, EV -0.0600)  

---

## 1. Executive Summary & Core Scientific Distinction

The empirical execution of `HYPOTHESIS_002` across 115 rolling Out-of-Sample windows demonstrated a critical quantitative distinction:

$$\mathbf{PREDICTIVE \; INFORMATION \neq ECONOMIC \; EDGE}$$

- **Predictive Information Demonstrated**:
  - $\text{H002 Win Rate} = \mathbf{52.2206\%}$
  - $\text{Baseline 003 Control} = \mathbf{49.8922\%}$ ($\Delta = +2.3284\text{ pp}$)
  - $\text{Reversed Control (Momentum Mirror)} = \mathbf{47.3787\%}$ ($\Delta = +4.8419\text{ pp}$)
- **Economic Inadequacy**:
  - Required Breakeven ($P_{BE}$ under payout $r=0.80$): $\mathbf{55.5556\%}$
  - 95% Wilson Score CI: $\mathbf{[50.0556\%, 54.3773\%]}$
  - Expected Value ($EV$): $\mathbf{-0.060029}$ per dollar wagered.

**Definitive Epistemic Verdict:**
> The pre-registered hypothesis that extreme 1-minute displacement, extreme closing location, and abnormal volume generate an economic edge with a 3-minute expiry under an 80% payout on BTCUSDT spot is **falsified**. No parameter tuning or post-hoc threshold rescue will be conducted.

---

## 2. The 6 Post-Mortem Inquiries

### Question 1: Did the hypothesis produce predictive information?
**Yes.** The model exhibited genuine directional signal relative to naive drift ($+2.33\text{ pp}$ over baseline) and inverted continuation ($+4.84\text{ pp}$ over reversed control). The statistical difference against the reversed control confirms that high-displacement volume spikes tend toward short-term mean-reversion rather than continuation. However, the magnitude of the signal is economically insufficient to absorb broker friction.

### Question 2: Where does the information appear (Directional Symmetry)?
- **CALL Trades (Down Exhaustion $\to$ CALL)**: $1,036$ signals, $531$ wins $\implies \mathbf{51.25\%}$ win rate.
- **PUT Trades (Up Exhaustion $\to$ PUT)**: $1,047$ signals, $539$ wins $\implies \mathbf{51.48\%}$ win rate.
- **Symmetry Finding**: The effect is remarkably symmetric across both long and short extremes, proving that the signal is a genuine property of range exhaustion rather than market trend bias.

### Question 3: Is there temporal dependency among signals?
**Yes.** Because consecutive 1-minute candles ($t, t+1, t+2$) can trigger independent 3-minute contracts ($t+3, t+4, t+5$), price paths overlap. Consequently, the effective independent sample size ($N_{\text{eff}}$) is smaller than $2,049$. This temporal dependency represents a structural feature of overlapping binary options contracts.

### Question 4: Was the probabilistic model calibrated?
- **Train Window Average $\hat{P}_{\text{CALL}}$**: $\mathbf{53.45\%}$ vs **Realized OOS**: $\mathbf{51.25\%}$ (Overestimation: $+2.20\text{ pp}$)
- **Train Window Average $\hat{P}_{\text{PUT}}$**: $\mathbf{53.55\%}$ vs **Realized OOS**: $\mathbf{51.48\%}$ (Overestimation: $+2.07\text{ pp}$)
- **Brier Score**: $\mathbf{0.251357}$ (Uninformative).
- **Diagnosis**: Historical In-Sample conditional frequency exhibited mild overconfidence bias of approximately $\approx 2.1\text{ pp}$ relative to Out-of-Sample realization.

### Question 5: Why is 52.22% not economically sufficient?
Under binary options contract mechanics ($r = 0.80$):
$$EV = P_{win} \times 0.80 - (1 - P_{win}) \times 1.00$$
$$EV = (0.522206 \times 0.80) - (0.477794 \times 1.00) = 0.417765 - 0.477794 = -0.060029$$
For every \$10,000 traded across 2,049 contracts, the strategy loses \$600 in expected value due to structural broker edge.

### Question 6: What was NOT proven (Epistemic Boundaries)?
- **NOT Proven**: That mean-reversion does not exist in BTC.
- **NOT Proven**: That volume/range exhaustion is devoid of alpha on other timeframes (e.g. 5m, 15m, 1h).
- **NOT Proven**: That exhaustion cannot provide edge in perpetual futures or spot limit orders with lower friction.
- **Strict Scope**: Falsification applies strictly and solely to the pre-registered 1m binary contract setup.
