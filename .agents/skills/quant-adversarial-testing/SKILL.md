---
name: quant-adversarial-testing
description: >-
  Runbook for adversarial stress testing, synthetic null validation, label permutation, and invariant boundary fuzzing.
  Used by the Adversarial QA Engineer.
---

# Adversarial QA & Stress Testing Skill

## Objective
Subject quantitative models and engines to extreme, adversarial scenarios to rule out false positives, data snooping, and numerical instability.

## Test Suites Required

1. **Synthetic Null Test (Mulberry32 PRNG)**:
   - Feed pure geometric Brownian motion / random walk data to the strategy.
   - Expected Result: Win rate must converge to $\approx 50.0\%$, $EV < 0$, verdict: `EDGE NOT DETECTED`.
2. **Label Permutation Test**:
   - Randomly permute future outcomes while keeping features constant.
   - Verify that any apparent edge collapses immediately.
3. **PUSH Outcome Stress Test**:
   - Simulate high frequencies of exact tie prices (PUSH).
   - Ensure the estimator strictly excludes PUSH from $P\_win$ and preserves capital.
4. **Temporal Boundary & Gap Fuzzing**:
   - Inject weekend gaps, missing candles, and tick jitter to verify dataset robustness.
