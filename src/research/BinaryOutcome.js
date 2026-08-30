"use strict";

const VALID_OUTCOMES = new Set(['WIN', 'LOSS', 'PUSH', 'INVALID']);

class BinaryOutcome {
  constructor({ signalId, entryTimestamp, expiryTimestamp, entryPrice, expiryPrice, direction, outcome, returnVal, probability }) {
    if (!signalId || typeof signalId !== 'string') throw new Error('Invalid signalId');
    if (typeof entryTimestamp !== 'number' || entryTimestamp <= 0) throw new Error('Invalid entryTimestamp');
    if (typeof expiryTimestamp !== 'number' || expiryTimestamp <= entryTimestamp) throw new Error('Invalid expiryTimestamp');
    if (typeof entryPrice !== 'number' || entryPrice <= 0) throw new Error('Invalid entryPrice');
    if (typeof expiryPrice !== 'number' || expiryPrice <= 0) throw new Error('Invalid expiryPrice');
    if (direction !== 'CALL' && direction !== 'PUT') throw new Error('Invalid direction');
    if (!VALID_OUTCOMES.has(outcome)) throw new Error('Invalid outcome');
    if (typeof returnVal !== 'number') throw new Error('Invalid returnVal');
    if (typeof probability !== 'number' || probability < 0 || probability > 1) throw new Error('Invalid probability');

    this.signalId = signalId;
    this.entryTimestamp = entryTimestamp;
    this.expiryTimestamp = expiryTimestamp;
    this.entryPrice = entryPrice;
    this.expiryPrice = expiryPrice;
    this.direction = direction;
    this.outcome = outcome;
    this.returnVal = returnVal;
    this.probability = probability;

    Object.freeze(this);
  }
}

module.exports = BinaryOutcome;
