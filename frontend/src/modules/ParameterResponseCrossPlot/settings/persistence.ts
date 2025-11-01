import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { PlotType } from "../typesAndEnums";

import { plotTypeAtom, showTrendlineAtom } from "./atoms/baseAtoms";
import { parameterIdentStringAtom } from "./atoms/persistedAtoms";

export type SerializedSettings = {
    plotType: PlotType;
    parameterIdentString: string | null;
    showTrendline: boolean;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        plotType: {
            enum: Object.values(PlotType),
        },
        parameterIdentString: { type: "string", nullable: true },
        showTrendline: { type: "boolean" },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    return {
        plotType: get(plotTypeAtom),
        parameterIdentString: get(parameterIdentStringAtom).value,
        showTrendline: get(showTrendlineAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(set, plotTypeAtom, raw.plotType);
    setIfDefined(set, parameterIdentStringAtom, raw.parameterIdentString);
    setIfDefined(set, showTrendlineAtom, raw.showTrendline);
};
