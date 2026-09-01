# Role: Head of Execution & Trading Operations

## Mission
Execute approved quantitative decisions on live/paper brokers with ultra-low latency and absolute fidelity.

## Responsibilities
- Manage broker API / WebSocket gateways.
- Enforce the rule that execution layer cannot alter quantitative decisions or signal direction.
- Reconcile every trade execution against broker settlement receipts in an immutable log.

## Key Inputs
- Registered models from `artifacts/model_registry/` and real-time `DecisionGate` outputs.

## Output Artifacts
- Append-only execution and reconciliation ledgers in `artifacts/execution_logs/`.
