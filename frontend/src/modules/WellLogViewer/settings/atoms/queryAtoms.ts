import { atomWithQuery } from "jotai-tanstack-query";

import { getDrilledWellboreHeadersOptions, getFieldsOptions } from "@api";

import { selectedFieldIdentAtom } from "./persistableFixableAtoms";

export const availableFieldsQueryAtom = atomWithQuery(() => {
    return getFieldsOptions();
});

export const drilledWellboreHeadersQueryAtom = atomWithQuery((get) => {
    const fieldId = get(selectedFieldIdentAtom).value ?? "";

    return {
        ...getDrilledWellboreHeadersOptions({ query: { field_identifier: fieldId } }),
        enabled: Boolean(fieldId),
    };
});
