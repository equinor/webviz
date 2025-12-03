import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { dataProviderStateAtom, horizontalLayoutAtom, limitDomainToDataAtom } from "./atoms/baseAtoms";
import { selectedFieldIdentAtom, selectedWellboreUuidAtom } from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    selectedFieldIdent: string | null;
    selectedWellboreUuid: string | null;
    horizontalLayout: boolean;
    limitDomainToData: boolean;
    dataProviderState: string;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        selectedFieldIdent: {
            type: "string",
            nullable: true,
        },
        selectedWellboreUuid: {
            type: "string",
            nullable: true,
        },
        horizontalLayout: {
            type: "boolean",
        },
        limitDomainToData: {
            type: "boolean",
        },
        dataProviderState: {
            type: "string",
        },
    },
}));

export const SETTINGS_STATE_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    return {
        dataProviderState: get(dataProviderStateAtom),
        horizontalLayout: get(horizontalLayoutAtom),
        limitDomainToData: get(limitDomainToDataAtom),
        selectedFieldIdent: get(selectedFieldIdentAtom).value,
        selectedWellboreUuid: get(selectedWellboreUuidAtom).value,
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(set, dataProviderStateAtom, raw.dataProviderState);
    setIfDefined(set, horizontalLayoutAtom, raw.horizontalLayout);
    setIfDefined(set, limitDomainToDataAtom, raw.limitDomainToData);
    setIfDefined(set, selectedFieldIdentAtom, raw.selectedFieldIdent);
    setIfDefined(set, selectedWellboreUuidAtom, raw.selectedWellboreUuid);
};
