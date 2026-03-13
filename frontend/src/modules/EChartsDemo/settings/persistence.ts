import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import type { StatisticKey } from "@modules/_shared/eCharts";
import { ALL_STATISTIC_KEYS } from "@modules/_shared/eCharts";
import { HistogramType } from "@modules/_shared/histogram";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { PlotType } from "../typesAndEnums";

import {
    plotTypeAtom,
    numSubplotsAtom,
    numGroupsAtom,
    numRealizationsAtom,
    showRealizationsAtom,
    showStatisticsAtom,
    showFanchartAtom,
    selectedStatisticsAtom,
    showStatisticalMarkersAtom,
    showRealizationPointsAtom,
    histogramBinsAtom,
    histogramTypeAtom,
    sharedXAxisAtom,
    sharedYAxisAtom,
    scrollModeAtom,
} from "./atoms/baseAtoms";

export type SerializedSettings = {
    plotType: PlotType;
    numSubplots: number;
    numGroups: number;
    numRealizations: number;
    showRealizations: boolean;
    showStatistics: boolean;
    showFanchart: boolean;
    selectedStatistics: StatisticKey[];
    showStatisticalMarkers: boolean;
    showRealizationPoints: boolean;
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
        numRealizations: { type: "int16" },
        showRealizations: { type: "boolean" },
        showStatistics: { type: "boolean" },
        showFanchart: { type: "boolean" },
        selectedStatistics: {
            elements: {
                enum: [...ALL_STATISTIC_KEYS],
            },
        },
        showStatisticalMarkers: { type: "boolean" },
        showRealizationPoints: { type: "boolean" },
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
    return {
        plotType: get(plotTypeAtom),
        numSubplots: get(numSubplotsAtom),
        numGroups: get(numGroupsAtom),
        numRealizations: get(numRealizationsAtom),
        showRealizations: get(showRealizationsAtom),
        showStatistics: get(showStatisticsAtom),
        showFanchart: get(showFanchartAtom),
        selectedStatistics: get(selectedStatisticsAtom),
        showStatisticalMarkers: get(showStatisticalMarkersAtom),
        showRealizationPoints: get(showRealizationPointsAtom),
        histogramBins: get(histogramBinsAtom),
        histogramType: get(histogramTypeAtom),
        sharedXAxis: get(sharedXAxisAtom),
        sharedYAxis: get(sharedYAxisAtom),
        scrollMode: get(scrollModeAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(set, plotTypeAtom, raw.plotType);
    setIfDefined(set, numSubplotsAtom, raw.numSubplots);
    setIfDefined(set, numGroupsAtom, raw.numGroups);
    setIfDefined(set, numRealizationsAtom, raw.numRealizations);
    setIfDefined(set, showRealizationsAtom, raw.showRealizations);
    setIfDefined(set, showStatisticsAtom, raw.showStatistics);
    setIfDefined(set, showFanchartAtom, raw.showFanchart);
    setIfDefined(set, selectedStatisticsAtom, raw.selectedStatistics);
    setIfDefined(set, showStatisticalMarkersAtom, raw.showStatisticalMarkers);
    setIfDefined(set, showRealizationPointsAtom, raw.showRealizationPoints);
    setIfDefined(set, histogramBinsAtom, raw.histogramBins);
    setIfDefined(set, histogramTypeAtom, raw.histogramType);
    setIfDefined(set, sharedXAxisAtom, raw.sharedXAxis);
    setIfDefined(set, sharedYAxisAtom, raw.sharedYAxis);
    setIfDefined(set, scrollModeAtom, raw.scrollMode);
};
