import { sortBy } from "lodash";

import type { EnsembleSetParameterArray } from "./ensembleSetParameterArray";

export function sortParametersAlphabetically(
    parameterDataArray: EnsembleSetParameterArray[],
): EnsembleSetParameterArray[] {
    return parameterDataArray.slice().sort((a, b) => a.parameterIdent.name.localeCompare(b.parameterIdent.name));
}
export enum ParameterSortMethod {
    ALPHABETICAL = "alphabetical",
    ENTROPY = "entropy",
    KL_DIVERGENCE = "kl",
}
export function sortPriorPosteriorParameters(
    parameterDataArray: EnsembleSetParameterArray[],
    sortMethod: ParameterSortMethod,
): EnsembleSetParameterArray[] {
    if (parameterDataArray.length === 0) {
        return parameterDataArray;
    }
    if (sortMethod === ParameterSortMethod.ALPHABETICAL) {
        return sortParametersAlphabetically(parameterDataArray);
    }

    const metricFunctions = {
        [ParameterSortMethod.ENTROPY]: calculateEntropyReduction,
        [ParameterSortMethod.KL_DIVERGENCE]: calculateKLDivergence,
    };

    const metricFunction = metricFunctions[sortMethod];

    // sortBy sorts in ascending order, so we reverse to get highest scores first
    return sortBy(parameterDataArray, metricFunction).reverse();
}

function calculateEntropyReduction(parameterData: EnsembleSetParameterArray): number {
    if (parameterData.ensembleParameterRealizationAndValues.length !== 2) {
        return 0;
    }

    const [prior, posterior] = parameterData.ensembleParameterRealizationAndValues;

    //  Use combined range for both distributions
    const allValues = [...prior.values, ...posterior.values];
    const numBins = Math.min(Math.ceil(Math.sqrt(prior.values.length)), 50);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const binWidth = (max - min) / numBins;

    if (binWidth === 0) return 0;

    // Calculate entropy for each distribution using the same bins
    const priorEntropy = calculateEntropyWithBins(prior.values, min, numBins, binWidth);
    const posteriorEntropy = calculateEntropyWithBins(posterior.values, min, numBins, binWidth);

    if (priorEntropy === 0) return 0;

    return ((priorEntropy - posteriorEntropy) / priorEntropy) * 100;
}

function calculateEntropyWithBins(values: number[], min: number, numBins: number, binWidth: number): number {
    if (values.length === 0) return 0;

    const bins = new Array(numBins).fill(0);

    for (const val of values) {
        const binIndex = Math.min(Math.floor((val - min) / binWidth), numBins - 1);
        bins[binIndex]++;
    }

    const n = values.length;
    let entropy = 0;

    for (const count of bins) {
        if (count > 0) {
            const p = count / n;
            entropy -= p * Math.log2(p);
        }
    }

    return entropy;
}

function calculateKLDivergence(parameterData: EnsembleSetParameterArray): number {
    if (parameterData.ensembleParameterRealizationAndValues.length !== 2) {
        return 0;
    }

    const [prior, posterior] = parameterData.ensembleParameterRealizationAndValues;

    // Create histograms with same bins for both distributions
    const numBins = Math.min(Math.ceil(Math.sqrt(prior.values.length)), 50);
    const allValues = [...prior.values, ...posterior.values];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const binWidth = (max - min) / numBins;

    if (binWidth === 0) return 0;

    const priorBins = new Array(numBins).fill(0);
    const posteriorBins = new Array(numBins).fill(0);

    // Fill histograms
    for (const val of prior.values) {
        const idx = Math.min(Math.floor((val - min) / binWidth), numBins - 1);
        priorBins[idx]++;
    }
    for (const val of posterior.values) {
        const idx = Math.min(Math.floor((val - min) / binWidth), numBins - 1);
        posteriorBins[idx]++;
    }

    // Convert to probabilities
    const priorProbs = priorBins.map((count) => count / prior.values.length);
    const posteriorProbs = posteriorBins.map((count) => count / posterior.values.length);

    // Calculate KL divergence: sum of posterior(i) * log(posterior(i) / prior(i))
    let kl = 0;
    for (let i = 0; i < numBins; i++) {
        if (posteriorProbs[i] > 0 && priorProbs[i] > 0) {
            kl += posteriorProbs[i] * Math.log2(posteriorProbs[i] / priorProbs[i]);
        }
    }

    return kl;
}
