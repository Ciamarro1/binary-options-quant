"use strict";
const { OrchestratorGate } = require('../../src/governance/OrchestratorGate');
const { STATES } = require('../../src/governance/Constants');
const { AuditLogger } = require('../../src/governance/AuditLogger');

describe('Provenance Integrity Certification', () => {
  it('verifies unbroken chain of custody in dispatch', async () => {
    const auditLog = new AuditLogger();
    const mockDependencies = {
      readFrozenConfig: jest.fn().mockResolvedValue({ hash: 'abcd', experimentId: 'EXP_011' }),
      checkHash: jest.fn().mockResolvedValue(true),
      readProvenance: jest.fn().mockResolvedValue({ experimentId: 'EXP_011' }),
      readRegistry: jest.fn().mockResolvedValue({ activeExperiment: 'EXP_011' }),
      readDatasetManifest: jest.fn().mockResolvedValue({ datasetId: 'DATASET_003' })
    };
    const mockDispatcher = { dispatch: jest.fn() };
    const gate = new OrchestratorGate(mockDispatcher, auditLog, mockDependencies);
    
    const spec = { id: 'HYP_PROV_TEST', state: STATES.FROZEN };
    const res = await gate.attemptDispatchAsync(spec);
    expect(res.status).toBe('AUTHORIZED');
    expect(mockDispatcher.dispatch).toHaveBeenCalled();
  });
});
