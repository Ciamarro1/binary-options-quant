class EVEngine {
  static calculateBreakEven(payout) {
    if (typeof payout !== 'number' || isNaN(payout) || !isFinite(payout) || payout <= 0) {
      throw new Error('Invalid payout');
    }
    return 1 / (1 + payout);
  }

  static calculateEV(probability, payout) {
    if (typeof probability !== 'number' || isNaN(probability) || !isFinite(probability) || probability < 0 || probability > 1) {
      throw new Error('Invalid probability');
    }
    if (typeof payout !== 'number' || isNaN(payout) || !isFinite(payout) || payout <= 0) {
      throw new Error('Invalid payout');
    }
    // EV = P(win) * payout - (1 - P(win))
    return probability * payout - (1 - probability);
  }

  static calculateEdge(probability, payout) {
    const be = EVEngine.calculateBreakEven(payout);
    return probability - be;
  }
}
module.exports = EVEngine;
