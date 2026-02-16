import { ParameterIdent } from "@framework/EnsembleParameters";
import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { PlotType } from "../typesAndEnums";

import {
    plotTypeAtom,
    selectedParameterIdentsAtom,
    showLabelsAtom,
    useFixedColorRangeAtom,
    correlationThresholdAtom,
    hideIndividualCellsAtom,
    filterColumnsAtom,
    filterRowsAtom,
} from "./atoms/baseAtoms";

export type SerializedSettings = {
    plotType: PlotType;
    parameterIdentStrings: string[];
    showLabels: boolean;
    useFixedColorRange: boolean;
    correlationThreshold: number;
    hideIndividualCells: boolean;
    filterColumns: boolean;
    filterRows: boolean;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        plotType: {
            enum: Object.values(PlotType),
        },
        parameterIdentStrings: { elements: { type: "string" } },
        showLabels: { type: "boolean" },
        useFixedColorRange: { type: "boolean" },
        correlationThreshold: { type: "float32" },
        hideIndividualCells: { type: "boolean" },
        filterColumns: { type: "boolean" },
        filterRows: { type: "boolean" },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    return {
        plotType: get(plotTypeAtom),
        parameterIdentStrings: get(selectedParameterIdentsAtom).map((ident) => ident.toString()),
        showLabels: get(showLabelsAtom),
        useFixedColorRange: get(useFixedColorRangeAtom),
        correlationThreshold: get(correlationThresholdAtom),
        hideIndividualCells: get(hideIndividualCellsAtom),
        filterColumns: get(filterColumnsAtom),
        filterRows: get(filterRowsAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const parameterIdents = raw.parameterIdentStrings?.map((id) => ParameterIdent.fromString(id)) ?? [];
    setIfDefined(set, plotTypeAtom, raw.plotType);
    setIfDefined(set, selectedParameterIdentsAtom, parameterIdents);
    setIfDefined(set, showLabelsAtom, raw.showLabels);
    setIfDefined(set, useFixedColorRangeAtom, raw.useFixedColorRange);
    setIfDefined(set, correlationThresholdAtom, raw.correlationThreshold);
    setIfDefined(set, hideIndividualCellsAtom, raw.hideIndividualCells);
    setIfDefined(set, filterColumnsAtom, raw.filterColumns);
    setIfDefined(set, filterRowsAtom, raw.filterRows);
};
