"use strict";
const { OrchestratorGate } = require('../../../src/governance/OrchestratorGate');
const { STATES } = require('../../../src/governance/Constants');

describe('Red Team 002: Capability Replay', () => {
  it('rejects stale cached authorization token', async () => {
    const auditLog = { log: jest.fn(), hasEvent: jest.fn() };
    const gate = new OrchestratorGate(null, auditLog, {});
    const staleSpec = { id: 'STALE_TEST', state: STATES.FROZEN, cachedToken: 'old_tok', timestamp: Date.now() - 99999999 };
    
    const res = await gate.attemptDispatchAsync(staleSpec);
    expect(res.status).toBe('DENIED');
    expect(gate.getCurrentState('STALE_TEST')).toBe(STATES.BLOCKED);
  });
});
