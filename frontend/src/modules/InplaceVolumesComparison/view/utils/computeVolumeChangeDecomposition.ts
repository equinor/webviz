/**
 * Volume change decomposition ("waterfall") between two inplace volumes sources.
 *
 * Decomposes the change in a calculated hydrocarbon volume (STOIIP / GIIP) between two ensembles
 * (reference → comparison) into additive contributions from its multiplicative factors.
 *
 * The volumetric relation is:
 *   HCIIP = BULK · NTG · PORO_NET · (1 − SW) / FVF        (expanded form)
 *   STOIIP = BULK · PORO · SO / BO      (collapsed form, SO = 1 − SW)
 *   GIIP   = BULK · PORO · SG / BG      (SG = 1 − SW)
 *
 * Every factor is built from MEAN VOLUMES, e.g. PORO = mean(PORV)/mean(BULK) and SO = mean(HCPV)/
 * mean(PORV). The API also serves mean PORO/SW/BO directly, but those are means of per-realization
 * ratios, and the mean of a ratio is not the ratio of the means. Only the latter telescopes
 *
 *   BULK · PORV/BULK · HCPV/PORV · STOIIP/HCPV = STOIIP
 *
 * so the waterfall lands exactly on the comparison mean. Substituting the mean properties leaves a
 * residual equal to the change in how the factors co-vary across realizations.
 *
 * Contributions are computed with a sequential cumulative-multiplier method:
 *
 *   running = mean(target)_reference
 *   for each factor:
 *       multiplier = f_comp / f_ref − 1        (f_ref / f_comp − 1 for the FVF denominator)
 *       impact  = running · multiplier
 *       running = running + impact
 *
 * The first and last bars are absolute (mean(target) of reference and comparison). The total is
 * order-independent, but the split between factors is not: cross-terms accumulate into whichever
 * factors come later in the list.
 */

export const WATERFALL_TARGET_RESULT_NAMES = ["STOIIP", "GIIP"] as const;
export type WaterfallTargetResultName = (typeof WATERFALL_TARGET_RESULT_NAMES)[number];

export const FLUID_INDEX_COLUMN = "FLUID";

export interface WaterfallFactor {
    /** Bar label (e.g. "BULK", "PORO", "SO", "BO"). */
    label: string;
    /** Factor value = mean(numerator) / mean(denominator), or mean(numerator) when no denominator. */
    numeratorResultName: string;
    denominatorResultName: string | null;
    /** The FVF divides the volume, so its multiplier is inverted. */
    dividesVolume: boolean;
}

export interface WaterfallFactorSpec {
    target: WaterfallTargetResultName;
    factors: WaterfallFactor[];
    /** All result names that must be fetched (target + the volumes the factors are built from). */
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
}

const SATURATION_LABEL_BY_TARGET: Record<WaterfallTargetResultName, string> = {
    STOIIP: "SO",
    GIIP: "SG",
};

const FVF_LABEL_BY_TARGET: Record<WaterfallTargetResultName, string> = {
    STOIIP: "BO",
    GIIP: "BG",
};

/**
 * The FLUID value (as used in the FLUID index column) whose zone the decomposition applies to.
 * STOIIP decomposes the oil zone, GIIP the gas zone.
 */
const REQUIRED_FLUID_BY_TARGET: Record<WaterfallTargetResultName, string> = {
    STOIIP: "oil",
    GIIP: "gas",
};

export function isWaterfallTargetResultName(resultName: string | null): resultName is WaterfallTargetResultName {
    return resultName !== null && (WATERFALL_TARGET_RESULT_NAMES as readonly string[]).includes(resultName);
}

/** The FLUID value the volumes must be restricted to for the given waterfall target. */
export function getRequiredFluidForWaterfallTarget(target: WaterfallTargetResultName): string {
    return REQUIRED_FLUID_BY_TARGET[target];
}

/**
 * Determine the factor decomposition for a target result, given the available result names.
 *
 * When NTG/PORO_NET are available the porosity term is split into NTG · PORO_NET, otherwise the
 * combined PORO term is used. Returns null when the target is not decomposable or a required volume
 * column is not available.
 */
export function getWaterfallFactorSpec(
    targetResultName: string | null,
    availableResultNames: string[],
): WaterfallFactorSpec | null {
    if (!isWaterfallTargetResultName(targetResultName)) {
        return null;
    }

    const available = new Set(availableResultNames);
    const saturationLabel = SATURATION_LABEL_BY_TARGET[targetResultName];
    const fvfLabel = FVF_LABEL_BY_TARGET[targetResultName];

    // NTG and PORO_NET are advertised exactly when NET is present, and NET is what the split needs.
    const useNtgSplit = available.has("NTG") && available.has("PORO_NET") && available.has("NET");
    const porosityFactors: WaterfallFactor[] = useNtgSplit
        ? [
              { label: "NTG", numeratorResultName: "NET", denominatorResultName: "BULK", dividesVolume: false },
              { label: "PORO_NET", numeratorResultName: "PORV", denominatorResultName: "NET", dividesVolume: false },
          ]
        : [{ label: "PORO", numeratorResultName: "PORV", denominatorResultName: "BULK", dividesVolume: false }];

    const factors: WaterfallFactor[] = [
        { label: "BULK", numeratorResultName: "BULK", denominatorResultName: null, dividesVolume: false },
        ...porosityFactors,
        { label: saturationLabel, numeratorResultName: "HCPV", denominatorResultName: "PORV", dividesVolume: false },
        {
            label: fvfLabel,
            numeratorResultName: "HCPV",
            denominatorResultName: targetResultName,
            dividesVolume: true,
        },
    ];

    const requiredResultNames = Array.from(
        new Set([
            targetResultName,
            ...factors.flatMap((factor) =>
                factor.denominatorResultName
                    ? [factor.numeratorResultName, factor.denominatorResultName]
                    : [factor.numeratorResultName],
            ),
        ]),
    );

    if (!requiredResultNames.every((resultName) => available.has(resultName))) {
        return null;
    }

    return { target: targetResultName, factors, requiredResultNames };
}

/** Factor value from mean volumes, e.g. PORO = mean(PORV) / mean(BULK). */
function computeFactorValue(factor: WaterfallFactor, means: Map<string, number>): number | null {
    const numerator = means.get(factor.numeratorResultName);
    if (numerator === undefined) {
        return null;
    }
    if (factor.denominatorResultName === null) {
        return numerator;
    }
    const denominator = means.get(factor.denominatorResultName);
    if (denominator === undefined || denominator === 0) {
        return null;
    }
    return numerator / denominator;
}

function computeFactorMultiplier(
    factor: WaterfallFactor,
    referenceMeans: Map<string, number>,
    comparisonMeans: Map<string, number>,
): number | null {
    const referenceValue = computeFactorValue(factor, referenceMeans);
    const comparisonValue = computeFactorValue(factor, comparisonMeans);
    if (referenceValue === null || comparisonValue === null) {
        return null;
    }

    if (factor.dividesVolume) {
        if (comparisonValue === 0) {
            return null;
        }
        return referenceValue / comparisonValue - 1;
    }

    if (referenceValue === 0) {
        return null;
    }
    return comparisonValue / referenceValue - 1;
}

/**
 * Compute the volume change decomposition from per-ensemble mean volumes.
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

    bars.push({ label: "Comparison", measure: "absolute", value: comparisonVolume, cumulative: comparisonVolume });

    return { target: spec.target, bars, referenceVolume, comparisonVolume };
}
