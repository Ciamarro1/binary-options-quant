# Quantitative Research Contract
This document serves as the constitutional foundation for all quantitative experiments in this project.

## 1. Mathematical Objective
The core objective is to detect and exploit market inefficiencies using strict statistical evidence.

## 2. P_win Estimand Definition (Frozen as of Commit 006B)
In this framework, the model's predicted probability and all aggregate win rate statistics are mathematically defined as the conditional probability of a WIN given that the outcome is resolved and non-PUSH:
$$P\_win = P(WIN | resolved, non-PUSH)$$
The `CalibrationEngine` explicitly excludes PUSH and INVALID outcomes to respect this estimator, ensuring the probability targets a strict binary classification space.

## 3. Epistemic Rigor
- No Future Leakage: Features can only use data strictly strictly before the signal generation time.
- No Target Leakage: Outcomes can only be resolved at strictly `>= entryTime + expiryTime`.
- No Model Leakage: Model state must not leak between OOS train and test windows.
