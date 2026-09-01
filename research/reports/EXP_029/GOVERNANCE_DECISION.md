# GOVERNANCE DECISION: H004
**Date:** 2026-09-01
**Action:** FALSIFIED / ARCHIVED

## 1. Assessment of Hypothesis H004
Hypothesis 004 explored the predictive capacity of relative state via empirical percentile rank (Family C). 
Based on the full-sample, out-of-sample execution (Commit 029R) without post-hoc selection bias:

1. **Directional Edge**: An observed directional advantage was detected (+0.88pp over the naïve historical baseline). This proves that the feature isolates some microstructural mean-reverting property, fulfilling Level 2 Predictability requirements. 
2. **Economic Viability**: The win rate achieved (50.63%) is significantly below the $P_{BE}$ (55.56%) dictated by the binary options spread (Payout: 0.80). Expected Value is heavily negative (-0.088).

**Decision**: The hypothesis is structurally sound as a signal, but economically inviable. **H004 is FALSIFIED AND ARCHIVED.**

## 2. Protocol and Constitution Updates
- P-Hacking explicitly forbidden: We will not add parameters or thresholds post-execution to "force" the 50.63% to jump to 55.56%. 
- The constitution (AGENTS.md) has been updated with **Rule 9** (prohibition of OOS window selection based on IS performance) and **Rule 10** (post-execution subsets cannot replace primary estimands).

## 3. Next Steps (Family Level)
Since Family C (Relative State) isolated a directional association (predictability) but failed to overcome the economic barrier, the governance must now decide on the fate of this Family:
- Do we close the Relative State dimension entirely?
- Or do we combine the discovered predictability with a new regime dimension in a completely independent Hypothesis (H005)?

The laboratory halts execution until a strategic path for Family 03 is deliberated.
