"use strict";
const ProbabilitySnapshot = require('../../src/core/ProbabilitySnapshot');

describe('ProbabilitySnapshot', () => {
  it('should create valid snapshot', () => {
    const snap = new ProbabilitySnapshot({
      probability: 0.55,
      modelId: 'm1',
      modelVersion: 'v1',
      generatedAt: Date.now(),
      inputHash: 'hash123'
    });
    expect(snap.probability).toBe(0.55);
  });

  it('should be immutable', () => {
    const snap = new ProbabilitySnapshot({
      probability: 0.55,
      modelId: 'm1',
      modelVersion: 'v1',
      generatedAt: Date.now(),
      inputHash: 'hash123'
    });
    expect(() => { snap.probability = 0.9 }).toThrow(TypeError);
  });
});
