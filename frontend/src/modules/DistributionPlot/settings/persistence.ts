import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { PlotType, BarSortBy, StatisticsColumn } from "../typesAndEnums";

import {
    plotTypeAtom,
    numBinsAtom,
    orientationAtom,
    sharedXAxesAtom,
    sharedYAxesAtom,
    barSortByAtom,
    statisticsColumnsAtom,
} from "./atoms/baseAtoms";

export type SerializedSettings = {
    plotType: PlotType;
    numBins: number;
    orientation: "h" | "v";
    sharedXAxes: boolean;
    sharedYAxes: boolean;
    barSortBy: BarSortBy;
    statisticsColumns: StatisticsColumn[];
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        plotType: {
            enum: Object.values(PlotType),
        },
        numBins: { type: "int16" },
        orientation: {
            enum: ["h", "v"],
        },
        sharedXAxes: { type: "boolean" },
        sharedYAxes: { type: "boolean" },
        barSortBy: {
            enum: Object.values(BarSortBy),
        },
        statisticsColumns: {
            elements: {
                enum: Object.values(StatisticsColumn),
            },
        },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    return {
        plotType: get(plotTypeAtom),
        numBins: get(numBinsAtom),
        orientation: get(orientationAtom),
        sharedXAxes: get(sharedXAxesAtom),
        sharedYAxes: get(sharedYAxesAtom),
        barSortBy: get(barSortByAtom),
        statisticsColumns: get(statisticsColumnsAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(set, plotTypeAtom, raw.plotType);
    setIfDefined(set, numBinsAtom, raw.numBins);
    setIfDefined(set, orientationAtom, raw.orientation);
    setIfDefined(set, sharedXAxesAtom, raw.sharedXAxes);
    setIfDefined(set, sharedYAxesAtom, raw.sharedYAxes);
    setIfDefined(set, barSortByAtom, raw.barSortBy);
    setIfDefined(set, statisticsColumnsAtom, raw.statisticsColumns);
};
