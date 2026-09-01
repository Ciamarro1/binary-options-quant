const fs = require('fs');
const path = require('path');

const DATASET_PATH = path.join(__dirname, 'DATASET_004.json');
const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));

console.log(`Loaded ${dataset.length} candles from DATASET_004.`);

// Fast rolling engine
let current15m = [], current1h = [];
function updateRolling(candle) {
    const tMs = candle.timestamp;
    const b15 = Math.floor(tMs / 900000) * 900000;
    const b60 = Math.floor(tMs / 3600000) * 3600000;

    let last15 = current15m.length > 0 ? current15m[current15m.length - 1] : null;
    if (!last15 || last15.timestamp !== b15) {
        current15m.push({ ...candle, timestamp: b15 });
        if (current15m.length > 150) current15m.shift();
    } else {
        last15.high = Math.max(last15.high, candle.high);
        last15.low = Math.min(last15.low, candle.low);
        last15.close = candle.close;
    }

    let last1h = current1h.length > 0 ? current1h[current1h.length - 1] : null;
    if (!last1h || last1h.timestamp !== b60) {
        current1h.push({ ...candle, timestamp: b60 });
        if (current1h.length > 80) current1h.shift();
    } else {
        last1h.high = Math.max(last1h.high, candle.high);
        last1h.low = Math.min(last1h.low, candle.low);
        last1h.close = candle.close;
    }
}

function getFastFeatures(targetTimeMs, current1m) {
    const signalTimeMs = targetTimeMs + 60000;
    let closed15 = [], closed1h = [];
    
    for(let i=current15m.length-1; i>=0; i--) {
        if (signalTimeMs >= current15m[i].timestamp + 15 * 60000) closed15.unshift(current15m[i]);
        if (closed15.length >= 96) break;
    }
    
    for(let i=current1h.length-1; i>=0; i--) {
        if (signalTimeMs >= current1h[i].timestamp + 60 * 60000) closed1h.unshift(current1h[i]);
        if (closed1h.length >= 50) break;
    }

    let SMA1h_50 = null;
    if (closed1h.length >= 50) {
        let sum = 0;
        for (let i = 0; i < 50; i++) sum += closed1h[i].close;
        SMA1h_50 = sum / 50;
    }

    let SwingHigh15m_96 = null, SwingLow15m_96 = null;
    if (closed15.length >= 96) {
        let maxH = -Infinity, minL = Infinity;
        for (let i = 0; i < 96; i++) {
            if (closed15[i].high > maxH) maxH = closed15[i].high;
            if (closed15[i].low < minL) minL = closed15[i].low;
        }
        SwingHigh15m_96 = maxH;
        SwingLow15m_96 = minL;
    }

    return { SMA1h_50, SwingHigh15m_96, SwingLow15m_96, ...current1m };
}

// Global Funnel Counters
const funnel = {
    total: 0,
    eligibleHTF: 0,
    
    up: {
        sweep: 0,
        sweepAndBias: 0,
        sweepAndBiasAndReclaim: 0 // Final H003 Short Setup
    },
    
    down: {
        sweep: 0,
        sweepAndBias: 0,
        sweepAndBiasAndReclaim: 0 // Final H003 Long Setup
    }
};

// Distribution Tracking
const WINDOWS = 152;
const TRAIN_DAYS = 30;
const CANDLES_PER_DAY = 1440;

const trainDistributions = {
    up: [],
    down: []
};

// Warm up initial 3000 candles
for (let i = 0; i < 3000; i++) updateRolling(dataset[i]);

// 1. GLOBAL FUNNEL ANALYSIS
for (let i = 3000; i < dataset.length; i++) {
    updateRolling(dataset[i]);
    const f = getFastFeatures(dataset[i].timestamp, dataset[i]);
    
    funnel.total++;
    
    if (f.SMA1h_50 !== null && f.SwingHigh15m_96 !== null) {
        funnel.eligibleHTF++;
        
        // --- UP FUNNEL (Sweep High) ---
        const sweepsHigh = f.high > f.SwingHigh15m_96;
        const downBias = f.close < f.SMA1h_50;
        const reclaimsHigh = f.close < f.SwingHigh15m_96;
        
        if (sweepsHigh) {
            funnel.up.sweep++;
            if (downBias) {
                funnel.up.sweepAndBias++;
                if (reclaimsHigh) {
                    funnel.up.sweepAndBiasAndReclaim++;
                }
            }
        }
        
        // --- DOWN FUNNEL (Sweep Low) ---
        const sweepsLow = f.low < f.SwingLow15m_96;
        const upBias = f.close > f.SMA1h_50;
        const reclaimsLow = f.close > f.SwingLow15m_96;
        
        if (sweepsLow) {
            funnel.down.sweep++;
            if (upBias) {
                funnel.down.sweepAndBias++;
                if (reclaimsLow) {
                    funnel.down.sweepAndBiasAndReclaim++;
                }
            }
        }
    }
}

// 2. WINDOW DISTRIBUTION ANALYSIS
for (let w = 0; w < WINDOWS; w++) {
    const trainStart = w * CANDLES_PER_DAY;
    const trainEnd = trainStart + (TRAIN_DAYS * CANDLES_PER_DAY);
    
    let windowUpSetups = 0;
    let windowDownSetups = 0;
    
    current15m = []; current1h = [];
    for(let i=trainStart; i<trainStart + 3000; i++) updateRolling(dataset[i]);
    
    for (let i = trainStart + 3000; i < trainEnd; i++) { 
        updateRolling(dataset[i]);
        const f = getFastFeatures(dataset[i].timestamp, dataset[i]);
        
        if (f.SMA1h_50 !== null && f.SwingHigh15m_96 !== null) {
            const isResolvedInTrain = (i + 3 < trainEnd);
            if (!isResolvedInTrain) continue;

            const sweepsHigh = f.high > f.SwingHigh15m_96;
            const downBias = f.close < f.SMA1h_50;
            const reclaimsHigh = f.close < f.SwingHigh15m_96;
            if (sweepsHigh && downBias && reclaimsHigh) windowUpSetups++;
            
            const sweepsLow = f.low < f.SwingLow15m_96;
            const upBias = f.close > f.SMA1h_50;
            const reclaimsLow = f.close > f.SwingLow15m_96;
            if (sweepsLow && upBias && reclaimsLow) windowDownSetups++;
        }
    }
    
    trainDistributions.up.push(windowUpSetups);
    trainDistributions.down.push(windowDownSetups);
}

function calcStats(arr) {
    arr.sort((a,b) => a-b);
    return {
        min: arr[0],
        max: arr[arr.length-1],
        mean: arr.reduce((a,b)=>a+b, 0) / arr.length,
        median: arr[Math.floor(arr.length/2)],
        p25: arr[Math.floor(arr.length * 0.25)],
        p75: arr[Math.floor(arr.length * 0.75)]
    };
}

const stats = {
    funnel,
    distributions: {
        up: calcStats(trainDistributions.up),
        down: calcStats(trainDistributions.down)
    }
};

fs.writeFileSync(path.join(__dirname, '023_FREQUENCY_ANALYSIS.json'), JSON.stringify(stats, null, 2));
console.log("Analysis complete. Saved to 023_FREQUENCY_ANALYSIS.json");
