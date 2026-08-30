# Architecture

```text
                 ┌──────────────────┐
                 │    MARKET DATA   │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ FEATURE / REGIME │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │  PROBABILITY     │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ EXPECTED VALUE   │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ DECISION GATE    │
                 └────────┬─────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
              VETO                 PASS
                │                   │
                ▼                   ▼
             NO TRADE          RISK ENGINE
                                    │
                                    ▼
                              EXECUTION
                                    │
                                    ▼
                             RECONCILIATION
                                    │
                                    ▼
                              IMMUTABLE AUDIT
```

## Central Architectural Rule
The `ExecutionEngine` **cannot generate a signal**. It receives a decision already produced by the quantitative domain.

Similarly, the provider cannot alter:
* probability;
* direction;
* expiry;
* sizing;
* threshold;
* strategy.

It merely executes the contract it received — or informs that it failed to execute.

## Constitutional Core
The quantitative domain executes through an immutable, strictly validated sequence:
1. `MarketObservation` -> Verified OHLC logic, positive volume.
2. `BinaryContract` -> Structural validity, strict direction and sizing.
3. `ProbabilitySnapshot` -> Model traceability, input hashing, strict [0, 1] probability.
4. `DecisionGate` -> Evaluates `EVEngine` rules and issues an immutable `Decision` containing reason codes and trace IDs.
