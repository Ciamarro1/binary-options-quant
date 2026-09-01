"use strict";

const ModelContract = require('./ModelContract');
const FeatureEngine = require('../FeatureEngine');

class DisplacementModel extends ModelContract {
  constructor({
    probCall = 0.50,
    probPut = 0.50,
    nCall = 0,
    nPut = 0,
    displacementThreshold = 1.0,
    volumeThreshold = 1.5,
    expirySeconds = 60
  } = {}) {
    super();
    this.probCall = probCall;
    this.probPut = probPut;
    this.nCall = nCall;
    this.nPut = nPut;
    this.displacementThreshold = displacementThreshold;
    this.volumeThreshold = volumeThreshold;
    this.expirySeconds = expirySeconds;
    Object.freeze(this);
  }

  get id() {
    return 'DISPLACEMENT_MOMENTUM';
  }

  get version() {
    return '1.0.0';
  }

  static fit(trainObservations, options = {}) {
    const displacementThreshold = options.displacementThreshold || 1.0;
    const volumeThreshold = options.volumeThreshold || 1.5;
    const expirySeconds = options.expirySeconds || 60;
    const minTrainSamples = options.minTrainSamples || 30;

    if (!Array.isArray(trainObservations) || trainObservations.length < 25) {
      return new DisplacementModel({
        probCall: 0.50,
        probPut: 0.50,
        nCall: 0,
        nPut: 0,
        displacementThreshold,
        volumeThreshold,
        expirySeconds
      });
    }

    const featureEngine = new FeatureEngine('fit_fe', '1.0');
    const N = trainObservations.length;
    const history = [];

    let winsCall = 0;
    let lossesCall = 0;
    let winsPut = 0;
    let lossesPut = 0;

    for (let i = 0; i < N - 1; i++) {
      history.push(trainObservations[i]);
      const currentObs = trainObservations[i];
      const nextObs = trainObservations[i + 1];

      const snap = featureEngine.extractFeatures(
        currentObs.asset,
        currentObs.timestamp,
        history
      );

      const f = snap.features;
      if (!f || f.displacementRatio === null || f.volumeRatio === null) {
        continue;
      }

      if (f.displacementRatio >= displacementThreshold && f.volumeRatio >= volumeThreshold) {
        if (currentObs.close > currentObs.open) {
          if (nextObs.close > currentObs.close) {
            winsCall++;
          } else if (nextObs.close < currentObs.close) {
            lossesCall++;
          }
        } else if (currentObs.close < currentObs.open) {
          if (nextObs.close < currentObs.close) {
            winsPut++;
          } else if (nextObs.close > currentObs.close) {
            lossesPut++;
          }
        }
      }
    }

    const nCallResolved = winsCall + lossesCall;
    const nPutResolved = winsPut + lossesPut;

    const probCall = nCallResolved >= minTrainSamples ? (winsCall / nCallResolved) : 0.50;
    const probPut = nPutResolved >= minTrainSamples ? (winsPut / nPutResolved) : 0.50;

    return new DisplacementModel({
      probCall,
      probPut,
      nCall: nCallResolved,
      nPut: nPutResolved,
      displacementThreshold,
      volumeThreshold,
      expirySeconds
    });
  }

  predict(featureSnapshot, regimeSnapshot) {
    if (!featureSnapshot || !featureSnapshot.features) {
      return null;
    }

    const f = featureSnapshot.features;
    if (f.displacementRatio === null || f.volumeRatio === null) {
      return null;
    }

    if (f.displacementRatio >= this.displacementThreshold && f.volumeRatio >= this.volumeThreshold) {
      if (f.close > f.open) {
        return {
          probability: this.probCall,
          direction: 'CALL',
          expirySeconds: this.expirySeconds
        };
      } else if (f.close < f.open) {
        return {
          probability: this.probPut,
          direction: 'PUT',
          expirySeconds: this.expirySeconds
        };
      }
    }

    return null;
  }
}

module.exports = DisplacementModel;
