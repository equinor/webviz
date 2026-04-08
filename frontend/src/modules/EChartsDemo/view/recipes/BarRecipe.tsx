/**
 * Recipe: Bar chart with optional statistical markers and value labels.
 *
 * No interaction hooks needed — static chart with built-in tooltips.
 */
import React from "react";

import { buildBarChart, Chart, computeSubplotGridLayout } from "@modules/_shared/eCharts";

import { generateBarTraces } from "../../utils/syntheticData";
import { makeBaseOptions, type RecipeProps } from "./types";

const ROW_HEIGHT_PX = 350;

export function BarRecipe({ viewContext, scrollMode, numSubplots, appliedZoomState, handleDataZoom }: RecipeProps): React.ReactNode {

    // ── Settings ─────────────────────────────────────────────────────────
    const dataConfig = viewContext.useSettingsToViewInterfaceValue("dataConfig");
    const plConfig = viewContext.useSettingsToViewInterfaceValue("pointsAndLabelsConfig");
    const layoutConfig = viewContext.useSettingsToViewInterfaceValue("layoutConfig");

    // ── Build chart option ───────────────────────────────────────────────
    const echartsOptions = React.useMemo(() => {
        const base = makeBaseOptions({ layoutConfig, appliedZoomState });
        const groups = Array.from({ length: dataConfig.numSubplots }, (_, i) => ({
            title: `Subplot ${i + 1}`,
            traces: generateBarTraces(dataConfig.numGroups, i),
        }));

        return buildBarChart(groups, {
            ...base,
            showStatisticalMarkers: plConfig.showStatisticalMarkers,
            showLabels: plConfig.showBarLabels,
        });
    }, [dataConfig, plConfig, layoutConfig, appliedZoomState]);

    // ── Render ───────────────────────────────────────────────────────────
    const layout = computeSubplotGridLayout(numSubplots);
    const chartHeight = scrollMode ? layout.numRows * ROW_HEIGHT_PX : "100%";

    return (
        <div style={{ height: chartHeight, width: "100%", minHeight: ROW_HEIGHT_PX, minWidth: 100 }}>
            <Chart option={echartsOptions} onDataZoom={handleDataZoom} />
        </div>
    );
}
