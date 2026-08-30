"use strict";
const MarketObservation = require('../core/MarketObservation');
const Dataset = require('../data/Dataset');

function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

class SyntheticDataGenerator {
  static generate({ seed, asset, timeframe, numObservations, initialPrice, upProbability, volatility }) {
    const random = mulberry32(seed);
    const obs = [];
    let currentPrice = initialPrice;
    const minuteMs = 60000;
    const baseTimestamp = 1600000000000;
    
    for (let i = 0; i < numObservations; i++) {
       const u = random();
       const isUp = u < upProbability;
       const r = isUp ? volatility : -volatility;
       
       const open = currentPrice;
       const close = currentPrice * (1 + r);
       
       // High/Low coherent noise
       const noiseHigh = random() * volatility * 0.5 * currentPrice;
       const noiseLow = random() * volatility * 0.5 * currentPrice;
       
       const maxOC = Math.max(open, close);
       const minOC = Math.min(open, close);
       
       const high = maxOC + noiseHigh;
       const low = Math.max(0.00001, minOC - noiseLow); // ensure positive
       
       const volume = Math.floor(random() * 1000) + 1;
       const timestamp = baseTimestamp + i * minuteMs;
       
       obs.push(new MarketObservation({ asset, timestamp, open, high, low, close, volume, timeframe }));
       currentPrice = close;
    }
    
    return new Dataset({
      datasetId: `SYNC_${seed}`,
      asset,
      timeframe,
      source: `SYNTHETIC_P${upProbability}_V${volatility}`,
      observations: obs
    });
  }
}

module.exports = SyntheticDataGenerator;
