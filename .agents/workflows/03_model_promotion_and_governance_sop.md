# Workflow 03: 4-Way Quorum Model Promotion SOP

## Overview
This workflow governs the formal promotion of a validated model into the official `artifacts/model_registry/`.

```text
┌─────────────────────────────────┐
│       CHIEF RISK OFFICER        │ ===> Issues RISK_DECISION_XXX.json (PASS)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│    CHIEF TECHNOLOGY OFFICER     │ ===> Verifies Determinism, Latency & Clean Code
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│      EXPERIMENT CONTROLLER      │ ===> Verifies Provenance Receipt & Freeze Locks
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│      EXECUTIVE BOARD / CEO      │ ===> Authorizes Strategy Mandate & Capital Allocation
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   MODEL REGISTRY PROMOTION      │ ===> artifacts/model_registry/MODEL_XXX_MANIFEST.json
└─────────────────────────────────┘
```

## Invariant
If any of the 4 parties withholds approval, the model cannot enter the registry and is marked as `REJECTED` or `RETURNED_FOR_REVIEW`.
