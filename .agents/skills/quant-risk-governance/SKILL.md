---
name: quant-risk-governance
description: >-
  Runbook for the Chief Risk Officer (CRO) to audit validation reports against the Quant Contract and issue binding PASS / VETO decisions.
---

# Risk Governance & Gatekeeper Skill

## Objective
Provide independent, sovereign risk review of quantitative models prior to any capital allocation.

## CRO Audit Checklist

- [ ] **Sample Size Check**: $N \ge 30$ resolved trades in frozen OOS dataset?
- [ ] **Causality Verification**: Zero future data contamination confirmed by automated test suite?
- [ ] **Wilson Score Lower Bound**: Does $W_{low} > P_{BE}$ for the minimum payout ($r=0.80$)?
- [ ] **Synthetic Null Negative Control**: Passed without false positive?
- [ ] **Drawdown & Sizing Limits**: Fixed Fractional / Kelly sizing bounded to $\le 1.0\%$ of fund equity per trade?

## Output
Generate `research/reports/.../RISK_DECISION_XXX.json` with:
```json
{
  "verdict": "VETO | PASS",
  "reason_code": "WILSON_LB_BELOW_P_BE | APPROVED_FOR_DEMO",
  "cro_signature": "CRO_VERIFIED_TIMESTAMP"
}
```
