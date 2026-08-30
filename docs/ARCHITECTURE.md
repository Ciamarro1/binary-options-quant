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
