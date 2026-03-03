import React from "react";

import ReactECharts from "echarts-for-react";
import { useAtomValue, useSetAtom } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";

import type { Interfaces } from "../interfaces";
import { VisualizationMode } from "../typesAndEnums";
import { buildHistogramData } from "../utils/aggregation";
import { buildHistogramOptions } from "../utils/echartsHistogramOptions";
import { buildTimeseriesOptions } from "../utils/echartsTimeseriesOptions";

import { selectedTimestepIdxAtom, showRecoveryFactorAtom, visualizationModeAtom } from "./atoms/baseAtoms";
import {
    allQueriesFailedAtom,
    chartTracesAtom,
    formatDate,
    isDataFetchingAtom,
    isInPlaceVector,
} from "./atoms/derivedAtoms";

// ────────── Constants ──────────

const HISTOGRAM_COLOR = "#42a5f5";

// ────────── View ──────────

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const { viewContext } = props;
    const statusWriter = useViewStatusWriter(viewContext);

    // View-side atoms
    const visualizationMode = useAtomValue(visualizationModeAtom);
    const isFetching = useAtomValue(isDataFetchingAtom);
    const allFailed = useAtomValue(allQueriesFailedAtom);
    const chartTraces = useAtomValue(chartTracesAtom);

    const divRef = React.useRef<HTMLDivElement>(null);
    const divBoundingRect = useElementBoundingRect(divRef);

    // Settings interface values that are only needed for rendering
    const showHistogram = viewContext.useSettingsToViewInterfaceValue("showHistogram");
    const selectedStatistics = viewContext.useSettingsToViewInterfaceValue("selectedStatistics");
    const selectedVectorBaseName = viewContext.useSettingsToViewInterfaceValue("selectedVectorBaseName");
    const ensembleIdents = viewContext.useSettingsToViewInterfaceValue("ensembleIdents");
    const vectorNamesToFetch = viewContext.useSettingsToViewInterfaceValue("vectorNamesToFetch");

    // Local view state
    const selectedTimestepIdx = useAtomValue(selectedTimestepIdxAtom);
    const setSelectedTimestepIdx = useSetAtom(selectedTimestepIdxAtom);
    const showRecoveryFactor = useAtomValue(showRecoveryFactorAtom);
    const setShowRecoveryFactor = useSetAtom(showRecoveryFactorAtom);

    const chartRef = React.useRef<ReactECharts>(null);

    // Status writer
    statusWriter.setLoading(isFetching);

    // ── Derived rendering data ──

    const showStatLines = visualizationMode !== VisualizationMode.IndividualRealizations;
    const showFanchart = visualizationMode === VisualizationMode.StatisticalFanchart;
    const yAxisLabel = showRecoveryFactor ? "Recovery Factor" : (selectedVectorBaseName ?? "Value");
    const queryEnabled = ensembleIdents.length > 0 && vectorNamesToFetch.length > 0;

    // ── Build echarts data from traces ──

    const { echartsOptions, timeseriesChartData } = React.useMemo(() => {
        return buildTimeseriesOptions(chartTraces, showStatLines, showFanchart, selectedStatistics, yAxisLabel);
    }, [chartTraces, showStatLines, showFanchart, selectedStatistics, yAxisLabel]);

    // ── Histogram data (first trace, aggregated values at selected timestep) ──

    const histogramData = React.useMemo(() => {
        if (selectedTimestepIdx === null || chartTraces.length === 0) return [];

        const firstTrace = chartTraces[0];
        if (!firstTrace.aggregatedValues || selectedTimestepIdx >= firstTrace.timestamps.length) return [];

        const valuesAtTimestep = firstTrace.aggregatedValues.map((realVals) => realVals[selectedTimestepIdx]);
        return buildHistogramData(valuesAtTimestep);
    }, [selectedTimestepIdx, chartTraces]);

    const echartsHistogramOptions = React.useMemo(() => {
        return buildHistogramOptions(histogramData, HISTOGRAM_COLOR);
    }, [histogramData]);

    // ── Handlers ──

    const highlightedSeriesRef = React.useRef<string | null>(null);

    const onChartEvents = React.useMemo(
        () => ({
            click: (e: any) => {
                if (e && e.dataIndex !== undefined) {
                    setSelectedTimestepIdx(e.dataIndex);
                }
            },
            mouseover: (e: any) => {
                if (!showStatLines && e.seriesName && chartRef.current) {
                    const instance = chartRef.current.getEchartsInstance();
                    // Dim all, then brighten the hovered one
                    if (highlightedSeriesRef.current !== e.seriesName) {
                        instance.dispatchAction({ type: "downplay" });
                        instance.dispatchAction({
                            type: "highlight",
                            seriesName: e.seriesName,
                        });
                        highlightedSeriesRef.current = e.seriesName;
                    }
                }
            },
            mouseout: () => {
                if (!showStatLines && chartRef.current) {
                    const instance = chartRef.current.getEchartsInstance();
                    instance.dispatchAction({ type: "downplay" });
                    highlightedSeriesRef.current = null;
                }
            },
            globalout: () => {
                if (!showStatLines && chartRef.current) {
                    const instance = chartRef.current.getEchartsInstance();
                    instance.dispatchAction({ type: "downplay" });
                    highlightedSeriesRef.current = null;
                }
            },
        }),
        [setSelectedTimestepIdx, showStatLines],
    );

    // ── Loading / empty states ──

    if (!queryEnabled) {
        return (
            <div className="flex items-center justify-center w-full h-full text-gray-400">
                Select ensembles, a vector, and regions to begin
            </div>
        );
    }

    if (isFetching && chartTraces.length === 0) {
        return <div className="flex items-center justify-center w-full h-full text-gray-400">Loading data...</div>;
    }

    if (allFailed) {
        return (
            <div className="flex items-center justify-center w-full h-full text-red-500">
                Error loading data from all ensembles
            </div>
        );
    }

    if (!timeseriesChartData.length) {
        return <div className="flex items-center justify-center w-full h-full text-gray-400">No data available</div>;
    }

    return (
        <div ref={divRef} className="flex flex-col w-full h-full p-2 gap-2">
            {/* Recovery factor toggle for in-place vectors */}
            {isInPlaceVector(selectedVectorBaseName) && (
                <div className="flex items-center gap-2 text-sm px-1">
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showRecoveryFactor}
                            onChange={(e) => setShowRecoveryFactor(e.target.checked)}
                        />
                        Show recovery factor
                    </label>
                    {selectedTimestepIdx !== null && chartTraces[0] && (
                        <span className="text-gray-500 ml-auto">
                            Histogram at: {formatDate(chartTraces[0].timestamps[selectedTimestepIdx])}
                        </span>
                    )}
                </div>
            )}

            {/* Timeseries chart */}
            <div
                style={{
                    height: showHistogram ? divBoundingRect.height * 0.666 : divBoundingRect.height,
                    width: divBoundingRect.width,
                }}
            >
                {divBoundingRect.width > 0 && divBoundingRect.height > 0 && (
                    <ReactECharts
                        ref={chartRef}
                        option={echartsOptions}
                        style={{ height: "100%", width: "100%" }}
                        onEvents={onChartEvents}
                        notMerge={true}
                    />
                )}
            </div>

            {/* Linked histogram */}
            {showHistogram && (
                <div style={{ height: divBoundingRect.height * 0.333, width: divBoundingRect.width }}>
                    {histogramData.length > 0 ? (
                        divBoundingRect.width > 0 &&
                        divBoundingRect.height > 0 && (
                            <ReactECharts
                                option={echartsHistogramOptions}
                                style={{ height: "100%", width: "100%" }}
                                notMerge={true}
                            />
                        )
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                            Click on a timestep in the chart above to show distribution
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ────────── Constants ──────────
