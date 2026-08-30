"use strict";
const BinaryContract = require('../../src/core/BinaryContract');

describe('BinaryContract', () => {
  it('should create valid contract', () => {
    const contract = new BinaryContract({
      direction: 'CALL',
      expirySeconds: 60,
      payout: 0.85,
      stake: 10
    });
    expect(contract.direction).toBe('CALL');
  });

  it('should be immutable', () => {
    const contract = new BinaryContract({
      direction: 'CALL',
      expirySeconds: 60,
      payout: 0.85,
      stake: 10
    });
    expect(() => { contract.payout = 0.90 }).toThrow(TypeError);
  });
});
