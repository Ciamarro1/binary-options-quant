"use strict";

const BinaryOutcome = require('./BinaryOutcome');

class TargetEngine {
  /**
   * Evaluates the outcome of a signal given entry and expiry data.
   * Enforces strict causality: entryTimestamp must be strictly < expiryTimestamp.
   */
  static resolve(signal, entryObs, expiryObs, payout) {
    if (!signal) throw new Error('Missing signal');
    if (!entryObs || !expiryObs) throw new Error('Missing market observations');
    if (typeof payout !== 'number' || payout <= 0) throw new Error('Invalid payout');

    if (entryObs.timestamp >= expiryObs.timestamp) {
      throw new Error('Causality violation: entry time must be strictly before expiry time');
    }
    if (signal.timestamp !== entryObs.timestamp) {
      throw new Error('Signal timestamp must match entry observation timestamp');
    }

    const entryPrice = entryObs.close;
    const expiryPrice = expiryObs.close;
    let outcome = 'INVALID';
    let returnVal = 0;

    if (entryPrice === expiryPrice) {
      outcome = 'PUSH';
      returnVal = 0;
    } else if (signal.direction === 'CALL') {
      if (expiryPrice > entryPrice) {
        outcome = 'WIN';
        returnVal = payout;
      } else {
        outcome = 'LOSS';
        returnVal = -1;
      }
    } else if (signal.direction === 'PUT') {
      if (expiryPrice < entryPrice) {
        outcome = 'WIN';
        returnVal = payout;
      } else {
        outcome = 'LOSS';
        returnVal = -1;
      }
    }

    return new BinaryOutcome({
      signalId: signal.signalId,
      entryTimestamp: entryObs.timestamp,
      expiryTimestamp: expiryObs.timestamp,
      entryPrice,
      expiryPrice,
      direction: signal.direction,
      outcome,
      returnVal,
      probability: signal.probability
    });
  }
}

module.exports = TargetEngine;
