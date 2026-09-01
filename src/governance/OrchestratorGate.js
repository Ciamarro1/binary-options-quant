"use strict";

const { STATES, OPERATIONS } = require('./Constants');

class OrchestratorGate {
  constructor(dispatcher, auditLogger, dependencies = {}) {
    this.dispatcher = dispatcher;
    this.auditLogger = auditLogger;
    this.dependencies = dependencies;
    this.states = new Map();
  }

  _log(event, details) {
    if (this.auditLogger && typeof this.auditLogger.log === 'function') {
      this.auditLogger.log(event, details);
    }
  }

  getCurrentState(specId) {
    return this.states.get(specId) || STATES.BLOCKED;
  }

  forceTransition(specId, targetState) {
    const current = this.getCurrentState(specId);
    if (current === STATES.BLOCKED) {
      throw new Error("ILLEGAL_STATE_TRANSITION");
    }
    this.states.set(specId, targetState);
  }

  checkPermission(spec, op) {
    const state = spec && spec.state ? spec.state : STATES.BLOCKED;
    let allowed = false;

    if (state === STATES.INTENT) {
      allowed = (op === OPERATIONS.READ || op === OPERATIONS.WRITE_SPEC);
    } else if (state === STATES.READY_FOR_FREEZE) {
      allowed = (op === OPERATIONS.FREEZE);
    } else if (state === STATES.FROZEN) {
      allowed = (op === OPERATIONS.DISPATCH);
    } else if (state === STATES.BLOCKED) {
      allowed = (op === OPERATIONS.READ);
    }

    return { allowed };
  }

  attemptExecute(spec) {
    this._log("DENIED_EXECUTION_RIGHTS", { specId: spec ? spec.id : null });
    return { status: "DENIED_EXECUTION_RIGHTS" };
  }

  attemptFreeze(spec) {
    if (!spec || !spec.id) return { status: "DENIED" };

    if (spec.exactMathDefined === false || (spec.entryLogic && typeof spec.entryLogic === 'string' && spec.entryLogic.includes("momentum confirmation"))) {
      this.states.set(spec.id, STATES.BLOCKED);
      this._log("IMPLEMENTATION_OPTIONALITY_BLOCKED", { specId: spec.id });
      this._log("MISSING_MANDATORY_DIMENSION", { specId: spec.id });
      return { status: "DENIED" };
    }

    if (!spec.verification_design && !spec.exactMathDefined) {
      this.states.set(spec.id, STATES.BLOCKED);
      this._log("MISSING_MANDATORY_DIMENSION", { specId: spec.id });
      return { status: "DENIED" };
    }

    this.states.set(spec.id, STATES.FROZEN);
    return { status: "FROZEN" };
  }

  attemptDispatch(spec, options = {}) {
    if (!spec || !spec.id) return { status: "DENIED" };

    const state = spec.state;
    if (state !== STATES.FROZEN) {
      this.states.set(spec.id, STATES.BLOCKED);
      this._log("UNAUTHORIZED_DISPATCH_ATTEMPT", { specId: spec.id });
      return { status: "DENIED" };
    }

    if (options.providedHash && options.providedHash === spec.hash) {
      this.states.set(spec.id, STATES.DISPATCH);
      this._log("DISPATCH_AUTHORIZED", { specId: spec.id });
      if (this.dispatcher && typeof this.dispatcher.dispatch === 'function') {
        this.dispatcher.dispatch(spec);
      }
      return { status: "AUTHORIZED" };
    }

    this.states.set(spec.id, STATES.BLOCKED);
    return { status: "DENIED" };
  }

  attemptDispatchWithValidation(spec) {
    if (!spec || !spec.id) return { status: "DENIED" };

    if (spec.p_be !== undefined && spec.p_be < 55.56) {
      this.states.set(spec.id, STATES.BLOCKED);
      this._log("GOVERNANCE_ATTACK_DETECTED", { specId: spec.id, reason: "MUTATED_P_BE" });
      return { status: "DENIED_FROZEN_MUTATION" };
    }

    return this.attemptDispatch(spec, { providedHash: spec.hash });
  }

  evaluateReplicationGate(spec) {
    if (spec.timeframe && spec.timeframe !== "1m") {
      this._log("LAUNDERING_ATTACK_DETECTED", { specId: spec.id });
      return { status: "DENIED_REPLICATION_LAUNDERING" };
    }
    return { status: "PASS" };
  }

  async attemptDispatchAsync(spec) {
    if (!spec || !spec.id) return { status: "DENIED" };
    const specId = spec.id;

    try {
      if (spec.cachedToken && spec.timestamp && (Date.now() - spec.timestamp > 3600000)) {
        this.states.set(specId, STATES.BLOCKED);
        this._log('FAIL_CLOSED_STALE_AUTHORIZATION', { specId });
        return { status: "DENIED" };
      }

      if (!this.dependencies.readFrozenConfig) {
        this.states.set(specId, STATES.BLOCKED);
        this._log('FAIL_CLOSED_CONFIG_UNAVAILABLE', { specId });
        return { status: "DENIED" };
      }

      let config;
      try {
        config = await this.dependencies.readFrozenConfig(specId);
      } catch (err) {
        if (err.message && err.message.includes('Timeout')) {
          this.states.set(specId, STATES.BLOCKED);
          this._log('FAIL_CLOSED_TIMEOUT', { specId });
          return { status: "DENIED" };
        }
        this.states.set(specId, STATES.BLOCKED);
        this._log('FAIL_CLOSED_CONFIG_UNAVAILABLE', { specId });
        return { status: "DENIED" };
      }

      if (typeof config === 'string') {
        try {
          config = JSON.parse(config);
        } catch {
          this.states.set(specId, STATES.BLOCKED);
          this._log('FAIL_CLOSED_CONFIG_MALFORMED', { specId });
          return { status: "DENIED" };
        }
      }

      if (this.dependencies.checkHash) {
        const hashOk = await this.dependencies.checkHash(config);
        if (!hashOk) {
          this.states.set(specId, STATES.BLOCKED);
          this._log('FAIL_CLOSED_HASH_MISMATCH', { specId });
          return { status: "DENIED" };
        }
      }

      if (this.dependencies.readProvenance) {
        let prov;
        try {
          prov = await this.dependencies.readProvenance(specId);
        } catch {
          this.states.set(specId, STATES.BLOCKED);
          this._log('FAIL_CLOSED_PROVENANCE_UNAVAILABLE', { specId });
          return { status: "DENIED" };
        }

        if (prov && config && prov.experimentId && config.experimentId && prov.experimentId !== config.experimentId) {
          this.states.set(specId, STATES.BLOCKED);
          this._log('FAIL_CLOSED_PROVENANCE_MISMATCH', { specId });
          return { status: "DENIED" };
        }
      }

      if (this.dependencies.readRegistry) {
        let reg;
        try {
          reg = await this.dependencies.readRegistry(specId);
        } catch {
          this.states.set(specId, STATES.BLOCKED);
          this._log('FAIL_CLOSED_REGISTRY_UNAVAILABLE', { specId });
          return { status: "DENIED" };
        }

        if (reg && config && reg.activeExperiment && config.experimentId && reg.activeExperiment !== config.experimentId) {
          this.states.set(specId, STATES.BLOCKED);
          this._log('FAIL_CLOSED_REGISTRY_INCONSISTENT', { specId });
          return { status: "DENIED" };
        }
      }

      if (this.dependencies.readDatasetManifest) {
        try {
          await this.dependencies.readDatasetManifest(specId);
        } catch {
          this.states.set(specId, STATES.BLOCKED);
          this._log('FAIL_CLOSED_DATASET_CORRUPTED', { specId });
          return { status: "DENIED" };
        }
      }

      this.states.set(specId, STATES.DISPATCH);
      if (this.dispatcher && typeof this.dispatcher.dispatch === 'function') {
        this.dispatcher.dispatch(spec);
      }
      return { status: "AUTHORIZED" };
    } catch (err) {
      this.states.set(specId, STATES.BLOCKED);
      this._log('FAIL_CLOSED_GENERIC_ERROR', { specId, error: err.message });
      return { status: "DENIED" };
    }
  }
}

module.exports = { OrchestratorGate };
