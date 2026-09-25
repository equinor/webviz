import { describe, expect, test } from "vitest";

import {
    CashFlowProfileType,
    EconomicMeasure,
    ResultMode,
    type CostProfileEntry,
} from "@modules/EconomicScreening/typesAndEnums";
import { isProductConfirmedAbsent } from "@modules/EconomicScreening/utils/monthlyEconomics";
import {
    MonthCoverage,
    monthIndexOf,
    type MonthlyProductionProfile,
} from "@modules/EconomicScreening/utils/monthlyProduction";
import {
    getResultRequirement,
    getSetupReadiness,
    hasIncludedNonZeroCost,
    parseCalendarYear,
    ResultRequirement,
    SetupIssueKind,
    suggestPredictionStartYears,
    summarizeSelectedProductSupport,
    type SelectedProductSupport,
    type SetupReadinessInput,
} from "@modules/EconomicScreening/utils/setupReadiness";
import { EMPTY_SOURCE_SNAPSHOT, SourceStatus } from "@modules/EconomicScreening/utils/sourceSnapshot";

/** Monthly profile from January of `firstYear`; `coverageOf` defaults to source-aligned. */
function profile(
    firstYear: number,
    volumes: number[],
    coverageOf: (month: number) => MonthCoverage = () => MonthCoverage.SOURCE_ALIGNED,
): MonthlyProductionProfile {
    return {
        months: volumes.map((volume, index) => ({
            year: firstYear + Math.floor(index / 12),
            month: (index % 12) + 1,
            volume,
            coverage: coverageOf(index),
        })),
        totalIncrement: volumes.reduce((sum, volume) => sum + volume, 0),
        rejection: null,
    };
}

const DERIVED_WITHOUT_FGCT = {
    kind: "DERIVED",
    hasGasProduction: true,
    hasGasInjection: true,
    hasGasConsumption: false,
} as const;

const PRODUCT_SUPPORT = { isConfirmedAbsent: false, firstEstablishedMonthIndex: monthIndexOf(2018, 1) };

function support(realizations: { oil: boolean; gas: boolean }[]): SelectedProductSupport {
    return { oil: PRODUCT_SUPPORT, gas: PRODUCT_SUPPORT, realizations };
}

const ALL_COVERED = support([
    { oil: true, gas: true },
    { oil: true, gas: true },
    { oil: true, gas: true },
]);
const NONE_COVERED = support([
    { oil: false, gas: false },
    { oil: false, gas: false },
    { oil: false, gas: false },
]);

function readyInput(overrides: Partial<SetupReadinessInput> = {}): SetupReadinessInput {
    return {
        hasEnsemble: true,
        vectorListStatus: "READY",
        snapshot: {
            ...EMPTY_SOURCE_SNAPSHOT,
            status: SourceStatus.READY,
            salesGasStrategy: DERIVED_WITHOUT_FGCT,
            envelopeEndMonthIndex: monthIndexOf(2020, 6),
        },
        hasOilVector: true,
        productSupport: ALL_COVERED,
        missingComponentAssumptions: undefined,
        predictionStartYear: null,
        oilPrice: null,
        gasPrice: null,
        costProfile: [],
        isCostProfileDraftValid: true,
        earlyValue: { enabled: false, endYear: null },
        requirement: ResultRequirement.FINANCIAL,
        ...overrides,
    };
}

const messages = (input: SetupReadinessInput) => getSetupReadiness(input).issues.map((issue) => issue.message);

describe("getSetupReadiness", () => {
    test("reports every known NPV requirement at once", () => {
        expect(getSetupReadiness(readyInput())).toEqual({
            isLoading: false,
            issues: [
                { kind: SetupIssueKind.INPUT, message: "Enter a prediction start year.", field: "predictionYear" },
                {
                    kind: SetupIssueKind.INPUT,
                    message: "Enter an oil price, or 0 to omit oil revenue.",
                    field: "oilPrice",
                },
                {
                    kind: SetupIssueKind.INPUT,
                    message: "Enter a gas price, or 0 to omit gas revenue.",
                    field: "gasPrice",
                },
                {
                    kind: SetupIssueKind.INPUT,
                    field: "consumption",
                    message:
                        "Gas consumption (FGCT) is missing: accept “Assume no gas consumption” or enter a gas price of 0.",
                },
            ],
        });
    });

    test("keeps the other requirements when only the oil price is resolved", () => {
        expect(messages(readyInput({ oilPrice: 50 }))).toEqual([
            "Enter a prediction start year.",
            "Enter a gas price, or 0 to omit gas revenue.",
            "Gas consumption (FGCT) is missing: accept “Assume no gas consumption” or enter a gas price of 0.",
        ]);
    });

    test("a zero gas price resolves gas revenue, but gas volumes still need the missing component", () => {
        expect(messages(readyInput({ predictionStartYear: 2018, oilPrice: 50, gasPrice: 0 }))).toEqual([]);
        expect(
            messages(
                readyInput({
                    predictionStartYear: 2018,
                    gasPrice: 0,
                    requirement: ResultRequirement.GAS_VOLUME,
                }),
            ),
        ).toEqual(["Gas consumption (FGCT) is missing: accept “Assume no gas consumption” to calculate sales gas."]);
    });

    test("an accepted assumption resolves the component for this input only", () => {
        const accepted = readyInput({
            predictionStartYear: 2018,
            oilPrice: 50,
            gasPrice: 0.2,
            missingComponentAssumptions: { assumeMissingConsumptionAsZero: true },
        });
        expect(messages(accepted)).toEqual([]);
        expect(messages({ ...accepted, missingComponentAssumptions: undefined })).toEqual([
            "Gas consumption (FGCT) is missing: accept “Assume no gas consumption” or enter a gas price of 0.",
        ]);
    });

    test("volume results need no prices, and break-even needs no oil price but needs included costs", () => {
        const base = readyInput({
            predictionStartYear: 2018,
            missingComponentAssumptions: { assumeMissingConsumptionAsZero: true },
        });
        expect(messages({ ...base, requirement: ResultRequirement.OIL_VOLUME })).toEqual([]);
        expect(messages({ ...base, requirement: ResultRequirement.OIL_AND_GAS_VOLUME })).toEqual([]);
        expect(messages({ ...base, requirement: ResultRequirement.BREAK_EVEN })).toEqual([
            "Enter a gas price, or 0 to omit gas revenue.",
            "Enter a non-zero CAPEX or OPEX within the evaluation.",
        ]);
        expect(
            messages({
                ...base,
                requirement: ResultRequirement.BREAK_EVEN,
                gasPrice: 0.2,
                costProfile: [{ year: 2019, capex: 10, opex: 0 }],
            }),
        ).toEqual([]);
    });

    test("confirmed-absent products need no price", () => {
        expect(
            messages(
                readyInput({
                    predictionStartYear: 2018,
                    gasPrice: 0,
                    productSupport: {
                        ...ALL_COVERED,
                        oil: { ...PRODUCT_SUPPORT, isConfirmedAbsent: true },
                    },
                }),
            ),
        ).toEqual([]);
    });

    test("does not report source-dependent requirements as satisfied while loading", () => {
        const loading = readyInput({
            vectorListStatus: "LOADING",
            snapshot: { ...EMPTY_SOURCE_SNAPSHOT, status: SourceStatus.LOADING },
            productSupport: null,
        });
        expect(getSetupReadiness(loading)).toEqual({
            isLoading: true,
            issues: [
                { kind: SetupIssueKind.INPUT, message: "Enter a prediction start year.", field: "predictionYear" },
            ],
        });
        const dataLoading = readyInput({
            snapshot: {
                ...EMPTY_SOURCE_SNAPSHOT,
                status: SourceStatus.LOADING,
                salesGasStrategy: DERIVED_WITHOUT_FGCT,
            },
            productSupport: null,
            predictionStartYear: 2018,
        });
        expect(getSetupReadiness(dataLoading).isLoading).toBe(true);
        expect(messages(dataLoading)).toContain("Enter an oil price, or 0 to omit oil revenue.");
    });

    test("reports products that no selected realization covers, with zero-price exemptions", () => {
        const beforeSource = readyInput({
            predictionStartYear: 2016,
            oilPrice: 50,
            gasPrice: 0.2,
            missingComponentAssumptions: { assumeMissingConsumptionAsZero: true },
            productSupport: NONE_COVERED,
        });
        expect(getSetupReadiness(beforeSource).issues).toEqual([
            {
                kind: SetupIssueKind.SOURCE,
                message:
                    "Oil source coverage is incomplete between Jan 2016 and Jun 2020 for every selected realization; supported data starts Jan 2018.",
            },
            {
                kind: SetupIssueKind.SOURCE,
                message:
                    "Sales gas source coverage is incomplete between Jan 2016 and Jun 2020 for every selected realization; supported data starts Jan 2018.",
            },
        ]);
        expect(messages({ ...beforeSource, gasPrice: 0 })).toEqual([
            "Oil source coverage is incomplete between Jan 2016 and Jun 2020 for every selected realization; supported data starts Jan 2018.",
        ]);
        expect(messages({ ...beforeSource, oilPrice: 0, gasPrice: 0 })).toEqual([]);
        // Break-even and volume results need the product's coverage regardless of its price.
        expect(
            messages({ ...beforeSource, oilPrice: 0, gasPrice: 0, requirement: ResultRequirement.BREAK_EVEN }),
        ).toContain(
            "Oil source coverage is incomplete between Jan 2016 and Jun 2020 for every selected realization; supported data starts Jan 2018.",
        );
        expect(messages({ ...beforeSource, requirement: ResultRequirement.GAS_VOLUME })).toEqual([
            "Sales gas source coverage is incomplete between Jan 2016 and Jun 2020 for every selected realization; supported data starts Jan 2018.",
        ]);
        // A realization with both products covered still produces results, so it is not a blocker here.
        expect(
            messages({
                ...beforeSource,
                productSupport: support([
                    { oil: true, gas: true },
                    { oil: false, gas: true },
                    { oil: false, gas: false },
                ]),
            }),
        ).toEqual([]);
        // An unresolved missing component already explains the missing sales gas.
        expect(messages({ ...beforeSource, oilPrice: 0, missingComponentAssumptions: undefined })).toEqual([
            "Gas consumption (FGCT) is missing: accept “Assume no gas consumption” or enter a gas price of 0.",
        ]);
    });

    test("requires the needed products to be covered in the same realization", () => {
        const disjoint = readyInput({
            predictionStartYear: 2018,
            oilPrice: 50,
            gasPrice: 0.2,
            costProfile: [{ year: 2018, capex: 100, opex: 0 }],
            missingComponentAssumptions: { assumeMissingConsumptionAsZero: true },
            productSupport: support([
                { oil: true, gas: false },
                { oil: false, gas: true },
            ]),
        });
        const noOverlap =
            "No selected realization has both oil and sales gas source coverage between Jan 2018 and Jun 2020.";
        expect(getSetupReadiness(disjoint).issues).toEqual([{ kind: SetupIssueKind.SOURCE, message: noOverlap }]);
        expect(messages({ ...disjoint, requirement: ResultRequirement.BREAK_EVEN })).toEqual([noOverlap]);
        expect(messages({ ...disjoint, requirement: ResultRequirement.OIL_AND_GAS_VOLUME })).toEqual([noOverlap]);
        // A zero price removes that product from the joint requirement.
        expect(messages({ ...disjoint, gasPrice: 0 })).toEqual([]);
        expect(messages({ ...disjoint, oilPrice: 0 })).toEqual([]);
        expect(messages({ ...disjoint, gasPrice: 0, requirement: ResultRequirement.BREAK_EVEN })).toEqual([]);
        // Single-product volume results need only their own product.
        expect(messages({ ...disjoint, requirement: ResultRequirement.OIL_VOLUME })).toEqual([]);
        expect(messages({ ...disjoint, requirement: ResultRequirement.GAS_VOLUME })).toEqual([]);
    });

    test("separates unavailable source data from missing inputs", () => {
        const unavailable = readyInput({
            predictionStartYear: 2018,
            oilPrice: 50,
            snapshot: {
                ...EMPTY_SOURCE_SNAPSHOT,
                status: SourceStatus.READY,
                salesGasStrategy: { kind: "UNAVAILABLE" },
                envelopeEndMonthIndex: monthIndexOf(2020, 6),
            },
        });
        expect(getSetupReadiness(unavailable).issues).toEqual([
            {
                kind: SetupIssueKind.SOURCE,
                message: "Sales gas is unavailable: enter a gas price of 0 to calculate without gas revenue.",
                field: "gasPrice",
            },
        ]);
        expect(messages({ ...unavailable, gasPrice: 0 })).toEqual([]);

        const failed = readyInput({
            snapshot: {
                ...EMPTY_SOURCE_SNAPSHOT,
                status: SourceStatus.ERROR,
                queryError: "Could not load vector data for FOPT.",
            },
            vectorListStatus: "READY",
        });
        expect(getSetupReadiness(failed).issues[1]).toEqual({
            kind: SetupIssueKind.SOURCE,
            message: "Could not load vector data for FOPT.",
        });

        expect(getSetupReadiness(readyInput({ predictionStartYear: 2021, oilPrice: 1, gasPrice: 0 })).issues).toEqual([
            {
                kind: SetupIssueKind.SOURCE,
                message: "The prediction start year 2021 is after the supported simulation end (Jun 2020).",
                field: "predictionYear",
            },
        ]);
    });

    test("reports invalid cost drafts and early-value years", () => {
        const base = readyInput({ predictionStartYear: 2018, oilPrice: 50, gasPrice: 0 });
        expect(messages({ ...base, isCostProfileDraftValid: false })).toEqual(["Finish or correct the cost schedule."]);
        expect(
            messages({ ...base, isCostProfileDraftValid: false, requirement: ResultRequirement.OIL_VOLUME }),
        ).toEqual([]);
        expect(messages({ ...base, earlyValue: { enabled: true, endYear: null } })).toEqual([
            "Early value: enter a Calculate through year.",
        ]);
        expect(messages({ ...base, earlyValue: { enabled: true, endYear: 2025 } })).toEqual([
            "Early value: choose a Calculate through year within 2018-2020.",
        ]);
        expect(messages({ ...base, earlyValue: { enabled: false, endYear: 2025 } })).toEqual([]);
    });
});

describe("getResultRequirement", () => {
    test("follows the selected measure or profile", () => {
        const profileType = CashFlowProfileType.ANNUAL_OIL_VOLUME;
        expect(getResultRequirement(ResultMode.DISTRIBUTION, EconomicMeasure.IRR, profileType)).toBe(
            ResultRequirement.FINANCIAL,
        );
        expect(getResultRequirement(ResultMode.DISTRIBUTION, EconomicMeasure.BREAK_EVEN_OIL_PRICE, profileType)).toBe(
            ResultRequirement.BREAK_EVEN,
        );
        expect(
            getResultRequirement(ResultMode.DISTRIBUTION, EconomicMeasure.DISCOUNTED_OIL_EQUIVALENTS, profileType),
        ).toBe(ResultRequirement.OIL_AND_GAS_VOLUME);
        expect(getResultRequirement(ResultMode.TIME_PROFILE, EconomicMeasure.NPV, profileType)).toBe(
            ResultRequirement.OIL_VOLUME,
        );
        expect(
            getResultRequirement(
                ResultMode.TIME_PROFILE,
                EconomicMeasure.DISCOUNTED_OIL_VOLUME,
                CashFlowProfileType.CUMULATIVE_DISCOUNTED_CASH_FLOW,
            ),
        ).toBe(ResultRequirement.FINANCIAL);
        expect(getResultRequirement(ResultMode.ALL_RESULTS, EconomicMeasure.DISCOUNTED_OIL_VOLUME, profileType)).toBe(
            ResultRequirement.FINANCIAL,
        );
    });
});

describe("suggestPredictionStartYears", () => {
    test("suggests years with covered Januaries, including zero-production years, through the envelope", () => {
        const oil = profile(2018, [...new Array(12).fill(0), ...new Array(18).fill(100)]);
        expect(
            suggestPredictionStartYears(
                [{ realization: 1, oilProfile: oil, salesGasProfile: null }],
                monthIndexOf(2020, 6),
            ),
        ).toEqual([2018, 2019, 2020]);
    });

    test("does not suggest uncovered, partial or out-of-envelope Januaries", () => {
        const partialStart = profile(2017, new Array(36).fill(10), (month) =>
            month === 0 ? MonthCoverage.PARTIAL : month === 12 ? MonthCoverage.UNSUPPORTED : MonthCoverage.INTERPOLATED,
        );
        expect(
            suggestPredictionStartYears(
                [{ realization: 1, oilProfile: partialStart, salesGasProfile: null }],
                monthIndexOf(2018, 12),
            ),
        ).toEqual([]);
        expect(
            suggestPredictionStartYears(
                [
                    { realization: 1, oilProfile: partialStart, salesGasProfile: null },
                    { realization: 2, oilProfile: null, salesGasProfile: profile(2018, new Array(24).fill(1)) },
                ],
                monthIndexOf(2019, 12),
            ),
        ).toEqual([2018, 2019]);
    });
});

describe("prediction and cost helpers", () => {
    test("parses whole four-digit years within the bounds only", () => {
        expect(parseCalendarYear(" 2031 ")).toBe(2031);
        expect(parseCalendarYear("1900")).toBe(1900);
        expect(parseCalendarYear("2201")).toBeNull();
        expect(parseCalendarYear("203")).toBeNull();
        expect(parseCalendarYear("2031.5")).toBeNull();
        expect(parseCalendarYear("")).toBeNull();
    });

    test("counts individual included non-zero entries, not a signed net sum", () => {
        const cancelling: CostProfileEntry[] = [
            { year: 2019, capex: 100, opex: 0 },
            { year: 2020, capex: -100, opex: 0 },
        ];
        expect(hasIncludedNonZeroCost(cancelling, 2018, 2020)).toBe(true);
        expect(hasIncludedNonZeroCost([{ year: 2016, capex: 7, opex: 0 }], 2018, 2020)).toBe(false);
        expect(hasIncludedNonZeroCost([{ year: 2018, capex: 0, opex: 0 }], 2018, 2020)).toBe(false);
    });

    test("summarizes coverage per selected realization from the given profiles only", () => {
        const full = profile(2018, new Array(30).fill(10));
        const short = profile(2018, new Array(30).fill(10), (month) =>
            month >= 24 ? MonthCoverage.UNSUPPORTED : MonthCoverage.SOURCE_ALIGNED,
        );
        const evaluationEnd = monthIndexOf(2020, 6);
        const disjoint = [
            { realization: 3, oilProfile: full, salesGasProfile: short },
            { realization: 8, oilProfile: short, salesGasProfile: full },
            { realization: 21, oilProfile: null, salesGasProfile: null },
        ];
        expect(summarizeSelectedProductSupport(disjoint, monthIndexOf(2018, 1), evaluationEnd)).toEqual({
            oil: { isConfirmedAbsent: false, firstEstablishedMonthIndex: monthIndexOf(2018, 1) },
            gas: { isConfirmedAbsent: false, firstEstablishedMonthIndex: monthIndexOf(2018, 1) },
            realizations: [
                { oil: true, gas: false },
                { oil: false, gas: true },
                { oil: false, gas: false },
            ],
        });
        expect(
            summarizeSelectedProductSupport(disjoint.slice(0, 2), monthIndexOf(2016, 1), evaluationEnd).realizations,
        ).toEqual([
            { oil: false, gas: false },
            { oil: false, gas: false },
        ]);
    });

    test("confirmed absence needs established zero months and no signed cancellation", () => {
        const start = monthIndexOf(2018, 1);
        const end = monthIndexOf(2018, 12);
        expect(isProductConfirmedAbsent(profile(2018, new Array(12).fill(0)), start, end)).toBe(true);
        expect(isProductConfirmedAbsent(profile(2018, [5, -5, ...new Array(10).fill(0)]), start, end)).toBe(false);
        expect(isProductConfirmedAbsent(profile(2018, new Array(11).fill(0)), start, end)).toBe(false);
        expect(isProductConfirmedAbsent(null, start, end)).toBe(false);
    });
});
