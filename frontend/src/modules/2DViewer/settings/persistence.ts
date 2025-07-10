import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";
import { dataProviderStateAtom, preferredViewLayoutAtom, userSelectedFieldIdentifierAtom } from "./atoms/baseAtoms";
import { PreferredViewLayout } from "../types";

export type SerializedSettings = {
    dataProviderData: string;
    fieldIdentifier: string | null;
    preferredViewLayout: PreferredViewLayout;
};

const settingsBuilder = new SchemaBuilder<SerializedSettings>(() => ({
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

export const SERIALIZED_SETTINGS = settingsBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const dataProviderData = get(dataProviderStateAtom);
    const fieldIdentifier = get(userSelectedFieldIdentifierAtom);
    const preferredViewLayout = get(preferredViewLayoutAtom);
    return {
        dataProviderData,
        fieldIdentifier,
        preferredViewLayout,
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    set(dataProviderStateAtom, raw.dataProviderData);
    set(userSelectedFieldIdentifierAtom, raw.fieldIdentifier);
    set(preferredViewLayoutAtom, raw.preferredViewLayout);
};
