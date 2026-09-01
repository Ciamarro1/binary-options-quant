# Workflow 01: Alpha Generation Pipeline (Research to Feature Spec)

## Overview
This workflow governs the creation of a new alpha hypothesis from economic intuition to formal specification and audited dataset ingestion.

```text
┌─────────────────────────┐
│  Head of Quant Research │ ===> Drafts HYPOTHESIS_XXX.md (Frozen)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Quant Feature Engineer │ ===> Ingests & Audits Dataset (DATASET_XXX)
└────────────┬────────────┘ ===> Implements Causal Feature Extractors
             │
             ▼
┌─────────────────────────┐
│  Core Engine Developer  │ ===> Integrates Model in SignalCore
└─────────────────────────┘
```

## Step-by-Step SOP

### Step 1: Hypothesis Drafting (Head of Research)
1. Formulate the trading logic in `research/hypotheses/HYPOTHESIS_XXX.md`.
2. Define the exact features, indicator parameters, and entry criteria.
3. Commit and declare the document **[FROZEN]**.

### Step 2: Dataset Preparation & Audit (Feature Engineer)
1. Ingest clean historical data with `scripts/ingest_dataset_XXX.js`.
2. Generate `manifest.json` with row counts, start/end timestamps, and hash checksums.
3. Run `DatasetValidator` to prove chronological monotonicity and absence of duplicate timestamps.

### Step 3: Causal Feature Implementation (Feature Engineer)
1. Implement feature extraction in `src/features/` or `src/models/`.
2. Enforce sequential, online state updates (no backward lookups).
3. Write unit tests in `tests/unit/` verifying mathematical accuracy.
