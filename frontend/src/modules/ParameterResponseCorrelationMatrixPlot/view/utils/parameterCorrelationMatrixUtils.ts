import type { CorrelationDataItem, CorrelationMatrix } from "@modules/_shared/utils/math/correlationMatrix";
import { pearsonCorrelation } from "@modules/_shared/utils/math/pearsonCorrelation";

/**
 * Creates a correlation matrix for parameters along x-axis and responses along y-axis.
 */
export function createParameterResponseCorrelationMatrix(
    parameters: CorrelationDataItem[],
    responses: CorrelationDataItem[],
): CorrelationMatrix {
    const xLabels = responses.map((item) => item.name);
    const yLabels = parameters.map((item) => item.name);

    const matrix: (number | null)[][] = Array(parameters.length)
        .fill(null)
        .map(() => Array(responses.length).fill(null));

    for (let i = 0; i < parameters.length; i++) {
        for (let j = 0; j < responses.length; j++) {
            const parameterItem = parameters[i];
            const responseItem = responses[j];

            const correlation = pearsonCorrelation(parameterItem.values, responseItem.values);
            matrix[i][j] = correlation;
        }
    }

    return { xLabels: xLabels, yLabels: yLabels, matrix };
}
