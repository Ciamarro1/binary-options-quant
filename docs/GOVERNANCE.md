# Governance

One of the biggest traps in quant projects is automatic promotion of models. We avoid this with a strict barrier:

```text
RESEARCH
   ↓
VALIDATION
   ↓
FROZEN ARTIFACT
   ↓
PAPER/DEMO
   ↓
PRODUCTION CANDIDATE
   ↓
LIVE
```

No PnL result can automatically promote a model.

> **Performance does not modify the model.**

If a model fails, it returns to Research. It does not receive a clandestine "tweak" in production.
