# Rule: Quantitative Coding Standards & Architectural Isolation

## 1. Immutability
- All core domain objects (`MarketObservation`, `BinaryContract`, `Signal`, `ProbabilitySnapshot`, `Decision`) MUST be frozen using `Object.freeze()` upon instantiation.
- Mutation of historical objects is strictly forbidden.

## 2. Determinism
- All simulation and synthetic generation must use deterministic Pseudo-Random Number Generators (e.g., Mulberry32 with explicit seeds).
- Replay tests on identical datasets must produce byte-for-byte identical signal and outcome streams.

## 3. Domain Isolation (Chinese Walls)
- The execution layer (`ExecutionEngine`, Broker bridges) must NEVER contain signal generation, probability calculation, or sizing alteration logic.
- Mathematical engines (`TargetEngine`, `EVEngine`, `FeatureEngine`, `RegimeEngine`) must NEVER make network requests or access broker account state.
