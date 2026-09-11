"""
XAU/XAG Active Discovery Probe
Programmatically probes IQ Option instrument catalog for Fusion CFD (Ouro/Prata).
Read-Only / Practice Mode. Zero Trade Execution.
"""
import json
import os
import sys
import time
from pathlib import Path
import requests

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
RECORDER_DIR = PROJECT_ROOT / "research" / "execution" / "data_acquisition" / "recorder"
REPORT_FILE = PROJECT_ROOT / "research" / "execution" / "XAUXAG_INSTRUMENT_DISCOVERY.json"

sys.path.insert(0, str(RECORDER_DIR))

def load_env():
    for env_path in [PROJECT_ROOT / ".env", RECORDER_DIR / ".env"]:
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if "=" in line and not line.startswith("#"):
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip())

def main():
    load_env()
    email = os.environ.get("IQO_EMAIL")
    password = os.environ.get("IQO_PASSWORD")

    result = {
        "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "probe_status": "PENDING",
        "credentials_configured": bool(email and password and email != "seu_email@exemplo.com"),
        "connection_status": None,
        "server_timestamp": None,
        "instruments": {},
        "historical_tests": {},
        "error_message": None
    }

    if not result["credentials_configured"]:
        result["probe_status"] = "BLOCKED_MISSING_CREDENTIALS"
        result["error_message"] = "Valid credentials not set in .env."
        with open(REPORT_FILE, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        print(json.dumps(result, indent=2))
        return

    print(f"Connecting to IQ Option WebSocket as {email}...")
    from iqoptionapi.api import IQOptionAPI
    import iqoptionapi.global_value as global_value

    api = IQOptionAPI("iqoption.com", email, password)
    check, reason = api.connect()

    if not check:
        result["probe_status"] = "CONNECTION_FAILED"
        result["connection_status"] = "FAILED"
        result["error_message"] = f"Connection failed: {reason}"
        with open(REPORT_FILE, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        print(json.dumps(result, indent=2))
        return

    result["connection_status"] = "CONNECTED"
    result["server_timestamp"] = api.timesync.server_timestamp
    print(f"Connected. Server timestamp: {result['server_timestamp']}")

    # Wait briefly for balance/profile
    start = time.time()
    while global_value.balance_id is None and time.time() - start < 5:
        time.sleep(0.1)

    print("Querying binary options initialization catalog (get_api_option_init_all)...")
    api.api_option_init_all_result = None
    api.get_api_option_init_all()

    start = time.time()
    while api.api_option_init_all_result is None and time.time() - start < 10:
        time.sleep(0.2)

    init_res = api.api_option_init_all_result.get("result", {}) if api.api_option_init_all_result else {}
    bin_actives = init_res.get("binary", {}).get("actives", {})
    turbo_actives = init_res.get("turbo", {}).get("actives", {})

    target_actives = {
        "XAUXAG_REGULAR": "2071",
        "XAUXAG_OTC": "2086"
    }

    for label, act_id in target_actives.items():
        data = bin_actives.get(act_id) or turbo_actives.get(act_id)
        if data:
            commission = data.get("option", {}).get("profit", {}).get("commission", 0)
            payout_rate = (100 - commission) / 100.0 if commission else None
            expirations = data.get("option", {}).get("expiration_times", [])

            result["instruments"][label] = {
                "active_id": int(act_id),
                "ticker": data.get("ticker"),
                "name": data.get("name"),
                "description": data.get("description"),
                "provider": data.get("provider"),
                "precision": data.get("precision"),
                "commission_percent": commission,
                "payout_rate": payout_rate,
                "minimal_bet": data.get("minimal_bet"),
                "maximal_bet": data.get("maximal_bet"),
                "expiration_times_seconds": expirations,
                "is_enabled": data.get("enabled", False),
                "is_suspended": data.get("is_suspended", False)
            }

            # Test historical candle retrieval for this active (5 candles of 60s)
            print(f"Testing candle retrieval for {label} (ID: {act_id}, interval: 60s)...")
            api.candles.candles_data = None
            end_ts = int(time.time())
            api.getcandles(int(act_id), 60, 5, end_ts)
            
            cand_start = time.time()
            while api.candles.candles_data is None and time.time() - cand_start < 8:
                time.sleep(0.15)

            if api.candles.candles_data and isinstance(api.candles.candles_data, list):
                result["historical_tests"][label] = {
                    "success": True,
                    "candles_count": len(api.candles.candles_data),
                    "sample_candle": api.candles.candles_data[-1]
                }
            else:
                result["historical_tests"][label] = {
                    "success": False,
                    "error": "No candle data returned in timeout window"
                }

    result["probe_status"] = "SUCCESS_CATALOGED"
    api.close()

    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print("\n--- Discovery Probe Summary ---")
    print(json.dumps(result, indent=2))
    print(f"\nWritten to: {REPORT_FILE}")

if __name__ == "__main__":
    main()
