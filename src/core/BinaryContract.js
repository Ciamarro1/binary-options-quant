class BinaryContract {
  constructor({ direction, expirySeconds, payout, stake }) {
    if (direction !== 'CALL' && direction !== 'PUT') throw new Error('Invalid direction');
    
    const isInvalidNumber = (val) => typeof val !== 'number' || isNaN(val) || !isFinite(val);

    if (isInvalidNumber(expirySeconds) || expirySeconds <= 0) throw new Error('Invalid expirySeconds');
    if (isInvalidNumber(payout) || payout <= 0) throw new Error('Invalid payout');
    if (isInvalidNumber(stake) || stake <= 0) throw new Error('Invalid stake');

    this.direction = direction;
    this.expirySeconds = expirySeconds;
    this.payout = payout;
    this.stake = stake;

    Object.freeze(this);
  }
}
module.exports = BinaryContract;
