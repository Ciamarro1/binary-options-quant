class ProbabilitySnapshot {
  constructor({ probability, modelId, modelVersion, generatedAt, inputHash }) {
    const isInvalidNumber = (val) => typeof val !== 'number' || isNaN(val) || !isFinite(val);
    
    if (isInvalidNumber(probability) || probability < 0 || probability > 1) {
      throw new Error('Invalid probability');
    }
    if (!modelId || typeof modelId !== 'string') throw new Error('Invalid modelId');
    if (!modelVersion || typeof modelVersion !== 'string') throw new Error('Invalid modelVersion');
    if (isInvalidNumber(generatedAt) || generatedAt <= 0) throw new Error('Invalid generatedAt');
    if (!inputHash || typeof inputHash !== 'string') throw new Error('Invalid inputHash');

    this.probability = probability;
    this.modelId = modelId;
    this.modelVersion = modelVersion;
    this.generatedAt = generatedAt;
    this.inputHash = inputHash;

    Object.freeze(this);
  }
}
module.exports = ProbabilitySnapshot;
