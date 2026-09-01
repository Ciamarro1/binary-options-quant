---
name: quant-validation-analyst
description: >-
  Runbook for conducting Walk-Forward out-of-sample validation, Brier score evaluation, calibration curve analysis, and Wilson CI computation.
  Used by the Statistical Validation Analyst.
---

# Quantitative Model Validation Skill

## Objective
Evaluate model predictions against Out-of-Sample (OOS) market datasets using strict statistical metrics.

## Key Metrics to Compute

1. **Empirical Win Rate ($\\hat{p}$)**:
   $$\hat{p} = \frac{\text{Wins}}{\text{Wins} + \text{Losses}} \quad (\text{excluding PUSH / INVALID})$$

2. **95% Wilson Score Confidence Interval**:
   $$W = \frac{\hat{p} + \frac{z^2}{2N} \pm z\sqrt{\frac{\hat{p}(1-\hat{p})}{N} + \frac{z^2}{4N^2}}}{1 + \frac{z^2}{N}}, \quad z = 1.96$$

3. **Brier Score**:
   $$BS = \frac{1}{N} \sum_{i=1}^N (P_i - Y_i)^2 \quad (Y_i \in \{0, 1\})$$

4. **Expected Value ($EV$)**:
   $$EV = \hat{p} \times r - (1 - \hat{p}) \times 1.0$$

## Decision Rules
- If $N < 30 \implies$ `INSUFFICIENT EVIDENCE`
- If $W_{low} \le P_{BE} \implies$ `EDGE NOT DETECTED`
- If $W_{low} > P_{BE} \land EV > 0 \land BS < 0.25 \implies$ `EDGE DETECTED (CANDIDATE)`
