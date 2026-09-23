import { atom } from "jotai";

import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { DEFAULT_GAS_TO_OIL_EQUIVALENT_FACTOR, type SourceHorizon } from "@modules/EconomicScreening/typesAndEnums";
import {
    computeMonthlyRealizationEconomics,
    type MonthlyRealizationEconomicResult,
    type ResolvedMonthlyAssumptions,
} from "@modules/EconomicScreening/utils/monthlyEconomics";
import {
    computeMonthlyVolumesFromCumulative,
    lastSupportedMonthIndex,
    monthIndexOf,
    SourceKind,
    type MonthlyProductionProfile,
} from "@modules/EconomicScreening/utils/monthlyProduction";
import {
    convertGasPriceToSimulatorUnit,
    convertOilPriceToSimulatorUnit,
    makeFixedOilEquivalentDivisor,
} from "@modules/EconomicScreening/utils/unitConversion";
import type { RealizationCumulativeSeries } from "@modules/EconomicScreening/utils/vectorResolution";
import {
    deriveSalesGasCumulative,
    isCumulativeVectorAllZero,
    summarizeCumulativeVectorTerminals,
    toRealizationCumulativeSeries,
} from "@modules/EconomicScreening/utils/vectorResolution";

import { missingComponentAssumptionsAtom } from "../../settings/atoms/baseAtoms";
import { selectedEnsembleIdentAtom } from "../../settings/atoms/persistableFixableAtoms";

import {
    costProfileAtom,
    earlyValueConfigurationAtom,
    economicAssumptionsAtom,
    ensembleIdentAtom,
    isCostProfileDraftValidAtom,
    priceAssumptionsAtom,
    salesGasStrategyAtom,
} from "./baseAtoms";
import {
    deltaConstituentGasConsumptionQueriesAtom,
    isVectorNeededAtom,
    validRealizationNumbersAtom,
    vectorDataQueriesAtom,
    VectorQueryIndex,
} from "./queryAtoms";

export type SalesGasData = {
    series: RealizationCumulativeSeries[];
    unit: string;
    /** True when gas consumption is available but zero in every realization. */
    hasZeroGasConsumption: boolean;
    isGasConsumptionMissing: boolean;
    isGasInjectionMissing: boolean;
    isGasConsumptionAssumedZero: boolean;
    isGasInjectionAssumedZero: boolean;
    incompleteInjectionRealizations: number[];
    incompleteConsumptionRealizations: number[];
};

export type EvaluationHorizon = {
    startYear: number;
    endYear: number;
    endMonthIndex: number;
};

export type EconomicScreeningResults = {
    results: MonthlyRealizationEconomicResult[];
    oilUnit: string;
    gasUnit: string;
    warnings: string[];
    errors: string[];
    isEarlyValueConfigurationValid: boolean;
    horizon: EvaluationHorizon | null;
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatMonthIndex(monthIndex: number): string {
    return `${MONTH_NAMES[monthIndex % 12]} ${Math.floor(monthIndex / 12)}`;
}

/** The prediction start must fall inside the source envelope; there is no evaluation otherwise. */
export function getPredictionHorizonError(
    predictionStartYear: number | null,
    envelopeEndMonthIndex: number | null,
): string | null {
    if (predictionStartYear === null) {
        return "Enter a prediction start year to calculate results.";
    }
    if (envelopeEndMonthIndex === null) {
        return "Source coverage is unavailable, so the simulation end cannot be established.";
    }
    if (monthIndexOf(predictionStartYear, 1) > envelopeEndMonthIndex) {
        return `The prediction start year ${predictionStartYear} is after the supported simulation end (${formatMonthIndex(envelopeEndMonthIndex)}).`;
    }
    return null;
}

export const isFetchingAtom = atom<boolean>((get) => {
    return get(vectorDataQueriesAtom).some((query) => query.isFetching);
});

export const queryErrorAtom = atom<string | null>((get) => {
    const queries = get(vectorDataQueriesAtom);
    const failedVectorNames: string[] = [];
    if (queries[VectorQueryIndex.OIL_PRODUCTION].isError) failedVectorNames.push("FOPT");
    if (queries[VectorQueryIndex.SALES_GAS].isError) failedVectorNames.push("FGST");
    if (queries[VectorQueryIndex.GAS_PRODUCTION].isError) failedVectorNames.push("FGPT");
    if (queries[VectorQueryIndex.GAS_INJECTION].isError) failedVectorNames.push("FGIT");
    if (queries[VectorQueryIndex.GAS_CONSUMPTION].isError) failedVectorNames.push("FGCT");

    if (failedVectorNames.length === 0) {
        return null;
    }
    return `Could not load vector data for ${failedVectorNames.join(", ")}.`;
});

const sourceKindAtom = atom<SourceKind>((get) => {
    const ensembleIdent = get(ensembleIdentAtom);
    return ensembleIdent && isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent)
        ? SourceKind.DELTA
        : SourceKind.REGULAR;
});

/** True only when every needed source request has succeeded; pending or failed requests never count. */
const areRequiredSourcesLoadedAtom = atom<boolean>((get) => {
    const queries = get(vectorDataQueriesAtom);
    const isVectorNeeded = get(isVectorNeededAtom);
    return isVectorNeeded.some(Boolean) && queries.every((query, index) => !isVectorNeeded[index] || query.isSuccess);
});

const oilProductionUnitAtom = atom<string>((get) => {
    return get(vectorDataQueriesAtom)[VectorQueryIndex.OIL_PRODUCTION].data?.[0]?.unit ?? "";
});

const oilProductionSeriesAtom = atom<RealizationCumulativeSeries[]>((get) => {
    const data = get(vectorDataQueriesAtom)[VectorQueryIndex.OIL_PRODUCTION].data ?? [];
    return toRealizationCumulativeSeries(data, get(sourceKindAtom));
});

const salesGasDataAtom = atom<SalesGasData>((get) => {
    const salesGasStrategy = get(salesGasStrategyAtom);
    const queries = get(vectorDataQueriesAtom);
    const sourceKind = get(sourceKindAtom);
    const ensembleKey = get(selectedEnsembleIdentAtom).value?.toString();
    const missingComponentAssumptions = ensembleKey ? get(missingComponentAssumptionsAtom)[ensembleKey] : undefined;

    if (salesGasStrategy.kind === "DIRECT") {
        const data = queries[VectorQueryIndex.SALES_GAS].data ?? [];
        const gasConsumptionData = salesGasStrategy.hasGasConsumption
            ? (queries[VectorQueryIndex.GAS_CONSUMPTION].data ?? [])
            : [];
        return {
            series: toRealizationCumulativeSeries(data, sourceKind),
            unit: data[0]?.unit ?? "",
            hasZeroGasConsumption: salesGasStrategy.hasGasConsumption && isCumulativeVectorAllZero(gasConsumptionData),
            isGasConsumptionMissing: !salesGasStrategy.hasGasConsumption,
            isGasInjectionMissing: false,
            isGasConsumptionAssumedZero: false,
            isGasInjectionAssumedZero: false,
            incompleteInjectionRealizations: [],
            incompleteConsumptionRealizations: [],
        };
    }

    if (salesGasStrategy.kind === "DERIVED") {
        const gasProductionData = queries[VectorQueryIndex.GAS_PRODUCTION].data ?? [];
        const gasInjectionData = salesGasStrategy.hasGasInjection
            ? (queries[VectorQueryIndex.GAS_INJECTION].data ?? [])
            : [];
        const gasConsumptionData = salesGasStrategy.hasGasConsumption
            ? (queries[VectorQueryIndex.GAS_CONSUMPTION].data ?? [])
            : [];

        const derivedSalesGas = deriveSalesGasCumulative(
            gasProductionData,
            gasInjectionData,
            gasConsumptionData,
            missingComponentAssumptions,
            sourceKind,
        );
        return {
            series: derivedSalesGas.series,
            unit: gasProductionData[0]?.unit ?? "",
            hasZeroGasConsumption: salesGasStrategy.hasGasConsumption && isCumulativeVectorAllZero(gasConsumptionData),
            isGasConsumptionMissing: !salesGasStrategy.hasGasConsumption,
            isGasInjectionMissing: !salesGasStrategy.hasGasInjection,
            isGasConsumptionAssumedZero:
                !salesGasStrategy.hasGasConsumption &&
                (missingComponentAssumptions?.assumeMissingConsumptionAsZero ?? false),
            isGasInjectionAssumedZero:
                !salesGasStrategy.hasGasInjection &&
                (missingComponentAssumptions?.assumeMissingInjectionAsZero ?? false),
            incompleteInjectionRealizations: derivedSalesGas.incompleteInjectionRealizations,
            incompleteConsumptionRealizations: derivedSalesGas.incompleteConsumptionRealizations,
        };
    }

    return {
        series: [],
        unit: "",
        hasZeroGasConsumption: false,
        isGasConsumptionMissing: true,
        isGasInjectionMissing: true,
        isGasConsumptionAssumedZero: false,
        isGasInjectionAssumedZero: false,
        incompleteInjectionRealizations: [],
        incompleteConsumptionRealizations: [],
    };
});

type RealizationProfiles = {
    realization: number;
    oilProfile: MonthlyProductionProfile | null;
    salesGasProfile: MonthlyProductionProfile | null;
};

function toProfile(series: RealizationCumulativeSeries | undefined): MonthlyProductionProfile | null {
    return series
        ? computeMonthlyVolumesFromCumulative(series.timestampsUtcMs, series.values, series.intervalCoverage)
        : null;
}

/** Assumption-independent monthly profiles for every fetched realization. */
const realizationProfilesAtom = atom<RealizationProfiles[]>((get) => {
    const oilSeriesByRealization = new Map(get(oilProductionSeriesAtom).map((series) => [series.realization, series]));
    const gasSeriesByRealization = new Map(get(salesGasDataAtom).series.map((series) => [series.realization, series]));
    const realizations = [...new Set([...oilSeriesByRealization.keys(), ...gasSeriesByRealization.keys()])].sort(
        (first, second) => first - second,
    );
    return realizations.map((realization) => ({
        realization,
        oilProfile: toProfile(oilSeriesByRealization.get(realization)),
        salesGasProfile: toProfile(gasSeriesByRealization.get(realization)),
    }));
});

/**
 * Last supported month over the full fetched ensemble and every required product. Individual
 * realizations and products are validated against this common horizon; it is not proof of their support.
 */
const sourceEnvelopeEndMonthIndexAtom = atom<number | null>((get) => {
    if (!get(areRequiredSourcesLoadedAtom)) {
        return null;
    }
    const supportEnds = [...get(oilProductionSeriesAtom), ...get(salesGasDataAtom).series]
        .map((series) => series.supportEndUtcMs)
        .filter((supportEnd): supportEnd is number => supportEnd !== null);
    return supportEnds.length > 0 ? lastSupportedMonthIndex(Math.max(...supportEnds)) : null;
});

export const sourceHorizonAtom = atom<SourceHorizon>((get) => {
    const envelopeEndMonthIndex = get(sourceEnvelopeEndMonthIndexAtom);
    return {
        endYear: envelopeEndMonthIndex === null ? null : Math.floor(envelopeEndMonthIndex / 12),
        isLoading: get(isFetchingAtom),
    };
});

export const economicScreeningResultsAtom = atom<EconomicScreeningResults>((get) => {
    const salesGasData = get(salesGasDataAtom);
    const ensembleIdent = get(ensembleIdentAtom);
    const isDeltaEnsemble = ensembleIdent ? isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent) : false;
    const deltaConstituentConsumptionQueries = get(deltaConstituentGasConsumptionQueriesAtom);
    const economicAssumptions = get(economicAssumptionsAtom);
    const priceAssumptions = get(priceAssumptionsAtom);
    const costProfile = get(costProfileAtom);
    const earlyValueConfiguration = get(earlyValueConfigurationAtom);
    const isCostProfileDraftValid = get(isCostProfileDraftValidAtom);
    const validRealizationNumbers = get(validRealizationNumbersAtom) ?? [];

    const warnings: string[] = [];
    const errors: string[] = [];
    let isEarlyValueConfigurationValid = true;

    const oilUnit = get(oilProductionUnitAtom);
    const gasUnit = salesGasData.unit;
    const salesGasStrategy = get(salesGasStrategyAtom);

    if (salesGasData.isGasConsumptionAssumedZero) {
        warnings.push("Assuming missing FGCT is zero.");
    } else if (salesGasData.isGasConsumptionMissing) {
        warnings.push(
            salesGasStrategy.kind === "DIRECT"
                ? "Gas consumption data unavailable."
                : "FGCT is not available. Sales gas is excluded until a zero-consumption assumption is accepted.",
        );
    } else if (salesGasData.hasZeroGasConsumption && !isDeltaEnsemble) {
        warnings.push("FGCT is zero in all realizations, so no gas consumption is modelled.");
    }
    if (isDeltaEnsemble && deltaConstituentConsumptionQueries.length === 2) {
        const [comparisonQuery, referenceQuery] = deltaConstituentConsumptionQueries;
        if (comparisonQuery.isError || referenceQuery.isError) {
            warnings.push("Constituent gas-consumption diagnostics are unavailable.");
        } else if (comparisonQuery.data && referenceQuery.data) {
            if (comparisonQuery.data.length === 0 || referenceQuery.data.length === 0) {
                warnings.push("Constituent gas-consumption diagnostics are unavailable.");
            } else {
                const comparisonSummary = summarizeCumulativeVectorTerminals(
                    comparisonQuery.data,
                    validRealizationNumbers,
                );
                const referenceSummary = summarizeCumulativeVectorTerminals(
                    referenceQuery.data,
                    validRealizationNumbers,
                );
                if (
                    comparisonSummary.missingOrInvalidRealizations.length > 0 ||
                    referenceSummary.missingOrInvalidRealizations.length > 0
                ) {
                    warnings.push("Constituent gas-consumption diagnostics are incomplete.");
                } else if (comparisonSummary.nonZeroCount === 0 && referenceSummary.nonZeroCount === 0) {
                    warnings.push("No gas consumption is modelled in either delta constituent.");
                } else {
                    warnings.push(
                        `Gas consumption is modelled in ${comparisonSummary.nonZeroCount} comparison and ${referenceSummary.nonZeroCount} reference realizations.`,
                    );
                }
            }
        }
    }
    if (salesGasData.isGasInjectionAssumedZero) {
        warnings.push("Assuming missing FGIT is zero.");
    } else if (salesGasData.isGasInjectionMissing && salesGasData.series.length > 0) {
        warnings.push(
            "FGIT is not available. Sales gas cannot be derived until a zero-injection assumption is accepted.",
        );
    }
    if (salesGasData.incompleteInjectionRealizations.length > 0) {
        warnings.push(
            `FGIT has missing samples for ${salesGasData.incompleteInjectionRealizations.length} realizations.`,
        );
    }
    if (salesGasData.incompleteConsumptionRealizations.length > 0) {
        warnings.push(
            `FGCT has missing samples for ${salesGasData.incompleteConsumptionRealizations.length} realizations.`,
        );
    }

    const withheld = (): EconomicScreeningResults => ({
        results: [],
        oilUnit,
        gasUnit,
        warnings,
        errors,
        isEarlyValueConfigurationValid,
        horizon: null,
    });

    if (!ensembleIdent || !get(areRequiredSourcesLoadedAtom)) {
        return withheld();
    }
    const realizationProfiles = get(realizationProfilesAtom);
    if (realizationProfiles.length === 0) {
        return withheld();
    }

    const { predictionStartYear, discountRatePercent } = economicAssumptions;
    const envelopeEndMonthIndex = get(sourceEnvelopeEndMonthIndexAtom);
    const horizonError = getPredictionHorizonError(predictionStartYear, envelopeEndMonthIndex);
    if (horizonError) {
        errors.push(horizonError);
    }
    if (horizonError || predictionStartYear === null || envelopeEndMonthIndex === null) {
        return withheld();
    }
    const horizon: EvaluationHorizon = {
        startYear: predictionStartYear,
        endYear: Math.floor(envelopeEndMonthIndex / 12),
        endMonthIndex: envelopeEndMonthIndex,
    };

    if (
        earlyValueConfiguration.enabled &&
        earlyValueConfiguration.endYear !== null &&
        (earlyValueConfiguration.endYear < horizon.startYear || earlyValueConfiguration.endYear > horizon.endYear)
    ) {
        errors.push(`The early-value year must be within ${horizon.startYear}-${horizon.endYear}.`);
        isEarlyValueConfigurationValid = false;
    }

    const gasToOilEquivalentDivisor =
        oilUnit === "" || gasUnit === ""
            ? DEFAULT_GAS_TO_OIL_EQUIVALENT_FACTOR
            : makeFixedOilEquivalentDivisor(oilUnit, gasUnit);
    const oilPricePerVolume =
        priceAssumptions.oilPrice === null
            ? null
            : oilUnit === ""
              ? priceAssumptions.oilPrice === 0
                  ? 0
                  : null
              : convertOilPriceToSimulatorUnit(priceAssumptions.oilPrice, priceAssumptions.oilPriceBasis, oilUnit);
    const gasPricePerVolume =
        priceAssumptions.gasPrice === null
            ? null
            : gasUnit === ""
              ? priceAssumptions.gasPrice === 0
                  ? 0
                  : null
              : convertGasPriceToSimulatorUnit(priceAssumptions.gasPrice, priceAssumptions.gasPriceBasis, gasUnit);

    if (priceAssumptions.oilPrice !== null && oilUnit !== "" && oilPricePerVolume === null) {
        errors.push(`Unrecognised oil volume unit "${oilUnit}". Cannot apply the given oil price.`);
    }
    if (priceAssumptions.gasPrice !== null && gasUnit !== "" && gasPricePerVolume === null) {
        errors.push(`Unrecognised gas volume unit "${gasUnit}". Cannot apply the given gas price.`);
    }
    if (gasToOilEquivalentDivisor === null) {
        errors.push(`Cannot convert between oil unit "${oilUnit}" and gas unit "${gasUnit}".`);
    }
    if (errors.some((error) => !error.startsWith("The early-value year"))) {
        return withheld();
    }

    const assumptions: ResolvedMonthlyAssumptions = {
        discountRateFraction: discountRatePercent / 100,
        predictionStartYear,
        horizonEndMonthIndex: envelopeEndMonthIndex,
        gasToOilEquivalentDivisor: gasToOilEquivalentDivisor ?? DEFAULT_GAS_TO_OIL_EQUIVALENT_FACTOR,
        oilPricePerVolume,
        gasPricePerVolume,
        earlyEndYear:
            earlyValueConfiguration.enabled && isEarlyValueConfigurationValid ? earlyValueConfiguration.endYear : null,
    };

    const selectedRealizations = new Set(validRealizationNumbers);
    const results = realizationProfiles
        .filter((profiles) => selectedRealizations.has(profiles.realization))
        .map((profiles) => computeMonthlyRealizationEconomics(profiles, assumptions, costProfile));

    const horizonLabel = `Jan ${horizon.startYear}-${formatMonthIndex(horizon.endMonthIndex)}`;
    const incompleteOilCount = results.filter((result) => !result.hasOilData).length;
    const incompleteGasCount = results.filter((result) => !result.hasSalesGasData).length;
    if (get(oilProductionSeriesAtom).length > 0 && incompleteOilCount > 0) {
        warnings.push(
            `Oil source coverage is incomplete over ${horizonLabel} for ${incompleteOilCount} of ${results.length} realizations; their results that need oil are withheld.`,
        );
    }
    if (salesGasData.series.length > 0 && incompleteGasCount > 0) {
        warnings.push(
            `Sales gas source coverage is incomplete over ${horizonLabel} for ${incompleteGasCount} of ${results.length} realizations; their results that need gas are withheld.`,
        );
    }
    const excludedCostYears = results[0]?.excludedCostYears ?? [];
    if (excludedCostYears.length > 0) {
        warnings.push(
            `Costs entered for ${excludedCostYears.join(", ")} are outside ${horizon.startYear}-${horizon.endYear} and are not used.`,
        );
    }

    if (!isCostProfileDraftValid) {
        warnings.push("Financial results are unavailable until the cost schedule is valid.");
        return {
            results: results.map((result) => ({
                ...result,
                npv: null,
                irr: null,
                irrStatus: undefined,
                breakEvenOilPrice: null,
                breakEvenSlopeDirection: undefined,
                annualProfile: result.annualProfile.map((entry) => ({
                    ...entry,
                    netCashFlow: null,
                    discountedNetCashFlow: null,
                    cumulativeDiscountedCashFlow: null,
                })),
                early: result.early ? { ...result.early, npv: null } : null,
            })),
            oilUnit,
            gasUnit,
            warnings,
            errors,
            isEarlyValueConfigurationValid,
            horizon,
        };
    }

    return { results, oilUnit, gasUnit, warnings, errors, isEarlyValueConfigurationValid, horizon };
});
