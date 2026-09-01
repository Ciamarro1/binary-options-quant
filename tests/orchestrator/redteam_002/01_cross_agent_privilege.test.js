"use strict";
const { OrchestratorGate } = require('../../../src/governance/OrchestratorGate');
const { STATES, OPERATIONS } = require('../../../src/governance/Constants');

describe('Red Team 002: Cross Agent Privilege', () => {
  it('denies research execution from gatekeeper', () => {
    const gate = new OrchestratorGate(null, null);
    const res = gate.attemptExecute({ id: 'PRIV_TEST', state: STATES.FROZEN });
    expect(res.status).toBe('DENIED_EXECUTION_RIGHTS');
  });
});
