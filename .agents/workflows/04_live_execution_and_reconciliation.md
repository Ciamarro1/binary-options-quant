# Workflow 04: Live / Paper Execution & Post-Trade Reconciliation

## Overview
This workflow governs the operational execution of signals emitted by registered models in paper or live production environments.

```text
┌─────────────────────────┐
│      SignalEngine       │ ===> Generates Signal (Probability & Direction)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│      DecisionGate       │ ===> Evaluates EV vs Payout Threshold -> Decision
└────────────┬────────────┘
             │
             ▼ [If PASS]
┌─────────────────────────┐
│    Head of Execution    │ ===> Submits Order to Broker Bridge (<250ms)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Reconciliation Engineer │ ===> Audits Execution vs Broker Receipt (Append-Only)
└─────────────────────────┘
```

## Invariants
- Execution layer cannot modify trade sizing or direction.
- All trade transitions (SIGNAL -> DISPATCHED -> EXECUTED -> SETTLED) are logged with nanosecond timestamps.
