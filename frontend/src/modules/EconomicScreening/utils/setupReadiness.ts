import {
    CashFlowProfileType,
    EconomicMeasure,
    ResultMode,
    type CostProfileEntry,
    type EarlyValueConfiguration,
} from "@modules/EconomicScreening/typesAndEnums";

import { isProductConfirmedAbsent, isProductEstablished } from "./monthlyEconomics";
import { isMonthCoverageEstablished, monthIndexOf, type MonthlyProductionProfile } from "./monthlyProduction";
import { SourceStatus, type EconomicSourceSnapshot, type RealizationProfiles } from "./sourceSnapshot";
import type { MissingComponentAssumptions } from "./vectorResolution";

export const MIN_CALENDAR_YEAR = 1900;
export const MAX_CALENDAR_YEAR = 2200;

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonthIndex(monthIndex: number): string {
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

/** A whole calendar year within the accepted bounds, or null for anything else. */
export function parseCalendarYear(text: string): number | null {
    const trimmed = text.trim();
    if (!/^\d{4}$/.test(trimmed)) {
        return null;
    }
    const year = Number(trimmed);
    return year >= MIN_CALENDAR_YEAR && year <= MAX_CALENDAR_YEAR ? year : null;
}

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

/** Individual included entries decide; signed entries that cancel are still non-zero costs. */
export function hasIncludedNonZeroCost(costProfile: CostProfileEntry[], startYear: number, endYear: number): boolean {
    return costProfile.some(
        (entry) => entry.year >= startYear && entry.year <= endYear && (entry.capex !== 0 || entry.opex !== 0),
    );
}

/** What the selected result needs from the setup, following the existing metric eligibility rules. */
export enum ResultRequirement {
    FINANCIAL = "FINANCIAL",
    BREAK_EVEN = "BREAK_EVEN",
    OIL_VOLUME = "OIL_VOLUME",
    GAS_VOLUME = "GAS_VOLUME",
    OIL_AND_GAS_VOLUME = "OIL_AND_GAS_VOLUME",
}

export function getResultRequirement(
    resultMode: ResultMode,
    selectedMeasure: EconomicMeasure,
    cashFlowProfileType: CashFlowProfileType,
): ResultRequirement {
    if (resultMode === ResultMode.TIME_PROFILE) {
        switch (cashFlowProfileType) {
            case CashFlowProfileType.ANNUAL_OIL_VOLUME:
                return ResultRequirement.OIL_VOLUME;
            case CashFlowProfileType.ANNUAL_SALES_GAS_VOLUME:
                return ResultRequirement.GAS_VOLUME;
            default:
                return ResultRequirement.FINANCIAL;
        }
    }
    if (resultMode === ResultMode.ALL_RESULTS) {
        return ResultRequirement.FINANCIAL;
    }
    switch (selectedMeasure) {
        case EconomicMeasure.NPV:
        case EconomicMeasure.IRR:
            return ResultRequirement.FINANCIAL;
        case EconomicMeasure.BREAK_EVEN_OIL_PRICE:
            return ResultRequirement.BREAK_EVEN;
        case EconomicMeasure.DISCOUNTED_OIL_VOLUME:
        case EconomicMeasure.UNDISCOUNTED_OIL_VOLUME:
            return ResultRequirement.OIL_VOLUME;
        case EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME:
        case EconomicMeasure.UNDISCOUNTED_SALES_GAS_VOLUME:
            return ResultRequirement.GAS_VOLUME;
        case EconomicMeasure.DISCOUNTED_OIL_EQUIVALENTS:
            return ResultRequirement.OIL_AND_GAS_VOLUME;
    }
}

export enum SetupIssueKind {
    /** Resolved by an entry or choice in Settings. */
    INPUT = "INPUT",
    /** Source data is unavailable, failed or does not support the entered setup. */
    SOURCE = "SOURCE",
}

export type SetupIssue = { kind: SetupIssueKind; message: string };

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

function coverageMessage(productLabel: string, support: ProductSupport, startYear: number, endMonthIndex: number) {
    const startMonthIndex = monthIndexOf(startYear, 1);
    const sourceStart =
        support.firstEstablishedMonthIndex !== null && support.firstEstablishedMonthIndex > startMonthIndex
            ? `; supported data starts ${formatMonthIndex(support.firstEstablishedMonthIndex)}`
            : "";
    return `${productLabel} source coverage is incomplete between Jan ${startYear} and ${formatMonthIndex(endMonthIndex)} for every selected realization${sourceStart}.`;
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
    predictionStartYear: number | null;
    oilPrice: number | null;
    gasPrice: number | null;
    costProfile: CostProfileEntry[];
    isCostProfileDraftValid: boolean;
    earlyValue: EarlyValueConfiguration;
    requirement: ResultRequirement;
};

function missingComponentMessage(componentLabel: string, checkboxLabel: string, needsGasVolume: boolean): string {
    return needsGasVolume
        ? `${componentLabel} is missing: accept “${checkboxLabel}” to calculate sales gas.`
        : `${componentLabel} is missing: accept “${checkboxLabel}” or enter a gas price of 0.`;
}

/**
 * Every currently known requirement of the selected result, reported together. Mirrors the calculation's
 * eligibility rules: a zero price omits that revenue, confirmed-absent products need no price, break-even
 * needs no oil price, and volume results need no prices.
 */
export function getSetupReadiness(input: SetupReadinessInput): SetupReadiness {
    if (!input.hasEnsemble) {
        return { isLoading: false, issues: [{ kind: SetupIssueKind.INPUT, message: "Select an ensemble." }] };
    }
    const { snapshot, requirement, predictionStartYear, oilPrice, gasPrice } = input;
    const issues: SetupIssue[] = [];
    const addInput = (message: string) => issues.push({ kind: SetupIssueKind.INPUT, message });
    const addSource = (message: string) => issues.push({ kind: SetupIssueKind.SOURCE, message });

    const isLoading =
        input.vectorListStatus === "LOADING" || snapshot.status === SourceStatus.LOADING || snapshot.isFetching;
    const isReady = snapshot.status === SourceStatus.READY;
    const envelopeEndMonthIndex = isReady ? snapshot.envelopeEndMonthIndex : null;
    const evaluationEndYear = envelopeEndMonthIndex === null ? null : Math.floor(envelopeEndMonthIndex / 12);
    const isStartWithinSource =
        predictionStartYear !== null &&
        envelopeEndMonthIndex !== null &&
        monthIndexOf(predictionStartYear, 1) <= envelopeEndMonthIndex;

    if (predictionStartYear === null) {
        addInput("Enter a prediction start year.");
    } else if (isReady) {
        const horizonError = getPredictionHorizonError(predictionStartYear, envelopeEndMonthIndex);
        if (horizonError) {
            addSource(horizonError);
        }
    }

    if (input.vectorListStatus === "ERROR" || snapshot.status === SourceStatus.ERROR) {
        addSource(snapshot.queryError ?? "Could not load the source data.");
    } else if (snapshot.status === SourceStatus.NO_SOURCES) {
        addSource("No oil or sales-gas vectors are available for this ensemble.");
    }

    const isFinancial = requirement === ResultRequirement.FINANCIAL;
    const needsGasRevenue = isFinancial || requirement === ResultRequirement.BREAK_EVEN;
    const needsOilVolume =
        requirement === ResultRequirement.BREAK_EVEN ||
        requirement === ResultRequirement.OIL_VOLUME ||
        requirement === ResultRequirement.OIL_AND_GAS_VOLUME;
    const needsGasVolume =
        requirement === ResultRequirement.GAS_VOLUME || requirement === ResultRequirement.OIL_AND_GAS_VOLUME;

    if (input.vectorListStatus === "READY" && snapshot.status !== SourceStatus.NO_SOURCES) {
        const support = input.productSupport;
        const coverage = support?.realizations;
        const needsOilCoverage = input.hasOilVector && (needsOilVolume || (isFinancial && oilPrice !== 0));
        let needsGasCoverage = false;
        if (!input.hasOilVector) {
            if (needsOilVolume || (isFinancial && oilPrice !== 0)) {
                addSource("Oil production (FOPT) is not available for this ensemble.");
            }
        } else {
            if (isFinancial && oilPrice === null && !support?.oil.isConfirmedAbsent) {
                addInput("Enter an oil price, or 0 to omit oil revenue.");
            }
            if (
                needsOilCoverage &&
                coverage &&
                !coverage.some((entry) => entry.oil) &&
                predictionStartYear !== null &&
                envelopeEndMonthIndex !== null
            ) {
                addSource(coverageMessage("Oil", support!.oil, predictionStartYear, envelopeEndMonthIndex));
            }
        }

        const gasRevenueNeedsSource = needsGasRevenue && gasPrice !== 0;
        const needsGasSource = needsGasVolume || gasRevenueNeedsSource;
        const strategy = snapshot.salesGasStrategy;
        if (strategy.kind === "UNAVAILABLE") {
            if (needsGasVolume) {
                addSource("Sales gas is unavailable: neither FGST nor FGPT is available.");
            } else if (gasRevenueNeedsSource) {
                addSource("Sales gas is unavailable: enter a gas price of 0 to calculate without gas revenue.");
            }
        } else {
            if (gasRevenueNeedsSource && gasPrice === null && !support?.gas.isConfirmedAbsent) {
                addInput("Enter a gas price, or 0 to omit gas revenue.");
            }
            let hasUnresolvedComponent = false;
            if (strategy.kind === "DERIVED" && needsGasSource) {
                const assumptions = input.missingComponentAssumptions;
                if (!strategy.hasGasInjection && !assumptions?.assumeMissingInjectionAsZero) {
                    hasUnresolvedComponent = true;
                    addInput(
                        missingComponentMessage("Gas injection (FGIT)", "Assume no gas injection", needsGasVolume),
                    );
                }
                if (!strategy.hasGasConsumption && !assumptions?.assumeMissingConsumptionAsZero) {
                    hasUnresolvedComponent = true;
                    addInput(
                        missingComponentMessage("Gas consumption (FGCT)", "Assume no gas consumption", needsGasVolume),
                    );
                }
            }
            // An unresolved component already explains the missing sales gas; its coverage is not yet defined.
            needsGasCoverage = needsGasSource && !hasUnresolvedComponent;
            if (
                needsGasCoverage &&
                coverage &&
                !coverage.some((entry) => entry.gas) &&
                predictionStartYear !== null &&
                envelopeEndMonthIndex !== null
            ) {
                addSource(coverageMessage("Sales gas", support!.gas, predictionStartYear, envelopeEndMonthIndex));
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
            predictionStartYear !== null &&
            envelopeEndMonthIndex !== null
        ) {
            addSource(
                `No selected realization has both oil and sales gas source coverage between Jan ${predictionStartYear} and ${formatMonthIndex(envelopeEndMonthIndex)}.`,
            );
        }
    }

    if (needsGasRevenue && !input.isCostProfileDraftValid) {
        addInput("Finish or correct the cost schedule.");
    }
    if (
        requirement === ResultRequirement.BREAK_EVEN &&
        isStartWithinSource &&
        evaluationEndYear !== null &&
        !hasIncludedNonZeroCost(input.costProfile, predictionStartYear, evaluationEndYear)
    ) {
        addInput("Enter a non-zero CAPEX or OPEX within the evaluation.");
    }

    if (input.earlyValue.enabled) {
        const earlyEndYear = input.earlyValue.endYear;
        if (earlyEndYear === null) {
            addInput("Early value: enter a Calculate through year.");
        } else if (
            isStartWithinSource &&
            evaluationEndYear !== null &&
            (earlyEndYear < predictionStartYear || earlyEndYear > evaluationEndYear)
        ) {
            addInput(
                `Early value: choose a Calculate through year within ${predictionStartYear}-${evaluationEndYear}.`,
            );
        }
    }

    return { isLoading, issues };
}
