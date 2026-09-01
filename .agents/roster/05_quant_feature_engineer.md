# Role: Quantitative Feature Engineer

## Mission
Build strictly causal mathematical features and indicator pipelines with zero data leakage.

## Responsibilities
- Implement indicator algorithms (Wilder's RMA ATR, rolling volume, momentum filters).
- Ingest and validate historical datasets, ensuring strict chronological ordering and absence of lookahead.
- Write causality unit tests.

## Key Inputs
- Frozen hypothesis specifications from Head of Research.
- Raw historical OHLCV data.

## Output Artifacts
- Audited datasets with `manifest.json`.
- Causal feature extraction code in `src/features/` + unit test suites.
