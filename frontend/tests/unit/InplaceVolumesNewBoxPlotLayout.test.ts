import type React from "react";

import type { Layout } from "plotly.js";
import { describe, expect, test, vi } from "vitest";

import { EnsembleSet } from "@framework/EnsembleSet";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorSet } from "@lib/utils/ColorSet";
import { HistogramType } from "@modules/_shared/histogram";
import { BarSortBy } from "@modules/_shared/InplaceVolumes/plotOptions";
import { Column, ColumnType, Table } from "@modules/_shared/InplaceVolumes/Table";
import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";
import { GroupedTableData } from "@modules/InplaceVolumesNew/view/utils/GroupedTableData";
import { PlotBuilder } from "@modules/InplaceVolumesNew/view/utils/PlotBuilder";
import { makePlotData } from "@modules/InplaceVolumesNew/view/utils/plotComponentUtils";
import {
    configurePlotlyLayoutAxisByPlotType,
    makeBoxPlotLayoutOptions,
} from "@modules/InplaceVolumesNew/view/utils/plotlyLayoutAxisOptions";

vi.mock("@modules/_shared/components/Plot", () => ({ Plot: () => null }));

const CASES = ["rms_seed", "faults:low", "faults:high"];
const ZONES = ["Valysar", "Therys", "Volon"];

// Two realizations per zone and case; "faults:low" is missing in Therys.
function makeTable(): Table {
    const rows = ZONES.flatMap((zone, zoneIndex) =>
        CASES.filter((sensitivityCase) => !(zone === "Therys" && sensitivityCase === "faults:low")).flatMap(
            (sensitivityCase) => [0, 1].map((real) => ({ zoneIndex, caseIndex: CASES.indexOf(sensitivityCase), real })),
        ),
    );
    return new Table([
        new Column(
            "ENSEMBLE",
            ColumnType.ENSEMBLE,
            ["ens"],
            rows.map(() => 0),
        ),
        new Column(
            "ZONE",
            ColumnType.INDEX,
            ZONES,
            rows.map((row) => row.zoneIndex),
        ),
        new Column(
            "SENSITIVITY",
            ColumnType.SENSITIVITY,
            CASES,
            rows.map((row) => row.caseIndex),
        ),
        new Column(
            "REAL",
            ColumnType.REAL,
            [0, 1],
            rows.map((row) => row.real),
        ),
        new Column(
            "STOIIP",
            ColumnType.RESULT,
            rows.map((_, index) => index),
            rows.map((_, index) => index),
        ),
    ]);
}

function buildBoxPlotLayout(subplotBy: string): Partial<Layout> & Record<string, unknown> {
    const colorBy = "SENSITIVITY";
    const groupedData = new GroupedTableData({
        table: makeTable(),
        subplotBy,
        colorBy,
        ensembleSet: new EnsembleSet([]),
        colorSet: new ColorSet(new ColorPalette({ id: "test", name: "Test", colors: ["#111111", "#222222"] })),
        categoryOrder: new Map([
            ["SENSITIVITY", CASES],
            ["ZONE", ZONES],
        ]),
    });
    const plotBuilder = new PlotBuilder(
        groupedData,
        makePlotData({
            plotType: PlotType.BOX,
            firstResultName: "STOIIP",
            secondResultNameOrSelectorName: "",
            histogramBins: 10,
            barSortBy: BarSortBy.Xvalues,
            showStatisticalMarkers: false,
            showRealizationPoints: false,
            showPercentageInBar: false,
            showStatisticalLabels: false,
        }),
    );
    configurePlotlyLayoutAxisByPlotType(plotBuilder, {
        plotType: PlotType.BOX,
        resultName: "STOIIP",
        barSelectorColumn: null,
        subplotBy,
        colorBy,
        histogramType: HistogramType.Overlay,
        barSelectorLength: 0,
        boxRowLabels: groupedData.getColorLabels(),
        numSubplots: groupedData.getNumSubplots(),
    });
    const element = plotBuilder.build(750, 1100) as React.ReactElement<{ layout: Partial<Layout> }>;
    return element.props.layout as Partial<Layout> & Record<string, unknown>;
}

describe("makeBoxPlotLayoutOptions", () => {
    test("a single subplot labels its rows and hides the legend", () => {
        const { yAxis, showLegend } = makeBoxPlotLayoutOptions(["a", "b"], 1);
        expect(yAxis).toMatchObject({ type: "category", showticklabels: true, automargin: true });
        expect(showLegend).toBe(false);
    });

    test("several subplots keep the legend and leave the rows unlabelled", () => {
        const { yAxis, showLegend } = makeBoxPlotLayoutOptions(["a", "b"], 3);
        expect(yAxis).toMatchObject({ type: "category", showticklabels: false, automargin: false });
        expect(showLegend).toBe(true);
    });

    test("rows are listed top-down, so reversed for Plotly", () => {
        const rows = ["a", "b", "c"];
        expect(makeBoxPlotLayoutOptions(rows, 2).yAxis).toMatchObject({
            categoryorder: "array",
            categoryarray: ["c", "b", "a"],
        });
        expect(rows).toEqual(["a", "b", "c"]);
    });

    test("without shared rows each subplot lists its own", () => {
        expect(makeBoxPlotLayoutOptions(null, 2).yAxis.categoryarray).toBeUndefined();
    });
});

describe("box plot layout", () => {
    test("every subplot gets the same row order, also where a group is missing", () => {
        const layout = buildBoxPlotLayout("ZONE");
        const expectedRows = CASES.toReversed();
        for (const axisKey of ["yaxis1", "yaxis2", "yaxis3"]) {
            expect(layout[axisKey]).toMatchObject({
                type: "category",
                categoryorder: "array",
                categoryarray: expectedRows,
                showticklabels: false,
            });
        }
        expect(layout.showlegend).toBeUndefined();
    });

    test("a single subplot shows row labels and no legend", () => {
        const layout = buildBoxPlotLayout("ENSEMBLE");
        expect(layout.yaxis1).toMatchObject({
            categoryarray: CASES.toReversed(),
            showticklabels: true,
            automargin: true,
        });
        expect(layout.showlegend).toBe(false);
    });
});
