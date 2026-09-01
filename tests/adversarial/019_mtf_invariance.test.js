const assert = require('assert');
const MTFFeatureEngine = require('../../src/strategy/MTFFeatureEngine');

describe('Commit 019: MTF Historical Invariance (Look-ahead Prevention)', () => {
    it('should strictly ignore open/forming 15m and 1h candles according to HTF_CANDLE_CLOSED_BEFORE(t) contract', () => {
        const engine = new MTFFeatureEngine();
        const baseTime = new Date('2024-10-31T00:00:00Z').getTime();
        
        // Generate a 1m stream covering 50 hours + 1 hour to have enough data
        const observations = [];
        let price = 60000;
        
        for (let i = 0; i < 3060; i++) {
            observations.push({
                timestamp: baseTime + i * 60000,
                open: price,
                high: price + 10,
                low: price - 10,
                close: price + 1,
                volume: 100
            });
            price += 1;
        }
        
        // Target time: 2024-11-02T02:28:00Z (which is baseTime + 50h + 28m)
        // Let's take index 3028
        const t28_index = 3028; 
        const obs_t28 = observations.slice(0, t28_index + 1);
        const targetTime_t28 = obs_t28[obs_t28.length - 1].timestamp; // XX:28:00Z
        
        // Baseline Evaluation
        const snap_baseline = engine.extractFeatures('BTCUSDT', targetTime_t28, obs_t28);
        
        // ADVERSARIAL ATTACK:
        // Modify the currently forming 15m candle (which is XX:15:00 to XX:29:59)
        // Since we are at open time XX:28 (signal time XX:29), the forming 15m candle is XX:15.
        // It SHOULD NOT be included in the HTF data (last closed is XX:00).
        const obs_attacked = JSON.parse(JSON.stringify(obs_t28)); 
        
        // Attack the forming 15m candle (13 minutes into it, modifying XX:27 and XX:28)
        // This ALSO belongs to the forming 1h candle (XX:00 to XX:59).
        obs_attacked[t28_index - 1].high = 999999; 
        obs_attacked[t28_index].high = 999999;
        obs_attacked[t28_index - 1].low = 1; 
        
        const snap_attacked = engine.extractFeatures('BTCUSDT', targetTime_t28, obs_attacked);
        
        // Verify Invariance: The HTF features MUST be identical
        assert.strictEqual(snap_baseline.features.SwingHigh15m_96, snap_attacked.features.SwingHigh15m_96, "🚨 MTF LOOK-AHEAD DETECTED in 15m: SwingHigh15m_96 changed");
        assert.strictEqual(snap_baseline.features.SwingLow15m_96, snap_attacked.features.SwingLow15m_96, "🚨 MTF LOOK-AHEAD DETECTED in 15m: SwingLow15m_96 changed");
        assert.strictEqual(snap_baseline.features.SMA1h_50, snap_attacked.features.SMA1h_50, "🚨 MTF LOOK-AHEAD DETECTED in 1h: SMA1h_50 changed");
        
        assert.notStrictEqual(snap_baseline.features.high, snap_attacked.features.high, "1m high should change in attack");
        
        console.log("✅ MTF HISTORICAL INVARIANCE: HTF Aggregators successfully blocked forming-candle look-ahead.");
    });
    
    it('should strictly respect the LTF boundary matrix using exact close time (signalTimeMs)', () => {
        const engine = new MTFFeatureEngine();
        const baseTime = new Date('2024-10-31T00:00:00Z').getTime(); // 00:00
        const observations = [];
        let price = 60000;
        
        // Generate up to 15:01:00Z (901 candles)
        for (let i = 0; i <= 901; i++) {
            observations.push({
                timestamp: baseTime + i * 60000,
                open: price, high: price + 10, low: price - 10, close: price + 1, volume: 100
            });
            price += 1;
        }
        
        // 1. LTF Open: 14:28:00 (Close: 14:29:00). Expected: 15m=14:00, 1h=13:00
        const idx_1428 = 14 * 60 + 28; // 868
        const snap_1428 = engine.extractFeatures('BTCUSDT', observations[idx_1428].timestamp, observations.slice(0, idx_1428 + 1));
        assert.strictEqual(new Date(snap_1428.features._last15mTimestamp).toISOString(), "2024-10-31T14:00:00.000Z");
        assert.strictEqual(new Date(snap_1428.features._last1hTimestamp).toISOString(), "2024-10-31T13:00:00.000Z");

        // 2. LTF Open: 14:29:00 (Close: 14:30:00). Expected: 15m=14:15, 1h=13:00
        const idx_1429 = 14 * 60 + 29; // 869
        const snap_1429 = engine.extractFeatures('BTCUSDT', observations[idx_1429].timestamp, observations.slice(0, idx_1429 + 1));
        assert.strictEqual(new Date(snap_1429.features._last15mTimestamp).toISOString(), "2024-10-31T14:15:00.000Z");
        assert.strictEqual(new Date(snap_1429.features._last1hTimestamp).toISOString(), "2024-10-31T13:00:00.000Z");

        // 3. LTF Open: 14:58:00 (Close: 14:59:00). Expected: 15m=14:30, 1h=13:00
        const idx_1458 = 14 * 60 + 58; // 898
        const snap_1458 = engine.extractFeatures('BTCUSDT', observations[idx_1458].timestamp, observations.slice(0, idx_1458 + 1));
        assert.strictEqual(new Date(snap_1458.features._last15mTimestamp).toISOString(), "2024-10-31T14:30:00.000Z");
        assert.strictEqual(new Date(snap_1458.features._last1hTimestamp).toISOString(), "2024-10-31T13:00:00.000Z");

        // 4. LTF Open: 14:59:00 (Close: 15:00:00). Expected: 15m=14:45, 1h=14:00
        const idx_1459 = 14 * 60 + 59; // 899
        const snap_1459 = engine.extractFeatures('BTCUSDT', observations[idx_1459].timestamp, observations.slice(0, idx_1459 + 1));
        assert.strictEqual(new Date(snap_1459.features._last15mTimestamp).toISOString(), "2024-10-31T14:45:00.000Z");
        assert.strictEqual(new Date(snap_1459.features._last1hTimestamp).toISOString(), "2024-10-31T14:00:00.000Z");
        
        console.log("✅ MTF BOUNDARY MATRIX: Close-time semantics for 14:28, 14:29, 14:58, 14:59 strictly verified.");
    });

    it('should exclude the currently forming structural candle from SwingHigh/Low calculations', () => {
        const engine = new MTFFeatureEngine();
        const baseTime = new Date('2024-10-31T00:00:00Z').getTime(); 
        const observations = [];
        let price = 60000;
        
        // Generate a stable market up to 14:14
        for (let i = 0; i <= 854; i++) {
            observations.push({
                timestamp: baseTime + i * 60000,
                open: price, high: price + 10, low: price - 10, close: price + 1, volume: 100
            });
        }
        
        // Now from 14:15 to 14:29 (the forming 15m candle), we inject a massive spike
        for (let i = 855; i <= 869; i++) {
            observations.push({
                timestamp: baseTime + i * 60000,
                open: price, high: 999999, low: price - 10, close: price + 1, volume: 100
            });
        }
        
        // We evaluate at 14:28 open time (14:29 signal time). The SwingHigh15m_96 MUST NOT include 999999.
        const snap = engine.extractFeatures('BTCUSDT', observations[868].timestamp, observations.slice(0, 869));
        
        // The max high prior to 14:15 was price + 10 at 14:14 (price was 60000 + 854)
        // so it should be around 60864, definitely NOT 999999.
        assert.strictEqual(snap.features.SwingHigh15m_96 < 999000, true, "🚨 CURRENT CANDLE CONTAMINATION: SwingHigh included the forming candle!");
        
        console.log("✅ STRUCTURAL EXCLUSION: SwingHigh/Low calculations strictly exclude the forming 15m candle.");
    });
});
