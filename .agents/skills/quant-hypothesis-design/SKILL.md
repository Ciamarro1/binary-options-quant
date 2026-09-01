---
name: quant-hypothesis-design
description: >-
  Runbook and protocol for formulating, formalizing, and freezing mathematical market hypotheses for binary options trading.
  Used by the Head of Quant Research when conceiving a new alpha thesis.
---

# Quant Hypothesis Design & Formalization Skill

## Objective
Establish a formal, falsifiable market anomaly hypothesis with rigorous economic rationale, mathematical estimand, entry/exit criteria, and frozen specifications.

## Procedure
1. **Define Market Anomaly**:
   - Identify the structural, behavioral, or micro-structural inefficiency (e.g., short-horizon volatility displacement, order book imbalance, post-announcement drift).
2. **Specify Mathematical Conditions**:
   - Explicitly define the signal condition $S_t$:
     $$S_t = f(X_{1,t}, X_{2,t}, \dots, X_{k,t}) \in \{\text{CALL}, \text{PUT}, \text{NO\_TRADE}\}$$
3. **Define Payout & Horizon**:
   - Fixed expiry horizon (e.g., $\Delta t = 60s, 300s$).
   - Benchmark broker payout: $r = 0.80 \implies P_{BE} = 55.56\%$.
4. **Draft Hypothesis Document**:
   - Create `research/hypotheses/HYPOTHESIS_XXX.md` using the standard template.
   - Detail the In-Sample (IS) training period and Out-of-Sample (OOS) testing period.
5. **Freeze & Sign-off**:
   - Commit and freeze the hypothesis. No changes permitted after freezing.
