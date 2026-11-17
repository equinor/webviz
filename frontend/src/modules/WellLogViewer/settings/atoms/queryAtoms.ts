import { atomWithQuery } from "jotai-tanstack-query";

import type { WellboreHeader_api } from "@api";
import { getDrilledWellboreHeadersOptions, getFieldIdentifiersOptions } from "@api";

import { selectedFieldIdentAtom } from "./persistableFixableAtoms";

export const availableFieldsQueryAtom = atomWithQuery(() => {
    return getFieldIdentifiersOptions();
});

export const drilledWellboreHeadersQueryAtom = atomWithQuery((get) => {
    const { value: fieldIdValue, isValidInContext: fieldIdValid } = get(selectedFieldIdentAtom);
    const fieldId = fieldIdValue ?? "";

    return {
        ...getDrilledWellboreHeadersOptions({ query: { field_identifier: fieldId } }),
        // A disabled query keeps its cached headers, which must not resolve a wellbore for an invalid field.
        // select also runs on cached data, and reruns whenever its reference changes with fieldIdValid.
        select: fieldIdValid ? undefined : (): WellboreHeader_api[] => [],
        enabled: Boolean(fieldId) && fieldIdValid,
    };
});
