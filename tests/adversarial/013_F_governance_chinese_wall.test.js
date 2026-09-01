"use strict";

const ExhaustionModel = require('../../src/strategy/models/ExhaustionModel');

describe('Adversarial 013-F: Chinese Wall & Model Immutability', () => {
  test('CW-001: Model instances are deeply frozen and resist post-hoc parameter mutations', () => {
    const model = new ExhaustionModel(0.60, 0.65, {
      bodyThreshold: 2.0,
      upperCloseLocation: 0.90,
      volumeThreshold: 2.0
    });

    expect(Object.isFrozen(model)).toBe(true);

    // Attempt malicious tampering
    expect(() => {
      model.bodyThreshold = 1.0;
    }).toThrow();

    expect(() => {
      model.upperCloseLocation = 0.50;
    }).toThrow();

    expect(model.bodyThreshold).toBe(2.0);
    expect(model.upperCloseLocation).toBe(0.90);
  });
});
