---
name: quant-model-registry-governance
description: >-
  Runbook for managing the lifecycle, promotion gates, model metadata, and retirement of quantitative strategies in the Model Registry.
  Used by the CRO, CTO, and Experiment Controller.
---

# Model Registry Governance Skill

## Objective
Control the state machine and cryptographic deployment manifests for all models transitioning from research to paper/live execution.

## Model Lifecycle State Machine

```text
[01. CANDIDATE]           Initial model implementation matching frozen hypothesis
       │
       ▼
[02. VALIDATED]           Passed OOS Walk-Forward ($N >= 30$, $W_{low} > P_{BE}$, $EV > 0$)
       │
       ▼
[03. APPROVED]            Unanimous Tri-Proof CRO + CTO + Controller sign-off
       │
       ▼
[04. PAPER / DEMO]        Active on shadow/demo execution feed; real-time latency audit
       │
       ▼
[05. PROD_CANDIDATE]      Mandate authorized by CEO; sizing limit strictly enforced
       │
       ▼
[06. LIVE]                Production execution
       │
       ▼
[07. RETIRED / REJECTED]  Degraded calibration, regime failure, or parameter veto
```

## Registry Manifest Specification
Stored in `artifacts/model_registry/MODEL_<ID>_MANIFEST.json`.
