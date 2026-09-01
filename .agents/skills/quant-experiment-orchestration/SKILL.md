---
name: quant-experiment-orchestration
description: >-
  Runbook for tracking the end-to-end experimental lifecycle, generating immutable provenance receipts, enforcing dataset/code version locks, and verifying audit trails.
  Used by the Experiment Controller (Head of Research Operations).
---

# Experiment Orchestration & Provenance Skill

## Objective
Guarantee full cryptographic and audit traceability for every quantitative experiment, ensuring that all data slices, code commits, protocol versions, and generated artifacts are immutably linked.

## Experimental Lineage Chain

```text
Hypothesis ID (Frozen)
      ↓
Protocol Version Lock
      ↓
Dataset Manifest Hash Checksum
      ↓
Git Commit SHA / Code Version
      ↓
Unique Execution Run ID (UUIDv4)
      ↓
OOS Replay Lock
      ↓
Tri-Proof Report Generation
      ↓
Provenance Receipt Issuance
```

## Step-by-Step Runbook

1. **Verify Pre-conditions**:
   - Confirm `HYPOTHESIS_XXX.md` is marked **[FROZEN]**.
   - Confirm `research/datasets/.../manifest.json` exists and checksum matches.
   - Confirm git status is clean and record current `COMMIT_HASH`.
2. **Generate Run Identifier**:
   - Create deterministic execution identifier: `EXP_<HYP_ID>_<DATASET_ID>_<TIMESTAMP>`.
3. **Enforce Blind OOS Lock**:
   - Verify that test data slice is isolated from research training scripts.
4. **Issue Provenance Receipt**:
   - Save `research/reports/<EXP_ID>/PROVENANCE_RECEIPT.json`.
