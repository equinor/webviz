import type { Layout } from "plotly.js";
import { describe, expect, it } from "vitest";

import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorSet } from "@lib/utils/ColorSet";
import { RelPermDataAccessor } from "@modules/RelPerm/utils/RelPermDataAccessor";
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

function makeColorSet(colors: string[]): ColorSet {
    return new ColorSet(new ColorPalette({ id: colors.join("-"), name: "Test colors", colors }));
}

function makeDefaultColorSet(): ColorSet {
    return makeColorSet(["#111111", "#222222"]);
}

function makeRegularEnsemble(ensembleIdent: RegularEnsembleIdent, color: string): RegularEnsemble {
    return new RegularEnsemble(
        "asset",
        [],
        ensembleIdent.getCaseUuid(),
        ensembleIdent.getEnsembleName(),
        ensembleIdent.getEnsembleName(),
        "stratigraphy",
        [],
        [],
        null,
        null,
        color,
    );
}

describe("RelPermDataAccessor", () => {
    it("expands realization data into curve entries", () => {
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
        expect(accessor.getEntries()[1]).toMatchObject({ realization: 3, satnum: 2, curveName: "KROW" });
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
            },
            [],
            makeDefaultColorSet(),
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
        ) as Partial<Layout> & { xaxis2?: NonNullable<Layout["xaxis"]> };

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
            },
            [makeRegularEnsemble(ENSEMBLE_IDENT, "#123456"), makeRegularEnsemble(SECOND_ENSEMBLE_IDENT, "#abcdef")],
            makeDefaultColorSet(),
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
            },
            [],
            makeDefaultColorSet(),
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
            },
            [],
            makeDefaultColorSet(),
        );
        const shownLegendColorByValues = new Set<string>();
        const traces = [
            ...builder.makeStatisticFanTraces(ColorBy.CURVE, GroupBy.NONE, shownLegendColorByValues),
            ...builder.makeStatisticLineTraces(
                ColorBy.CURVE,
                GroupBy.NONE,
                [RelPermStatistic.P50],
                shownLegendColorByValues,
            ),
            ...builder.makeIndividualRealizationTraces(ColorBy.CURVE, GroupBy.NONE, shownLegendColorByValues),
        ];

        expect(traces.filter((trace) => trace.showlegend)).toHaveLength(1);
        expect(traces.filter((trace) => trace.showlegend)[0]).toMatchObject({ name: "KRW", legendgroup: "KRW" });
        expect(new Set(traces.map((trace) => trace.legendgroup))).toEqual(new Set(["KRW"]));
    });

    it("shows legend entries from dedicated color group traces", () => {
        const builder = new RelPermPlotBuilder(
            {
                getEntries: () => [makeCurveEntry([0, 1, 1]), { ...makeCurveEntry([0, 0.5, 1]), curveName: "KROW" }],
            },
            [],
            makeDefaultColorSet(),
        );
        const shownLegendColorByValues = new Set<string>();
        const legendTraces = builder.makeLegendTraces(ColorBy.CURVE, shownLegendColorByValues);
        const statisticTraces = builder.makeStatisticLineTraces(
            ColorBy.CURVE,
            GroupBy.NONE,
            [RelPermStatistic.P50],
            shownLegendColorByValues,
        );

        expect(legendTraces).toHaveLength(2);
        expect(legendTraces[0]).toMatchObject({ name: "KRW", legendgroup: "KRW", showlegend: true });
        expect(legendTraces[0].line).toMatchObject({ width: 2.5 });
        expect(statisticTraces.every((trace) => trace.showlegend === false)).toBe(true);
    });

    it("uses stable color keys for traces", () => {
        const entries = [makeCurveEntry([0, 1, 1]), { ...makeCurveEntry([0, 1, 1]), curveName: "KROW", satnum: 2 }];
        const colorSet = makeColorSet(["#111111", "#222222"]);

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
