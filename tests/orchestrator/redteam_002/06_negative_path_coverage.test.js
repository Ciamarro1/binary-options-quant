"use strict";
const { OrchestratorGate } = require('../../../src/governance/OrchestratorGate');
const { STATES, OPERATIONS } = require('../../../src/governance/Constants');

describe('Red Team 002: Negative Path Coverage', () => {
  it('verifies all illegal state operations return DENIED', () => {
    const gate = new OrchestratorGate(null, null);
    expect(gate.checkPermission({ state: STATES.BLOCKED }, OPERATIONS.FREEZE).allowed).toBe(false);
    expect(gate.checkPermission({ state: STATES.INTENT }, OPERATIONS.DISPATCH).allowed).toBe(false);
  });
});
