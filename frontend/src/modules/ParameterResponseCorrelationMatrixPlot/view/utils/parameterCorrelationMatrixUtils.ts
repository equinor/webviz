import {
    alignCorrelationItemsValuesByRealizations,
    type CorrelationDataItem,
    type CorrelationMatrix,
} from "@modules/_shared/utils/math/correlationMatrix";
import { pearsonCorrelation } from "@modules/_shared/utils/math/pearsonCorrelation";

/**
 * Creates a correlation matrix for the given response and parameter data items.
 * The correlation is calculated using Pearson's method.
 * The resulting matrix is represented as an object with xLabels and yLabels for the axes,
 * and a 2D array for the correlation values.
 * If a correlation is below the specified cutoff, it is set to null.
 */
export function createResponseParameterCorrelationMatrix(
    responses: CorrelationDataItem[],
    parameters: CorrelationDataItem[],
    correlationCutoff: number | null = null,
): CorrelationMatrix {
    const xLabels = parameters.map((item) => item.name);
    const yLabels = responses.map((item) => item.name);

    const matrix: (number | null)[][] = Array(responses.length)
        .fill(null)
        .map(() => Array(parameters.length).fill(null));

    for (let i = 0; i < responses.length; i++) {
        for (let j = 0; j < parameters.length; j++) {
            const responseItem = responses[i];
            const parameterItem = parameters[j];
            let correlation: number | null;
            const [alignedValues1, alignedValues2] = alignCorrelationItemsValuesByRealizations(
                responseItem,
                parameterItem,
            );
            if (alignedValues1.length >= 2 && alignedValues2.length >= 2) {
                correlation = pearsonCorrelation(alignedValues1, alignedValues2);
            } else {
                correlation = null;
            }
            if (correlationCutoff !== null && correlation !== null && Math.abs(correlation) < correlationCutoff) {
                matrix[i][j] = null;
            } else {
                matrix[i][j] = correlation;
            }
        }
    }

    return { xLabels: xLabels, yLabels: yLabels, matrix };
}
