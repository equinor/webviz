import { describe, expect, test } from "vitest";

import { BarSortBy, makePlotlyBarTraces } from "@modules/InplaceVolumesNew/view/utils/plotly/bar";
import { makePlotlyBoxPlotTraces } from "@modules/InplaceVolumesNew/view/utils/plotly/box";
import { makePlotlyDensityTraces } from "@modules/InplaceVolumesNew/view/utils/plotly/distribution";
import { makePlotlyHistogramTraces } from "@modules/InplaceVolumesNew/view/utils/plotly/histogram";

const TITLE = "volon:high";
const VALUES = [10, 20, 30];
const REALIZATIONS = [230, 231, 239];

function expectEveryHoverToStartWithTitle(hovertemplate: string | string[] | undefined) {
    const templates = Array.isArray(hovertemplate) ? hovertemplate : [hovertemplate];
    expect(templates.length).toBeGreaterThan(0);
    for (const template of templates) {
        expect(template?.startsWith(`<b>${TITLE}</b><br>`)).toBe(true);
    }
}

describe("InplaceVolumesNew plotly trace hovers", () => {
    test("bar hovers start with the colour label", () => {
        const traces = makePlotlyBarTraces({
            title: TITLE,
            yValues: VALUES,
            xValues: ["A", "B", "C"],
            resultName: "STOIIP",
            selectorName: "ZONE",
            color: "red",
            barSortBy: BarSortBy.Xvalues,
            showStatisticalMarkers: true,
        });

        expect(traces).toHaveLength(4);
        for (const trace of traces) {
            expectEveryHoverToStartWithTitle(trace.hovertemplate);
        }
    });

    test("histogram hovers start with the colour label and the rug carries the realizations", () => {
        const traces = makePlotlyHistogramTraces({
            title: TITLE,
            values: VALUES,
            realizations: REALIZATIONS,
            resultName: "STOIIP",
            color: "red",
            numBins: 2,
            showStatisticalMarkers: true,
            showRealizationPoints: true,
            showStatisticalLabels: false,
            showPercentageInBar: false,
        });

        for (const trace of traces) {
            expectEveryHoverToStartWithTitle(trace.hovertemplate);
        }
        const rug = traces.find((trace) => trace.name === "Realizations")!;
        expect(rug.customdata).toEqual(REALIZATIONS);
        expect(rug.hovertemplate).toContain("Realization: %{customdata}");
        expect(rug.hovertemplate).not.toContain("pointNumber");
    });

    test("box hovers start with the colour label and points carry the realizations", () => {
        const traces = makePlotlyBoxPlotTraces({
            title: TITLE,
            values: VALUES,
            realizations: REALIZATIONS,
            resultName: "STOIIP",
            color: "red",
            showStatisticalMarkers: true,
            showRealizationPoints: true,
        });

        for (const trace of traces) {
            expectEveryHoverToStartWithTitle(trace.hovertemplate);
        }
        const box = traces.find((trace) => trace.type === "box")!;
        expect(box.hoverinfo).toBeUndefined();
        expect(box.hoveron).toBe("points");
        expect(box.customdata).toEqual(REALIZATIONS);
        expect(box.hovertemplate).toContain("Realization: <b>%{customdata}</b>");
    });

    test("violin hovers start with the colour label and points carry the realizations", () => {
        const traces = makePlotlyDensityTraces({
            title: TITLE,
            values: VALUES,
            realizations: REALIZATIONS,
            color: "red",
            resultName: "STOIIP",
            showRealizationPoints: true,
            showStatisticalMarkers: true,
            showStatisticalLabels: false,
        });

        for (const trace of traces) {
            expectEveryHoverToStartWithTitle(trace.hovertemplate);
        }
        const violin = traces.find((trace) => trace.type === "violin")!;
        expect(violin.hoveron).toBe("points");
        expect(violin.customdata).toEqual(REALIZATIONS);
        expect(violin.hovertemplate).toContain("Realization: %{customdata}");
    });
});
