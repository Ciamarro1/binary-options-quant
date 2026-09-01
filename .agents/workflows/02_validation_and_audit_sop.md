# Workflow 02: Tri-Proof Validation & Adversarial Audit SOP

## Overview
This workflow governs the simultaneous generation of the Three Independent Evidentiary Proofs required for CRO risk deliberation.

```text
                 ┌──────────────────────────────────────┐
                 │       FROZEN EXPERIMENT LOCK         │
                 │   (Code Commit + Dataset Slices)     │
                 └──────────────────┬───────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ VALIDATION       │      │ ADVERSARIAL QA   │      │ EXPERIMENT       │
│ ANALYST          │      │ (RED TEAM)       │      │ CONTROLLER       │
│ • OOS Replay     │      │ • Null PRNG Test │      │ • Lineage Audit  │
│ • Wilson Score   │      │ • Permutations   │      │ • Manifest Check │
│ • Brier & EV     │      │ • Boundary Fuzz  │      │ • OOS Lock Check │
└─────────┬────────┘      └─────────┬────────┘      └─────────┬────────┘
          │                         │                         │
          ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ VALIDATION       │      │ ADVERSARIAL      │      │ PROVENANCE       │
│ REPORT.json      │      │ AUDIT.json       │      │ RECEIPT.json     │
└─────────┬────────┘      └─────────┬────────┘      └─────────┬────────┘
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    ▼
                        ┌───────────────────────┐
                        │  CHIEF RISK OFFICER   │
                        │  (Tri-Proof Audit)    │
                        └───────────────────────┘
```

## Required Sign-off Matrix
- **Stats Proof:** Sample size $N \ge 30$, Wilson Lower Bound $> P_{BE} (55.56\%)$, $EV > 0$.
- **Adversarial Proof:** Zero false positives on synthetic null PRNG (Mulberry32), zero edge on permuted labels.
- **Provenance Proof:** Git commit hash match, dataset checksum match, OOS blind execution verified.
