import type { CustomSeriesOption } from "echarts/charts";
import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams } from "echarts/types/dist/shared";

import type { SeriesBuildResult } from "../../core/composeChartOption";
import { makeSeriesId } from "../../core/seriesId";
import type { TimeseriesTrace } from "../../types";

import { TIMESERIES_CATEGORY } from "./ids";

/**
 * Builds a single custom series per trace that renders all members as polylines
 * in one ECharts series object. Designed for large member counts (100+) where
 * creating one LineSeriesOption per member causes render and interaction overhead.
 *
 * The data array has one item per timestep with [categoryIndex, yMin, yMax] so that
 * ECharts can compute axis ranges correctly. The renderItem function draws one polyline
 * per member using values from the closure — it cycles through all members
 * across multiple renderItem calls via progressive rendering.
 *
 * Trade-offs vs buildMemberSeries:
 * - No per-line emphasis/blur (hover highlight disabled)
 * - No interaction entries registered (no tooltip for individual members)
 * - Progressive rendering via ECharts chunking
 * - Significantly fewer series model instances (1 vs N per trace)
 */
export function buildMemberSeriesLarge(trace: TimeseriesTrace, axisIndex = 0): SeriesBuildResult {
    if (!trace.memberValues || trace.memberValues.length === 0) {
        return { series: [], legendData: [] };
    }

    const memberValues = trace.memberValues;
    const numTimesteps = memberValues[0].length;
    const numMembers = memberValues.length;

    // Data: one item per member. Each item carries [memberIndex, yMin, yMax]
    // so ECharts can derive the y-axis extent from dimensions 1 and 2.
    const data: number[][] = [];
    for (let r = 0; r < numMembers; r++) {
        const vals = memberValues[r];
        let min = Infinity;
        let max = -Infinity;
        for (let t = 0; t < numTimesteps; t++) {
            const v = vals[t];
            if (v < min) min = v;
            if (v > max) max = v;
        }
        data.push([r, min, max]);
    }

    const series: CustomSeriesOption = {
        id: makeSeriesId({
            chartType: TIMESERIES_CATEGORY,
            role: "member-large",
            name: trace.highlightGroupKey ?? trace.name,
            subKey: "all",
            axisIndex,
        }),
        name: trace.name,
        type: "custom",
        data,
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        // Tell ECharts that dimensions 1 and 2 map to y so it computes axis range.
        encode: { y: [1, 2] },
        renderItem: createRenderItem(memberValues, numTimesteps, trace.color, trace.memberColors),
        // Explicit color so legend swatch matches renderItem stroke.
        // Without this, ECharts falls back to the palette for the legend icon.
        itemStyle: { color: trace.color },
        progressive: 200,
        clip: true,
        // Disable all interaction affordances
        silent: true,
        animation: false,
        tooltip: { show: false },
        // z-index below fanchart bands (z:1) and statistics (z:2 default)
        z: 0,
    };

    return { series: [series], legendData: [trace.name] };
}

function createRenderItem(
    memberValues: number[][],
    numTimesteps: number,
    defaultColor: string,
    memberColors?: string[],
): CustomSeriesOption["renderItem"] {
    return function renderMemberPolyline(
        params: CustomSeriesRenderItemParams,
        api: CustomSeriesRenderItemAPI,
    ) {
        const memberIndex = api.value(0) as number;
        const values = memberValues[memberIndex];
        if (!values) return undefined;

        // Derive the linear pixel mapping from two api.coord() calls instead of
        // calling api.coord() per timestep. For 500 timesteps this reduces
        // function-call overhead from ~500 to 2 per member.
        const p0 = api.coord([0, 0]);
        const p1 = api.coord([1, 1]);
        const pxPerT = p1[0] - p0[0];
        const pxPerVal = p1[1] - p0[1];
        const ox = p0[0];
        const oy = p0[1];

        // Only iterate the visible timestep range when zoomed in.
        const coordSys = params.coordSys as unknown as { x: number; width: number } | undefined;
        let tStart = 0;
        let tEnd = numTimesteps;
        if (coordSys && pxPerT !== 0) {
            const dataLeft = (coordSys.x - ox) / pxPerT;
            const dataRight = (coordSys.x + coordSys.width - ox) / pxPerT;
            tStart = Math.max(0, Math.floor(Math.min(dataLeft, dataRight)) - 1);
            tEnd = Math.min(numTimesteps, Math.ceil(Math.max(dataLeft, dataRight)) + 2);
        }

        const points: number[][] = [];
        for (let t = tStart; t < tEnd; t++) {
            const val = values[t];
            if (!Number.isFinite(val)) continue;
            points.push([ox + t * pxPerT, oy + val * pxPerVal]);
        }

        if (points.length < 2) return undefined;

        const color = memberColors?.[memberIndex] ?? defaultColor;

        return {
            type: "polyline",
            shape: { points },
            style: {
                stroke: color,
                lineWidth: 0.8,
                opacity: 0.4,
                fill: "none",
            },
        };
    };
}
