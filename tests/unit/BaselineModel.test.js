"use strict";
const BaselineModel = require('../../src/research/BaselineModel');

describe('BaselineModel', () => {
  it('adapts naive frequency deterministically from pure market observations', () => {
    const mockObs = [
      { close: 1.0 }, // t=0
      { close: 1.5 }, // t=1, UP
      { close: 1.2 }, // t=2, DOWN
      { close: 1.8 }  // t=3, UP
    ];

    const model = BaselineModel.fit(mockObs);
    
    // 3 transitions. 2 UP. Frequency = 2/3 = 0.666...
    expect(model.callFrequency).toBeCloseTo(0.6666, 3);
    
    const pred = model.predict({}, {});
    expect(pred.direction).toBe('CALL');
    expect(pred.probability).toBeCloseTo(0.6666, 3);
  });

  it('is strictly immutable after creation', () => {
    const model = new BaselineModel(0.6);
    expect(() => { model.callFrequency = 0.9; }).toThrow();
  });
});
