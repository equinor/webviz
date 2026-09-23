import { describe, expect, test } from "vitest";

import type {
    SourceCoverageRole_api,
    VectorRealizationData_api,
    VectorSourceCoverage_api,
    VectorSourceSummary_api,
} from "@api";
import { SourceCoverageIntervalStatus_api, SourceCoverageInterpolationMethod_api } from "@api";
import {
    adaptSourceCoverage,
    aggregateMonthlyVolumesByYear,
    computeMonthlyVolumesFromCumulative,
    isMonthCoverageEstablished,
    lastSupportedMonthIndex,
    MonthCoverage,
    monthIndexOf,
    MonthlySamplingRejection,
    monthStartUtcMs,
    SourceKind,
} from "@modules/EconomicScreening/utils/monthlyProduction";
import {
    countCumulativeVectorNonZeroRealizations,
    determineSalesGasStrategy,
    deriveSalesGasCumulative,
    isCumulativeVectorAllZero,
    summarizeCumulativeVectorTerminals,
} from "@modules/EconomicScreening/utils/vectorResolution";

function makeVectorData(realization: number, timestampsUtcMs: number[], values: number[]): VectorRealizationData_api {
    return {
        realization,
        timestampsUtcMs,
        values,
        unit: "SM3",
        isRate: false,
    } as VectorRealizationData_api;
}

describe("determineSalesGasStrategy", () => {
    test("prefers FGST when available", () => {
        expect(determineSalesGasStrategy(["FOPT", "FGST", "FGPT", "FGCT"])).toEqual({
            kind: "DIRECT",
            hasGasConsumption: true,
        });
    });

    test("reports unavailable consumption even when FGST is used directly", () => {
        expect(determineSalesGasStrategy(["FOPT", "FGST", "FGPT"])).toEqual({
            kind: "DIRECT",
            hasGasConsumption: false,
        });
    });

    test("falls back to deriving from the gas components", () => {
        expect(determineSalesGasStrategy(["FOPT", "FGPT", "FGIT"])).toEqual({
            kind: "DERIVED",
            hasGasProduction: true,
            hasGasInjection: true,
            hasGasConsumption: false,
        });
    });

    test("is unavailable without FGST and FGPT", () => {
        expect(determineSalesGasStrategy(["FOPT"])).toEqual({ kind: "UNAVAILABLE" });
    });
});

describe("deriveSalesGasCumulative", () => {
    const timestamps = [0, 1000];

    test("subtracts injection and consumption from production", () => {
        const result = deriveSalesGasCumulative(
            [makeVectorData(0, timestamps, [100, 200])],
            [makeVectorData(0, timestamps, [10, 20])],
            [makeVectorData(0, timestamps, [1, 2])],
        );

        expect(result.series).toMatchObject([{ realization: 0, timestampsUtcMs: timestamps, values: [89, 178] }]);
    });

    test("does not treat an unavailable component as zero without an explicit assumption", () => {
        const result = deriveSalesGasCumulative([makeVectorData(0, timestamps, [100, 200])], [], []);

        expect(result.series).toEqual([]);
        expect(result.missingInjectionRealizations).toEqual([0]);
        expect(result.missingConsumptionRealizations).toEqual([0]);
    });

    test("aligns components on timestamps rather than position", () => {
        const result = deriveSalesGasCumulative(
            [makeVectorData(0, [0, 1000], [100, 200])],
            [makeVectorData(0, [1000], [50])],
            [],
            { assumeMissingConsumptionAsZero: true },
        );

        expect(result.series).toEqual([]);
        expect(result.incompleteInjectionRealizations).toEqual([0]);
    });

    test("matches components by realization", () => {
        const result = deriveSalesGasCumulative(
            [makeVectorData(0, timestamps, [100, 200]), makeVectorData(1, timestamps, [300, 400])],
            [makeVectorData(1, timestamps, [30, 40])],
            [],
            { assumeMissingConsumptionAsZero: true },
        );

        expect(result.series).toMatchObject([{ realization: 1, timestampsUtcMs: timestamps, values: [270, 360] }]);
        expect(result.missingInjectionRealizations).toEqual([0]);
    });

    test("uses an explicitly accepted missing-component assumption only for an absent vector", () => {
        const result = deriveSalesGasCumulative(
            [makeVectorData(0, timestamps, [100, 200])],
            [],
            [makeVectorData(0, timestamps, [1, 2])],
            { assumeMissingInjectionAsZero: true },
        );

        expect(result.series).toMatchObject([{ realization: 0, timestampsUtcMs: timestamps, values: [99, 198] }]);
    });
});

describe("isCumulativeVectorAllZero", () => {
    test("is true when every realization ends at zero", () => {
        expect(isCumulativeVectorAllZero([makeVectorData(0, [0, 1], [0, 0])])).toBe(true);
    });

    test("is false when any realization ends above zero", () => {
        expect(isCumulativeVectorAllZero([makeVectorData(0, [0, 1], [0, 0]), makeVectorData(1, [0, 1], [0, 5])])).toBe(
            false,
        );
    });

    test("is false for no data because zero consumption is not confirmed", () => {
        expect(isCumulativeVectorAllZero([])).toBe(false);
    });
});

test("counts realizations with non-zero terminal consumption", () => {
    expect(
        countCumulativeVectorNonZeroRealizations([
            makeVectorData(1, [0, 1], [0, 0]),
            makeVectorData(2, [0, 1], [0, 5]),
            makeVectorData(3, [0, 1], [0, -2]),
        ]),
    ).toBe(2);
});

describe("summarizeCumulativeVectorTerminals", () => {
    test("reports missing, empty, and non-finite terminals as incomplete", () => {
        expect(
            summarizeCumulativeVectorTerminals(
                [
                    makeVectorData(1, [0, 1], [0, 0]),
                    makeVectorData(2, [], []),
                    makeVectorData(3, [0, 1], [0, Number.NaN]),
                ],
                [1, 2, 3, 4],
            ),
        ).toEqual({ nonZeroCount: 0, zeroCount: 1, missingOrInvalidRealizations: [2, 3, 4] });
    });

    test("confirms zero consumption only for a complete selected population", () => {
        expect(
            summarizeCumulativeVectorTerminals(
                [makeVectorData(1, [0, 1], [0, 0]), makeVectorData(2, [0, 1], [0, 0])],
                [1, 2],
            ),
        ).toEqual({ nonZeroCount: 0, zeroCount: 2, missingOrInvalidRealizations: [] });
    });
});

const DAY_MS = 86_400_000;

function ms(isoDate: string): number {
    return Date.parse(`${isoDate}T00:00:00Z`);
}

type IntervalStatus = `${SourceCoverageIntervalStatus_api}`;

/**
 * Builds an API-shaped `sourceCoverage` payload with the backend's clipping rule: supported bounds are
 * the positive-duration intersection of each interval with the common range of all sources.
 */
function makeCoverage(
    timestampsUtcMs: number[],
    sources: VectorSourceSummary_api[],
    statuses: IntervalStatus[],
): VectorSourceCoverage_api {
    const commonStart = Math.max(...sources.map((source) => source.firstTimestampUtcMs));
    const commonEnd = Math.min(...sources.map((source) => source.lastTimestampUtcMs));
    return {
        interpolationMethod: SourceCoverageInterpolationMethod_api.LINEAR,
        sources,
        intervals: statuses.map((status, index) => {
            const start = Math.max(timestampsUtcMs[index], commonStart);
            const end = Math.min(timestampsUtcMs[index + 1], commonEnd);
            return {
                status: status as SourceCoverageIntervalStatus_api,
                supportedStartUtcMs: start < end ? start : null,
                supportedEndUtcMs: start < end ? end : null,
            };
        }),
    };
}

function source(
    role: `${SourceCoverageRole_api}`,
    firstIsoDate: string,
    lastIsoDate: string,
    sampleCount: number,
    maxSampleGapMs: number | null,
): VectorSourceSummary_api {
    return {
        role: role as SourceCoverageRole_api,
        firstTimestampUtcMs: ms(firstIsoDate),
        lastTimestampUtcMs: ms(lastIsoDate),
        sampleCount,
        maxSampleGapMs,
    };
}

function makeCoveredVectorData(
    realization: number,
    isoDates: string[],
    values: number[],
    sources: VectorSourceSummary_api[],
    statuses: IntervalStatus[],
): VectorRealizationData_api {
    const timestampsUtcMs = isoDates.map(ms);
    return {
        realization,
        timestampsUtcMs,
        values,
        unit: "SM3",
        isRate: false,
        derivedVectorInfo: null,
        sourceCoverage: makeCoverage(timestampsUtcMs, sources, statuses),
    };
}

/** Mirrors realization 3 of the backend route test for partial first and last months. */
const REGULAR_PARTIAL_EDGES = makeCoveredVectorData(
    3,
    ["2020-01-01", "2020-02-01", "2020-03-01", "2020-04-01"],
    [0, 160, 450, 600],
    [source("REGULAR", "2020-01-16", "2020-03-16", 4, 29 * DAY_MS)],
    ["PARTIAL", "SOURCE_ALIGNED", "PARTIAL"],
);

/** Mirrors realization 0 of the backend delta route test: comparison ends 15 February. */
const DELTA_PARTIAL_END = makeCoveredVectorData(
    0,
    ["2020-01-01", "2020-02-01", "2020-03-01"],
    [0, 50, 70],
    [
        source("COMPARISON", "2020-01-01", "2020-02-15", 3, 31 * DAY_MS),
        source("REFERENCE", "2020-01-01", "2020-03-01", 3, 31 * DAY_MS),
    ],
    ["SOURCE_ALIGNED", "PARTIAL"],
);

function profileOf(data: VectorRealizationData_api, sourceKind = SourceKind.REGULAR) {
    return computeMonthlyVolumesFromCumulative(
        data.timestampsUtcMs,
        data.values,
        adaptSourceCoverage(data, sourceKind).intervalCoverage,
    );
}

describe("adaptSourceCoverage", () => {
    test("maps backend statuses and keeps partial edge volumes visible and conserved", () => {
        const adapted = adaptSourceCoverage(REGULAR_PARTIAL_EDGES, SourceKind.REGULAR);
        const profile = profileOf(REGULAR_PARTIAL_EDGES);

        expect(adapted.isVerified).toBe(true);
        expect(adapted.intervalCoverage).toEqual([
            MonthCoverage.PARTIAL,
            MonthCoverage.SOURCE_ALIGNED,
            MonthCoverage.PARTIAL,
        ]);
        expect(profile.months.map((entry) => entry.volume)).toEqual([160, 290, 150]);
        expect(profile.totalIncrement).toBe(600);
        expect(profile.months.map((entry) => isMonthCoverageEstablished(entry.coverage))).toEqual([false, true, false]);
        // Support ends on 16 March, not at the padded 1 April sample; the partial month is March.
        expect(adapted.supportEndUtcMs).toBe(ms("2020-03-16"));
        expect(lastSupportedMonthIndex(adapted.supportEndUtcMs!)).toBe(monthIndexOf(2020, 3));
    });

    test("treats a 1 January terminal sample as closing December without inventing January", () => {
        const data = makeCoveredVectorData(
            7,
            ["2030-11-01", "2030-12-01", "2031-01-01"],
            [0, 31, 62],
            [source("REGULAR", "2030-11-01", "2031-01-01", 3, 31 * DAY_MS)],
            ["SOURCE_ALIGNED", "SOURCE_ALIGNED"],
        );
        const adapted = adaptSourceCoverage(data, SourceKind.REGULAR);

        expect(profileOf(data).months.map((entry) => [entry.year, entry.month])).toEqual([
            [2030, 11],
            [2030, 12],
        ]);
        expect(lastSupportedMonthIndex(adapted.supportEndUtcMs!)).toBe(monthIndexOf(2030, 12));
    });

    test("accepts sparse annual samples as interpolated, not source-aligned", () => {
        const isoDates = Array.from({ length: 13 }, (_, index) =>
            new Date(monthStartUtcMs(2030, index + 1)).toISOString().slice(0, 10),
        );
        const data = makeCoveredVectorData(
            1,
            isoDates,
            isoDates.map((_, index) => index * 100),
            [source("REGULAR", "2030-01-01", "2031-01-01", 2, 365 * DAY_MS)],
            new Array(12).fill("INTERPOLATED"),
        );

        const profile = profileOf(data);
        expect(profile.months).toHaveLength(12);
        expect(profile.months.every((entry) => entry.coverage === MonthCoverage.INTERPOLATED)).toBe(true);
        expect(profile.months.every((entry) => isMonthCoverageEstablished(entry.coverage))).toBe(true);
    });

    test("marks a single-sample source as unsupported with no support end", () => {
        const data = makeCoveredVectorData(
            0,
            ["2020-01-01", "2020-02-01"],
            [5, 5],
            [source("REGULAR", "2020-01-15", "2020-01-15", 1, null)],
            ["UNSUPPORTED"],
        );
        const adapted = adaptSourceCoverage(data, SourceKind.REGULAR);

        expect(adapted.intervalCoverage).toEqual([MonthCoverage.UNSUPPORTED]);
        expect(adapted.supportEndUtcMs).toBeNull();
    });

    test("uses both delta constituents and never treats partial delta support as complete", () => {
        const adapted = adaptSourceCoverage(DELTA_PARTIAL_END, SourceKind.DELTA);

        expect(adapted.intervalCoverage).toEqual([MonthCoverage.SOURCE_ALIGNED, MonthCoverage.PARTIAL]);
        expect(adapted.supportEndUtcMs).toBe(ms("2020-02-15"));
        // The February increment keeps the legacy subtraction; it is not relabeled as a 1-15 February volume.
        expect(profileOf(DELTA_PARTIAL_END, SourceKind.DELTA).months[1]).toEqual({
            year: 2020,
            month: 2,
            volume: 20,
            coverage: MonthCoverage.PARTIAL,
        });
    });

    test.each<[string, (data: VectorRealizationData_api) => VectorRealizationData_api, SourceKind?]>([
        [
            "an older server omits sourceCoverage",
            (data) => {
                const withoutCoverage = { ...data };
                delete withoutCoverage.sourceCoverage;
                return withoutCoverage;
            },
        ],
        ["sourceCoverage is null", (data) => ({ ...data, sourceCoverage: null })],
        [
            "the interval count does not match the timestamps",
            (data) => ({
                ...data,
                sourceCoverage: { ...data.sourceCoverage!, intervals: data.sourceCoverage!.intervals.slice(1) },
            }),
        ],
        [
            "an interval claims support outside the source range",
            (data) => ({
                ...data,
                sourceCoverage: {
                    ...data.sourceCoverage!,
                    intervals: data.sourceCoverage!.intervals.map((interval, index) =>
                        index === 0
                            ? {
                                  status: SourceCoverageIntervalStatus_api.SOURCE_ALIGNED,
                                  supportedStartUtcMs: ms("2020-01-01"),
                                  supportedEndUtcMs: ms("2020-02-01"),
                              }
                            : interval,
                    ),
                },
            }),
        ],
        [
            "partial bounds are not the clipped common support",
            (data) => ({
                ...data,
                sourceCoverage: {
                    ...data.sourceCoverage!,
                    intervals: data.sourceCoverage!.intervals.map((interval, index) =>
                        index === 2 ? { ...interval, supportedEndUtcMs: ms("2020-04-01") } : interval,
                    ),
                },
            }),
        ],
        [
            "a status is unknown",
            (data) => ({
                ...data,
                sourceCoverage: {
                    ...data.sourceCoverage!,
                    intervals: data.sourceCoverage!.intervals.map((interval) => ({
                        ...interval,
                        status: "OBSERVED" as SourceCoverageIntervalStatus_api,
                    })),
                },
            }),
        ],
        [
            "a source bound is not finite",
            (data) => ({
                ...data,
                sourceCoverage: {
                    ...data.sourceCoverage!,
                    sources: [{ ...data.sourceCoverage!.sources[0], firstTimestampUtcMs: Number.NaN }],
                },
            }),
        ],
        [
            "a source reports no samples",
            (data) => ({
                ...data,
                sourceCoverage: {
                    ...data.sourceCoverage!,
                    sources: [{ ...data.sourceCoverage!.sources[0], sampleCount: 0 }],
                },
            }),
        ],
        ["regular metadata is read as delta metadata", (data) => data, SourceKind.DELTA],
    ])("leaves every interval unverified when %s", (_description, mutate, sourceKind = SourceKind.REGULAR) => {
        const adapted = adaptSourceCoverage(mutate(REGULAR_PARTIAL_EDGES), sourceKind);

        expect(adapted.isVerified).toBe(false);
        expect(adapted.supportEndUtcMs).toBeNull();
        expect(adapted.intervalCoverage).toEqual(new Array(3).fill(MonthCoverage.UNVERIFIED));
    });

    test("rejects delta metadata without a reference source", () => {
        const withoutReference = {
            ...DELTA_PARTIAL_END,
            sourceCoverage: {
                ...DELTA_PARTIAL_END.sourceCoverage!,
                sources: [DELTA_PARTIAL_END.sourceCoverage!.sources[0]],
            },
        };

        expect(adaptSourceCoverage(withoutReference, SourceKind.DELTA).isVerified).toBe(false);
        expect(adaptSourceCoverage(DELTA_PARTIAL_END, SourceKind.REGULAR).isVerified).toBe(false);
    });
});

describe("derived sales-gas coverage", () => {
    const dates = ["2030-01-01", "2030-02-01", "2030-03-01"];
    const fullSource = [source("REGULAR", "2030-01-01", "2030-03-01", 3, 31 * DAY_MS)];

    test("keeps a partial component interval after subtraction and takes the earliest support end", () => {
        const production = makeCoveredVectorData(4, dates, [0, 100, 200], fullSource, [
            "SOURCE_ALIGNED",
            "SOURCE_ALIGNED",
        ]);
        const injection = makeCoveredVectorData(
            4,
            dates,
            [0, 10, 15],
            [source("REGULAR", "2030-01-01", "2030-02-20", 3, 31 * DAY_MS)],
            ["SOURCE_ALIGNED", "PARTIAL"],
        );

        const [series] = deriveSalesGasCumulative([production], [injection], [], {
            assumeMissingConsumptionAsZero: true,
        }).series;

        expect(series.values).toEqual([0, 90, 185]);
        expect(series.intervalCoverage).toEqual([MonthCoverage.SOURCE_ALIGNED, MonthCoverage.PARTIAL]);
        expect(series.supportEndUtcMs).toBe(ms("2030-02-20"));
    });

    test("leaves derived gas unverified when a component lacks coverage metadata", () => {
        const production = makeCoveredVectorData(4, dates, [0, 100, 200], fullSource, [
            "SOURCE_ALIGNED",
            "SOURCE_ALIGNED",
        ]);
        const consumption = makeVectorData(4, dates.map(ms), [0, 1, 2]);

        const [series] = deriveSalesGasCumulative([production], [], [consumption], {
            assumeMissingInjectionAsZero: true,
        }).series;

        expect(series.intervalCoverage).toEqual([MonthCoverage.UNVERIFIED, MonthCoverage.UNVERIFIED]);
        expect(series.supportEndUtcMs).toBeNull();
    });

    test("matches component intervals by date when the component starts earlier", () => {
        const production = makeCoveredVectorData(4, dates.slice(1), [0, 100], fullSource, ["INTERPOLATED"]);
        const injection = makeCoveredVectorData(
            4,
            dates,
            [0, 0, 10],
            [source("REGULAR", "2030-01-15", "2030-03-01", 3, 31 * DAY_MS)],
            ["PARTIAL", "SOURCE_ALIGNED"],
        );

        const [series] = deriveSalesGasCumulative([production], [injection], [], {
            assumeMissingConsumptionAsZero: true,
        }).series;

        expect(series.values).toEqual([0, 90]);
        expect(series.intervalCoverage).toEqual([MonthCoverage.INTERPOLATED]);
    });
});

describe("computeMonthlyVolumesFromCumulative", () => {
    test("rejects sampling that is not a consecutive series of month starts", () => {
        expect(
            computeMonthlyVolumesFromCumulative([Date.UTC(2030, 0, 1), Date.UTC(2031, 0, 1)], [0, 100]).rejection,
        ).toBe(MonthlySamplingRejection.NON_CONSECUTIVE_MONTHS);
        expect(
            computeMonthlyVolumesFromCumulative([Date.UTC(2030, 0, 15), Date.UTC(2030, 1, 15)], [0, 100]).rejection,
        ).toBe(MonthlySamplingRejection.NOT_MONTH_START);
        expect(computeMonthlyVolumesFromCumulative([monthStartUtcMs(2030, 1)], [0]).rejection).toBe(
            MonthlySamplingRejection.TOO_FEW_SAMPLES,
        );
        expect(computeMonthlyVolumesFromCumulative([monthStartUtcMs(2030, 1)], [0, 1]).rejection).toBe(
            MonthlySamplingRejection.LENGTH_MISMATCH,
        );
        expect(
            computeMonthlyVolumesFromCumulative([monthStartUtcMs(2030, 1), monthStartUtcMs(2030, 2)], [0, Number.NaN])
                .rejection,
        ).toBe(MonthlySamplingRejection.NON_FINITE_SAMPLE);
    });

    test("keeps signed delta increments and unequal realization coverage separate", () => {
        const timestamps = [1, 2, 3, 4].map((month) => monthStartUtcMs(2030, month));
        const aligned = [MonthCoverage.SOURCE_ALIGNED, MonthCoverage.SOURCE_ALIGNED, MonthCoverage.SOURCE_ALIGNED];
        const longProfile = computeMonthlyVolumesFromCumulative(timestamps, [0, -10, -25, -25], aligned);
        const shortProfile = computeMonthlyVolumesFromCumulative(
            timestamps.slice(0, 3),
            [0, -10, -25],
            aligned.slice(1),
        );

        expect(longProfile.months.map((entry) => entry.volume)).toEqual([-10, -15, 0]);
        expect(shortProfile.months).toHaveLength(2);
        expect(longProfile.months.every((entry) => entry.coverage === MonthCoverage.SOURCE_ALIGNED)).toBe(true);
        expect(aggregateMonthlyVolumesByYear(shortProfile.months)).toEqual([
            { year: 2030, volume: -25, isCoverageEstablished: true, monthCount: 2 },
        ]);
    });

    test("leaves increments unverified when the coverage length does not match", () => {
        const timestamps = [1, 2, 3].map((month) => monthStartUtcMs(2030, month));
        const profile = computeMonthlyVolumesFromCumulative(timestamps, [0, 1, 2], [MonthCoverage.SOURCE_ALIGNED]);

        expect(profile.months.map((entry) => entry.coverage)).toEqual([
            MonthCoverage.UNVERIFIED,
            MonthCoverage.UNVERIFIED,
        ]);
    });

    test("aggregates to calendar years and keeps the weakest coverage of the year", () => {
        const profile = computeMonthlyVolumesFromCumulative(
            [monthStartUtcMs(2030, 11), monthStartUtcMs(2030, 12), monthStartUtcMs(2031, 1), monthStartUtcMs(2031, 2)],
            [0, 100, 224, 300],
            [MonthCoverage.SOURCE_ALIGNED, MonthCoverage.INTERPOLATED, MonthCoverage.PARTIAL],
        );

        expect(aggregateMonthlyVolumesByYear(profile.months)).toEqual([
            { year: 2030, volume: 224, isCoverageEstablished: true, monthCount: 2 },
            { year: 2031, volume: 76, isCoverageEstablished: false, monthCount: 1 },
        ]);
    });
});
