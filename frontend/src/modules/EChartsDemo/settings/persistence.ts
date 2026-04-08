import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import type { StatisticKey } from "@modules/_shared/eCharts";
import { ALL_STATISTIC_KEYS, HistogramType } from "@modules/_shared/eCharts";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { PlotType } from "../typesAndEnums";

import type {
    DataConfig,
    HistogramDisplayConfig,
    LayoutConfig,
    PointsAndLabelsConfig,
    TimeseriesDisplayConfig,
} from "./atoms/baseAtoms";
import {
    dataConfigAtom,
    histogramDisplayConfigAtom,
    layoutConfigAtom,
    pointsAndLabelsConfigAtom,
    timeseriesDisplayConfigAtom,
} from "./atoms/baseAtoms";

export type SerializedSettings = {
    plotType: PlotType;
    numSubplots: number;
    numGroups: number;
    numMembers: number;
    numTimesteps: number;
    showMembers: boolean;
    showStatistics: boolean;
    showFanchart: boolean;
    showReferenceLines: boolean;
    showPointAnnotations: boolean;
    selectedStatistics: StatisticKey[];
    showStatisticalMarkers: boolean;
    showBarLabels: boolean;
    showMemberPoints: boolean;
    histogramBins: number;
    histogramType: HistogramType;
    sharedXAxis: boolean;
    sharedYAxis: boolean;
    scrollMode: boolean;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        plotType: {
            enum: Object.values(PlotType),
        },
        numSubplots: { type: "int16" },
        numGroups: { type: "int16" },
        numMembers: { type: "int16" },
        numTimesteps: { type: "int16" },
        showMembers: { type: "boolean" },
        showStatistics: { type: "boolean" },
        showFanchart: { type: "boolean" },
        showReferenceLines: { type: "boolean" },
        showPointAnnotations: { type: "boolean" },
        selectedStatistics: {
            elements: {
                enum: [...ALL_STATISTIC_KEYS],
            },
        },
        showStatisticalMarkers: { type: "boolean" },
        showBarLabels: { type: "boolean" },
        showMemberPoints: { type: "boolean" },
        histogramBins: { type: "int16" },
        histogramType: {
            enum: Object.values(HistogramType),
        },
        sharedXAxis: { type: "boolean" },
        sharedYAxis: { type: "boolean" },
        scrollMode: { type: "boolean" },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const data = get(dataConfigAtom);
    const ts = get(timeseriesDisplayConfigAtom);
    const hist = get(histogramDisplayConfigAtom);
    const pl = get(pointsAndLabelsConfigAtom);
    const layout = get(layoutConfigAtom);

    return {
        plotType: data.plotType,
        numSubplots: data.numSubplots,
        numGroups: data.numGroups,
        numMembers: data.numMembers,
        numTimesteps: data.numTimesteps,
        showMembers: ts.showMembers,
        showStatistics: ts.showStatistics,
        showFanchart: ts.showFanchart,
        showReferenceLines: ts.showReferenceLines,
        showPointAnnotations: ts.showPointAnnotations,
        selectedStatistics: ts.selectedStatistics,
        showStatisticalMarkers: pl.showStatisticalMarkers,
        showBarLabels: pl.showBarLabels,
        showMemberPoints: pl.showMemberPoints,
        histogramBins: hist.histogramBins,
        histogramType: hist.histogramType,
        sharedXAxis: layout.sharedXAxis,
        sharedYAxis: layout.sharedYAxis,
        scrollMode: layout.scrollMode,
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const dataUpdate: Partial<DataConfig> = {};
    if (raw.plotType !== undefined) dataUpdate.plotType = raw.plotType;
    if (raw.numSubplots !== undefined) dataUpdate.numSubplots = raw.numSubplots;
    if (raw.numGroups !== undefined) dataUpdate.numGroups = raw.numGroups;
    if (raw.numMembers !== undefined) dataUpdate.numMembers = raw.numMembers;
    if (raw.numTimesteps !== undefined) dataUpdate.numTimesteps = raw.numTimesteps;
    if (Object.keys(dataUpdate).length > 0) {
        set(dataConfigAtom, (prev) => ({ ...prev, ...dataUpdate }));
    }

    const tsUpdate: Partial<TimeseriesDisplayConfig> = {};
    if (raw.showMembers !== undefined) tsUpdate.showMembers = raw.showMembers;
    if (raw.showStatistics !== undefined) tsUpdate.showStatistics = raw.showStatistics;
    if (raw.showFanchart !== undefined) tsUpdate.showFanchart = raw.showFanchart;
    if (raw.showReferenceLines !== undefined) tsUpdate.showReferenceLines = raw.showReferenceLines;
    if (raw.showPointAnnotations !== undefined) tsUpdate.showPointAnnotations = raw.showPointAnnotations;
    if (raw.selectedStatistics !== undefined) tsUpdate.selectedStatistics = raw.selectedStatistics;
    if (Object.keys(tsUpdate).length > 0) {
        set(timeseriesDisplayConfigAtom, (prev) => ({ ...prev, ...tsUpdate }));
    }

    const histUpdate: Partial<HistogramDisplayConfig> = {};
    if (raw.histogramBins !== undefined) histUpdate.histogramBins = raw.histogramBins;
    if (raw.histogramType !== undefined) histUpdate.histogramType = raw.histogramType;
    if (Object.keys(histUpdate).length > 0) {
        set(histogramDisplayConfigAtom, (prev) => ({ ...prev, ...histUpdate }));
    }

    const plUpdate: Partial<PointsAndLabelsConfig> = {};
    if (raw.showStatisticalMarkers !== undefined) plUpdate.showStatisticalMarkers = raw.showStatisticalMarkers;
    if (raw.showBarLabels !== undefined) plUpdate.showBarLabels = raw.showBarLabels;
    if (raw.showMemberPoints !== undefined) plUpdate.showMemberPoints = raw.showMemberPoints;
    if (Object.keys(plUpdate).length > 0) {
        set(pointsAndLabelsConfigAtom, (prev) => ({ ...prev, ...plUpdate }));
    }

    const layoutUpdate: Partial<LayoutConfig> = {};
    if (raw.sharedXAxis !== undefined) layoutUpdate.sharedXAxis = raw.sharedXAxis;
    if (raw.sharedYAxis !== undefined) layoutUpdate.sharedYAxis = raw.sharedYAxis;
    if (raw.scrollMode !== undefined) layoutUpdate.scrollMode = raw.scrollMode;
    if (Object.keys(layoutUpdate).length > 0) {
        set(layoutConfigAtom, (prev) => ({ ...prev, ...layoutUpdate }));
    }
};
