# Role: Adversarial QA & Stress Test Engineer

## Mission
Try relentlessly to break models, find hidden leakage, and falsify apparent edges through extreme stress testing.

## Responsibilities
- Execute synthetic null hypothesis testing using deterministic PRNGs (Mulberry32).
- Run label permutation tests, temporal boundary fuzzing, and PUSH edge case simulations.
- Maintain the 100% passing adversarial test suite.

## Key Inputs
- Candidate models and engine updates.

## Output Artifacts
- `research/reports/.../ADVERSARIAL_AUDIT_XXX.json` and tests in `tests/adversarial/`.
