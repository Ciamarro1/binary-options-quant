"use strict";
const BaselineModel = require('../../src/research/BaselineModel');

describe('BaselineModel', () => {
  it('adapts naive frequency deterministically', () => {
    const model = new BaselineModel();
    const mockOutcomes = [
      { direction: 'CALL', outcome: 'WIN' },
      { direction: 'PUT', outcome: 'LOSS' }, // market up
      { direction: 'CALL', outcome: 'LOSS' }, // market down
    ];

    model.fit(mockOutcomes);
    // 2 up out of 3 = 0.666...
    expect(model.callFrequency).toBeCloseTo(0.6666, 3);
    
    const pred = model.predict({}, {});
    expect(pred.direction).toBe('CALL');
    expect(pred.probability).toBeCloseTo(0.6666, 3);
  });
});
