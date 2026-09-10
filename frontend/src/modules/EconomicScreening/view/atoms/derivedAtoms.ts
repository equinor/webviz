import { atom } from "jotai";

import type { VectorRealizationData_api } from "@api";
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
    toRealizationCumulativeSeries,
} from "@modules/EconomicScreening/utils/vectorResolution";

import { missingComponentAssumptionsAtom } from "../../settings/atoms/baseAtoms";
import { selectedEnsembleIdentAtom } from "../../settings/atoms/persistableFixableAtoms";

import {
    costProfileAtom,
    discountAssumptionsAtom,
    evaluationWindowAtom,
    priceAssumptionsAtom,
    salesGasStrategyAtom,
} from "./baseAtoms";
import { vectorDataQueriesAtom, VectorQueryIndex } from "./queryAtoms";

export type SalesGasData = {
    series: RealizationCumulativeSeries[];
    unit: string;
    /** True when gas consumption is available but zero in every realization. */
    hasZeroGasConsumption: boolean;
    isGasConsumptionMissing: boolean;
    isGasInjectionMissing: boolean;
    incompleteInjectionRealizations: number[];
    incompleteConsumptionRealizations: number[];
};

export type EconomicScreeningResults = {
    results: RealizationEconomicResult[];
    oilUnit: string;
    gasUnit: string;
    warnings: string[];
    errors: string[];
};

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
        incompleteInjectionRealizations: [],
        incompleteConsumptionRealizations: [],
    };
});

export const economicScreeningResultsAtom = atom<EconomicScreeningResults>((get) => {
    const oilProductionData = get(oilProductionDataAtom);
    const salesGasData = get(salesGasDataAtom);
    const discountAssumptions = get(discountAssumptionsAtom);
    const priceAssumptions = get(priceAssumptionsAtom);
    const costProfile = get(costProfileAtom);
    const evaluationWindow = get(evaluationWindowAtom);

    const warnings: string[] = [];
    const errors: string[] = [];

    const oilUnit = oilProductionData[0]?.unit ?? "";
    const gasUnit = salesGasData.unit;
    const salesGasStrategy = get(salesGasStrategyAtom);

    if (salesGasData.isGasConsumptionMissing) {
        warnings.push(
            salesGasStrategy.kind === "DIRECT"
                ? "Gas consumption data unavailable."
                : "FGCT is not available. Sales gas is excluded until a zero-consumption assumption is accepted.",
        );
    } else if (salesGasData.hasZeroGasConsumption) {
        warnings.push("FGCT is zero in all realizations, so no gas consumption is modelled.");
    }
    if (salesGasData.isGasInjectionMissing && salesGasData.series.length > 0) {
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
        return { results: [], oilUnit, gasUnit, warnings, errors };
    }

    const normalizedProfiles = normalizeEconomicProfiles(oilProductionData, salesGasData.series);

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

    if (errors.length > 0) {
        return { results: [], oilUnit, gasUnit, warnings, errors };
    }

    const assumptions: ResolvedEconomicAssumptions = {
        discountRateFraction: discountAssumptions.discountRatePercent / 100,
        baseYear: discountAssumptions.baseYear,
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

    return { results, oilUnit, gasUnit, warnings, errors };
});
