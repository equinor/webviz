/**
 * Immutable class for storing a min/max scalar range
 */

export class MinMax {
    readonly min: number;
    readonly max: number;

    constructor(min: number, max: number) {
        this.min = min;
        this.max = max;
    }

    static createInvalid(): MinMax {
        return new MinMax(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY);
    }

    static fromNumericValues(values: Iterable<number>): MinMax {
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;
        for (const v of values) {
            if (v < min) {
                min = v;
            }
            if (v > max) {
                max = v;
            }
        }

        if (min <= max) {
            return new MinMax(min, max);
        } else {
            return MinMax.createInvalid();
        }
    }

    /**
     * Returns a new MinMax object that is extend to include values from other min/max range
     * Will handle invalid ranges (min > max) in both this and the other object.
     */
    extendedBy(otherMinMax: MinMax): MinMax {
        if (!otherMinMax.isValid()) {
            return new MinMax(this.min, this.max);
        }
        if (!this.isValid()) {
            return new MinMax(otherMinMax.min, otherMinMax.max);
        }

        const newMin = Math.min(this.min, otherMinMax.min);
        const newMax = Math.max(this.max, otherMinMax.max);
        return new MinMax(newMin, newMax);
    }

    /**
     * Returns true if the range is valid, i.e. if minimum <= maximum
     */
    isValid(): boolean {
        if (this.min <= this.max) {
            return true;
        } else {
            return false;
        }
    }
}
