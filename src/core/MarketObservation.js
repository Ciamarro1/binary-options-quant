class MarketObservation {
  constructor({ asset, timestamp, open, high, low, close, volume, timeframe }) {
    if (!asset || typeof asset !== 'string') throw new Error('Invalid asset');
    if (!timeframe || typeof timeframe !== 'string') throw new Error('Invalid timeframe');
    if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) throw new Error('Invalid timestamp');
    
    const isInvalidNumber = (val) => typeof val !== 'number' || isNaN(val) || !isFinite(val);
    
    if (isInvalidNumber(open)) throw new Error('Invalid open');
    if (isInvalidNumber(high)) throw new Error('Invalid high');
    if (isInvalidNumber(low)) throw new Error('Invalid low');
    if (isInvalidNumber(close)) throw new Error('Invalid close');
    if (isInvalidNumber(volume) || volume < 0) throw new Error('Invalid volume');

    if (high < Math.max(open, close)) throw new Error('High cannot be less than max(open, close)');
    if (low > Math.min(open, close)) throw new Error('Low cannot be greater than min(open, close)');
    if (high < low) throw new Error('High cannot be less than low');

    this.asset = asset;
    this.timestamp = timestamp;
    this.open = open;
    this.high = high;
    this.low = low;
    this.close = close;
    this.volume = volume;
    this.timeframe = timeframe;

    Object.freeze(this);
  }
}
module.exports = MarketObservation;
