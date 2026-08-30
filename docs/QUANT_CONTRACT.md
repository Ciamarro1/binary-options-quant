# Quantitative Contract

## Mathematical Foundation

```text
P_BE = 1 / (1 + payout)

EV = P_win × payout - P_loss
```

The system will work with strict numerical metrics, such as:
- `signal_probability`
- `payout`
- `break_even_probability`
- `edge`
- `expected_value`
- `confidence`
- `expiry`
- `direction`

There are no arbitrary rules like:
```text
if (confidence > 0.7) BUY
```
without knowing **why 0.7 exists**, how it was estimated, and whether it remains valid out-of-sample.

## EVEngine
The core mathematical engine is pure and deterministic. It evaluates probabilities against the required `Edge`.
- `EV = P(win) * payout - (1 - P(win))`
- `P_BE = 1 / (1 + payout)`
- `Edge = P(win) - P_BE`

No trade is allowed if `EV <= 0` or if the `Edge` is below the system's threshold.
