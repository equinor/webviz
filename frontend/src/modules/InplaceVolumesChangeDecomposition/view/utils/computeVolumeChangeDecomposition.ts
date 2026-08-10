/**
 * Volume change decomposition ("waterfall") for delta ensembles.
 *
 * Decomposes the change in a calculated hydrocarbon volume (STOIIP / GIIP) between two ensembles
 * (reference → comparison) into additive contributions from its multiplicative factors.
 *
 * The volumetric relation is:
 *   HCIIP = BULK · NTG · PORO_NET · (1 − SW) / FVF        (expanded form)
 *   STOIIP = BULK · PORO · SO / BO      (collapsed form, SO = 1 − SW)
 *   GIIP   = BULK · PORO · SG / BG      (SG = 1 − SW)
 *
 * Contributions are computed with a sequential cumulative-multiplier method operating on the
 * per-ensemble MEAN of each factor (ported from the legacy webviz-subsurface waterfall):
 *
 *   running = mean(target)_reference
 *   for each factor:
 *       multiplier = numerator: mean(f)_comp / mean(f)_ref − 1
 *                    saturation: (1 − mean(SW)_comp) / (1 − mean(SW)_ref) − 1
 *                    fvf:        mean(FVF)_ref / mean(FVF)_comp − 1
 *       impact  = running · multiplier
 *       running = running + impact
 *
 * The first and last bars are absolute (mean(target) of reference and comparison). Because the
 * factors telescope over ratios of means while the endpoints are means of a product
 * (E[XY] != E[X]E[Y]), the factor bars generally do not sum to the total change. The remainder is
 * emitted as an explicit "Interaction" bar so the waterfall always reconciles to the comparison mean
 * rather than hiding the gap in the final connector.
 */

export const WATERFALL_TARGET_RESULT_NAMES = ["STOIIP", "GIIP"] as const;
export type WaterfallTargetResultName = (typeof WATERFALL_TARGET_RESULT_NAMES)[number];

export const INTERACTION_LABEL = "Interaction";

type FactorKind = "numerator" | "saturation" | "fvf";

export interface WaterfallFactor {
    /** Result name whose per-ensemble means drive this factor's multiplier. */
    resultName: string;
    /** Bar label (e.g. "BULK", "PORO", "SO", "BO"). */
    label: string;
    kind: FactorKind;
}

export interface WaterfallFactorSpec {
    target: WaterfallTargetResultName;
    factors: WaterfallFactor[];
    /** All result names that must be fetched (target + factor result names). */
    requiredResultNames: string[];
}

export type WaterfallMeasure = "absolute" | "relative";

export interface WaterfallBar {
    label: string;
    measure: WaterfallMeasure;
    /** Absolute value for endpoints, relative impact for factor bars. */
    value: number;
    /** Running cumulative top of this bar. */
    cumulative: number;
}

export interface VolumeChangeDecomposition {
    target: WaterfallTargetResultName;
    bars: WaterfallBar[];
    referenceVolume: number;
    comparisonVolume: number;
    /** Change not attributable to the individual factors (covariance between them). */
    interaction: number;
}

const SATURATION_LABEL_BY_TARGET: Record<WaterfallTargetResultName, string> = {
    STOIIP: "SO",
    GIIP: "SG",
};

const FVF_RESULT_NAME_BY_TARGET: Record<WaterfallTargetResultName, string> = {
    STOIIP: "BO",
    GIIP: "BG",
};

/**
 * The FLUID value (as used in the FLUID index column) whose zone the decomposition applies to.
 * STOIIP decomposes the oil zone (BO), GIIP the gas zone (BG).
 */
const REQUIRED_FLUID_BY_TARGET: Record<WaterfallTargetResultName, string> = {
    STOIIP: "oil",
    GIIP: "gas",
};

export function isWaterfallTargetResultName(resultName: string | null): resultName is WaterfallTargetResultName {
    return resultName !== null && (WATERFALL_TARGET_RESULT_NAMES as readonly string[]).includes(resultName);
}

/**
 * The FLUID value that must be present (selected in the filters) for the given waterfall target.
 */
export function getRequiredFluidForWaterfallTarget(target: WaterfallTargetResultName): string {
    return REQUIRED_FLUID_BY_TARGET[target];
}

/**
 * Determine the factor decomposition for a target result, given the available result names.
 *
 * When both NTG and PORO_NET are available the porosity term is split into NTG · PORO_NET,
 * otherwise the combined PORO term is used. Returns null when the target is not decomposable or a
 * required factor result name is not available.
 */
export function getWaterfallFactorSpec(
    targetResultName: string | null,
    availableResultNames: string[],
): WaterfallFactorSpec | null {
    if (!isWaterfallTargetResultName(targetResultName)) {
        return null;
    }

    const available = new Set(availableResultNames);
    const fvfResultName = FVF_RESULT_NAME_BY_TARGET[targetResultName];
    const saturationLabel = SATURATION_LABEL_BY_TARGET[targetResultName];

    const useNtgSplit = available.has("NTG") && available.has("PORO_NET");
    const numeratorFactors: WaterfallFactor[] = useNtgSplit
        ? [
              { resultName: "BULK", label: "BULK", kind: "numerator" },
              { resultName: "NTG", label: "NTG", kind: "numerator" },
              { resultName: "PORO_NET", label: "PORO_NET", kind: "numerator" },
          ]
        : [
              { resultName: "BULK", label: "BULK", kind: "numerator" },
              { resultName: "PORO", label: "PORO", kind: "numerator" },
          ];

    const factors: WaterfallFactor[] = [
        ...numeratorFactors,
        { resultName: "SW", label: saturationLabel, kind: "saturation" },
        { resultName: fvfResultName, label: fvfResultName, kind: "fvf" },
    ];

    const requiredResultNames = Array.from(new Set([targetResultName, ...factors.map((factor) => factor.resultName)]));

    // All required results must be available.
    if (!requiredResultNames.every((resultName) => available.has(resultName))) {
        return null;
    }

    return { target: targetResultName, factors, requiredResultNames };
}

function computeFactorMultiplier(
    factor: WaterfallFactor,
    referenceMeans: Map<string, number>,
    comparisonMeans: Map<string, number>,
): number | null {
    const referenceValue = referenceMeans.get(factor.resultName);
    const comparisonValue = comparisonMeans.get(factor.resultName);
    if (referenceValue === undefined || comparisonValue === undefined) {
        return null;
    }

    if (factor.kind === "saturation") {
        // Saturation term: SO = 1 − SW. Multiplier = SO_comp / SO_ref − 1.
        const referenceSaturation = 1 - referenceValue;
        if (referenceSaturation === 0) {
            return null;
        }
        return (1 - comparisonValue) / referenceSaturation - 1;
    }

    if (factor.kind === "fvf") {
        // Formation volume factor is a denominator. Multiplier = FVF_ref / FVF_comp − 1.
        if (comparisonValue === 0) {
            return null;
        }
        return referenceValue / comparisonValue - 1;
    }

    // Numerator factor. Multiplier = f_comp / f_ref − 1.
    if (referenceValue === 0) {
        return null;
    }
    return comparisonValue / referenceValue - 1;
}

/**
 * Compute the volume change decomposition from per-ensemble factor means.
 *
 * Returns null when the target means are missing/invalid or any factor multiplier cannot be
 * computed (e.g. a zero reference value).
 */
export function computeVolumeChangeDecomposition(
    spec: WaterfallFactorSpec,
    referenceMeans: Map<string, number>,
    comparisonMeans: Map<string, number>,
): VolumeChangeDecomposition | null {
    const referenceVolume = referenceMeans.get(spec.target);
    const comparisonVolume = comparisonMeans.get(spec.target);
    if (
        referenceVolume === undefined ||
        comparisonVolume === undefined ||
        !Number.isFinite(referenceVolume) ||
        !Number.isFinite(comparisonVolume)
    ) {
        return null;
    }

    let running = referenceVolume;
    const bars: WaterfallBar[] = [
        { label: "Reference", measure: "absolute", value: referenceVolume, cumulative: referenceVolume },
    ];

    for (const factor of spec.factors) {
        const multiplier = computeFactorMultiplier(factor, referenceMeans, comparisonMeans);
        if (multiplier === null || !Number.isFinite(multiplier)) {
            return null;
        }
        const impact = running * multiplier;
        running += impact;
        bars.push({ label: factor.label, measure: "relative", value: impact, cumulative: running });
    }

    const interaction = comparisonVolume - running;
    bars.push({
        label: INTERACTION_LABEL,
        measure: "relative",
        value: interaction,
        cumulative: comparisonVolume,
    });

    bars.push({ label: "Comparison", measure: "absolute", value: comparisonVolume, cumulative: comparisonVolume });

    return { target: spec.target, bars, referenceVolume, comparisonVolume, interaction };
}
