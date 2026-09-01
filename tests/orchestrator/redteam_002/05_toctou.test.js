"use strict";
const { OrchestratorGate } = require('../../../src/governance/OrchestratorGate');
const { STATES } = require('../../../src/governance/Constants');

describe('Red Team 002: Time of Check / Time of Use (TOCTOU)', () => {
  it('blocks mutating spec after freeze', () => {
    const auditLog = { log: jest.fn(), hasEvent: jest.fn() };
    const gate = new OrchestratorGate(null, auditLog, {});
    const res = gate.attemptDispatchWithValidation({ id: 'TOCTOU_TEST', state: STATES.FROZEN, p_be: 50.0 });
    expect(res.status).toBe('DENIED_FROZEN_MUTATION');
  });
});
