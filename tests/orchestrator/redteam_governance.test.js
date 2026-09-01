const { OrchestratorGate } = require('../../src/governance/OrchestratorGate');
const { STATES } = require('../../src/governance/Constants');
const { AuditLogger } = require('../../src/governance/AuditLogger');

describe('Scientific Gatekeeper - RED TEAM GOVERNANCE HARNESS', () => {
    let gate;
    let systemState;
    let auditLog;

    beforeEach(() => {
        auditLog = new AuditLogger();
        
        // Simulates the actual machine boundaries
        systemState = {
            dispatchCount: 0,
            executionCount: 0,
            frozenSpecHash: "hash_0x0001",
            registryHash: "reg_0x0001",
            provenanceHash: "prov_0x0001",
            
            // Critical side-effect channels
            dispatch: jest.fn(() => systemState.dispatchCount++),
            execute: jest.fn(() => systemState.executionCount++),
            mutateSpec: jest.fn((newHash) => systemState.frozenSpecHash = newHash)
        };
        
        gate = new OrchestratorGate(systemState, auditLog, systemState);
    });

    /**
     * THE GOLD STANDARD ASSERTION
     * Guarantees zero leakage of execution or state mutation before the block.
     */
    function createSnapshot() {
        return {
            dispatchCount: systemState.dispatchCount,
            executionCount: systemState.executionCount,
            frozenSpecHash: systemState.frozenSpecHash,
            registryHash: systemState.registryHash,
            provenanceHash: systemState.provenanceHash
        };
    }

    function assertNoUnauthorizedSideEffects(snapshotBefore, snapshotAfter) {
        expect(snapshotAfter.dispatchCount).toBe(snapshotBefore.dispatchCount);
        expect(snapshotAfter.executionCount).toBe(snapshotBefore.executionCount);
        expect(snapshotAfter.frozenSpecHash).toBe(snapshotBefore.frozenSpecHash);
        expect(snapshotAfter.registryHash).toBe(snapshotBefore.registryHash);
        expect(snapshotAfter.provenanceHash).toBe(snapshotBefore.provenanceHash);
    }

    describe('Vector Certifications', () => {

        test('RT-002: Moving Goalpost (Sequential Attack)', () => {
            // 1. Spec is already frozen
            const spec = { id: "HYP_RT2", state: STATES.FROZEN, p_be: 55.56, hash: systemState.frozenSpecHash };
            const before = createSnapshot();

            // 2. Attack: Attempt to dispatch a spec with a modified P_BE after poor results
            const maliciousPayload = { ...spec, p_be: 50.00 }; // Lowering the bar
            
            const result = gate.attemptDispatchWithValidation(maliciousPayload);
            const after = createSnapshot();

            expect(result.status).toBe("DENIED_FROZEN_MUTATION");
            expect(gate.getCurrentState(spec.id)).toBe(STATES.BLOCKED);
            assertNoUnauthorizedSideEffects(before, after);
            expect(auditLog.hasEvent("GOVERNANCE_ATTACK_DETECTED")).toBe(true);
        });

        test('RT-013: Implementation Optionality (Indirect Attack)', () => {
            // Attack: User submits a vague spec to give the engineer degrees of freedom
            const maliciousSpec = {
                id: "HYP_RT13",
                state: STATES.READY_FOR_FREEZE,
                entryLogic: "Use momentum confirmation", // VAGUE - no math defined
                exactMathDefined: false
            };
            
            const before = createSnapshot();
            gate.attemptFreeze(maliciousSpec);
            const after = createSnapshot();

            // The gate MUST reject the freeze ceremony
            expect(gate.getCurrentState(maliciousSpec.id)).toBe(STATES.BLOCKED);
            assertNoUnauthorizedSideEffects(before, after);
            expect(auditLog.hasEvent("IMPLEMENTATION_OPTIONALITY_BLOCKED")).toBe(true);
        });

        test('RT-010: Delegation Bypass (Direct Attack)', () => {
            // Attack: Attempt to invoke subagents directly bypassing the Quant-Grill
            const spec = { id: "HYP_RT10", state: STATES.INTENT };
            const before = createSnapshot();

            const result = gate.attemptDispatch(spec);
            const after = createSnapshot();

            expect(result.status).toBe("DENIED");
            expect(gate.getCurrentState(spec.id)).toBe(STATES.BLOCKED);
            assertNoUnauthorizedSideEffects(before, after);
        });

        test('RT-008: Replication Laundering (Sequential Attack)', () => {
            // Attack: Submitting a "replicated" result where the timeframe was stealthily altered
            const spec = { id: "HYP_RT8", state: STATES.FROZEN, timeframe: "1m", hash: systemState.frozenSpecHash };
            const before = createSnapshot();

            const launderedPayload = { ...spec, timeframe: "5m" }; // Sneaky change

            const result = gate.evaluateReplicationGate(launderedPayload);
            const after = createSnapshot();

            expect(result.status).toBe("DENIED_REPLICATION_LAUNDERING");
            assertNoUnauthorizedSideEffects(before, after);
            expect(auditLog.hasEvent("LAUNDERING_ATTACK_DETECTED")).toBe(true);
        });
    });
});
