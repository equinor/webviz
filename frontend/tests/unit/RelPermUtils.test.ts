import { describe, expect, it } from "vitest";

import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { RelPermDataAccessor } from "@modules/RelPerm/utils/RelPermDataAccessor";
import { calculateRelPermMetric } from "@modules/RelPerm/utils/RelPermMetrics";
import { makeRelPermPlotTitle } from "@modules/RelPerm/view/utils/createTitle";
import {
    calculateFanchartStatistics,
    makeRelPermColorByValueMap,
    RelPermPlotBuilder,
} from "@modules/RelPerm/view/utils/RelPermPlotBuilder";

import {
    ColorBy,
    CurveType,
    GroupBy,
    RelPermMetric,
    RelPermStatistic,
    YAxisScale,
    type RelPermCurveEntry,
    type RelPermEnsembleRealizationData,
} from "../../src/modules/RelPerm/typesAndEnums";

const ENSEMBLE_IDENT = new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "iter-0");
const SECOND_ENSEMBLE_IDENT = new RegularEnsembleIdent("22222222-bbbb-4444-bbbb-bbbbbbbbbbbb", "iter-1");

function makeCurveEntry(curveValues: number[]): RelPermCurveEntry {
    return {
        ensembleIdent: ENSEMBLE_IDENT,
        realization: 0,
        satnum: 1,
        saturationName: "SW",
        saturationValues: [0, 0.5, 1],
        curveName: "KRW",
        curveValues,
    };
}

describe("RelPerm metrics", () => {
    it("calculates extrema and area metrics", () => {
        const entry = makeCurveEntry([0, 1, 1]);

        expect(calculateRelPermMetric(entry, RelPermMetric.ENDPOINT_MAX)).toBe(1);
        expect(calculateRelPermMetric(entry, RelPermMetric.ENDPOINT_MIN)).toBe(0);
        expect(calculateRelPermMetric(entry, RelPermMetric.AREA_UNDER_CURVE)).toBe(0.75);
        expect(calculateRelPermMetric(entry, RelPermMetric.MEAN_CURVE_VALUE)).toBe(0.75);
    });

    it("calculates integral metrics over the full saturation range", () => {
        const entry = { ...makeCurveEntry([1, 0, 1]), saturationValues: [0.5, 0, 1] };

        expect(calculateRelPermMetric(entry, RelPermMetric.AREA_UNDER_CURVE)).toBe(0.75);
        expect(calculateRelPermMetric(entry, RelPermMetric.MEAN_CURVE_VALUE)).toBe(0.75);
    });

    it("returns null for invalid integral metrics", () => {
        expect(
            calculateRelPermMetric({ ...makeCurveEntry([0, 1]), saturationValues: [0] }, RelPermMetric.AREA_UNDER_CURVE),
        ).toBeNull();
        expect(
            calculateRelPermMetric(
                { ...makeCurveEntry([0, 1]), saturationValues: [0, 0] },
                RelPermMetric.MEAN_CURVE_VALUE,
            ),
        ).toBeNull();
    });
});

describe("RelPermDataAccessor", () => {
    it("expands realization data into curve entries and metric values", () => {
        const ensembleData: RelPermEnsembleRealizationData[] = [
            {
                ensembleIdent: ENSEMBLE_IDENT,
                data: {
                    saturation_name: "SW",
                    saturation_values_by_satnum: [{ satnum: 2, saturation_values: [0, 1] }],
                    realization_data: [
                        {
                            realization: 3,
                            satnum: 2,
                            curve_data: [
                                { curve_name: "KRW", curve_values: [0, 0.8] },
                                { curve_name: "KROW", curve_values: [1, 0] },
                            ],
                        },
                    ],
                },
            },
        ];

        const accessor = new RelPermDataAccessor(ensembleData);

        expect(accessor.getEntries()).toHaveLength(2);
        expect(accessor.getEntries()[0]).toMatchObject({ realization: 3, satnum: 2, curveName: "KRW" });
        expect(accessor.getMetricValues(RelPermMetric.ENDPOINT_MAX)).toEqual([
            { ensembleIdent: ENSEMBLE_IDENT, realization: 3, satnum: 2, curveName: "KRW", value: 0.8 },
            { ensembleIdent: ENSEMBLE_IDENT, realization: 3, satnum: 2, curveName: "KROW", value: 1 },
        ]);
    });
});

describe("RelPerm fanchart statistics", () => {
    it("uses reserves P90/P10 semantics and includes min/max", () => {
        const entries = [makeCurveEntry([0, 10, 20]), makeCurveEntry([10, 20, 30]), makeCurveEntry([20, 30, 40])];

        expect(calculateFanchartStatistics(entries)).toEqual({
            saturationValues: [0, 0.5, 1],
            minValues: [0, 10, 20],
            p90Values: [2, 12, 22],
            p50Values: [10, 20, 30],
            meanValues: [10, 20, 30],
            p10Values: [18, 28, 38],
            maxValues: [20, 30, 40],
        });
    });

    it("returns null for empty fanchart input", () => {
        expect(calculateFanchartStatistics([])).toBeNull();
    });
});

describe("RelPerm title", () => {
    it("combines curve type, selected curves, and subplot grouping", () => {
        expect(makeRelPermPlotTitle(CurveType.RELPERM, ["KRW", "KROW"], GroupBy.SATNUM)).toBe(
            "Relative permeability: KRW, KROW per SATNUM",
        );
    });
});

describe("RelPerm layout", () => {
    it("pins saturation x-axis to 0-1 for single plots and subplots", () => {
        const builder = new RelPermPlotBuilder(
            {
                getEntries: () => [makeCurveEntry([0, 1, 1]), { ...makeCurveEntry([0, 1, 1]), satnum: 2 }],
                getMetricValues: () => [],
            },
            [],
            { getFirstColor: () => "#111111", getNextColor: () => "#222222" } as any,
        );

        const singleLayout = builder.makeLayout(
            { width: 800, height: 600 },
            CurveType.RELPERM,
            "SW",
            GroupBy.NONE,
            YAxisScale.LINEAR,
        );
        const subplotLayout = builder.makeLayout(
            { width: 800, height: 600 },
            CurveType.RELPERM,
            "SW",
            GroupBy.SATNUM,
            YAxisScale.LINEAR,
        ) as Record<string, any>;

        expect(singleLayout.xaxis).toMatchObject({ range: [0, 1] });
        expect(subplotLayout.xaxis).toMatchObject({ range: [0, 1] });
        expect(subplotLayout.xaxis2).toMatchObject({ range: [0, 1] });
    });

    it("uses ensemble colors when coloring by ensemble", () => {
        const builder = new RelPermPlotBuilder(
            {
                getEntries: () => [
                    makeCurveEntry([0, 1, 1]),
                    { ...makeCurveEntry([0, 1, 1]), ensembleIdent: SECOND_ENSEMBLE_IDENT },
                ],
                getMetricValues: () => [],
            },
            [
                {
                    getIdent: () => ENSEMBLE_IDENT,
                    getCustomName: () => null,
                    getEnsembleName: () => ENSEMBLE_IDENT.getEnsembleName(),
                    getDisplayName: () => ENSEMBLE_IDENT.getEnsembleName(),
                    getColor: () => "#123456",
                },
                {
                    getIdent: () => SECOND_ENSEMBLE_IDENT,
                    getCustomName: () => null,
                    getEnsembleName: () => SECOND_ENSEMBLE_IDENT.getEnsembleName(),
                    getDisplayName: () => SECOND_ENSEMBLE_IDENT.getEnsembleName(),
                    getColor: () => "#abcdef",
                },
            ] as any,
            { getFirstColor: () => "#111111", getNextColor: () => "#222222" } as any,
        );

        const traces = builder.makeIndividualRealizationTraces(ColorBy.ENSEMBLE, GroupBy.NONE);

        expect(traces[0].line).toMatchObject({ color: "#123456" });
        expect(traces[0].line).toMatchObject({ width: 0.75 });
        expect(traces[0].opacity).toBe(0.35);
        expect(traces[1].line).toMatchObject({ color: "#abcdef" });
    });

    it("can render statistic lines without a fan", () => {
        const builder = new RelPermPlotBuilder(
            {
                getEntries: () => [makeCurveEntry([0, 1, 1]), { ...makeCurveEntry([0, 0.5, 1]), realization: 1 }],
                getMetricValues: () => [],
            },
            [],
            { getFirstColor: () => "#111111", getNextColor: () => "#222222" } as any,
        );

        const traces = builder.makeStatisticLineTraces(ColorBy.CURVE, GroupBy.NONE, [
            RelPermStatistic.P50,
            RelPermStatistic.MEAN,
        ]);

        expect(traces).toHaveLength(2);
        expect(traces[0]).toMatchObject({ name: "KRW", y: [0, 0.75, 1], showlegend: true });
        expect(traces[1]).toMatchObject({ name: "KRW", y: [0, 0.75, 1], showlegend: false });
        expect(traces[1].line).toMatchObject({ width: 3 });
    });

    it("uses one legend item per color group across visualization layers", () => {
        const builder = new RelPermPlotBuilder(
            {
                getEntries: () => [makeCurveEntry([0, 1, 1]), { ...makeCurveEntry([0, 0.5, 1]), realization: 1 }],
                getMetricValues: () => [],
            },
            [],
            { getFirstColor: () => "#111111", getNextColor: () => "#222222" } as any,
        );
        const shownLegendColorByValues = new Set<string>();
        const traces = [
            ...builder.makeStatisticFanTraces(ColorBy.CURVE, GroupBy.NONE, shownLegendColorByValues),
            ...builder.makeStatisticLineTraces(ColorBy.CURVE, GroupBy.NONE, [RelPermStatistic.P50], shownLegendColorByValues),
            ...builder.makeIndividualRealizationTraces(ColorBy.CURVE, GroupBy.NONE, shownLegendColorByValues),
        ];

        expect(traces.filter((trace) => trace.showlegend)).toHaveLength(1);
        expect(traces.filter((trace) => trace.showlegend)[0]).toMatchObject({ name: "KRW", legendgroup: "KRW" });
        expect(new Set(traces.map((trace) => trace.legendgroup))).toEqual(new Set(["KRW"]));
    });

    it("uses stable legend proxy traces for color groups", () => {
        const builder = new RelPermPlotBuilder(
            {
                getEntries: () => [makeCurveEntry([0, 1, 1]), { ...makeCurveEntry([0, 0.5, 1]), curveName: "KROW" }],
                getMetricValues: () => [],
            },
            [],
            { getFirstColor: () => "#111111", getNextColor: () => "#222222" } as any,
        );
        const shownLegendColorByValues = new Set<string>();
        const legendTraces = builder.makeLegendTraces(ColorBy.CURVE, shownLegendColorByValues);
        const statisticTraces = builder.makeStatisticLineTraces(ColorBy.CURVE, GroupBy.NONE, [RelPermStatistic.P50], shownLegendColorByValues);

        expect(legendTraces).toHaveLength(2);
        expect(legendTraces[0]).toMatchObject({ name: "KRW", legendgroup: "KRW", showlegend: true });
        expect(legendTraces[0].line).toMatchObject({ width: 2.5 });
        expect(statisticTraces.every((trace) => trace.showlegend === false)).toBe(true);
    });

    it("uses the same color keys for traces and data channels", () => {
        const entries = [
            makeCurveEntry([0, 1, 1]),
            { ...makeCurveEntry([0, 1, 1]), curveName: "KROW", satnum: 2 },
        ];
        const colorSet = { getFirstColor: () => "#111111", getNextColor: () => "#222222" } as any;

        expect(makeRelPermColorByValueMap(entries, [], ColorBy.CURVE, colorSet)).toEqual(
            new Map([
                ["KRW", "#111111"],
                ["KROW", "#222222"],
            ]),
        );
        expect(makeRelPermColorByValueMap(entries, [], ColorBy.SATNUM, colorSet)).toEqual(
            new Map([
                ["1", "#111111"],
                ["2", "#222222"],
            ]),
        );
    });
});