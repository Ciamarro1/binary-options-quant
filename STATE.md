# Project State: Binary Options Quant

**Current Phase:** Commit 016 Complete (Cross-Hypothesis Meta-Analysis Complete & Research Family Archived)

## Completed Milestones
1. **Commit 001 - Core Types:** MarketObservation, BinaryOutcome, Signal, ProbabilitySnapshot.
2. **Commit 002 - Mathematical Core:** TargetEngine, EVEngine, DatasetValidator, DecisionGate.
3. **Commit 003 - Signal Research Core:** SignalCore, FeatureEngine, RegimeEngine, SignalEngine.
4. **Commit 004 - Quantitative Evidence Laboratory:** Dataset, ReplayEngine, BaselineModel, CalibrationEngine, MetricsEngine, WalkForward.
5. **Commit 005 - Post-Audit Fixes:** Immutability, strict causality, pure market baseline, Wilson CI.
6. **Commit 006A - Synthetic Null Validation:** Mulberry32 PRNG null/edge detection tests. **[FROZEN]**
7. **Commit 006B - Real Market Baseline OOS:** BTCUSDT 1m Jan-24. Win rate 50.43% vs P_BE 55.56%. EDGE NOT DETECTED. **[FROZEN]**
8. **Commit 007 - Robustness / Adversarial Validation:** 100 tests / 28 suites. Temporal boundary, label permutation, data corruption, PUSH stress, Wilson CI math, Architecture A (cadence-agnostic Dataset). **[FROZEN]**
9. **Commit 008 - Strategy Hypothesis 001 (Short-Horizon Momentum / DisplacementModel):**
   - Ingested & Audited `DATASET_002` (BTCUSDT 1m Feb-May 2024, 174,240 rows). **[FROZEN]**
   - Implemented Causal `FeatureEngine` (Wilder's RMA ATR(14), Volume SMA(20)) & `DisplacementModel`.
   - Executed Blind Walk-Forward OOS Replay (114 rolling windows, 12,808 resolved signals).
   - Result: Win Rate 47.88% (95% Wilson CI [47.01%, 48.74%]), EV -0.1382 vs P_BE 55.56%. `EDGE NOT DETECTED`.
   - **CRO Tri-Proof Deliberation:** Sovereign **`VETO`** issued (`RISK_DECISION.json`).
   - **Classification:** **`FALSIFIED & ARCHIVED`**. No parameter rescue, no curve-fitting. **[FROZEN]**
10. **Commit 009 - Research Post-Mortem & Multiple Testing Governance:**
    - Formalized `008_POST_MORTEM.md` & `POST_MORTEM.json` with epistemic boundaries.
    - Fixed cryptographic hash lineage in `PROVENANCE_RECEIPT.json` and `EXP_008_MANIFEST.json`.
    - Established `research/governance/HYPOTHESIS_REGISTRY.json` for Family-Wise Error Rate control.
    - Instituted Research Information Barrier between research cycles. **[FROZEN]**
11. **Commit 010 - HYPOTHESIS-002 Formulation & Formal Freeze:**
    - Conceived `HYPOTHESIS_002` (Short-Horizon Mean-Reversion / Exhaustion Anomaly, v1.0.0).
    - 15 Mandatory Dimensions audited and validated via Quant-Grill.
    - Defined 3-candle expiry target ($180\text{s}$), fail-closed training probability, and 115 OOS windows.
    - Cryptographically hashed and registered in `HYPOTHESIS_REGISTRY.json` (`parent_hypothesis: HYPOTHESIS_001`). **[FROZEN]**
12. **Commit 011 - DATASET_003 Ingest & Audit + BASELINE_003_CONTROL Execution:**
    - Downloaded, validated and canonicalized `DATASET_003` (BTCUSDT Spot 1m Jun–Sep 2024, 175,680 rows, 0 gaps, hash: `3ed2064690b63516a559d10c4d8e7d8de60795f380668bc9c2d1544ad5c53638`). **[FROZEN]**
    - Implemented `src/governance/` OrchestratorGate, AuditLogger, Constants, with 43 passing test suites (147 tests).
    - Executed `BASELINE_003_CONTROL` on `DATASET_003` across 115 OOS windows with 3-candle expiry ($180\text{s}$).
    - Empirical Baseline Result: 163,675 resolved predictions, Win Rate 49.8922% (95% Wilson CI [49.65%, 50.13%]), EV -0.1019 vs P_BE 55.56%. `EDGE NOT DETECTED`. **[FROZEN]**
13. **Commit 012 - FeatureEngine Extension (`closeLocation`) & ExhaustionModel Implementation:**
    - Implemented `closeLocation` with zero-range division check (`high === low \implies null \implies \text{NO SIGNAL}`).
    - Implemented Wilder's RMA ATR(14) with bootstrap and Volume SMA(20) lookback ($[t-20 \dots t-1]$ excluding $t$).
    - Implemented `ExhaustionModel` with direction-specific train probability estimation ($\hat{P}_{\text{CALL}}$, $\hat{P}_{\text{PUT}}$).
    - Enforced fail-closed sample size ($N_{\text{Train, dir}} < 30 \implies \text{prob} = \text{null} \implies \text{NO SIGNAL}$) and overlap coexistence.
    - 49 test suites / 162 unit & adversarial tests passing (100%). **[FROZEN]**
14. **Commit 013 - Adversarial Validation Suite (HYPOTHESIS_002 Certification):**
    - Implemented `ReversedExhaustionModel` (Negative Directional Control).
    - Executed 1,000 label permutations with Mulberry32 PRNG (0 false positives).
    - Executed Synthetic Null Random Walk (Win Rate 51.88%, `EDGE NOT DETECTED`).
    - Executed Numerical Fuzzing & Chinese Wall Immutability verification.
    - Generated `ADVERSARIAL_AUDIT_002.json` with status `CLEAR_FOR_BLIND_OOS`.
    - 55 test suites / 170 tests passing (100%). **[FROZEN]**
15. **Commit 014 - Blind Walk-Forward OOS Replay (115 Windows) & Tri-Proof CRO Deliberation:**
    - Replayed H002 and Reversed Control across 115 rolling windows of `DATASET_003`.
    - Results: N = 2,049 trades, Win Rate = 52.2206% (95% Wilson CI [50.0556%, 54.3773%]), EV = -0.0600 vs P_BE = 55.5556%.
    - Comparative: Outperformed Baseline 003 Control (49.8922%, +2.33 pp) and Reversed Control (47.3787%, +4.84 pp).
    - **CRO Tri-Proof Deliberation:** Sovereign **`VETO`** issued (`RISK_DECISION.json`, `CRO_VERDICT.md`).
    - **Classification:** **`FALSIFIED & ARCHIVED`**. No parameter rescue, no curve-fitting. **[FROZEN]**
16. **Commit 015 - H002 Formal Scientific Post-Mortem & Research Family Ledger:**
    - Emitted `H002_POST_MORTEM.md`, `H002_POST_MORTEM.json`, `FAILURE_ANALYSIS.json`, `RESEARCH_LIMITS.md`.
    - Formulated Core Axiom: *Predictive Information != Economic Edge*.
    - Established Research Family Ledger (`SHORT_HORIZON_BTCUSDT_1M`) in `HYPOTHESIS_REGISTRY.json`. **[FROZEN]**
17. **Commit 016 - Cross-Hypothesis Meta-Analysis (H001 vs H002 Synthesis):**
    - Emitted full META_016 dossier (`META_ANALYSIS.md`, `META_ANALYSIS.json`, `H001_SYNTHESIS.json`, `H002_SYNTHESIS.json`, `DEPENDENCY_ANALYSIS.json`, `CALIBRATION_SYNTHESIS.json`, `GOVERNANCE_DECISION.md`).
    - Executed 10,000 paired block bootstrap resamples across 115 OOS windows (Difference vs Baseline: +1.35 pp, p = 0.2434; Difference vs Reversed: +2.73 pp, p = 0.2443).
    - Verified Expected Calibration Error (ECE = 0.0215) and directional symmetry.
    - Established dedicated `RESEARCH_FAMILY_LEDGER.json` and formally archived `SHORT_HORIZON_BTCUSDT_1M`. **[FROZEN]**

65. **Commit 017 - MTF Liquidity Microstructure Conception (H003 Pre-Registration):**
    - Established new Research Family `MTF_LIQUIDITY_MICROSTRUCTURE`.
    - Frozen pre-registration of `HYPOTHESIS_003` v1.0.1 (Multi-Timeframe Liquidity Microstructure Sweep).
    - Enforced rigorous `HTF_CANDLE_CLOSED_BEFORE(t)` strict causality matrix.
    - Specified dataset zero-contamination period: `2024-10-01` to `2025-03-31`. **[FROZEN]**
66. **Commit 018 - DATASET_004 Ingest & Audit + BASELINE_004_CONTROL Execution:**
    - Ingested and canonicalized `DATASET_004` (BTCUSDT Spot 1m, 262,080 candles, 0 gaps). **[FROZEN]**
    - Executed `BASELINE_004_CONTROL` against 152 OOS windows (Win Rate: 49.90%). **[FROZEN]**
67. **Commit 019 - MTF Feature Engine & Strategy Implementation:**
    - Developed `MTFFeatureEngine` with strictly accurate evaluation timing (`signalTimeMs = targetTimeMs + 60000`) for precise boundary logic.
    - Passed comprehensive tests ensuring MTF Historical Invariance and Exclusion of the structural forming candle. **[FROZEN]**
68. **Commit 020 - MTF Adversarial Validation Suite (H003):**
    - Executed 020-A (Future Injection), 020-B (Boundary Fuzzing), 020-C (Current-Candle Contamination).
    - Executed 020-D (Aggregate Determinism) and 020-E (H003 vs Reversed Identity logic check).
    - Verified 020-G (Synthetic Null) and 020-H (Immutability Hash). **[FROZEN]**
69. **Commit 021 - Genuine Blind OOS Execution (H003):**
    - `021` Synthetic test invalidated by CRO; executed `021-R Genuine Data Acquisition` direct from Binance Archive.
    - Verified `DATASET_004` Provenance Gate (Canonical Hash `12683...230d`, 262,080 rows, 0 gaps).
    - Normalization of microseconds to milliseconds formalized in `021-R_PROVENANCE_REPORT.json`.
    - 152 Walk-Forward windows executed cleanly. Total Candidates over 152 days: 15 Sweep-Up, 9 Sweep-Down.
    - $N_{train} \ge 30$ failed in all windows $\implies$ Fail-Closed $\implies$ 0 OOS Signals.
    - CRO Classification: **`INCONCLUSIVE - INOPERABLE UNDER PRE-REGISTERED SAMPLE FLOOR`**. **[FROZEN]**
70. **Commit 022 - H003 Formal Scientific Post-Mortem:**
    - Emitted `POST_MORTEM_H003.md` detailing catastrophic structural rarity (Hit Rate 0.01096%).
    - Formally audited Train/Test boundary resolution (leak identified for `t_setup + expiry > t_trainEnd`).
    - Enforced rule: Parameter relaxation (e.g., $N=10$, SMA=20h) is prohibited as it constitutes curve-fitting.
    - H003 is formally archived as inconclusive. **[FROZEN]**
71. **Commit 023 - H003 Feasibility & Structural Frequency Analysis:**
    - Performed purely diagnostic conditional funnel breakdown on `DATASET_004`.
    - Finding: Liquidity Sweeps of 24h extremes are common (~4,000+ occurrences in 6 months).
    - Finding: The geometric intersection of `Sweep` + `Counter-Trend SMA50h Bias` annihilates >98% of candidates.
    - Conclusion: H003 is mathematically and geometrically too strict to exist in sufficient frequencies. **[FROZEN]**
    - `MTF_LIQUIDITY_MICROSTRUCTURE` family archived as `CLOSED / INCONCLUSIVE` (No tuning allowed).
72. **Commit 024 - Research Mandate Review (Informational Capacity):**
    - Epistemic pivot: Evaluating dataset informational capacity prior to strict structural geometry.
    - Implemented Tri-Level Metric Framework: 1. Detectability, 2. Predictability, 3. Economics.
    - Issued `RESEARCH_MANDATE_024.md` selecting Family C (Relative State) for empirical testing. **[FROZEN]**
73. **Commit 025 - HYPOTHESIS-004 Pre-Registration (Family 03):**
    - Quant-Grill closed with exact deterministic rules for Relative State Mean Reversion.
    - Feature: Empirical Percentile Rank ($Q_t$) over $L=240$ avoiding normality assumptions.
    - Setup: $Q \le 0.025 \implies \text{CALL}$, $Q \ge 0.975 \implies \text{PUT}$. No secondary filters.
    - Expiry 3m. Train deduzido para $4.320$ candles (3 dias) gerando margem teórica de $\sim 108$ eventos, prevenindo Frequency Starvation.
    - Adversarial additions: Quantile Future Injection, Rank Contamination, Boundary Precision, e Calibration Test. **[FROZEN]**
74. **Commit 026 - DATASET_005 Ingestion & Baseline 005 Control Execution:**
    - `DATASET_005` created from Binance Public Data (April-Sept 2025). 263,520 rows, 0 gaps.
75. **Commit 027 - Quantile State Engine Implementation (H004):**
    - `QuantileStateEngine.js` deployed.
    - $Q_t = \text{count}(H_i < r_t) / 240$. Strict inequality, discrete thresholds.
    - $r_t$ strictly excluded from the reference array $H$.
    - `027_quantile_state_engine.test.js` executed. QS-001 to QS-010 passed. Perfect causal flow verified. **[FROZEN]**
76. **Commit 028 - Adversarial OOS Harness (H004):**
    - `H004Runner.js` created with strict `predict` $\to$ `signal` $\to$ `update` pipeline.
    - Test Suite 028-A to 028-H executed. ALL PASS.
    - Output: `ADVERSARIAL_AUDIT_H004.json` recorded. No sequence inversion detected. **[FROZEN]**
77. **Commit 029 - Blind OOS Execution (H004):**
    - **[INVALID / HOLD]** - OOS windows were selected retroactively based on $P_{train} > P_{BE}$. Violates structural integrity.
78. **Commit 029R - Full-Sample Blind OOS Re-run (H004):**
    - Protocol: ALL 180 Walk-Forward windows on `DATASET_005`. Train=3d, Test=1d, Expiry=3m, Payout=0.8. NO selective exclusion.
    - Result: 16,003 OOS signals emitted across 180 windows. (Signal Rate: 6.17%). Frequency Starvation cured.
    - OOS Win Rate (Primary): $50.63\%$ (Wilson Lower: $49.85\%$).
    - Baseline Win Rate: $49.75\%$. Reversed Win Rate: $49.36\%$ (perfect symmetry).
    - Diagnostic: Windows with $P_{train} > P_{BE}$ showed $51.27\%$ WR; windows $\le P_{BE}$ showed $50.50\%$ WR.
    - Conclusion: **FALSIFIED** economically (EV = -0.088). **[FROZEN]**
79. **Commit 030 - H004 Post-Mortem & Formalization:**
    - `H004_POST_MORTEM.md` and related JSONs generated.
    - Note on Predictability: Observed relative advantage of +0.88pp does not constitute statistical confirmation absent formal tests.
    - The core distinction is proven: Predictability $\neq$ Monetization.
    - H004 is **FALSIFIED_ARCHIVED**. **[FROZEN]**
80. **Commit 031 - Family 03 Decision & Statistical Association Audit:**
    - Inverse-Variance Weighted Paired t-test over 180 windows.
    - Result initially indicated $p=0.021$, but placed on **[AUDIT HOLD]** due to temporal dependence and asymmetric sampling.
    - Status: Observed advantage of +0.94pp, pending temporal validation.
81. **Commit 031A - Temporal Association Audit (Block Bootstrap):**
    - Protocol: Temporal Block Bootstrap across the 180 contiguous TEST windows ($B=10,000$). Resamples non-overlapping 1-day OOS blocks.
    - Result: Observed $\Delta = +0.88\%$. 95% CI: [+0.07%, +1.71%]. Empirical p-value = 0.016.
    - Conclusion: The directional edge survives temporal blocking. It is statistically robust, though economically unviable in binary options.
    - Status: Family 03 is **CLOSED_ARCHIVED**. **[FROZEN]**
82. **Commit 032 - Venue Alignment Mandate:**
    - Major epistemic pivot: $Market\ Signal \neq Venue\ Signal \neq Contract\ Outcome \neq Economic\ Edge$.
    - Laboratory divided into **Reference Market Research** (Binance) and **Venue-Specific Execution Research** (IQ Option).
    - Established the 10-Point Checklist for IQ Option Reconciliation.
    - Status: **[FROZEN]**
83. **Commit 033 - IQ Option Venue & Contract Acquisition:**
    - Directory structure (`data_acquisition`) established.
    - Protocol defined in 4 Phases: A (Recorder), B (Reconstruction), C (Reconciliation), D (Contract Formalization).
    - **033-A (Recorder Skeleton)**: `iqoption_adapter.py` and `recorder.py` created. Adapter is observation-only, shielding execution logic from the core.
    - Status: **[PENDING 033-B - Local Execution]**
84. **Commit 034 - Operational Contract Discovery:**
    - Operational target locked: **IQ Option BTC/USD, Binary, 15m Expiry, 87% Payout**.
    - Breakeven threshold drops to **$53.48\%$**.
    - Mandate created to study $\Delta P_t = P_{IQO} - P_{Binance}$ before opening Family 04.
    - Status: **[FROZEN]**

**Next Objective:** User runs the Smoke Capture (033-B/C) to gather raw IQ Option data. Lab stands by to process the $\Delta P_t$ divergence study.