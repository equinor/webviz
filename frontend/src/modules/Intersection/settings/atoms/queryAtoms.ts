import { getDrilledWellboreHeadersOptions } from "@api";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedFieldIdentifierAtom } from "./derivedAtoms";

export const drilledWellboreHeadersQueryAtom = atomWithQuery((get) => {
    const fieldIdentifier = get(selectedFieldIdentifierAtom);

    getDrilledWellboreHeadersOptions;

    return {
        ...getDrilledWellboreHeadersOptions({
            query: {
                field_identifier: fieldIdentifier ?? "",
            },
        }),
        enabled: Boolean(fieldIdentifier),
    };
});
