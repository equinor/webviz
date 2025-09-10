import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { PreferredViewLayout } from "../types";

import { dataProviderStateAtom, preferredViewLayoutAtom } from "./atoms/baseAtoms";
import { fieldIdentifierAtom } from "./atoms/derivedAtoms";

export type SerializedSettings = {
    dataProviderData: string;
    fieldIdentifier: string | null;
    preferredViewLayout: PreferredViewLayout;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        dataProviderData: {
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

export const SERIALIZED_SETTINGS = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const dataProviderData = get(dataProviderStateAtom);
    const fieldIdentifier = get(fieldIdentifierAtom);
    const preferredViewLayout = get(preferredViewLayoutAtom);
    return {
        dataProviderData,
        fieldIdentifier: fieldIdentifier.value,
        preferredViewLayout,
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(set, dataProviderStateAtom, raw.dataProviderData);
    setIfDefined(set, dataProviderStateAtom, raw.dataProviderData);
    setIfDefined(set, fieldIdentifierAtom, raw.fieldIdentifier);
    setIfDefined(set, preferredViewLayoutAtom, raw.preferredViewLayout);
};
