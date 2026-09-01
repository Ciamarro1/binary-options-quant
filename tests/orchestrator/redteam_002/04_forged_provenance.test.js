"use strict";
const { OrchestratorGate } = require('../../../src/governance/OrchestratorGate');
const { STATES } = require('../../../src/governance/Constants');

describe('Red Team 002: Forged Provenance', () => {
  it('blocks mismatched experiment ID in provenance', async () => {
    const mockDependencies = {
      readFrozenConfig: jest.fn().mockResolvedValue({ hash: 'abcd', experimentId: 'EXP_A' }),
      checkHash: jest.fn().mockResolvedValue(true),
      readProvenance: jest.fn().mockResolvedValue({ experimentId: 'EXP_FORGED' })
    };
    const gate = new OrchestratorGate(null, null, mockDependencies);
    const spec = { id: 'FORGE_TEST', state: STATES.FROZEN };
    
    const res = await gate.attemptDispatchAsync(spec);
    expect(res.status).toBe('DENIED');
    expect(gate.getCurrentState('FORGE_TEST')).toBe(STATES.BLOCKED);
  });
});
