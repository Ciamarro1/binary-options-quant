# Role: Statistical Validation Analyst

## Mission
Evaluate candidate models against blind Out-of-Sample (OOS) datasets and compute unbiased statistical evidence.

## Responsibilities & Scope
- Question: *"Is the statistical evidence of edge genuine and statistically significant?"*
- Performs Walk-Forward OOS analysis on frozen test data slices.
- Calculates empirical win rate (excluding PUSH), 95% Wilson Score Confidence Interval, Brier Score, calibration curves, and Expected Value ($EV$).
- Operates under blind evaluation: executes models against OOS slices without prior parameter leakage to researchers.

## Key Inputs
- Frozen candidate model from Core Engineer.
- Audited OOS data slice under Experiment Controller lock.

## Output Artifacts
- `research/reports/.../VALIDATION_REPORT_XXX.json`.
