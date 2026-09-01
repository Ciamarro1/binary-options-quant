---
name: quant-feature-engineering
description: >-
  Runbook for engineering strictly causal technical and statistical indicators without future lookahead leakage.
  Used by the Quant Feature Engineer when building indicator pipelines.
---

# Causal Feature Engineering Skill

## Objective
Transform raw OHLCV market observations into clean, causal feature snapshots adhering to zero-leakage constraints.

## Procedures

### 1. Wilder's RMA ATR(14)
- True Range definition:
  $$TR_t = \max(H_t - L_t, |H_t - C_{t-1}|, |L_t - C_{t-1}|)$$
- Recursive Wilder smoothing (no forward averaging):
  $$ATR_t = \frac{ATR_{t-1} \times 13 + TR_t}{14}$$

### 2. Sequential Volume Moving Average
- Causal rolling mean over previous $K$ completed periods ($t-K$ to $t-1$ or including current closed candle $t$):
  $$\bar{V}_t = \frac{1}{K} \sum_{i=0}^{K-1} V_{t-i}$$

### 3. Verification & Unit Testing
- Always execute causal boundary tests:
  ```bash
  cmd /c npm test -- tests/adversarial/causal_integrity.test.js
  ```
- Ensure `timestamp` monotonicity and absence of lookahead.
