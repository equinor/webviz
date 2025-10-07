import type { EnsembleSetParameterArray } from "./ensembleSetParameterArray";

export function sortParametersAlphabetically(
    parameterDataArray: EnsembleSetParameterArray[],
): EnsembleSetParameterArray[] {
    return parameterDataArray.slice().sort((a, b) => a.parameterIdent.name.localeCompare(b.parameterIdent.name));
}

export function sortPriorPosteriorParametersByVariance(
    parameterDataArray: EnsembleSetParameterArray[],
): EnsembleSetParameterArray[] {
    return [...parameterDataArray].sort((a, b) => {
        const scoreA = calculateVarianceReduction(a);
        const scoreB = calculateVarianceReduction(b);
        // Sort by descending score (most change first)
        return scoreB - scoreA;
    });
}
function calculateVarianceReduction(parameterData: EnsembleSetParameterArray): number {
    if (parameterData.ensembleParameterRealizationAndValues.length !== 2) {
        return 0;
    }

    const [prior, posterior] = parameterData.ensembleParameterRealizationAndValues;

    const priorVariance = calculateVariance(prior.values);
    const posteriorVariance = calculateVariance(posterior.values);

    if (priorVariance === 0) return 0;

    // Return percentage of variance reduction
    return ((priorVariance - posteriorVariance) / priorVariance) * 100;
}
function calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    return variance;
}
