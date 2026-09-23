import { atom } from "jotai";

import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { DEFAULT_GAS_TO_OIL_EQUIVALENT_FACTOR } from "@modules/EconomicScreening/typesAndEnums";
import {
    computeMonthlyRealizationEconomics,
    type MonthlyRealizationEconomicResult,
    type ResolvedMonthlyAssumptions,
} from "@modules/EconomicScreening/utils/monthlyEconomics";
import { monthIndexOf } from "@modules/EconomicScreening/utils/monthlyProduction";
import { SourceStatus } from "@modules/EconomicScreening/utils/sourceSnapshot";
import {
    convertGasPriceToSimulatorUnit,
    convertOilPriceToSimulatorUnit,
    makeFixedOilEquivalentDivisor,
} from "@modules/EconomicScreening/utils/unitConversion";

import {
    constituentGasConsumptionWarningAtom,
    costProfileAtom,
    earlyValueConfigurationAtom,
    economicAssumptionsAtom,
    isCostProfileDraftValidAtom,
    priceAssumptionsAtom,
    realizationNumbersAtom,
    sourceSnapshotAtom,
} from "./baseAtoms";

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

export const economicScreeningResultsAtom = atom<EconomicScreeningResults>((get) => {
    const snapshot = get(sourceSnapshotAtom);
    const salesGas = snapshot.salesGas;
    const ensembleIdent = snapshot.ensembleIdent;
    const isDeltaEnsemble = ensembleIdent ? isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent) : false;
    const constituentGasConsumptionWarning = get(constituentGasConsumptionWarningAtom);
    const economicAssumptions = get(economicAssumptionsAtom);
    const priceAssumptions = get(priceAssumptionsAtom);
    const costProfile = get(costProfileAtom);
    const earlyValueConfiguration = get(earlyValueConfigurationAtom);
    const isCostProfileDraftValid = get(isCostProfileDraftValidAtom);
    const validRealizationNumbers = get(realizationNumbersAtom) ?? [];

    const warnings: string[] = [];
    const errors: string[] = [];
    let isEarlyValueConfigurationValid = true;

    const { oilUnit, gasUnit, salesGasStrategy } = snapshot;

    if (salesGas.isGasConsumptionAssumedZero) {
        warnings.push("Assuming missing FGCT is zero.");
    } else if (salesGas.isGasConsumptionMissing) {
        warnings.push(
            salesGasStrategy.kind === "DIRECT"
                ? "Gas consumption data unavailable."
                : "FGCT is not available. Sales gas is excluded until a zero-consumption assumption is accepted.",
        );
    } else if (salesGas.hasZeroGasConsumption && !isDeltaEnsemble) {
        warnings.push("FGCT is zero in all realizations, so no gas consumption is modelled.");
    }
    if (isDeltaEnsemble && constituentGasConsumptionWarning) {
        warnings.push(constituentGasConsumptionWarning);
    }
    if (salesGas.isGasInjectionAssumedZero) {
        warnings.push("Assuming missing FGIT is zero.");
    } else if (salesGas.isGasInjectionMissing && salesGas.hasSeries) {
        warnings.push(
            "FGIT is not available. Sales gas cannot be derived until a zero-injection assumption is accepted.",
        );
    }
    if (salesGas.incompleteInjectionRealizations.length > 0) {
        warnings.push(`FGIT has missing samples for ${salesGas.incompleteInjectionRealizations.length} realizations.`);
    }
    if (salesGas.incompleteConsumptionRealizations.length > 0) {
        warnings.push(
            `FGCT has missing samples for ${salesGas.incompleteConsumptionRealizations.length} realizations.`,
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

    if (!ensembleIdent || snapshot.status !== SourceStatus.READY) {
        return withheld();
    }
    const realizationProfiles = snapshot.realizationProfiles;
    if (realizationProfiles.length === 0) {
        return withheld();
    }

    const { predictionStartYear, discountRatePercent } = economicAssumptions;
    const envelopeEndMonthIndex = snapshot.envelopeEndMonthIndex;
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
    if (snapshot.hasOilSeries && incompleteOilCount > 0) {
        warnings.push(
            `Oil source coverage is incomplete over ${horizonLabel} for ${incompleteOilCount} of ${results.length} realizations; their results that need oil are withheld.`,
        );
    }
    if (salesGas.hasSeries && incompleteGasCount > 0) {
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
