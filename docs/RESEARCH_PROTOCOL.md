# Research Protocol

This document establishes the zero-data-leakage and baseline integrity protocols for all quantitative models in the system.

## 1. Zero Data Leakage (Causality Protocol)

The system formally establishes:
`t = time of decision`

- **Allowed Data**: `D <= t`
- **Prohibited Data**: `D > t`

No future information can enter the creation of a signal.
If the `FeatureEngine` or `RegimeEngine` detects any observation where `timestamp > targetTimestamp`, it must throw an explicit `Causality violation` error.

## 2. Model Contract
We do not couple the system to a specific model. Any model must implement:
`predict(featureSnapshot, regimeSnapshot)` returning `{ probability, direction, expirySeconds }`

## 3. Signal Engine Abstraction
The `SignalEngine` orchestrates the conversion of Data -> Features -> Regime -> Prediction -> Signal.
It cannot make any API calls.
It cannot fetch order book status.
It cannot know the current account balance.
It produces a purely mathematical hypothesis.

## 4. Reality Check (Evidence Laboratory)
No single metric constitutes sufficient evidence of edge.
The laboratory MUST observe:
- Prediction Quality (Brier, Log Loss, Accuracy)
- Calibration (Predicted probabilities align with empirical win rates)
- Out-of-Sample Stability (Walk-forward temporal splits)
- Statistical Confidence (Sufficient sample size and tight confidence intervals)
- Positive Expected Value (EV) over various valid payouts

If all conditions are not unequivocally met, the system verdict is `EDGE NOT DETECTED` or `INSUFFICIENT EVIDENCE`. Failing to prove edge is not the same as proving the absence of edge, but the default state is NO EDGE.
