"use strict";
const { OrchestratorGate } = require('../../../src/governance/OrchestratorGate');
const { STATES, OPERATIONS } = require('../../../src/governance/Constants');

describe('Red Team 002: Confused Deputy', () => {
  it('blocks unverified operation requests', () => {
    const gate = new OrchestratorGate(null, null);
    const perm = gate.checkPermission({ id: 'CONF_TEST', state: STATES.BLOCKED }, OPERATIONS.EXECUTE);
    expect(perm.allowed).toBe(false);
  });
});
