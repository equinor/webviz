import React from "react";

import {
    buildCartesianSubplotChart,
    Chart,
    computeSubplotGridLayout,
    type CartesianSubplotBuildResult,
    type SubplotGroup,
} from "@modules/_shared/eCharts";

import type { RecipeProps } from "./types";

const ROW_HEIGHT_PX = 350;

function buildSubplot(_group: SubplotGroup<unknown>, axisIndex: number): CartesianSubplotBuildResult {
    return {
        series: [{ type: "bar", name: "Revenue", xAxisIndex: axisIndex, yAxisIndex: axisIndex, data: [12, 19, 8, 24] }],
        legendData: ["Revenue"],
        xAxis: { type: "category", data: ["Q1", "Q2", "Q3", "Q4"] },
        yAxis: { type: "value" },
    };
}

export function CustomRecipe({ scrollMode, numSubplots, appliedZoomState, handleDataZoom, handleRestore }: RecipeProps): React.ReactNode {
    const groups = React.useMemo(
        () => Array.from({ length: numSubplots }, (): SubplotGroup<unknown> => ({ title: "", traces: [null] })),
        [numSubplots],
    );

    const echartsOptions = React.useMemo(
        function buildOption() {
            return buildCartesianSubplotChart(groups, buildSubplot, { zoomable: true, zoomState: appliedZoomState });
        },
        [groups, appliedZoomState],
    );

    const layout = computeSubplotGridLayout(numSubplots);
    const chartHeight = scrollMode ? layout.numRows * ROW_HEIGHT_PX : "100%";

    return (
        <div style={{ height: chartHeight, width: "100%", minHeight: ROW_HEIGHT_PX, minWidth: 100 }}>
            <Chart option={echartsOptions} onDataZoom={handleDataZoom} onRestore={handleRestore} />
        </div>
    );
}