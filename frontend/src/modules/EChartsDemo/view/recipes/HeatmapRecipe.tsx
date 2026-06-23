/**
 * Recipe: Heatmap chart. Simplest chart type — no interaction hooks, no overlays.
 *
 * Just generate traces → call builder → render.
 */
import React from "react";

import { buildHeatmapChart, Chart, computeSubplotGridLayout } from "@modules/_shared/eCharts";

import { generateHeatmapTraces } from "../../utils/syntheticData";

import { makeBaseOptions, type RecipeProps } from "./types";

const ROW_HEIGHT_PX = 350;

export function HeatmapRecipe({ viewContext, scrollMode, numSubplots, appliedZoomState, handleDataZoom, handleRestore }: RecipeProps): React.ReactNode {

    // ── Settings ─────────────────────────────────────────────────────────
    const dataConfig = viewContext.useSettingsToViewInterfaceValue("dataConfig");
    const layoutConfig = viewContext.useSettingsToViewInterfaceValue("layoutConfig");

    // ── Build chart option ───────────────────────────────────────────────
    const echartsOptions = React.useMemo(() => {
        const base = makeBaseOptions({ layoutConfig, appliedZoomState });
        const traces = generateHeatmapTraces(dataConfig.numSubplots);

        return buildHeatmapChart(traces, { ...base, valueLabel: "Value" });
    }, [dataConfig, layoutConfig, appliedZoomState]);

    // ── Render ───────────────────────────────────────────────────────────
    const layout = computeSubplotGridLayout(numSubplots);
    const chartHeight = scrollMode ? layout.numRows * ROW_HEIGHT_PX : "100%";

    return (
        <div style={{ height: chartHeight, width: "100%", minHeight: ROW_HEIGHT_PX, minWidth: 100 }}>
            <Chart option={echartsOptions} onDataZoom={handleDataZoom} onRestore={handleRestore} />
        </div>
    );
}
