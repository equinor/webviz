import { atomWithQuery } from "jotai-tanstack-query";

import { getDrilledWellboreHeadersOptions } from "@api";

import { selectedFieldIdentAtom } from "./persistableFixableAtoms";

export const drilledWellboreHeadersQueryAtom = atomWithQuery((get) => {
    const fieldId = get(selectedFieldIdentAtom).value ?? "";

    return {
        ...getDrilledWellboreHeadersOptions({ query: { field_identifier: fieldId } }),
        enabled: Boolean(fieldId),
    };
});
