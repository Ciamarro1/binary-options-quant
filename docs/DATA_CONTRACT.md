# Data Contract

This defines the structure, schema, and expectations for all incoming market data and internal datasets.

## Market Observation
Every incoming data point must satisfy the `MarketObservation` contract:
- Valid Timestamp.
- `High >= max(Open, Close)`
- `Low <= min(Open, Close)`
- `Volume >= 0`
- `Asset` and `Timeframe` are required.
- No `NaN`, `Infinity`, or silent coercions allowed.
