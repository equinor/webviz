import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";
import { SensitivitySortBy } from "@modules/_shared/SensitivityProcessing/types";

import { DisplayComponentType, SensitivityScaling } from "../typesAndEnums";
import { ColorBy } from "../view/components/sensitivityChartFigure";

import {
    colorByAtom,
    displayComponentTypeAtom,
    hideZeroYAtom,
    referenceSensitivityNameAtom,
    responseChannelNameAtom,
    sensitivityScalingAtom,
    sensitivitySortByAtom,
    showLabelsAtom,
    showRealizationPointsAtom,
} from "./atoms/baseAtoms";

export type SerializedSettings = {
    displayComponentType: DisplayComponentType;
    referenceSensitivityName: string | null;
    responseChannelName: string | null;
    showLabels: boolean;
    hideZeroY: boolean;
    showRealizationPoints: boolean;
    sensitivitySortBy: SensitivitySortBy;
    sensitivityScaling: SensitivityScaling;
    colorBy: ColorBy;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        displayComponentType: {
            enum: Object.values(DisplayComponentType),
        },
        referenceSensitivityName: { type: "string", nullable: true },
        responseChannelName: { type: "string", nullable: true },
        showLabels: { type: "boolean" },
        hideZeroY: { type: "boolean" },
        showRealizationPoints: { type: "boolean" },
        sensitivitySortBy: { enum: Object.values(SensitivitySortBy) },
        sensitivityScaling: { enum: Object.values(SensitivityScaling) },
        colorBy: { enum: Object.values(ColorBy) },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    return {
        displayComponentType: get(displayComponentTypeAtom),
        referenceSensitivityName: get(referenceSensitivityNameAtom),
        responseChannelName: get(responseChannelNameAtom),
        showLabels: get(showLabelsAtom),
        hideZeroY: get(hideZeroYAtom),
        showRealizationPoints: get(showRealizationPointsAtom),
        sensitivitySortBy: get(sensitivitySortByAtom),
        sensitivityScaling: get(sensitivityScalingAtom),
        colorBy: get(colorByAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(set, displayComponentTypeAtom, raw.displayComponentType);
    setIfDefined(set, referenceSensitivityNameAtom, raw.referenceSensitivityName);
    setIfDefined(set, responseChannelNameAtom, raw.responseChannelName);
    setIfDefined(set, showLabelsAtom, raw.showLabels);
    setIfDefined(set, hideZeroYAtom, raw.hideZeroY);
    setIfDefined(set, showRealizationPointsAtom, raw.showRealizationPoints);
    setIfDefined(set, sensitivitySortByAtom, raw.sensitivitySortBy);
    setIfDefined(set, sensitivityScalingAtom, raw.sensitivityScaling);
    setIfDefined(set, colorByAtom, raw.colorBy);
};
