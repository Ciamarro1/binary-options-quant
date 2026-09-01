class QuantileStateEngine {
    constructor(lookback = 240, lowerExtreme = 0.025, upperExtreme = 0.975) {
        this.L = lookback;
        this.lowerExtreme = lowerExtreme;
        this.upperExtreme = upperExtreme;
        
        this.history = []; // Array to store up to L historical returns
        this.lastClose = null;
    }

    /**
     * Evaluates the current candle and returns the relative state / signal.
     * Crucially, this DOES NOT mutate the historical distribution.
     * $r_t$ does not enter the reference array.
     */
    predict(candle) {
        // QS-002: Require exactly L historical returns (meaning L+1 prices observed)
        if (this.lastClose === null || this.history.length < this.L) {
            return null;
        }

        const rt = (candle.close / this.lastClose) - 1;

        // Strict Percentile Rank: Q_t = count(r_i < r_t) / L
        let count = 0;
        for (let i = 0; i < this.L; i++) {
            // QS-009: Strict inequality ensures ties don't artificially inflate the rank
            if (this.history[i] < rt) {
                count++;
            }
        }

        const Q = count / this.L;

        let direction = null;
        if (Q <= this.lowerExtreme) {
            direction = 'CALL';
        } else if (Q >= this.upperExtreme) {
            direction = 'PUT';
        }

        return direction ? { direction, Q, rt } : { direction: 'NO_SIGNAL', Q, rt };
    }

    /**
     * Updates the internal historical distribution with the evaluated candle.
     * Must be called AFTER predict(candle) for the same timestep.
     */
    update(candle) {
        if (this.lastClose !== null) {
            const rt = (candle.close / this.lastClose) - 1;
            this.history.push(rt);
            if (this.history.length > this.L) {
                this.history.shift();
            }
        }
        this.lastClose = candle.close;
    }
}

module.exports = QuantileStateEngine;
