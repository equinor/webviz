import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { ColorBy, StatisticsType, VisualizationMode } from "../typesAndEnums";

import {
    colorByAtom,
    selectedStatisticsAtom,
    showHistogramAtom,
    visualizationModeAtom,
} from "./atoms/baseAtoms";

export type SerializedSettings = {
    visualizationMode: VisualizationMode;
    colorBy: ColorBy;
    selectedStatistics: StatisticsType[];
    showHistogram: boolean;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        visualizationMode: {
            enum: Object.values(VisualizationMode),
        },
        colorBy: {
            enum: Object.values(ColorBy),
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
        colorBy: get(colorByAtom),
        selectedStatistics: get(selectedStatisticsAtom),
        showHistogram: get(showHistogramAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(set, visualizationModeAtom, raw.visualizationMode);
    setIfDefined(set, colorByAtom, raw.colorBy);
    setIfDefined(set, selectedStatisticsAtom, raw.selectedStatistics);
    setIfDefined(set, showHistogramAtom, raw.showHistogram);
};
