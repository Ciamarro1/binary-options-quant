import json
import os
import time
from pathlib import Path
from iqoption_adapter import IQOptionAdapter

# Support reading from a local .env file if it exists
try:
    with open(".env", "r") as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                key, val = line.strip().split("=", 1)
                os.environ[key] = val
except FileNotFoundError:
    pass

ASSET = os.environ.get("IQO_ASSET", "BTC")
INTERVAL = int(os.environ.get("IQO_INTERVAL", 60))

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
RAW_DIR = PROJECT_ROOT / "research" / "execution" / "data_acquisition" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)
RAW_FILE = RAW_DIR / f"IQO_{ASSET}_{INTERVAL}s_raw.jsonl"

def append_jsonl(record: dict):
    with RAW_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, separators=(",", ":"), sort_keys=True))
        f.write("\n")

def main():
    email = os.environ.get("IQO_EMAIL")
    password = os.environ.get("IQO_PASSWORD")
    
    if not email or not password:
        print("ERROR: Environment variables IQO_EMAIL and IQO_PASSWORD must be set in .env or system.")
        return

    print("Connecting to IQ Option (Observation Only)...")
    adapter = IQOptionAdapter(email, password)
    adapter.connect()
    
    print(f"Connection successful. Practice mode asserted.")
    adapter.start_candles(ASSET, INTERVAL, maxdict=100)
    
    print(f"Recorder started: {ASSET} / {INTERVAL}s")
    print(f"Raw file: {RAW_FILE}")
    
    last_seen = set()
    
    try:
        while True:
            server_ts = adapter.server_timestamp()
            candles = adapter.get_candles(ASSET, INTERVAL)
            
            for candle_ts in sorted(candles.keys()):
                if candle_ts in last_seen:
                    continue
                
                candle = candles[candle_ts]
                
                # Regra de fechamento: se o relógio do servidor já passou do fim da vela, ela fechou.
                is_closed = server_ts >= (candle_ts + INTERVAL)
                candle_status = "CLOSED" if is_closed else "FORMING"

                record = {
                    "source": "IQ_OPTION_STREAM",
                    "asset": ASSET,
                    "interval_requested": INTERVAL,
                    "candle_status": candle_status,
                    "local_timestamp": time.time(),
                    "server_timestamp_original": server_ts,
                    "raw_payload": candle
                }
                
                append_jsonl(record)
                last_seen.add(candle_ts)
                
                print(f"Captured TS: {candle_ts} [{candle_status}] | raw: {candle}")
            
            time.sleep(0.25)
    except KeyboardInterrupt:
        print("\nRecorder stopped by user.")
    except Exception as e:
        print(f"\nRecorder encountered an error: {e}")
    finally:
        adapter.stop_candles(ASSET, INTERVAL)
        print("Candle stream stopped gracefully.")

if __name__ == "__main__":
    main()
