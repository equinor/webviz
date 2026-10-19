import {
    CostDraftStatus,
    type CostProfileEntry,
    type EarlyValueConfiguration,
} from "@modules/EconomicScreening/typesAndEnums";

import { formatMonthIndex } from "./calendar";
import { hasIncludedNonZeroCost } from "./costProfile";
import { REQUIREMENT_NEEDS, revenueNeeds, type MeasureRequirement } from "./eligibility";
import {
    getEvaluationHorizonError,
    isYearInHorizon,
    type EvaluationHorizon,
    type EvaluationHorizonState,
} from "./evaluationHorizon";
import { isProductConfirmedAbsent, isProductEstablished } from "./monthlyEconomics";
import { isMonthCoverageEstablished, monthIndexOf, type MonthlyProductionProfile } from "./monthlyProduction";
import { SourceStatus, type EconomicSourceSnapshot, type RealizationProfiles } from "./sourceSnapshot";
import type { MissingComponentAssumptions } from "./vectorResolution";

/**
 * Years whose January has established source coverage in at least one realization and product, through
 * the envelope end. Coverage, not volume, decides, so covered zero-production years are included.
 */
export function suggestPredictionStartYears(
    realizationProfiles: RealizationProfiles[],
    envelopeEndMonthIndex: number,
): number[] {
    const years = new Set<number>();
    for (const profiles of realizationProfiles) {
        for (const profile of [profiles.oilProfile, profiles.salesGasProfile]) {
            if (!profile || profile.rejection !== null) {
                continue;
            }
            for (const monthSample of profile.months) {
                if (
                    monthSample.month === 1 &&
                    isMonthCoverageEstablished(monthSample.coverage) &&
                    monthIndexOf(monthSample.year, 1) <= envelopeEndMonthIndex
                ) {
                    years.add(monthSample.year);
                }
            }
        }
    }
    return [...years].sort((first, second) => first - second);
}

export enum SetupIssueKind {
    /** Resolved by an entry or choice in Settings. */
    INPUT = "INPUT",
    /** Source data is unavailable, failed or does not support the entered setup. */
    SOURCE = "SOURCE",
}

export type SetupField =
    | "ensemble"
    | "predictionYear"
    | "oilPrice"
    | "gasPrice"
    | "injection"
    | "consumption"
    | "costs"
    | "earlyYear";

export type SetupIssue = { kind: SetupIssueKind; message: string; field?: SetupField };

export type ProductSupport = {
    /** Every selected realization has the product established and zero in every evaluated month. */
    isConfirmedAbsent: boolean;
    /** Earliest established month over the selected realizations; null when there is none. */
    firstEstablishedMonthIndex: number | null;
};

export type SelectedProductSupport = {
    oil: ProductSupport;
    gas: ProductSupport;
    /** Per selected realization, whether each product is established for every evaluated month. */
    realizations: { oil: boolean; gas: boolean }[];
};

/** Applies the results' own coverage and confirmed-absence rules to each selected realization. */
export function summarizeSelectedProductSupport(
    realizationProfiles: RealizationProfiles[],
    startMonthIndex: number,
    endMonthIndex: number,
): SelectedProductSupport {
    return {
        oil: summarizeProductSupport(
            realizationProfiles.map((profiles) => profiles.oilProfile),
            startMonthIndex,
            endMonthIndex,
        ),
        gas: summarizeProductSupport(
            realizationProfiles.map((profiles) => profiles.salesGasProfile),
            startMonthIndex,
            endMonthIndex,
        ),
        realizations: realizationProfiles.map((profiles) => ({
            oil: isProductEstablished(profiles.oilProfile, startMonthIndex, endMonthIndex),
            gas: isProductEstablished(profiles.salesGasProfile, startMonthIndex, endMonthIndex),
        })),
    };
}

function summarizeProductSupport(
    profiles: (MonthlyProductionProfile | null)[],
    startMonthIndex: number,
    endMonthIndex: number,
): ProductSupport {
    let firstEstablishedMonthIndex: number | null = null;
    for (const profile of profiles) {
        if (!profile || profile.rejection !== null) {
            continue;
        }
        const firstEstablished = profile.months.find((monthSample) => isMonthCoverageEstablished(monthSample.coverage));
        if (firstEstablished) {
            const monthIndex = monthIndexOf(firstEstablished.year, firstEstablished.month);
            firstEstablishedMonthIndex = Math.min(firstEstablishedMonthIndex ?? monthIndex, monthIndex);
        }
    }
    return {
        isConfirmedAbsent: profiles.every((profile) =>
            isProductConfirmedAbsent(profile, startMonthIndex, endMonthIndex),
        ),
        firstEstablishedMonthIndex,
    };
}

function coverageMessage(productLabel: string, support: ProductSupport, horizon: EvaluationHorizon) {
    const startMonthIndex = monthIndexOf(horizon.startYear, 1);
    const sourceStart =
        support.firstEstablishedMonthIndex !== null && support.firstEstablishedMonthIndex > startMonthIndex
            ? `; supported data starts ${formatMonthIndex(support.firstEstablishedMonthIndex)}`
            : "";
    return `${productLabel} source coverage is incomplete between Jan ${horizon.startYear} and ${formatMonthIndex(horizon.endMonthIndex)} for every selected realization${sourceStart}.`;
}

export type SetupReadiness = {
    /** Source requirements that depend on loading data are not reported as satisfied meanwhile. */
    isLoading: boolean;
    issues: SetupIssue[];
};

export type SetupReadinessInput = {
    hasEnsemble: boolean;
    vectorListStatus: "LOADING" | "ERROR" | "READY";
    snapshot: EconomicSourceSnapshot;
    hasOilVector: boolean;
    /** Support of each product over the evaluation for the selected realizations; null until known. */
    productSupport: SelectedProductSupport | null;
    missingComponentAssumptions: MissingComponentAssumptions | undefined;
    evaluationHorizon: EvaluationHorizonState;
    oilPrice: number | null;
    gasPrice: number | null;
    costProfile: CostProfileEntry[];
    costDraftStatus: CostDraftStatus;
    earlyValue: EarlyValueConfiguration;
    requirement: MeasureRequirement;
};

function missingComponentMessage(componentLabel: string, checkboxLabel: string, needsGasVolume: boolean): string {
    return needsGasVolume
        ? `${componentLabel} is missing: accept “${checkboxLabel}” to calculate sales gas.`
        : `${componentLabel} is missing: accept “${checkboxLabel}” or enter a gas price of 0.`;
}

/**
 * Every currently known requirement of the selected result, reported together. Applies the shared
 * eligibility rules to the selected realizations' support, worded for the setup rather than per realization.
 */
export function getSetupReadiness(input: SetupReadinessInput): SetupReadiness {
    if (!input.hasEnsemble) {
        return {
            isLoading: false,
            issues: [{ kind: SetupIssueKind.INPUT, message: "Select an ensemble.", field: "ensemble" }],
        };
    }
    const { snapshot, requirement, evaluationHorizon, oilPrice, gasPrice } = input;
    const issues: SetupIssue[] = [];
    const addInput = (message: string, field: SetupField) =>
        issues.push({ kind: SetupIssueKind.INPUT, message, field });
    const addSource = (message: string, field?: SetupField) =>
        issues.push({ kind: SetupIssueKind.SOURCE, message, ...(field && { field }) });

    const isLoading =
        input.vectorListStatus === "LOADING" || snapshot.status === SourceStatus.LOADING || snapshot.isFetching;
    const horizon = evaluationHorizon.status === "READY" ? evaluationHorizon.horizon : null;

    if (evaluationHorizon.status === "NO_START") {
        addInput("Enter a prediction start year.", "predictionYear");
    } else if (snapshot.status === SourceStatus.READY) {
        const horizonError = getEvaluationHorizonError(evaluationHorizon);
        if (horizonError) {
            addSource(horizonError, "predictionYear");
        }
    }

    if (input.vectorListStatus === "ERROR" || snapshot.status === SourceStatus.ERROR) {
        addSource(snapshot.queryError ?? "Could not load the source data.");
    } else if (snapshot.status === SourceStatus.NO_SOURCES) {
        addSource("No oil or sales-gas vectors are available for this ensemble.");
    }

    const needs = REQUIREMENT_NEEDS[requirement];
    const oilRevenue = revenueNeeds(oilPrice, input.productSupport?.oil.isConfirmedAbsent ?? false);
    const gasRevenue = revenueNeeds(gasPrice, input.productSupport?.gas.isConfirmedAbsent ?? false);
    const needsOilSource = needs.oilVolume || (needs.oilRevenue && oilRevenue.needsSourceCoverage);
    const gasRevenueNeedsSource = needs.gasRevenue && gasRevenue.needsSourceCoverage;
    const needsGasSource = needs.gasVolume || gasRevenueNeedsSource;

    if (input.vectorListStatus === "READY" && snapshot.status !== SourceStatus.NO_SOURCES) {
        const support = input.productSupport;
        const coverage = support?.realizations;
        const needsOilCoverage = input.hasOilVector && needsOilSource;
        let needsGasCoverage = false;
        if (!input.hasOilVector) {
            if (needsOilSource) {
                addSource("Oil production (FOPT) is not available for this ensemble.");
            }
        } else {
            if (needs.oilRevenue && oilRevenue.needsPrice) {
                addInput("Enter an oil price, or 0 to omit oil revenue.", "oilPrice");
            }
            if (needsOilCoverage && coverage && !coverage.some((entry) => entry.oil) && horizon) {
                addSource(coverageMessage("Oil", support!.oil, horizon));
            }
            if (needs.nonZeroOilVolume && support?.oil.isConfirmedAbsent) {
                addSource("Oil production is zero in every selected realization, so break-even cannot be solved.");
            }
        }

        const strategy = snapshot.salesGasStrategy;
        if (strategy.kind === "UNAVAILABLE") {
            if (needs.gasVolume) {
                addSource("Sales gas is unavailable: neither FGST nor FGPT is available.");
            } else if (gasRevenueNeedsSource) {
                addSource(
                    "Sales gas is unavailable: enter a gas price of 0 to calculate without gas revenue.",
                    "gasPrice",
                );
            }
        } else {
            if (needs.gasRevenue && gasRevenue.needsPrice) {
                addInput("Enter a gas price, or 0 to omit gas revenue.", "gasPrice");
            }
            let hasUnresolvedComponent = false;
            if (strategy.kind === "DERIVED" && needsGasSource) {
                const assumptions = input.missingComponentAssumptions;
                if (!strategy.hasGasInjection && !assumptions?.assumeMissingInjectionAsZero) {
                    hasUnresolvedComponent = true;
                    addInput(
                        missingComponentMessage("Gas injection (FGIT)", "Assume no gas injection", needs.gasVolume),
                        "injection",
                    );
                }
                if (!strategy.hasGasConsumption && !assumptions?.assumeMissingConsumptionAsZero) {
                    hasUnresolvedComponent = true;
                    addInput(
                        missingComponentMessage("Gas consumption (FGCT)", "Assume no gas consumption", needs.gasVolume),
                        "consumption",
                    );
                }
            }
            // An unresolved component already explains the missing sales gas; its coverage is not yet defined.
            needsGasCoverage = needsGasSource && !hasUnresolvedComponent;
            if (needsGasCoverage && coverage && !coverage.some((entry) => entry.gas) && horizon) {
                addSource(coverageMessage("Sales gas", support!.gas, horizon));
            }
        }

        // Each product can be covered somewhere while no realization has both, which the results require.
        if (
            needsOilCoverage &&
            needsGasCoverage &&
            coverage &&
            coverage.some((entry) => entry.oil) &&
            coverage.some((entry) => entry.gas) &&
            !coverage.some((entry) => entry.oil && entry.gas) &&
            horizon
        ) {
            addSource(
                `No selected realization has both oil and sales gas source coverage between Jan ${horizon.startYear} and ${formatMonthIndex(horizon.endMonthIndex)}.`,
            );
        }
    }

    if (needs.validCostDraft && input.costDraftStatus === CostDraftStatus.INVALID) {
        addInput("Correct the cost schedule.", "costs");
    }
    if (
        needs.includedNonZeroCosts &&
        horizon &&
        !hasIncludedNonZeroCost(input.costProfile, horizon.startYear, horizon.endYear)
    ) {
        addInput("Enter a non-zero CAPEX or OPEX within the evaluation.", "costs");
    }

    if (input.earlyValue.enabled) {
        const earlyEndYear = input.earlyValue.endYear;
        if (earlyEndYear === null) {
            addInput("Early value: enter a Calculate through year.", "earlyYear");
        } else if (horizon && !isYearInHorizon(earlyEndYear, horizon)) {
            addInput(
                `Early value: choose a Calculate through year within ${horizon.startYear}-${horizon.endYear}.`,
                "earlyYear",
            );
        }
    }

    return { isLoading, issues };
}
