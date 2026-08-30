const DecisionGate = require('../../src/core/DecisionGate');
const MarketObservation = require('../../src/core/MarketObservation');
const BinaryContract = require('../../src/core/BinaryContract');
const ProbabilitySnapshot = require('../../src/core/ProbabilitySnapshot');

describe('DecisionGate', () => {
  const getValidInputs = (probability = 0.6, payout = 0.85) => ({
    marketObservation: new MarketObservation({
      asset: 'EURUSD',
      timestamp: Date.now(),
      open: 1, high: 1.1, low: 0.9, close: 1, volume: 100, timeframe: 'M5'
    }),
    binaryContract: new BinaryContract({
      direction: 'CALL',
      expirySeconds: 60,
      payout: payout,
      stake: 10
    }),
    probabilitySnapshot: new ProbabilitySnapshot({
      probability,
      modelId: 'm1',
      modelVersion: 'v1',
      generatedAt: Date.now(),
      inputHash: 'hash123'
    }),
    contractHash: 'cHash123'
  });

  it('should approve positive EV', () => {
    const decision = DecisionGate.evaluate(getValidInputs(0.6, 0.85));
    expect(decision.decision).toBe('PASS');
    expect(decision.reasonCode).toBe('APPROVED');
  });

  it('should reject negative EV', () => {
    const decision = DecisionGate.evaluate(getValidInputs(0.4, 0.85)); // 0.4 * 0.85 - 0.6 = -0.26
    expect(decision.decision).toBe('REJECT');
    expect(decision.reasonCode).toBe('NEGATIVE_EV');
  });

  it('should reject zero EV', () => {
    // BE for 0.85 is ~0.54054...
    const be = 1 / 1.85;
    const decision = DecisionGate.evaluate(getValidInputs(be, 0.85));
    expect(decision.decision).toBe('REJECT');
    expect(decision.reasonCode).toBe('NEGATIVE_EV');
  });
});
