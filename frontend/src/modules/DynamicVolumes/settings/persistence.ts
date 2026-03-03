import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { GroupBy, StatisticsType, VisualizationMode } from "../typesAndEnums";

import {
    groupByAtom,
    selectedStatisticsAtom,
    showHistogramAtom,
    visualizationModeAtom,
} from "./atoms/baseAtoms";

export type SerializedSettings = {
    visualizationMode: VisualizationMode;
    groupBy: GroupBy;
    selectedStatistics: StatisticsType[];
    showHistogram: boolean;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        visualizationMode: {
            enum: Object.values(VisualizationMode),
        },
        groupBy: {
            enum: Object.values(GroupBy),
        },
        selectedStatistics: {
            elements: {
                enum: Object.values(StatisticsType),
            },
        },
        showHistogram: { type: "boolean" },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    return {
        visualizationMode: get(visualizationModeAtom),
        groupBy: get(groupByAtom),
        selectedStatistics: get(selectedStatisticsAtom),
        showHistogram: get(showHistogramAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(set, visualizationModeAtom, raw.visualizationMode);
    setIfDefined(set, groupByAtom, raw.groupBy);
    setIfDefined(set, selectedStatisticsAtom, raw.selectedStatistics);
    setIfDefined(set, showHistogramAtom, raw.showHistogram);
};
