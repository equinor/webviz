import { atom } from "jotai";

import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { CostDraftStatus, DEFAULT_GAS_TO_OIL_EQUIVALENT_FACTOR } from "@modules/EconomicScreening/typesAndEnums";
import { formatMonthIndex } from "@modules/EconomicScreening/utils/calendar";
import { getIneligibilityMessage, Ineligibility } from "@modules/EconomicScreening/utils/eligibility";
import { isYearInHorizon, type EvaluationHorizon } from "@modules/EconomicScreening/utils/evaluationHorizon";
import {
    computeMonthlyRealizationEconomics,
    type MonthlyRealizationEconomicResult,
    type ResolvedMonthlyAssumptions,
} from "@modules/EconomicScreening/utils/monthlyEconomics";
import { SourceStatus } from "@modules/EconomicScreening/utils/sourceSnapshot";
import {
    convertGasPriceToSimulatorUnit,
    convertOilPriceToSimulatorUnit,
    makeFixedOilEquivalentDivisor,
} from "@modules/EconomicScreening/utils/unitConversion";

import {
    constituentGasConsumptionWarningAtom,
    costDraftStatusAtom,
    costProfileAtom,
    earlyValueConfigurationAtom,
    economicAssumptionsAtom,
    evaluationHorizonAtom,
    priceAssumptionsAtom,
    realizationNumbersAtom,
    sourceSnapshotAtom,
} from "./baseAtoms";

export type EconomicScreeningResults = {
    results: MonthlyRealizationEconomicResult[];
    oilUnit: string;
    gasUnit: string;
    warnings: string[];
    errors: string[];
    isEarlyValueConfigurationValid: boolean;
    horizon: EvaluationHorizon | null;
};

/** Everything except the cost-draft mask, so a draft status change does not recalculate every realization. */
const unmaskedResultsAtom = atom<EconomicScreeningResults>((get) => {
    const snapshot = get(sourceSnapshotAtom);
    const salesGas = snapshot.salesGas;
    const ensembleIdent = snapshot.ensembleIdent;
    const isDeltaEnsemble = ensembleIdent ? isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent) : false;
    const constituentGasConsumptionWarning = get(constituentGasConsumptionWarningAtom);
    const economicAssumptions = get(economicAssumptionsAtom);
    const evaluationHorizon = get(evaluationHorizonAtom);
    const priceAssumptions = get(priceAssumptionsAtom);
    const costProfile = get(costProfileAtom);
    const earlyValueConfiguration = get(earlyValueConfigurationAtom);
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

    if (evaluationHorizon.status !== "READY") {
        return withheld();
    }
    const { horizon } = evaluationHorizon;

    // The Settings setup summary reports an out-of-range early year; only the early outputs are withheld here.
    if (
        earlyValueConfiguration.enabled &&
        earlyValueConfiguration.endYear !== null &&
        !isYearInHorizon(earlyValueConfiguration.endYear, horizon)
    ) {
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

    const blockingErrors: string[] = [];
    if (priceAssumptions.oilPrice !== null && oilUnit !== "" && oilPricePerVolume === null) {
        blockingErrors.push(`Unrecognised oil volume unit "${oilUnit}". Cannot apply the given oil price.`);
    }
    if (priceAssumptions.gasPrice !== null && gasUnit !== "" && gasPricePerVolume === null) {
        blockingErrors.push(`Unrecognised gas volume unit "${gasUnit}". Cannot apply the given gas price.`);
    }
    if (gasToOilEquivalentDivisor === null) {
        blockingErrors.push(`Cannot convert between oil unit "${oilUnit}" and gas unit "${gasUnit}".`);
    }
    if (blockingErrors.length > 0) {
        errors.push(...blockingErrors);
        return withheld();
    }

    const assumptions: ResolvedMonthlyAssumptions = {
        discountRateFraction: economicAssumptions.discountRatePercent / 100,
        predictionStartYear: horizon.startYear,
        horizonEndMonthIndex: horizon.endMonthIndex,
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

    return { results, oilUnit, gasUnit, warnings, errors, isEarlyValueConfigurationValid, horizon };
});

export const economicScreeningResultsAtom = atom<EconomicScreeningResults>((get) => {
    const unmasked = get(unmaskedResultsAtom);
    // A pending valid draft keeps the committed results. Withheld results carry no financial values to mask.
    if (get(costDraftStatusAtom) !== CostDraftStatus.INVALID || unmasked.horizon === null) {
        return unmasked;
    }
    return {
        ...unmasked,
        warnings: [...unmasked.warnings, getIneligibilityMessage(Ineligibility.COST_DRAFT_INVALID)],
        results: unmasked.results.map((result) => ({
            ...result,
            npv: null,
            financialIneligibility: Ineligibility.COST_DRAFT_INVALID,
            irr: null,
            irrStatus: undefined,
            breakEvenOilPrice: null,
            breakEvenIneligibility: Ineligibility.COST_DRAFT_INVALID,
            breakEvenSlopeDirection: undefined,
            annualProfile: result.annualProfile.map((entry) => ({
                ...entry,
                netCashFlow: null,
                discountedNetCashFlow: null,
                cumulativeDiscountedCashFlow: null,
            })),
            early: result.early ? { ...result.early, npv: null } : null,
        })),
    };
});
