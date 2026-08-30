# Project State: Binary Options Quant

**Current Phase:** Robustness & Adversarial Validation (Commit 007)

## Completed Milestones
1. **Commit 001 - Core Types:** MarketObservation, BinaryOutcome, Signal, ProbabilitySnapshot.
2. **Commit 002 - Mathematical Core:** TargetEngine, EVEngine, DatasetValidator, DecisionGate.
3. **Commit 003 - Signal Research Core:** SignalCore, FeatureEngine, RegimeEngine, SignalEngine.
4. **Commit 004 - Quantitative Evidence Laboratory:** Dataset, ReplayEngine, BaselineModel, CalibrationEngine, MetricsEngine, WalkForward.
5. **Commit 005 - Post-Audit Fixes:** Immutability, strict causality in delayed resolution, pure market baseline fitting, Wilson CI metrics.
6. **Commit 006A - Synthetic Null Validation:** Mulberry32 PRNG synthetic data testing specificity/sensitivity.
7. **Commit 006B - Real Market Baseline OOS:** Ingested BTCUSDT 1m Jan-24. Validated Walk-Forward OOS without future leakage. Established 50.43% baseline win rate (vs 55.56% Break-Even). Strict provenance with 3 distinct SHA-256 hashes. **[FROZEN]**

## Current Focus: Commit 007 - Robustness / Adversarial Validation
- Objective: Subject the Evidence Laboratory to severe stress tests before researching real strategies.
- Tasks:
  - Implement Permutation / label-shuffling tests to detect overfitting.
  - Test edge cases: Extreme PUSH proportions, small samples, probabilities near 0/1.
  - Test corrupted data, gaps, irregular temporal boundaries.
  - Ensure negative controls and deliberately bad models are consistently rejected.
