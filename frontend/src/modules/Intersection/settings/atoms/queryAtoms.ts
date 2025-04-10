import { atomWithQuery } from "jotai-tanstack-query";

import { getDrilledWellboreHeadersOptions } from "@api";


import { selectedFieldIdentifierAtom } from "./derivedAtoms";

export const drilledWellboreHeadersQueryAtom = atomWithQuery((get) => {
    const fieldIdentifier = get(selectedFieldIdentifierAtom);

    return {
        ...getDrilledWellboreHeadersOptions({
            query: {
                field_identifier: fieldIdentifier ?? "",
            },
        }),
        enabled: Boolean(fieldIdentifier),
    };
});
