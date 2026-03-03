import React from "react";

import {
    Bar,
    BarChart,
    Brush,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import type { ModuleViewProps } from "@framework/Module";

import type { Interfaces } from "./interfaces";
import { VisualizationMode } from "./typesAndEnums";

/**
 * Placeholder sample data – replace with real query data once the API hooks are wired up.
 */
function makeSampleTimeseriesData() {
    const startDate = new Date("2020-01-01");
    return Array.from({ length: 24 }, (_, i) => {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);
        const base = 1000 + 200 * Math.sin(i * 0.5);
        return {
            date: date.toISOString().slice(0, 10),
            mean: Math.round(base),
            p10: Math.round(base * 1.15),
            p90: Math.round(base * 0.85),
        };
    });
}

function makeSampleHistogramData() {
    return Array.from({ length: 10 }, (_, i) => ({
        bin: `${800 + i * 50}`,
        count: Math.round(5 + 15 * Math.exp(-((i - 4) ** 2) / 4)),
    }));
}

const COLORS = {
    mean: "#1976d2",
    p10: "#43a047",
    p90: "#e53935",
    histogram: "#42a5f5",
};

export function View({ viewContext }: ModuleViewProps<Interfaces>): React.ReactNode {
    const visualizationMode = viewContext.useSettingsToViewInterfaceValue("visualizationMode");
    const showHistogram = viewContext.useSettingsToViewInterfaceValue("showHistogram");
    const selectedStatistics = viewContext.useSettingsToViewInterfaceValue("selectedStatistics");

    const [brushIndex, setBrushIndex] = React.useState<{ startIndex?: number; endIndex?: number }>({});

    const timeseriesData = React.useMemo(() => makeSampleTimeseriesData(), []);
    const histogramData = React.useMemo(() => makeSampleHistogramData(), []);

    const handleBrushChange = React.useCallback((range: { startIndex?: number; endIndex?: number }) => {
        setBrushIndex(range);
    }, []);

    const showStatLines = visualizationMode !== VisualizationMode.IndividualRealizations;

    return (
        <div className="flex flex-col w-full h-full p-2 gap-2">
            {/* Timeseries chart */}
            <div className={showHistogram ? "h-2/3" : "h-full"}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeseriesData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        {showStatLines && selectedStatistics.includes("mean" as any) && (
                            <Line
                                type="monotone"
                                dataKey="mean"
                                stroke={COLORS.mean}
                                strokeWidth={2}
                                dot={false}
                                name="Mean"
                            />
                        )}
                        {showStatLines && selectedStatistics.includes("p10" as any) && (
                            <Line
                                type="monotone"
                                dataKey="p10"
                                stroke={COLORS.p10}
                                strokeWidth={1.5}
                                strokeDasharray="5 3"
                                dot={false}
                                name="P10"
                            />
                        )}
                        {showStatLines && selectedStatistics.includes("p90" as any) && (
                            <Line
                                type="monotone"
                                dataKey="p90"
                                stroke={COLORS.p90}
                                strokeWidth={1.5}
                                strokeDasharray="5 3"
                                dot={false}
                                name="P90"
                            />
                        )}
                        <Brush
                            dataKey="date"
                            height={20}
                            stroke={COLORS.mean}
                            onChange={handleBrushChange}
                            startIndex={brushIndex.startIndex}
                            endIndex={brushIndex.endIndex}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Linked histogram for the selected timestep */}
            {showHistogram && (
                <div className="h-1/3">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={histogramData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="bin" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill={COLORS.histogram} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
