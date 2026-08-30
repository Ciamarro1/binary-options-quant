const Decision = require('./Decision');
const EVEngine = require('../probability/EVEngine');

class DecisionGate {
  static evaluate({ marketObservation, binaryContract, probabilitySnapshot, requiredEdge = 0, contractHash }) {
    // We assume the caller validated the inputs by instantiating the models.
    const timestamp = Date.now();
    const probabilitySnapshotId = `${probabilitySnapshot.modelId}_${probabilitySnapshot.modelVersion}_${probabilitySnapshot.generatedAt}`;
    
    const ev = EVEngine.calculateEV(probabilitySnapshot.probability, binaryContract.payout);
    const edge = EVEngine.calculateEdge(probabilitySnapshot.probability, binaryContract.payout);

    if (ev <= 0) {
      return new Decision({
        decision: 'REJECT',
        reasonCode: 'NEGATIVE_EV',
        timestamp,
        contractHash,
        probabilitySnapshotId
      });
    }

    if (edge < requiredEdge) {
      return new Decision({
        decision: 'REJECT',
        reasonCode: 'INSUFFICIENT_EDGE',
        timestamp,
        contractHash,
        probabilitySnapshotId
      });
    }

    return new Decision({
      decision: 'PASS',
      reasonCode: 'APPROVED',
      timestamp,
      contractHash,
      probabilitySnapshotId
    });
  }
}
module.exports = DecisionGate;
