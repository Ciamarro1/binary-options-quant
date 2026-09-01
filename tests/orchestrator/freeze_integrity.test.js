"use strict";
const { OrchestratorGate } = require('../../src/governance/OrchestratorGate');
const { STATES } = require('../../src/governance/Constants');
const { AuditLogger } = require('../../src/governance/AuditLogger');

describe('Freeze Integrity Certification', () => {
  it('guarantees immutability of frozen specifications', () => {
    const auditLog = new AuditLogger();
    const gate = new OrchestratorGate(null, auditLog);
    const spec = { id: 'HYP_FROZEN_TEST', state: STATES.READY_FOR_FREEZE, exactMathDefined: true };
    
    const res = gate.attemptFreeze(spec);
    expect(res.status).toBe('FROZEN');
    expect(gate.getCurrentState('HYP_FROZEN_TEST')).toBe(STATES.FROZEN);
  });
});
