import { atom } from "jotai";

import type { SourceHorizon } from "@modules/EconomicScreening/typesAndEnums";
import {
    computeMonthlyVolumesFromCumulative,
    lastSupportedMonthIndex,
    monthIndexOf,
    SourceKind,
} from "@modules/EconomicScreening/utils/monthlyProduction";
import type { MonthlyProductionProfile } from "@modules/EconomicScreening/utils/monthlyProduction";
import {
    suggestPredictionStartYears,
    summarizeSelectedProductSupport,
    type SelectedProductSupport,
} from "@modules/EconomicScreening/utils/setupReadiness";
import {
    NO_SALES_GAS_DIAGNOSTICS,
    SourceStatus,
    type EconomicSourceSnapshot,
    type RealizationProfiles,
    type SalesGasDiagnostics,
} from "@modules/EconomicScreening/utils/sourceSnapshot";
import type { RealizationCumulativeSeries } from "@modules/EconomicScreening/utils/vectorResolution";
import {
    deriveSalesGasCumulative,
    isCumulativeVectorAllZero,
    summarizeCumulativeVectorTerminals,
    toRealizationCumulativeSeries,
} from "@modules/EconomicScreening/utils/vectorResolution";

import { missingComponentAssumptionsAtom, predictionStartYearAtom } from "./baseAtoms";
import { activeVectorListQueryAtom, isSelectedEnsembleDeltaAtom, salesGasStrategyAtom } from "./derivedAtoms";
import { selectedEnsembleIdentAtom } from "./persistableFixableAtoms";
import {
    deltaConstituentGasConsumptionQueriesAtom,
    isVectorNeededAtom,
    validRealizationNumbersAtom,
    vectorDataQueriesAtom,
    VectorQueryIndex,
} from "./sourceQueryAtoms";

type SalesGasData = {
    series: RealizationCumulativeSeries[];
    unit: string;
    diagnostics: SalesGasDiagnostics;
};

const isFetchingAtom = atom<boolean>((get) => {
    return get(activeVectorListQueryAtom).isLoading || get(vectorDataQueriesAtom).some((query) => query.isFetching);
});

const queryErrorAtom = atom<string | null>((get) => {
    if (get(activeVectorListQueryAtom).isError) {
        return "Could not load the vector list.";
    }
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

/** Pending or failed requests never count as loaded. */
const sourceStatusAtom = atom<SourceStatus>((get) => {
    if (!get(selectedEnsembleIdentAtom).value) {
        return SourceStatus.NO_ENSEMBLE;
    }
    const vectorListQuery = get(activeVectorListQueryAtom);
    if (vectorListQuery.isError) {
        return SourceStatus.ERROR;
    }
    if (!vectorListQuery.isSuccess) {
        return SourceStatus.LOADING;
    }
    const queries = get(vectorDataQueriesAtom);
    const isVectorNeeded = get(isVectorNeededAtom);
    if (!isVectorNeeded.some(Boolean)) {
        return SourceStatus.NO_SOURCES;
    }
    if (queries.some((query, index) => isVectorNeeded[index] && query.isError)) {
        return SourceStatus.ERROR;
    }
    if (queries.some((query, index) => isVectorNeeded[index] && !query.isSuccess)) {
        return SourceStatus.LOADING;
    }
    return SourceStatus.READY;
});

const sourceKindAtom = atom<SourceKind>((get) => {
    return get(isSelectedEnsembleDeltaAtom) ? SourceKind.DELTA : SourceKind.REGULAR;
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
        const series = toRealizationCumulativeSeries(data, sourceKind);
        return {
            series,
            unit: data[0]?.unit ?? "",
            diagnostics: {
                hasSeries: series.length > 0,
                hasZeroGasConsumption:
                    salesGasStrategy.hasGasConsumption && isCumulativeVectorAllZero(gasConsumptionData),
                isGasConsumptionMissing: !salesGasStrategy.hasGasConsumption,
                isGasInjectionMissing: false,
                isGasConsumptionAssumedZero: false,
                isGasInjectionAssumedZero: false,
                incompleteInjectionRealizations: [],
                incompleteConsumptionRealizations: [],
            },
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
            diagnostics: {
                hasSeries: derivedSalesGas.series.length > 0,
                hasZeroGasConsumption:
                    salesGasStrategy.hasGasConsumption && isCumulativeVectorAllZero(gasConsumptionData),
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
            },
        };
    }

    return { series: [], unit: "", diagnostics: NO_SALES_GAS_DIAGNOSTICS };
});

function toProfile(series: RealizationCumulativeSeries | undefined): MonthlyProductionProfile | null {
    return series
        ? computeMonthlyVolumesFromCumulative(series.timestampsUtcMs, series.values, series.intervalCoverage)
        : null;
}

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
    if (get(sourceStatusAtom) !== SourceStatus.READY) {
        return null;
    }
    const supportEnds = [...get(oilProductionSeriesAtom), ...get(salesGasDataAtom).series]
        .map((series) => series.supportEndUtcMs)
        .filter((supportEnd): supportEnd is number => supportEnd !== null);
    return supportEnds.length > 0 ? lastSupportedMonthIndex(Math.max(...supportEnds)) : null;
});

/** The single acquisition result forwarded to the view; independent of prices, costs and display choices. */
export const sourceSnapshotAtom = atom<EconomicSourceSnapshot>((get) => {
    const status = get(sourceStatusAtom);
    const salesGasData = get(salesGasDataAtom);
    const isReady = status === SourceStatus.READY;
    return {
        ensembleIdent: get(selectedEnsembleIdentAtom).value,
        status,
        isFetching: get(isFetchingAtom),
        queryError: get(queryErrorAtom),
        salesGasStrategy: get(salesGasStrategyAtom),
        oilUnit: get(vectorDataQueriesAtom)[VectorQueryIndex.OIL_PRODUCTION].data?.[0]?.unit ?? "",
        gasUnit: salesGasData.unit,
        hasOilSeries: get(oilProductionSeriesAtom).length > 0,
        salesGas: salesGasData.diagnostics,
        realizationProfiles: isReady ? get(realizationProfilesAtom) : [],
        envelopeEndMonthIndex: isReady ? get(sourceEnvelopeEndMonthIndexAtom) : null,
    };
});

/** Generated cost years run through this year; resolved from the settings' own acquisition. */
export const sourceHorizonAtom = atom<SourceHorizon>((get) => {
    const snapshot = get(sourceSnapshotAtom);
    return {
        endYear: snapshot.envelopeEndMonthIndex === null ? null : Math.floor(snapshot.envelopeEndMonthIndex / 12),
        isLoading: snapshot.isFetching || snapshot.status === SourceStatus.LOADING,
    };
});

/** From the full-ensemble snapshot, so realization filtering does not change the suggestions. */
export const predictionStartYearSuggestionsAtom = atom<number[]>((get) => {
    const snapshot = get(sourceSnapshotAtom);
    if (snapshot.envelopeEndMonthIndex === null) {
        return [];
    }
    return suggestPredictionStartYears(snapshot.realizationProfiles, snapshot.envelopeEndMonthIndex);
});

/** Coverage and confirmed absence of each product over the evaluation for the filtered realizations; null until known. */
export const selectedProductSupportAtom = atom<SelectedProductSupport | null>((get) => {
    const snapshot = get(sourceSnapshotAtom);
    const predictionStartYear = get(predictionStartYearAtom);
    const endMonthIndex = snapshot.envelopeEndMonthIndex;
    if (predictionStartYear === null || endMonthIndex === null) {
        return null;
    }
    const startMonthIndex = monthIndexOf(predictionStartYear, 1);
    const realizations = new Set(get(validRealizationNumbersAtom) ?? []);
    const profiles = snapshot.realizationProfiles.filter((profile) => realizations.has(profile.realization));
    if (startMonthIndex > endMonthIndex || profiles.length === 0) {
        return null;
    }
    return summarizeSelectedProductSupport(profiles, startMonthIndex, endMonthIndex);
});

/** Delta constituents' FGCT is reported for context only; it never gates results. */
export const constituentGasConsumptionWarningAtom = atom<string | null>((get) => {
    if (!get(isSelectedEnsembleDeltaAtom)) {
        return null;
    }
    const queries = get(deltaConstituentGasConsumptionQueriesAtom);
    if (queries.length !== 2) {
        return null;
    }
    const [comparisonQuery, referenceQuery] = queries;
    if (comparisonQuery.isError || referenceQuery.isError) {
        return "Constituent gas-consumption diagnostics are unavailable.";
    }
    if (!comparisonQuery.data || !referenceQuery.data) {
        return null;
    }
    if (comparisonQuery.data.length === 0 || referenceQuery.data.length === 0) {
        return "Constituent gas-consumption diagnostics are unavailable.";
    }
    const validRealizationNumbers = get(validRealizationNumbersAtom) ?? [];
    const comparisonSummary = summarizeCumulativeVectorTerminals(comparisonQuery.data, validRealizationNumbers);
    const referenceSummary = summarizeCumulativeVectorTerminals(referenceQuery.data, validRealizationNumbers);
    if (
        comparisonSummary.missingOrInvalidRealizations.length > 0 ||
        referenceSummary.missingOrInvalidRealizations.length > 0
    ) {
        return "Constituent gas-consumption diagnostics are incomplete.";
    }
    if (comparisonSummary.nonZeroCount === 0 && referenceSummary.nonZeroCount === 0) {
        return "No gas consumption is modelled in either delta constituent.";
    }
    return `Gas consumption is modelled in ${comparisonSummary.nonZeroCount} comparison and ${referenceSummary.nonZeroCount} reference realizations.`;
});
