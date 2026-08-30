# Quantitative Research Contract
This document serves as the constitutional foundation for all quantitative experiments in this project.

## 1. Mathematical Objective
The core objective is to detect and exploit market inefficiencies using strict statistical evidence.

## 2. P_win Estimand Definition (Frozen: Commit 006B)
In this framework, the model's predicted probability and all aggregate win rate statistics are mathematically defined as the conditional probability of a WIN given that the outcome is resolved and non-PUSH:

$$P\_win = P(WIN | resolved, non-PUSH)$$

The `CalibrationEngine` explicitly excludes PUSH and INVALID outcomes to respect this estimator, ensuring the probability targets a strict binary classification space.

## 3. Minimum Sample Size for Valid Decision (Frozen: Commit 007, Protocol v1.1)
The laboratory enforces a minimum of **N = 30** resolved (WIN/LOSS) outcomes before producing any `EDGE DETECTED` or `EDGE NOT DETECTED` verdict.

Below this threshold, `MetricsEngine.calculate()` returns `INSUFFICIENT EVIDENCE`.

This threshold was established because the Wilson Score CI is too wide below N=30 to produce meaningful binary conclusions.

- **Threshold:** `N >= 30`
- **Implemented in:** `MetricsEngine.MIN_SAMPLE_SIZE = 30`
- **Protocol Version:** 1.1

## 4. Epistemic Rigor
- **No Future Leakage:** Features can only use data strictly before the signal generation time.
- **No Target Leakage:** Outcomes can only be resolved at strictly `>= entryTime + expiryMs`.
- **No Model Leakage:** Model state must not leak between OOS train and test windows.
- **No Retrospective Editing:** A bug found after an experiment is frozen does NOT alter the historical record. A new experiment ID is created; the old one is preserved as-is.

## 5. Timestamp Convention
All timestamps in `MarketObservation`, `Signal`, and `BinaryOutcome` are **milliseconds since Unix epoch** (UTC).
The `ReplayEngine` converts `signal.expirySeconds * 1000` to milliseconds internally before comparing to `obs.timestamp`.
