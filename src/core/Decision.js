class Decision {
  constructor({ decision, reasonCode, timestamp, contractHash, probabilitySnapshotId }) {
    if (decision !== 'PASS' && decision !== 'REJECT') throw new Error('Invalid decision');
    if (!reasonCode || typeof reasonCode !== 'string') throw new Error('Invalid reasonCode');
    if (typeof timestamp !== 'number' || isNaN(timestamp) || !isFinite(timestamp) || timestamp <= 0) {
      throw new Error('Invalid timestamp');
    }
    if (!contractHash || typeof contractHash !== 'string') throw new Error('Invalid contractHash');
    if (!probabilitySnapshotId || typeof probabilitySnapshotId !== 'string') throw new Error('Invalid probabilitySnapshotId');

    this.decision = decision;
    this.reasonCode = reasonCode;
    this.timestamp = timestamp;
    this.contractHash = contractHash;
    this.probabilitySnapshotId = probabilitySnapshotId;

    Object.freeze(this);
  }
}
module.exports = Decision;
