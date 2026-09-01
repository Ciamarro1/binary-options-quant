# Rule: Strict Temporal Causality & Anti-Leakage Protocol

## 1. Principle
In financial time series and binary option signal generation, future leakage is the primary cause of illusory alpha and severe live capital loss. All system components must enforce strict causality.

## 2. Invariants
1. **Decision Time Boundary ($t$)**:
   - For any prediction made at time $t$, input dataset $D$ must satisfy:
     $$\forall d \in D, \quad \text{timestamp}(d) \le t$$
2. **Feature Computation**:
   - Rolling statistics, moving averages, Wilder's RMA ATR, and volume calculations must be updated iteratively or strictly indexed on historical windows ending at or before $t$.
   - Using full array length, centering filters, or forward-looking window slices is strictly prohibited.
3. **Resolution Barrier**:
   - A binary option outcome with duration $\Delta t_{exp}$ initiated at $t$ cannot be resolved using any observation where $\text{timestamp} < t + \Delta t_{exp}$.
4. **Train / Test Split Isolation**:
   - In-Sample (IS) training parameters (e.g., historical win rate priors, normalization scalers) must NEVER be updated with or derived from Out-of-Sample (OOS) data.
