import os
import time
import iqoptionapi.constants as OP_code
from iqoptionapi.stable_api import IQ_Option

# Pre-populate dynamic Fusion CFDs to avoid WebSocket reverse-lookup failures
OP_code.ACTIVES["XAU/XAG"] = 2071
OP_code.ACTIVES["XAU/XAG-OTC"] = 2086

class IQOptionAdapter:
    """
    Observation-only adapter for IQ Option market data.
    Strictly read-only; no trade or order execution endpoints are exposed.
    """
    def __init__(self, email: str, password: str):
        if not email or not password:
            raise ValueError("IQ Option credentials are required")
        self.api = IQ_Option(email, password)

    def connect(self) -> None:
        ok, reason = self.api.connect()
        if not ok:
            raise RuntimeError(f"IQ Option connection failed: {reason}")
        
        # Ensure we are in practice mode for safety
        self.api.change_balance("PRACTICE")

    def server_timestamp(self) -> float:
        ts = self.api.get_server_timestamp()
        if not isinstance(ts, (int, float)):
            raise RuntimeError("Invalid server timestamp")
        return float(ts)

    def start_candles(self, asset: str, interval: int = 60, maxdict: int = 100):
        self.api.start_candles_stream(asset, interval, maxdict)

    def get_candles(self, asset: str, interval: int = 60):
        data = self.api.get_realtime_candles(asset, interval)
        if not isinstance(data, dict):
            raise RuntimeError("Invalid candle payload")
        # Snapshot to avoid iterating a live mutable dictionary.
        return dict(data)

    def stop_candles(self, asset: str, interval: int = 60):
        self.api.stop_candles_stream(asset, interval)
