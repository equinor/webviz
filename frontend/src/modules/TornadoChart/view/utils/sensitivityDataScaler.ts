import type { SensitivityResponse } from "../../../_shared/SensitivityProcessing/types";
import { XAxisBarScaling } from "../../typesAndEnums";

export class SensitivityDataScaler {
    private _scaling: XAxisBarScaling;
    private _referenceAverage: number;

    constructor(scaling: XAxisBarScaling, referenceAverage: number) {
        this._scaling = scaling;
        this._referenceAverage = referenceAverage;
    }

    public get isAbsolute(): boolean {
        return this._scaling === XAxisBarScaling.ABSOLUTE;
    }

    public get isRelativePercentage(): boolean {
        return this._scaling === XAxisBarScaling.RELATIVE_PERCENTAGE;
    }

    public get isRelative(): boolean {
        return this._scaling === XAxisBarScaling.RELATIVE;
    }

    public calculateHighXValues(sensitivityResponses: SensitivityResponse[]): number[] {
        return sensitivityResponses.map((s) => {
            if (this.isAbsolute) {
                const lowDiff = s.lowCaseAverage - this._referenceAverage;
                const highDiff = s.highCaseAverage - this._referenceAverage;
                return this._calculateHighX(lowDiff, highDiff);
            } else if (this.isRelativePercentage) {
                const lowDiff = ((s.lowCaseAverage - this._referenceAverage) / this._referenceAverage) * 100;
                const highDiff = ((s.highCaseAverage - this._referenceAverage) / this._referenceAverage) * 100;
                return this._calculateHighX(lowDiff, highDiff);
            } else {
                return this._calculateHighX(s.lowCaseReferenceDifference, s.highCaseReferenceDifference);
            }
        });
    }

    public calculateLowXValues(sensitivityResponses: SensitivityResponse[]): number[] {
        return sensitivityResponses.map((s) => {
            if (this.isAbsolute) {
                const lowDiff = s.lowCaseAverage - this._referenceAverage;
                const highDiff = s.highCaseAverage - this._referenceAverage;
                return this._calculateLowX(lowDiff, highDiff);
            } else if (this.isRelativePercentage) {
                const lowDiff = ((s.lowCaseAverage - this._referenceAverage) / this._referenceAverage) * 100;
                const highDiff = ((s.highCaseAverage - this._referenceAverage) / this._referenceAverage) * 100;
                return this._calculateLowX(lowDiff, highDiff);
            } else {
                return this._calculateLowX(s.lowCaseReferenceDifference, s.highCaseReferenceDifference);
            }
        });
    }

    public createHighBase(sensitivityResponses: SensitivityResponse[]): number[] {
        return sensitivityResponses.map((s) => {
            if (this.isAbsolute) {
                const lowDiff = s.lowCaseAverage - this._referenceAverage;
                const highDiff = s.highCaseAverage - this._referenceAverage;
                return this._calculateHighBase(lowDiff, highDiff) + this._referenceAverage;
            } else if (this.isRelativePercentage) {
                const lowDiff = ((s.lowCaseAverage - this._referenceAverage) / this._referenceAverage) * 100;
                const highDiff = ((s.highCaseAverage - this._referenceAverage) / this._referenceAverage) * 100;
                return this._calculateHighBase(lowDiff, highDiff);
            } else {
                return this._calculateHighBase(s.lowCaseReferenceDifference, s.highCaseReferenceDifference);
            }
        });
    }

    public createLowBase(sensitivityResponses: SensitivityResponse[]): number[] {
        return sensitivityResponses.map((s) => {
            if (this.isAbsolute) {
                const lowDiff = s.lowCaseAverage - this._referenceAverage;
                const highDiff = s.highCaseAverage - this._referenceAverage;
                return this._calculateLowBase(lowDiff, highDiff) + this._referenceAverage;
            } else if (this.isRelativePercentage) {
                const lowDiff = ((s.lowCaseAverage - this._referenceAverage) / this._referenceAverage) * 100;
                const highDiff = ((s.highCaseAverage - this._referenceAverage) / this._referenceAverage) * 100;
                return this._calculateLowBase(lowDiff, highDiff);
            } else {
                return this._calculateLowBase(s.lowCaseReferenceDifference, s.highCaseReferenceDifference);
            }
        });
    }

    public scaleRealizationValues(realizationValues: number[]): number[] {
        if (this.isAbsolute) {
            return realizationValues;
        } else if (this.isRelativePercentage) {
            return realizationValues.map((val) => ((val - this._referenceAverage) / this._referenceAverage) * 100);
        } else {
            return realizationValues.map((val) => val - this._referenceAverage);
        }
    }

    public createLowRealizationsValues(sensitivityResponses: SensitivityResponse[]): number[] {
        return sensitivityResponses.flatMap((s) => this.scaleRealizationValues(s.lowCaseRealizationValues));
    }

    public createHighRealizationsValues(sensitivityResponses: SensitivityResponse[]): number[] {
        return sensitivityResponses.flatMap((s) => this.scaleRealizationValues(s.highCaseRealizationValues));
    }

    public calculateXAxisRange(sensitivityResponses: SensitivityResponse[]): [number, number] {
        let lowValues: number[];
        let highValues: number[];

        if (this.isAbsolute) {
            lowValues = sensitivityResponses.map((s) => s.lowCaseAverage);
            highValues = sensitivityResponses.map((s) => s.highCaseAverage);
        } else if (this.isRelativePercentage) {
            lowValues = sensitivityResponses.map(
                (s) => ((s.lowCaseAverage - this._referenceAverage) / this._referenceAverage) * 100,
            );
            highValues = sensitivityResponses.map(
                (s) => ((s.highCaseAverage - this._referenceAverage) / this._referenceAverage) * 100,
            );
        } else {
            lowValues = sensitivityResponses.map((s) => s.lowCaseReferenceDifference);
            highValues = sensitivityResponses.map((s) => s.highCaseReferenceDifference);
        }

        const lowRealizationValues = sensitivityResponses.map((s) =>
            this.scaleRealizationValues(s.lowCaseRealizationValues),
        );
        const highRealizationValues = sensitivityResponses.map((s) =>
            this.scaleRealizationValues(s.highCaseRealizationValues),
        );

        let minVal = this.isAbsolute ? this._referenceAverage : 0;
        let maxVal = this.isAbsolute ? this._referenceAverage : 0;

        // Calculate min/max based on bar chart values
        for (const val of [...lowValues, ...highValues]) {
            minVal = Math.min(minVal, val);
            maxVal = Math.max(maxVal, val);
        }

        // Include realization values in the min/max calculation
        for (const values of [...lowRealizationValues, ...highRealizationValues]) {
            for (const value of values) {
                minVal = Math.min(minVal, value);
                maxVal = Math.max(maxVal, value);
            }
        }

        // Add some space for better visualization
        const buffer = (maxVal - minVal) * 0.1;
        return [minVal - buffer, maxVal + buffer];
    }

    public getXAxisReferencePosition(): number {
        return this.isAbsolute ? this._referenceAverage : 0;
    }

    public calculateLowLabelValue(sensitivity: SensitivityResponse): number {
        if (this.isAbsolute) {
            return sensitivity.lowCaseAverage;
        } else if (this.isRelativePercentage) {
            return ((sensitivity.lowCaseAverage - this._referenceAverage) / this._referenceAverage) * 100;
        } else {
            return sensitivity.lowCaseReferenceDifference;
        }
    }

    public calculateHighLabelValue(sensitivity: SensitivityResponse): number {
        if (this.isAbsolute) {
            return sensitivity.highCaseAverage;
        } else if (this.isRelativePercentage) {
            return ((sensitivity.highCaseAverage - this._referenceAverage) / this._referenceAverage) * 100;
        } else {
            return sensitivity.highCaseReferenceDifference;
        }
    }

    // Private calculation utility methods
    private _calculateLowBase(low: number, high: number): number {
        if (low < 0) {
            return Math.min(0, high);
        }
        return low;
    }

    private _calculateHighBase(low: number, high: number): number {
        if (high > 0) {
            return Math.max(0, low);
        }
        return high;
    }

    private _calculateHighX(low: number, high: number): number {
        if (high > 0) {
            return high - Math.max(0, low);
        }
        return 0.0;
    }

    private _calculateLowX(low: number, high: number): number {
        if (low < 0) {
            return low - Math.min(0, high);
        }
        return 0.0;
    }
}
