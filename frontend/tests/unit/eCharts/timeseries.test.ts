import type { EChartsOption } from "echarts";
import { describe, expect, it } from "vitest";

import type { TimeseriesDisplayConfig, TimeseriesSubplotOverlays, TimeseriesTrace } from "@modules/_shared/eCharts";
import { buildTimeseriesChart } from "@modules/_shared/eCharts";

type ToolboxConfig = {
    feature?: Record<string, unknown>;
};

type DataZoomConfig = {
    id?: string;
    start?: number;
    end?: number;
};

const DISPLAY_CONFIG: TimeseriesDisplayConfig = {
    showMembers: true,
    showStatistics: false,
    showFanchart: false,
    showReferenceLines: false,
    showPointAnnotations: false,
    selectedStatistics: ["mean"],
};

const OVERLAYS: TimeseriesSubplotOverlays[] = [{
    referenceLineTraces: [],
    pointAnnotationTraces: [],
}];

const GROUPS = [{
    title: "Subplot 1",
    traces: [{
        name: "Trace A",
        color: "#336699",
        timestamps: [1, 2, 3],
        memberValues: [[10, 20, 30]],
        memberIds: [1],
    }] satisfies TimeseriesTrace[],
}];

function toToolbox(option: EChartsOption): ToolboxConfig {
    return (option.toolbox ?? {}) as ToolboxConfig;
}

function toDataZoomArray(option: EChartsOption): DataZoomConfig[] {
    const dataZoom = option.dataZoom;
    if (Array.isArray(dataZoom)) {
        return dataZoom as DataZoomConfig[];
    }
    return dataZoom ? [dataZoom as DataZoomConfig] : [];
}

describe("timeseries zoom controls", () => {
    it("omits zoom controls when zoom is disabled", () => {
        const option = buildTimeseriesChart(GROUPS, {
            subplotOverlays: OVERLAYS,
            displayConfig: DISPLAY_CONFIG,
        });

        expect(toDataZoomArray(option)).toEqual([]);
        expect(toToolbox(option).feature).not.toHaveProperty("dataZoom");
    });

    it("adds zoom controls when zoomable is enabled", () => {
        const option = buildTimeseriesChart(GROUPS, {
            subplotOverlays: OVERLAYS,
            displayConfig: DISPLAY_CONFIG,
            zoomable: true,
        });

        expect(toDataZoomArray(option)).toHaveLength(2);
        expect(toToolbox(option).feature).toHaveProperty("dataZoom");
    });

    it("applies a persisted zoom state even without zoomable", () => {
        const option = buildTimeseriesChart(GROUPS, {
            subplotOverlays: OVERLAYS,
            displayConfig: DISPLAY_CONFIG,
            zoomState: { x: { start: 10, end: 90 } },
        });

        const dataZoom = toDataZoomArray(option);
        expect(dataZoom).toHaveLength(2);
        expect(dataZoom.find((entry) => entry.id === "x")).toMatchObject({ start: 10, end: 90 });
    });
});