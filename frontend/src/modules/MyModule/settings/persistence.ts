import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { myPersistableAtom } from "./atoms/baseAtoms";

export type SerializedSettings = {
    myData: string;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        myData: {
            type: "string",
        },
    },
}));

export const SERIALIZED_SETTINGS = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const myData = get(myPersistableAtom);
    return {
        myData: myData.value,
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(set, myPersistableAtom, raw.myData);
};
