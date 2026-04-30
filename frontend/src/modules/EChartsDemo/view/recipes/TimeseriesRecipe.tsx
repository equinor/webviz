/**
 * Recipe: Timeseries chart with members, statistics, fanchart, reference lines,
 * point annotations, interactive hover highlighting, and click-to-timestamp.
 *
 * Hooks used: useTimestampSelection, useSeriesInteraction
 */
import React from "react";

import type ReactECharts from "echarts-for-react";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import type {
    HoveredSeriesInfo,
    TimeseriesDisplayConfig,
} from "@modules/_shared/eCharts";
import {
    buildTimeseriesChart,
    buildTimeseriesInteractionSeries,
    Chart,
    computeSubplotGridLayout,
    useTimestampSelection,
    useSeriesInteraction,
} from "@modules/_shared/eCharts";

import { generateTimeseriesGroups, generateTimeseriesOverlays } from "../../utils/syntheticData";
import { createHoveredSeriesStore, HoveredSeriesReadout } from "../hoveredSeriesReadout";

import { makeBaseOptions, type RecipeProps } from "./types";

const MEMBER_LABEL = "Member";
const ROW_HEIGHT_PX = 350;

export function TimeseriesRecipe({ viewContext, scrollMode, numSubplots, appliedZoomState, handleDataZoom, handleRestore }: RecipeProps): React.ReactNode {
    // ── Refs ──────────────────────────────────────────────────────────────
    const chartRef = React.useRef<ReactECharts>(null);
    const hoveredSeriesStore = React.useMemo(createHoveredSeriesStore, []);

    // ── Settings ─────────────────────────────────────────────────────────
    const dataConfig = viewContext.useSettingsToViewInterfaceValue("dataConfig");
    const tsConfig = viewContext.useSettingsToViewInterfaceValue("timeseriesDisplayConfig");
    const layoutConfig = viewContext.useSettingsToViewInterfaceValue("layoutConfig");

    // ── Generate synthetic data (only depends on data shape + coloring) ──
    const { groups, overlays, timestamps } = React.useMemo(() => {
        const g = generateTimeseriesGroups(
            dataConfig.numSubplots, dataConfig.numGroups, dataConfig.numMembers, dataConfig.numTimesteps,
            tsConfig.colorByParameter,
        );
        const o = generateTimeseriesOverlays(g, dataConfig.numSubplots);
        const ts = g.flatMap((gr) => gr.traces).find((t) => t.timestamps.length > 0)?.timestamps ?? [];
        return { groups: g, overlays: o, timestamps: ts };
    }, [dataConfig.numSubplots, dataConfig.numGroups, dataConfig.numMembers, dataConfig.numTimesteps, tsConfig.colorByParameter]);

    // ── Build chart option + interaction index ───────────────────────────
    const { echartsOptions, interactionSeries } = React.useMemo(() => {
        const displayConfig: TimeseriesDisplayConfig = {
            showMembers: tsConfig.showMembers,
            showStatistics: tsConfig.showStatistics,
            showFanchart: tsConfig.showFanchart && tsConfig.showStatistics,
            showReferenceLines: tsConfig.showReferenceLines,
            showPointAnnotations: tsConfig.showPointAnnotations,
            selectedStatistics: tsConfig.selectedStatistics,
        };
        const base = makeBaseOptions({ layoutConfig, appliedZoomState });

        return {
            echartsOptions: buildTimeseriesChart(groups, {
                ...base,
                subplotOverlays: overlays, displayConfig, yAxisLabel: "Value", memberLabel: MEMBER_LABEL,
            }),
            interactionSeries: buildTimeseriesInteractionSeries(groups, { displayConfig, subplotOverlays: overlays }),
        };
    }, [groups, overlays, tsConfig, layoutConfig, appliedZoomState]);

    // ── Timestamp selection (click + markLine in one hook) ───────────────
    const activeTimestampUtcMs = useTimestampSelection(chartRef, timestamps, echartsOptions);

    // ── Interaction hooks ────────────────────────────────────────────────
    const formatSeriesLabel = React.useCallback((info: HoveredSeriesInfo): string => {
        switch (info.kind) {
            case "member":         return `${MEMBER_LABEL} ${info.memberId}`;
            case "statistic":      return `${info.seriesName ?? "Series"} ${info.statisticLabel}`;
            case "reference-line": return "History";
            case "point-annotation": return "Observation";
        }
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
                <TimestampReadout activeTimestampUtcMs={activeTimestampUtcMs} />
                <HoveredSeriesReadout store={hoveredSeriesStore} />
            </div>
            <div style={{ height: chartHeight, width: "100%", minHeight: ROW_HEIGHT_PX, minWidth: 100 }}>
                <Chart chartRef={chartRef} option={echartsOptions} onDataZoom={handleDataZoom} onRestore={handleRestore} onEvents={onChartEvents} />
            </div>
        </>
    );
}

// ── Small local helpers (not exported) ───────────────────────────────────

function TimestampReadout({ activeTimestampUtcMs }: { activeTimestampUtcMs: number | null }): React.ReactNode {
    return (
        <div>
            <span className="font-bold">Timestamp: </span>
            {activeTimestampUtcMs ? timestampUtcMsToCompactIsoString(activeTimestampUtcMs) : "Ctrl + Click to select"}
        </div>
    );
}
