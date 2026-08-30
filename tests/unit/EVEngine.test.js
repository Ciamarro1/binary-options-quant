const EVEngine = require('../../src/probability/EVEngine');

describe('EVEngine', () => {
  it('should calculate EV properly', () => {
    // 0.6 * 0.85 - (1 - 0.6) = 0.51 - 0.40 = 0.11
    expect(EVEngine.calculateEV(0.6, 0.85)).toBeCloseTo(0.11);
  });

  it('should calculate break even properly', () => {
    expect(EVEngine.calculateBreakEven(1.0)).toBe(0.5);
  });

  it('should return edge properly', () => {
    expect(EVEngine.calculateEdge(0.6, 1.0)).toBeCloseTo(0.1);
  });

  it('should be deterministic', () => {
    const ev1 = EVEngine.calculateEV(0.55, 0.80);
    const ev2 = EVEngine.calculateEV(0.55, 0.80);
    expect(ev1).toBe(ev2);
  });
});
