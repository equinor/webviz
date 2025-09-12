import type { EnsembleScalarResponse_api } from "@api";
import { SensitivityType, type Sensitivity } from "@framework/EnsembleSensitivities";
import { computeQuantile } from "@modules/_shared/utils/math/statistics";

import { extractResponseValues, extractSensitivityRealizations } from "./helpers";
import type { SensitivityResponse } from "./types";

// Monte Carlo sensitivity processor
export const processMonteCarloSensitivity = (
    sensitivity: Sensitivity,
    ensembleResponse: EnsembleScalarResponse_api,
    referenceAverage: number,
): SensitivityResponse => {
    if (sensitivity.cases.length !== 1) {
        throw new Error(`Monte Carlo sensitivity ${sensitivity.name} must have exactly 1 case`);
    }

    const sensitivityCase = sensitivity.cases[0];
    const responseValues = extractResponseValues(ensembleResponse, sensitivityCase.realizations);
    const p90 = computeP90(responseValues);
    const p10 = computeP10(responseValues);

    const allRealizations = extractSensitivityRealizations(sensitivity);
    const partitioned = partitionRealizationsByThreshold(ensembleResponse, allRealizations, referenceAverage);

    return {
        sensitivityName: sensitivity.name,
        sensitivityType: SensitivityType.MONTECARLO,
        lowCaseName: "P90",
        lowCaseAverage: p90,
        lowCaseReferenceDifference: p90 - referenceAverage,
        lowCaseRealizations: partitioned.below,
        lowCaseRealizationValues: partitioned.belowValues,
        highCaseName: "P10",
        highCaseAverage: p10,
        highCaseReferenceDifference: p10 - referenceAverage,
        highCaseRealizations: partitioned.above,
        highCaseRealizationValues: partitioned.aboveValues,
    };
};

export function computeP10(values: number[]): number {
    return computeQuantile(values, 0.9);
}

export function computeP90(values: number[]): number {
    return computeQuantile(values, 0.1);
}
// Partitioning functions
function partitionRealizationsByThreshold(
    ensembleResponse: EnsembleScalarResponse_api,
    realizations: number[],
    threshold: number,
): { below: number[]; above: number[]; belowValues: number[]; aboveValues: number[] } {
    const below: number[] = [];
    const above: number[] = [];
    const belowValues: number[] = [];
    const aboveValues: number[] = [];

    realizations.forEach((real) => {
        const idx = ensembleResponse.realizations.indexOf(real);
        if (idx !== -1) {
            const value = ensembleResponse.values[idx];
            if (value <= threshold) {
                below.push(real);
                belowValues.push(value);
            } else {
                above.push(real);
                aboveValues.push(value);
            }
        }
    });

    return { below, above, belowValues, aboveValues };
}
