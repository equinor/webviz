import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { ViewLayout } from "@modules/_shared/enums/viewLayout";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { dataProviderStateAtom, preferredViewLayoutAtom } from "./atoms/baseAtoms";
import { fieldIdentifierAtom } from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    dataProviderData: string;
    fieldIdentifier: string | null;
    preferredViewLayout: ViewLayout;
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
            enum: [
                ViewLayout.VERTICAL,
                ViewLayout.HORIZONTAL,

                // ! Legacy workaround
                // ! Allow de-serializing the previous PreferredViewLayout enum
                ViewLayout.VERTICAL.toUpperCase() as ViewLayout,
                ViewLayout.HORIZONTAL.toUpperCase() as ViewLayout,
            ],
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
    setIfDefined(set, fieldIdentifierAtom, raw.fieldIdentifier);

    // ! Allow de-serializing the previous PreferredViewLayout enum
    setIfDefined(set, preferredViewLayoutAtom, raw.preferredViewLayout?.toLowerCase() as ViewLayout);
};
