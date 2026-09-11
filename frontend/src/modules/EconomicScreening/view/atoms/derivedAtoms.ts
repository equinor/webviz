import { atom } from "jotai";

import type { VectorRealizationData_api } from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import type { EvaluationWindow } from "@modules/EconomicScreening/typesAndEnums";
import {
    computeRealizationEconomics,
    type RealizationEconomicResult,
    type ResolvedEconomicAssumptions,
} from "@modules/EconomicScreening/utils/economicCalculations";
import { normalizeEconomicProfiles } from "@modules/EconomicScreening/utils/normalizedProfiles";
import {
    convertGasPriceToSimulatorUnit,
    convertGasToOilEquivalentFactorToSimulatorUnit,
    convertOilPriceToSimulatorUnit,
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
    discountAssumptionsAtom,
    earlyValueConfigurationAtom,
    ensembleIdentAtom,
    evaluationWindowAtom,
    isCostProfileDraftValidAtom,
    priceAssumptionsAtom,
    salesGasStrategyAtom,
} from "./baseAtoms";
import {
    deltaConstituentGasConsumptionQueriesAtom,
    automaticBaseYearVectorDataQueriesAtom,
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

export type EconomicScreeningResults = {
    results: RealizationEconomicResult[];
    oilUnit: string;
    gasUnit: string;
    warnings: string[];
    errors: string[];
    isEarlyValueConfigurationValid: boolean;
};

export function getEvaluationRangeError(
    evaluationGridYears: number[],
    evaluationWindow: EvaluationWindow,
): string | null {
    if (
        evaluationWindow.firstYear !== null &&
        evaluationWindow.lastYear !== null &&
        evaluationWindow.firstYear > evaluationWindow.lastYear
    ) {
        return "Evaluation start year must be before or equal to the end year.";
    }

    const firstAvailableYear = Math.min(...evaluationGridYears);
    const lastAvailableYear = Math.max(...evaluationGridYears);
    const resolvedEvaluationFirstYear = evaluationWindow.firstYear ?? firstAvailableYear;
    const resolvedEvaluationLastYear = evaluationWindow.lastYear ?? lastAvailableYear;
    const hasEvaluationData = evaluationGridYears.some(
        (year) => year >= resolvedEvaluationFirstYear && year <= resolvedEvaluationLastYear,
    );
    return hasEvaluationData ? null : "The evaluation range contains no production or cost years.";
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

const oilProductionDataAtom = atom<VectorRealizationData_api[]>((get) => {
    return get(vectorDataQueriesAtom)[VectorQueryIndex.OIL_PRODUCTION].data ?? [];
});

const salesGasDataAtom = atom<SalesGasData>((get) => {
    const salesGasStrategy = get(salesGasStrategyAtom);
    const queries = get(vectorDataQueriesAtom);
    const ensembleKey = get(selectedEnsembleIdentAtom).value?.toString();
    const missingComponentAssumptions = ensembleKey ? get(missingComponentAssumptionsAtom)[ensembleKey] : undefined;

    if (salesGasStrategy.kind === "DIRECT") {
        const data = queries[VectorQueryIndex.SALES_GAS].data ?? [];
        const gasConsumptionData = salesGasStrategy.hasGasConsumption
            ? (queries[VectorQueryIndex.GAS_CONSUMPTION].data ?? [])
            : [];
        return {
            series: toRealizationCumulativeSeries(data),
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

export const economicScreeningResultsAtom = atom<EconomicScreeningResults>((get) => {
    const oilProductionData = get(oilProductionDataAtom);
    const salesGasData = get(salesGasDataAtom);
    const ensembleIdent = get(ensembleIdentAtom);
    const isDeltaEnsemble = ensembleIdent ? isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent) : false;
    const deltaConstituentConsumptionQueries = get(deltaConstituentGasConsumptionQueriesAtom);
    const automaticBaseYearQueries = get(automaticBaseYearVectorDataQueriesAtom);
    const discountAssumptions = get(discountAssumptionsAtom);
    const priceAssumptions = get(priceAssumptionsAtom);
    const costProfile = get(costProfileAtom);
    const evaluationWindow = get(evaluationWindowAtom);
    const earlyValueConfiguration = get(earlyValueConfigurationAtom);
    const isCostProfileDraftValid = get(isCostProfileDraftValidAtom);
    const validRealizationNumbers = get(validRealizationNumbersAtom) ?? [];

    const warnings: string[] = [];
    const errors: string[] = [];
    let isEarlyValueConfigurationValid = true;

    const oilUnit = oilProductionData[0]?.unit ?? "";
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

    if (oilProductionData.length === 0 && salesGasData.series.length === 0) {
        return { results: [], oilUnit, gasUnit, warnings, errors, isEarlyValueConfigurationValid };
    }

    const normalizedProfiles = normalizeEconomicProfiles(oilProductionData, salesGasData.series);
    const availableYears = normalizedProfiles.flatMap((profile) => profile.years);
    const evaluationGridYears = Array.from(
        new Set([...availableYears, ...costProfile.map((entry) => entry.year)]),
    ).sort((firstYear, secondYear) => firstYear - secondYear);
    const resolvedEvaluationFirstYear = evaluationWindow.firstYear ?? Math.min(...evaluationGridYears);
    const resolvedEvaluationLastYear = evaluationWindow.lastYear ?? Math.max(...evaluationGridYears);
    const evaluationRangeError = getEvaluationRangeError(evaluationGridYears, evaluationWindow);
    if (evaluationRangeError) {
        errors.push(evaluationRangeError);
    }
    if (
        earlyValueConfiguration.enabled &&
        earlyValueConfiguration.endYear !== null &&
        (earlyValueConfiguration.endYear < resolvedEvaluationFirstYear ||
            earlyValueConfiguration.endYear > resolvedEvaluationLastYear)
    ) {
        errors.push("Early-value end year must be within the evaluation range.");
        isEarlyValueConfigurationValid = false;
    }

    if (evaluationRangeError) {
        return { results: [], oilUnit, gasUnit, warnings, errors, isEarlyValueConfigurationValid };
    }

    const gasToOilEquivalentDivisor =
        gasUnit === ""
            ? discountAssumptions.gasToOilEquivalentFactor
            : convertGasToOilEquivalentFactorToSimulatorUnit(
                  discountAssumptions.gasToOilEquivalentFactor,
                  oilUnit,
                  gasUnit,
              );

    const oilPricePerVolume =
        priceAssumptions.oilPrice === null
            ? null
            : convertOilPriceToSimulatorUnit(priceAssumptions.oilPrice, priceAssumptions.oilPriceBasis, oilUnit);
    const gasPricePerVolume =
        priceAssumptions.gasPrice === null || gasUnit === ""
            ? null
            : convertGasPriceToSimulatorUnit(priceAssumptions.gasPrice, priceAssumptions.gasPriceBasis, gasUnit);

    if (priceAssumptions.oilPrice !== null && oilPricePerVolume === null) {
        errors.push(`Unrecognised oil volume unit "${oilUnit}". Cannot apply the given oil price.`);
    }
    if (priceAssumptions.gasPrice !== null && gasUnit !== "" && gasPricePerVolume === null) {
        errors.push(`Unrecognised gas volume unit "${gasUnit}". Cannot apply the given gas price.`);
    }
    if (oilUnit !== "" && gasUnit !== "" && gasToOilEquivalentDivisor === null) {
        errors.push(`Cannot convert between oil unit "${oilUnit}" and gas unit "${gasUnit}".`);
    }

    if (errors.some((error) => error !== "Early-value end year must be within the evaluation range.")) {
        return { results: [], oilUnit, gasUnit, warnings, errors, isEarlyValueConfigurationValid };
    }

    if (discountAssumptions.baseYear === null && automaticBaseYearQueries.some((query) => query.data === undefined)) {
        errors.push("Automatic valuation year is unavailable until ensemble production data has loaded.");
        return { results: [], oilUnit, gasUnit, warnings, errors, isEarlyValueConfigurationValid };
    }
    const automaticBaseYearTimestamps = automaticBaseYearQueries.flatMap((query) =>
        (query.data ?? []).flatMap((series) => series.timestampsUtcMs.filter(Number.isFinite)),
    );
    const resolvedAutomaticBaseYear = automaticBaseYearTimestamps.length
        ? new Date(Math.min(...automaticBaseYearTimestamps)).getUTCFullYear()
        : null;
    if (discountAssumptions.baseYear === null && resolvedAutomaticBaseYear === null) {
        errors.push("Automatic valuation year is unavailable until ensemble production data has loaded.");
        return { results: [], oilUnit, gasUnit, warnings, errors, isEarlyValueConfigurationValid };
    }
    const assumptions: ResolvedEconomicAssumptions = {
        discountRateFraction: discountAssumptions.discountRatePercent / 100,
        baseYear: discountAssumptions.baseYear ?? resolvedAutomaticBaseYear,
        convention: discountAssumptions.convention,
        investmentTiming: discountAssumptions.investmentTiming,
        gasToOilEquivalentDivisor: gasToOilEquivalentDivisor ?? discountAssumptions.gasToOilEquivalentFactor,
        oilPricePerVolume,
        gasPricePerVolume,
        excludeOilRevenue: priceAssumptions.excludeOilRevenue,
        excludeGasRevenue: priceAssumptions.excludeGasRevenue,
    };

    const results = normalizedProfiles.map((profile) => {
        return computeRealizationEconomics(profile, assumptions, costProfile, evaluationWindow);
    });

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
                netCashFlow: null,
                discountedNetCashFlow: null,
                cumulativeDiscountedCashFlow: null,
            })),
            oilUnit,
            gasUnit,
            warnings,
            errors,
            isEarlyValueConfigurationValid,
        };
    }

    return { results, oilUnit, gasUnit, warnings, errors, isEarlyValueConfigurationValid };
});
