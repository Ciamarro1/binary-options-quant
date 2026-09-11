import json
import os
import sys
import time
import traceback
from pathlib import Path
from datetime import datetime, timezone

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
RECORDER_DIR = Path(__file__).resolve().parent

# Support reading from project root .env or local .env
for env_file in [PROJECT_ROOT / ".env", RECORDER_DIR / ".env"]:
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip())

ASSET = os.environ.get("IQO_ASSET", "XAU/XAG")
INTERVAL = int(os.environ.get("IQO_INTERVAL", 60))
MAX_CANDLES = int(os.environ.get("IQO_MAX_CANDLES", 0))  # 0 = infinite / continuous

RAW_DIR = PROJECT_ROOT / "research" / "execution" / "data_acquisition" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)
SAFE_ASSET = ASSET.replace("/", "_").replace("\\", "_")
RAW_FILE = RAW_DIR / f"IQO_{SAFE_ASSET}_{INTERVAL}s_raw.jsonl"

# Reconnect parameters
MAX_RECONNECT_ATTEMPTS = 10
RECONNECT_DELAY_BASE = 5   # seconds, exponential backoff
CANDLE_POLL_INTERVAL = 0.5  # seconds
EMPTY_POLL_PATIENCE = 60    # seconds of empty polls before reconnecting
GET_CANDLES_ERROR_PATIENCE = 30  # seconds of continuous errors before reconnecting


def log(msg):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    print(f"[{ts}] {msg}", flush=True)


def append_jsonl(record: dict):
    with RAW_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, separators=(",", ":"), sort_keys=True))
        f.write("\n")


def create_adapter(email, password):
    """Create and connect an IQOptionAdapter. Returns (adapter, success)."""
    from iqoption_adapter import IQOptionAdapter
    try:
        adapter = IQOptionAdapter(email, password)
        adapter.connect()
        return adapter, True
    except Exception as e:
        log(f"Connection failed: {e}")
        return None, False


def record_session(adapter, recorded_closed, candles_captured_count):
    """Run a single recording session. Returns (candles_captured_count, should_reconnect)."""
    last_forming_at = {}
    consecutive_empty = 0
    consecutive_errors = 0
    last_data_time = time.time()

    try:
        adapter.start_candles(ASSET, INTERVAL, maxdict=100)
        log(f"Candle stream started: Asset={ASSET} | Interval={INTERVAL}s")
    except Exception as e:
        log(f"Failed to start candle stream: {e}")
        return candles_captured_count, True

    try:
        while True:
            try:
                server_ts = adapter.server_timestamp()
                candles = adapter.get_candles(ASSET, INTERVAL)
                consecutive_errors = 0  # Reset error counter on success
            except RuntimeError as e:
                consecutive_errors += 1
                if consecutive_errors == 1:
                    log(f"get_candles error: {e}")
                if consecutive_errors * CANDLE_POLL_INTERVAL > GET_CANDLES_ERROR_PATIENCE:
                    log(f"Persistent candle errors for {GET_CANDLES_ERROR_PATIENCE}s. Reconnecting...")
                    return candles_captured_count, True
                time.sleep(CANDLE_POLL_INTERVAL)
                continue
            except Exception as e:
                log(f"Unexpected error in candle poll: {e}")
                return candles_captured_count, True

            if not candles:
                consecutive_empty += 1
                elapsed = time.time() - last_data_time
                if elapsed > EMPTY_POLL_PATIENCE:
                    log(f"No candles for {EMPTY_POLL_PATIENCE}s. Market may be closed. Reconnecting...")
                    return candles_captured_count, True
                time.sleep(CANDLE_POLL_INTERVAL)
                continue

            consecutive_empty = 0
            last_data_time = time.time()

            for candle_ts in sorted(candles.keys()):
                candle = candles[candle_ts]

                # Check if candle interval has fully concluded
                is_closed = server_ts >= (candle_ts + INTERVAL)

                if is_closed:
                    if candle_ts in recorded_closed:
                        continue

                    record = {
                        "source": "IQ_OPTION_STREAM",
                        "asset": ASSET,
                        "interval_requested": INTERVAL,
                        "candle_status": "CLOSED",
                        "local_timestamp": time.time(),
                        "server_timestamp_original": server_ts,
                        "raw_payload": candle
                    }
                    append_jsonl(record)
                    recorded_closed.add(candle_ts)
                    candles_captured_count += 1
                    log(f"CLOSED #{candles_captured_count} | TS: {candle_ts} | Close: {candle.get('close')} | Vol: {candle.get('volume')}")

                else:
                    # Forming candle: log snapshot if updated
                    current_at = candle.get("at")
                    if last_forming_at.get(candle_ts) != current_at:
                        last_forming_at[candle_ts] = current_at
                        record = {
                            "source": "IQ_OPTION_STREAM",
                            "asset": ASSET,
                            "interval_requested": INTERVAL,
                            "candle_status": "FORMING",
                            "local_timestamp": time.time(),
                            "server_timestamp_original": server_ts,
                            "raw_payload": candle
                        }
                        append_jsonl(record)

            if MAX_CANDLES > 0 and candles_captured_count >= MAX_CANDLES:
                log(f"Target of {MAX_CANDLES} closed candles reached. Stopping recorder.")
                return candles_captured_count, False

            time.sleep(CANDLE_POLL_INTERVAL)

    except KeyboardInterrupt:
        log("Recorder stopped by user.")
        return candles_captured_count, False
    except Exception as e:
        log(f"Session error: {e}")
        traceback.print_exc()
        return candles_captured_count, True
    finally:
        try:
            adapter.stop_candles(ASSET, INTERVAL)
        except:
            pass


def main():
    email = os.environ.get("IQO_EMAIL")
    password = os.environ.get("IQO_PASSWORD")

    if not email or not password:
        log("ERROR: IQO_EMAIL and IQO_PASSWORD must be set in .env or system.")
        return

    log("=" * 60)
    log(f"IQ Option Recorder v2.0 — Resilient Daemon Mode")
    log(f"Asset: {ASSET} | Interval: {INTERVAL}s | Max: {'infinite' if MAX_CANDLES == 0 else MAX_CANDLES}")
    log(f"Output: {RAW_FILE}")
    log("=" * 60)

    recorded_closed = set()
    candles_captured_count = 0

    # Load existing closed timestamps to avoid re-recording
    if RAW_FILE.exists():
        with RAW_FILE.open("r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    rec = json.loads(line)
                    if rec.get("candle_status") == "CLOSED":
                        payload = rec.get("raw_payload", {})
                        ts = payload.get("from")
                        if ts is not None:
                            recorded_closed.add(ts)
                            candles_captured_count += 1
                except:
                    pass
        log(f"Loaded {candles_captured_count} previously recorded closed candles (dedup)")

    reconnect_attempt = 0

    while True:
        log(f"Connecting to IQ Option (attempt {reconnect_attempt + 1})...")
        adapter, ok = create_adapter(email, password)

        if not ok:
            reconnect_attempt += 1
            if reconnect_attempt > MAX_RECONNECT_ATTEMPTS:
                log(f"Max reconnect attempts ({MAX_RECONNECT_ATTEMPTS}) exceeded. Waiting 5 minutes...")
                reconnect_attempt = 0
                time.sleep(300)
            else:
                delay = min(RECONNECT_DELAY_BASE * (2 ** (reconnect_attempt - 1)), 120)
                log(f"Retrying in {delay}s...")
                time.sleep(delay)
            continue

        log("Connection successful. Practice mode asserted.")
        reconnect_attempt = 0  # Reset on successful connection

        candles_captured_count, should_reconnect = record_session(
            adapter, recorded_closed, candles_captured_count
        )

        if not should_reconnect:
            break

        # Reconnect with backoff
        reconnect_attempt += 1
        if reconnect_attempt > MAX_RECONNECT_ATTEMPTS:
            log(f"Max reconnect attempts exceeded. Sleeping 5 minutes before reset...")
            reconnect_attempt = 0
            time.sleep(300)
        else:
            delay = min(RECONNECT_DELAY_BASE * (2 ** (reconnect_attempt - 1)), 120)
            log(f"Reconnecting in {delay}s...")
            time.sleep(delay)

    log(f"Recorder finished. Total closed candles: {candles_captured_count}")
    log("Candle stream stopped gracefully.")


if __name__ == "__main__":
    main()
