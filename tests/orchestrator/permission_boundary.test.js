const { OrchestratorGate } = require('../../src/governance/OrchestratorGate');
const { STATES, OPERATIONS } = require('../../src/governance/Constants');

describe('Scientific Gatekeeper - Permission Boundary Certification', () => {
    let gate;
    let mockDispatcher;

    beforeEach(() => {
        mockDispatcher = {
            dispatchCount: 0,
            executionCount: 0,
            executeResearch: jest.fn(() => mockDispatcher.executionCount++)
        };
        gate = new OrchestratorGate(mockDispatcher, null);
    });

    describe('Strict Permission Matrix Enforcement', () => {
        const matrix = [
            { state: STATES.INTENT, op: OPERATIONS.READ, allowed: true },
            { state: STATES.INTENT, op: OPERATIONS.WRITE_SPEC, allowed: true },
            { state: STATES.INTENT, op: OPERATIONS.FREEZE, allowed: false },
            { state: STATES.INTENT, op: OPERATIONS.DISPATCH, allowed: false },
            { state: STATES.INTENT, op: OPERATIONS.EXECUTE, allowed: false },

            { state: STATES.READY_FOR_FREEZE, op: OPERATIONS.WRITE_SPEC, allowed: false },
            { state: STATES.READY_FOR_FREEZE, op: OPERATIONS.FREEZE, allowed: true },
            { state: STATES.READY_FOR_FREEZE, op: OPERATIONS.DISPATCH, allowed: false },

            { state: STATES.FROZEN, op: OPERATIONS.WRITE_SPEC, allowed: false },
            { state: STATES.FROZEN, op: OPERATIONS.FREEZE, allowed: false },
            { state: STATES.FROZEN, op: OPERATIONS.DISPATCH, allowed: true },
            { state: STATES.FROZEN, op: OPERATIONS.EXECUTE, allowed: false },

            { state: STATES.BLOCKED, op: OPERATIONS.READ, allowed: true },
            { state: STATES.BLOCKED, op: OPERATIONS.WRITE_SPEC, allowed: false },
            { state: STATES.BLOCKED, op: OPERATIONS.FREEZE, allowed: false },
            { state: STATES.BLOCKED, op: OPERATIONS.DISPATCH, allowed: false },
            { state: STATES.BLOCKED, op: OPERATIONS.EXECUTE, allowed: false }
        ];

        matrix.forEach(({ state, op, allowed }) => {
            test(`State [${state}] + Operation [${op}] -> ${allowed ? 'ALLOW' : 'DENY'}`, () => {
                const spec = { id: "TEST_SPEC", state: state };
                const result = gate.checkPermission(spec, op);
                
                expect(result.allowed).toBe(allowed);

                if (!allowed) {
                    // Assert side-effects were prevented
                    if (op === OPERATIONS.DISPATCH) expect(mockDispatcher.dispatchCount).toBe(0);
                    if (op === OPERATIONS.EXECUTE) expect(mockDispatcher.executionCount).toBe(0);
                }
            });
        });

        test('PB-001: Orchestrator MUST NOT execute research workloads directly', () => {
            const spec = { id: "HYP_EXEC", state: STATES.FROZEN };
            
            const result = gate.attemptExecute(spec);
            
            expect(result.status).toBe("DENIED_EXECUTION_RIGHTS");
            expect(mockDispatcher.executionCount).toBe(0); // Proves research workload was blocked
        });
    });
});
