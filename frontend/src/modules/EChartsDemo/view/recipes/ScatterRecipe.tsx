/**
 * Recipe: Member scatter chart with interactive hover highlighting.
 *
 * Hooks used: useSeriesInteraction
 */
import React from "react";

import type ReactECharts from "echarts-for-react";

import type { HoveredSeriesInfo } from "@modules/_shared/eCharts";
import {
    buildMemberScatterChart,
    buildMemberScatterInteractionSeries,
    Chart,
    computeSubplotGridLayout,
    useSeriesInteraction,
} from "@modules/_shared/eCharts";

import { generateMemberScatterTraces } from "../../utils/syntheticData";
import { createHoveredSeriesStore, HoveredSeriesReadout } from "../hoveredSeriesReadout";
import { makeBaseOptions, type RecipeProps } from "./types";

const MEMBER_LABEL = "Member";
const ROW_HEIGHT_PX = 350;

export function ScatterRecipe({ viewContext, scrollMode, numSubplots, appliedZoomState, handleDataZoom }: RecipeProps): React.ReactNode {
    const chartRef = React.useRef<ReactECharts>(null);
    const hoveredSeriesStore = React.useMemo(createHoveredSeriesStore, []);

    // ── Settings ─────────────────────────────────────────────────────────
    const dataConfig = viewContext.useSettingsToViewInterfaceValue("dataConfig");
    const tsConfig = viewContext.useSettingsToViewInterfaceValue("timeseriesDisplayConfig");
    const layoutConfig = viewContext.useSettingsToViewInterfaceValue("layoutConfig");

    // ── Generate synthetic data (only depends on data shape + coloring) ──
    const groups = React.useMemo(
        () => Array.from({ length: dataConfig.numSubplots }, (_, i) => ({
            title: `Subplot ${i + 1}`,
            traces: generateMemberScatterTraces(dataConfig.numGroups, dataConfig.numMembers, i, tsConfig.colorByParameter),
        })),
        [dataConfig.numSubplots, dataConfig.numGroups, dataConfig.numMembers, tsConfig.colorByParameter],
    );

    // ── Build chart option + interaction index ───────────────────────────
    const { echartsOptions, interactionSeries } = React.useMemo(() => {
        const base = makeBaseOptions({ layoutConfig, appliedZoomState });

        return {
            echartsOptions: buildMemberScatterChart(groups, { ...base, memberLabel: MEMBER_LABEL }),
            interactionSeries: buildMemberScatterInteractionSeries(groups),
        };
    }, [groups, layoutConfig, appliedZoomState]);

    // ── Interaction hooks ────────────────────────────────────────────────
    const formatSeriesLabel = React.useCallback((info: HoveredSeriesInfo): string => {
        return info.kind === "member" ? `${MEMBER_LABEL} ${info.memberId}` : (info.seriesName ?? "Series");
    }, []);

    const handleHoveredSeriesChange = React.useCallback(
        (info: HoveredSeriesInfo | null) => {
            hoveredSeriesStore.setValue(info ? { group: info.groupKey, label: formatSeriesLabel(info) } : null);
        },
        [formatSeriesLabel, hoveredSeriesStore],
    );

    const seriesEvents = useSeriesInteraction(chartRef, true, echartsOptions, {
        formatSeriesLabel,
        onHoveredSeriesChange: handleHoveredSeriesChange,
        interactionSeries,
    });
    const onChartEvents = React.useMemo(
        () => ({ ...seriesEvents }),
        [seriesEvents],
    );

    // ── Render ───────────────────────────────────────────────────────────
    const layout = computeSubplotGridLayout(numSubplots);
    const chartHeight = scrollMode ? layout.numRows * ROW_HEIGHT_PX : "100%";

    return (
        <>
            <div className="absolute top-2 left-2 z-10 flex gap-4 p-2 bg-white/80 backdrop-blur border rounded shadow-sm text-xs">
                <HoveredSeriesReadout store={hoveredSeriesStore} />
            </div>
            <div style={{ height: chartHeight, width: "100%", minHeight: ROW_HEIGHT_PX, minWidth: 100 }}>
                <Chart chartRef={chartRef} option={echartsOptions} onDataZoom={handleDataZoom} onEvents={onChartEvents} />
            </div>
        </>
    );
}
