import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { PreferredViewLayout } from "../typesAndEnums";

import { dataProviderSerializedStateAtom, preferredViewLayoutAtom } from "./atoms/baseAtoms";
import { selectedFieldIdentifierAtom } from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    dataProviderSerializedState: string;
    fieldIdentifier: string | null;
    preferredViewLayout: PreferredViewLayout;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        dataProviderSerializedState: {
            type: "string",
        },
        fieldIdentifier: {
            type: "string",
            nullable: true,
        },
        preferredViewLayout: {
            enum: [PreferredViewLayout.VERTICAL, PreferredViewLayout.HORIZONTAL],
        },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    return {
        dataProviderSerializedState: get(dataProviderSerializedStateAtom),
        fieldIdentifier: get(selectedFieldIdentifierAtom).value,
        preferredViewLayout: get(preferredViewLayoutAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(set, dataProviderSerializedStateAtom, raw.dataProviderSerializedState);
    setIfDefined(set, selectedFieldIdentifierAtom, raw.fieldIdentifier);
    setIfDefined(set, preferredViewLayoutAtom, raw.preferredViewLayout);
};
