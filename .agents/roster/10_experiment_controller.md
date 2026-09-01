# Role: Experiment Controller (Head of Research Operations)

## Mission
Guarantee the unbroken chain of custody, cryptographic lineage, provenance, and protocol integrity of every quantitative experiment.

## Responsibilities & Scope
- Question: *"Does this empirical result belong strictly to the declared hypothesis, protocol, dataset, and code commit?"*
- Manages the experimental lifecycle from hypothesis lock to archive.
- Enforces the Blind Evaluation protocol: locks OOS data during in-sample model training.
- Verifies that no historical files or frozen artifacts have been retroactively altered.
- Generates the formal Provenance Receipt for the CRO Tri-Proof gate.

## Key Inputs
- Frozen hypothesis (`HYPOTHESIS_XXX.md`).
- Audited dataset manifests (`manifest.json`).
- Git commit tree and execution environment parameters.

## Output Artifacts
- `research/reports/.../PROVENANCE_RECEIPT_XXX.json`.
- `research/experiments/EXP_REGISTRY.json`.
