import type { PlotData } from "plotly.js";
import { describe, expect, test } from "vitest";

import { BarSortBy } from "@modules/_shared/InplaceVolumes/plotOptions";
import { Column, ColumnType, Table } from "@modules/_shared/InplaceVolumes/Table";
import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";
import type { ColorEntry } from "@modules/InplaceVolumesNew/view/utils/GroupedTableData";
import { hideRepeatedLegendEntries, makePlotData } from "@modules/InplaceVolumesNew/view/utils/plotComponentUtils";

function makeEntry(colorKey: string, colorLabel: string): ColorEntry {
    return {
        colorKey,
        colorLabel,
        color: "red",
        table: new Table([
            new Column("REAL", ColumnType.REAL, [230, 231, 232], [0, 1, 2]),
            new Column("ZONE", ColumnType.INDEX, ["Valysar", "Volon"], [0, 1, 0]),
            new Column("STOIIP", ColumnType.RESULT, [10, 20, 30], [0, 1, 2]),
        ]),
    };
}

function makeTraces(plotType: PlotType, entries: ColorEntry[]): Partial<PlotData>[] {
    return makePlotData({
        plotType,
        firstResultName: "STOIIP",
        secondResultNameOrSelectorName: "ZONE",
        histogramBins: 2,
        barSortBy: BarSortBy.Xvalues,
        showStatisticalMarkers: true,
        showRealizationPoints: true,
        showPercentageInBar: false,
        showStatisticalLabels: false,
    })(entries);
}

function legendTrace(legendgroup: string, showlegend?: boolean): Partial<PlotData> {
    return { legendgroup, showlegend };
}

describe("makePlotData legend groups", () => {
    test.each([PlotType.BAR, PlotType.HISTOGRAM, PlotType.BOX, PlotType.DISTRIBUTION, PlotType.CONVERGENCE])(
        "every %s trace belongs to its colour key's legend group",
        (plotType) => {
            const traces = makeTraces(plotType, [
                makeEntry("rms_seed", "rms_seed"),
                makeEntry("volon:low", "Volon low"),
            ]);

            expect(traces.length).toBeGreaterThan(2);
            const groups = traces.map((trace) => trace.legendgroup);
            expect(new Set(groups)).toEqual(new Set(["rms_seed", "volon:low"]));
            expect(groups.indexOf("volon:low")).toBe(traces.length / 2);
        },
    );
});

describe("hideRepeatedLegendEntries", () => {
    test("keeps the first legend entry per group across subplots", () => {
        const subplot1 = [legendTrace("a", false), legendTrace("a"), legendTrace("b", true)];
        const subplot2 = [legendTrace("a"), legendTrace("b", true), legendTrace("b", false)];

        hideRepeatedLegendEntries([...subplot1, ...subplot2]);

        expect(subplot1.map((trace) => trace.showlegend)).toEqual([false, undefined, true]);
        expect(subplot2.map((trace) => trace.showlegend)).toEqual([false, false, false]);
    });

    test("a group missing from the first subplot gets its entry in a later one", () => {
        const subplot1 = [legendTrace("a")];
        const subplot2 = [legendTrace("a"), legendTrace("c", false), legendTrace("c")];
        const subplot3 = [legendTrace("c")];

        hideRepeatedLegendEntries([...subplot1, ...subplot2, ...subplot3]);

        expect(subplot1.map((trace) => trace.showlegend)).toEqual([undefined]);
        expect(subplot2.map((trace) => trace.showlegend)).toEqual([false, false, undefined]);
        expect(subplot3.map((trace) => trace.showlegend)).toEqual([false]);
    });
});
