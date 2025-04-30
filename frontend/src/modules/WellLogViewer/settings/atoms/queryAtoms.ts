import { atomWithQuery } from "jotai-tanstack-query";

import { getDrilledWellboreHeadersOptions, getFieldsOptions } from "@api";

import { selectedFieldIdentifierAtom } from "./derivedAtoms";

export const availableFieldsQueryAtom = atomWithQuery(() => {
    return getFieldsOptions();
});

export const drilledWellboreHeadersQueryAtom = atomWithQuery((get) => {
    const fieldId = get(selectedFieldIdentifierAtom) ?? "";

    return {
        ...getDrilledWellboreHeadersOptions({ query: { field_identifier: fieldId } }),
        enabled: Boolean(fieldId),
    };
});
