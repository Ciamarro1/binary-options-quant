const { OrchestratorGate } = require('../../src/governance/OrchestratorGate');
const { STATES } = require('../../src/governance/Constants');
const { AuditLogger } = require('../../src/governance/AuditLogger');

describe('Scientific Gatekeeper - State Transition Certification', () => {
    let gate;
    let mockDispatcher;
    let auditLog;

    beforeEach(() => {
        // Mock isolation per test
        auditLog = new AuditLogger();
        mockDispatcher = {
            dispatchCount: 0,
            executionCount: 0,
            dispatch: jest.fn(() => mockDispatcher.dispatchCount++),
            execute: jest.fn(() => mockDispatcher.executionCount++)
        };

        gate = new OrchestratorGate(mockDispatcher, auditLog);
    });

    describe('Strict Sequential State Machine', () => {
        test('ST-001: Cannot DISPATCH from DRAFT state', () => {
            const spec = {
                id: "HYP_010",
                state: STATES.SPEC_DRAFT,
                hash: null
            };

            const result = gate.attemptDispatch(spec);

            // Assertions mapping to the strict contract
            expect(result.status).toBe("DENIED");
            expect(gate.getCurrentState(spec.id)).toBe(STATES.BLOCKED);
            expect(mockDispatcher.dispatchCount).toBe(0);
            expect(mockDispatcher.executionCount).toBe(0);
            expect(auditLog.hasEvent("UNAUTHORIZED_DISPATCH_ATTEMPT")).toBe(true);
        });

        test('ST-002: Cannot transition to FROZEN without Verification Design', () => {
            const spec = {
                id: "HYP_011",
                state: STATES.SPEC_DRAFT,
                hypothesis: "Momentum breakout",
                // MISSING verification_design
            };

            gate.attemptFreeze(spec);

            // The Zero Implicit Assumptions rule kicks in
            expect(gate.getCurrentState(spec.id)).toBe(STATES.BLOCKED);
            expect(auditLog.hasEvent("MISSING_MANDATORY_DIMENSION")).toBe(true);
        });

        test('ST-003: Authorized DISPATCH requires strict cryptographic and state match', () => {
            const validHash = "a3f8c9...d21";
            
            const spec = {
                id: "HYP_012",
                state: STATES.FROZEN,
                hash: validHash,
                datasetHash: "dataset_890",
                provenanceValid: true,
                permission: "AUTHORIZED"
            };

            const result = gate.attemptDispatch(spec, { providedHash: validHash });

            expect(result.status).toBe("AUTHORIZED");
            expect(mockDispatcher.dispatchCount).toBe(1);
            expect(auditLog.hasEvent("DISPATCH_AUTHORIZED")).toBe(true);
        });

        test('ST-004: Terminal BLOCKED state cannot be mutated or overridden', () => {
            const spec = {
                id: "HYP_013",
                state: STATES.BLOCKED,
                hash: null
            };

            // Attempt to force a transition via internal bypass
            expect(() => {
                gate.forceTransition(spec.id, STATES.READY_FOR_FREEZE);
            }).toThrow("ILLEGAL_STATE_TRANSITION");

            gate.attemptDispatch(spec);

            expect(gate.getCurrentState(spec.id)).toBe(STATES.BLOCKED);
            expect(mockDispatcher.dispatchCount).toBe(0);
            expect(mockDispatcher.executionCount).toBe(0);
        });
    });
});
