# Project State: Binary Options Quant

**Current Phase:** Strategy Hypothesis (Commit 008)

## Completed Milestones
1. **Commit 001 - Core Types:** MarketObservation, BinaryOutcome, Signal, ProbabilitySnapshot.
2. **Commit 002 - Mathematical Core:** TargetEngine, EVEngine, DatasetValidator, DecisionGate.
3. **Commit 003 - Signal Research Core:** SignalCore, FeatureEngine, RegimeEngine, SignalEngine.
4. **Commit 004 - Quantitative Evidence Laboratory:** Dataset, ReplayEngine, BaselineModel, CalibrationEngine, MetricsEngine, WalkForward.
5. **Commit 005 - Post-Audit Fixes:** Immutability, strict causality, pure market baseline, Wilson CI.
6. **Commit 006A - Synthetic Null Validation:** Mulberry32 PRNG null/edge detection tests. **[FROZEN]**
7. **Commit 006B - Real Market Baseline OOS:** BTCUSDT 1m Jan-24. Win rate 50.43% vs P_BE 55.56%. EDGE NOT DETECTED. **[FROZEN]**
8. **Commit 007 - Robustness / Adversarial Validation:** 100 tests / 28 suites. Temporal boundary, label permutation, data corruption, PUSH stress, Wilson CI math, Architecture A (cadence-agnostic Dataset). **[FROZEN]**

## Current Focus: Commit 008 - Strategy Hypothesis (Short-Horizon Momentum)
- **Completed 008.1 - 008.3:**
  - `HYPOTHESIS_001.md v1.0.2` documented and **[FROZEN]**.
  - `DATASET_002` (BTCUSDT 1m Feb-May 2024, 174,240 rows) ingested, audited, and **[FROZEN]**.
- **Pending Implementation (008.4 - 008.6):**
  - Update `FeatureEngine` for `ATR(14)` (Wilder RMA) and `meanVolume(20)` with causal sequential updates (no look-ahead).
  - Implement `DisplacementModel` using the frozen rules.
  - Implement Conditional Historical Probability (calculated exclusively on the TRAIN window).
  - Execute 008 OOS Protocol and evaluate against `BASELINE_OOS_001`.
- **Constraint:** No post-hoc tuning. If OOS fails economically (vs P_BE = 55.56%), hypothesis is discarded.
