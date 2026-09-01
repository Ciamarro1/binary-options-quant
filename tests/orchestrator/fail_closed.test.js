const { OrchestratorGate } = require('../../src/governance/OrchestratorGate');
const { STATES } = require('../../src/governance/Constants');
const { AuditLogger } = require('../../src/governance/AuditLogger');

describe('Scientific Gatekeeper - Fail-Closed Certification', () => {
    let gate;
    let mockDispatcher;
    let auditLog;
    let mockDependencies;

    beforeEach(() => {
        auditLog = new AuditLogger();
        
        mockDispatcher = {
            dispatchCount: 0,
            executionCount: 0,
            dispatch: jest.fn(() => mockDispatcher.dispatchCount++),
            execute: jest.fn(() => mockDispatcher.executionCount++)
        };

        // We inject dependencies to simulate real filesystem/registry failures
        mockDependencies = {
            readFrozenConfig: jest.fn(),
            readRegistry: jest.fn(),
            readProvenance: jest.fn(),
            readDatasetManifest: jest.fn(),
            checkHash: jest.fn()
        };

        gate = new OrchestratorGate(mockDispatcher, auditLog, mockDependencies);
    });

    const verifyFailClosed = (specId, expectedEvent) => {
        expect(gate.getCurrentState(specId)).toBe(STATES.BLOCKED);
        expect(mockDispatcher.dispatchCount).toBe(0);
        expect(mockDispatcher.executionCount).toBe(0);
        expect(auditLog.hasEvent(expectedEvent)).toBe(true);
    };

    const validSpec = { id: "HYP_020", state: STATES.FROZEN };

    test('FC-001: frozenConfig unavailable', async () => {
        mockDependencies.readFrozenConfig.mockRejectedValue(new Error('ENOENT: no such file or directory'));
        await gate.attemptDispatchAsync(validSpec);
        verifyFailClosed(validSpec.id, 'FAIL_CLOSED_CONFIG_UNAVAILABLE');
    });

    test('FC-002: frozenConfig malformed', async () => {
        mockDependencies.readFrozenConfig.mockResolvedValue("{ malformed_json: }");
        await gate.attemptDispatchAsync(validSpec);
        verifyFailClosed(validSpec.id, 'FAIL_CLOSED_CONFIG_MALFORMED');
    });

    test('FC-003: hash mismatch', async () => {
        mockDependencies.readFrozenConfig.mockResolvedValue({ hash: "abcd" });
        mockDependencies.checkHash.mockResolvedValue(false); // Fails cryptographic check
        await gate.attemptDispatchAsync(validSpec);
        verifyFailClosed(validSpec.id, 'FAIL_CLOSED_HASH_MISMATCH');
    });

    test('FC-004: provenance unavailable', async () => {
        mockDependencies.readFrozenConfig.mockResolvedValue({ hash: "abcd" });
        mockDependencies.checkHash.mockResolvedValue(true);
        mockDependencies.readProvenance.mockRejectedValue(new Error('Missing PROVENANCE_RECEIPT.json'));
        await gate.attemptDispatchAsync(validSpec);
        verifyFailClosed(validSpec.id, 'FAIL_CLOSED_PROVENANCE_UNAVAILABLE');
    });

    test('FC-005: provenance mismatch', async () => {
        mockDependencies.readFrozenConfig.mockResolvedValue({ hash: "abcd", experimentId: "EXP_020" });
        mockDependencies.checkHash.mockResolvedValue(true);
        mockDependencies.readProvenance.mockResolvedValue({ experimentId: "EXP_999" }); // Mismatch!
        await gate.attemptDispatchAsync(validSpec);
        verifyFailClosed(validSpec.id, 'FAIL_CLOSED_PROVENANCE_MISMATCH');
    });

    test('FC-006: registry unavailable', async () => {
        mockDependencies.readFrozenConfig.mockResolvedValue({ hash: "abcd", experimentId: "EXP_020" });
        mockDependencies.checkHash.mockResolvedValue(true);
        mockDependencies.readProvenance.mockResolvedValue({ experimentId: "EXP_020" });
        mockDependencies.readRegistry.mockRejectedValue(new Error('Registry missing'));
        await gate.attemptDispatchAsync(validSpec);
        verifyFailClosed(validSpec.id, 'FAIL_CLOSED_REGISTRY_UNAVAILABLE');
    });

    test('FC-007: registry inconsistent', async () => {
        mockDependencies.readFrozenConfig.mockResolvedValue({ hash: "abcd", experimentId: "EXP_020" });
        mockDependencies.checkHash.mockResolvedValue(true);
        mockDependencies.readProvenance.mockResolvedValue({ experimentId: "EXP_020" });
        mockDependencies.readRegistry.mockResolvedValue({ activeExperiment: "EXP_099" }); // Inconsistent state
        await gate.attemptDispatchAsync(validSpec);
        verifyFailClosed(validSpec.id, 'FAIL_CLOSED_REGISTRY_INCONSISTENT');
    });

    test('FC-008: dataset manifest corrupted', async () => {
        mockDependencies.readFrozenConfig.mockResolvedValue({ hash: "abcd", experimentId: "EXP_020" });
        mockDependencies.checkHash.mockResolvedValue(true);
        mockDependencies.readProvenance.mockResolvedValue({ experimentId: "EXP_020" });
        mockDependencies.readRegistry.mockResolvedValue({ activeExperiment: "EXP_020" });
        mockDependencies.readDatasetManifest.mockRejectedValue(new Error('Checksum failed'));
        await gate.attemptDispatchAsync(validSpec);
        verifyFailClosed(validSpec.id, 'FAIL_CLOSED_DATASET_CORRUPTED');
    });

    test('FC-009: governance timeout / exception', async () => {
        // Simulating a network or DB timeout in a remote lockbox
        mockDependencies.readFrozenConfig.mockImplementation(() => {
            return new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100));
        });
        await gate.attemptDispatchAsync(validSpec);
        verifyFailClosed(validSpec.id, 'FAIL_CLOSED_TIMEOUT');
    });

    test('FC-010: stale authorization (cached PASS rejected)', async () => {
        // Attempt to pass a previously cached authorization token
        const staleSpec = { ...validSpec, cachedToken: "token_from_yesterday", timestamp: Date.now() - 86400000 };
        mockDependencies.readFrozenConfig.mockResolvedValue({ hash: "abcd", experimentId: "EXP_020" });
        await gate.attemptDispatchAsync(staleSpec);
        verifyFailClosed(staleSpec.id, 'FAIL_CLOSED_STALE_AUTHORIZATION');
    });
});
