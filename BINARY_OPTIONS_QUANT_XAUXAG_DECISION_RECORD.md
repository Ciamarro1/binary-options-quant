# ARCHITECTURAL DECISION RECORD: XAU/XAG DATA AUDIT
**Decision Record ID:** ADR-035-XAUXAG-DATA-AUDIT  
**Date:** 2026-09-11  
**Domain:** Quantitative Governance & Research Operations  
**Status:** **GO — PHASE 1 COMPLETE (READY FOR LIVE CAPTURE)**

---

## 1. Context & Governance Problem

The research initiative aims to evaluate the `XAU/XAG` (Ouro/Prata — Fusion CFD) instrument traded as a Binary Option on the IQ Option platform with an observed reference payout of $88\%$ ($P_{\text{BE}} = 53.1915\%$).

Following the execution of the read-only Active Discovery Probe (`scripts/execution/discover_actives.py`), the instrument parameters and active opcodes were empirically established directly from the broker's live WebSocket.

---

## 2. Formal Institutional Decision

### **DECISION: GO (PHASE 1 COMPLETED — CLEARED FOR OBSERVATION RECORDING)**

The operational parameters of the instrument are formally cataloged in `research/execution/XAUXAG_INSTRUMENT_DISCOVERY.json`. The lab is authorized to proceed to **Phase 2 (Live Observation Recording)** to accumulate raw execution data without trading.

---

## 3. Empirically Verified Parameters

| Parameter | Market Hours (`XAUXAG_REGULAR`) | Weekend / Algorithmic (`XAUXAG_OTC`) |
|---|:---:|:---:|
| **Active ID** | **`2071`** | **`2086`** |
| **Broker Ticker** | `XAU/XAG` | `XAU/XAG-OTC` |
| **Catalog Name** | `front.XAU/XAG` | `front.XAU/XAG-OTC` |
| **Data Provider** | `"feed"` (Interbank/Synthetic aggregator) | `"OTC"` (Broker Internal Synthetic) |
| **Decimal Precision** | **6 decimal places** (e.g. `67.929885`) | **6 decimal places** (e.g. `69.155185`) |
| **Commission** | 12% | 14% |
| **Payout Rate ($r_t$)** | **88.0%** ($P_{\text{BE}} = 53.1915\%$) | **86.0%** ($P_{\text{BE}} = 53.7634\%$) |
| **Expiration Target** | **900s (15 minutes)** | **900s (15 minutes)** |
| **M1 Retrieval** | **VERIFIED** (Live candles streamed successfully) | **VERIFIED** (Live candles streamed successfully) |
| **Pricing Divergence** | Reference level: $\approx 67.92$ | Reference level: $\approx 69.16$ ($\Delta P \approx +1.24$) |

---

## 4. Invariant Enforcement & Epistemic Boundaries

1. **Strict Regime Segregation**: The discovery of two distinct active IDs (`2071` vs `2086`) confirms Constitutional Risk 2. `XAUXAG_REGULAR` and `XAUXAG_OTC` are separate mathematical universes and must **NEVER be merged** into a single dataset.
2. **The 15m Expiry Alignment**: The broker contracts for both instruments declare `expiration_times: [900]`. Downstream research must target 15-minute resolution ($h = 15\text{m}$), perfectly aligning with Mandate 034.
3. **No Strategy Authorization**: Edge mining, parameter optimization, and live trading remain **STRICTLY PROHIBITED**.

---

## 5. Next Authorized Step (Phase 2)

Harden and run the Live Observation Recorder (`research/execution/data_acquisition/recorder/recorder.py`) targeting Active ID `2071` (and optionally `2086` in a segregated stream) to accumulate continuous 1m JSONL snapshots for the Cross-Venue Divergence Study.
