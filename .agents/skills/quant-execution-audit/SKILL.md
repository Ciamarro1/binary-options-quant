---
name: quant-execution-audit
description: >-
  Runbook for validating execution bridges, broker contract compliance, latency tracking, and post-trade state reconciliation.
  Used by Head of Execution & Reconciliation Engineer.
---

# Execution & Reconciliation Skill

## Objective
Execute approved quantitative decisions with microsecond precision, ensuring zero deviation from mathematical model parameters and complete post-trade state auditability.

## Invariants
1. **Zero Logic Inversion**: The execution bridge cannot alter direction, stake size, or expiry horizon issued by `DecisionGate`.
2. **Latency Budget**: Order submission must complete within $< 250\text{ms}$ of signal generation timestamp.
3. **Immutable Trade Ledger**: Every trade event (DISPATCHED, FILLED, REJECTED, EXPIRED, SETTLED) is written to an append-only JSONL log.
4. **Disconnect Fail-Safe**: If WebSocket/API connection drops, all pending execution is frozen immediately.
