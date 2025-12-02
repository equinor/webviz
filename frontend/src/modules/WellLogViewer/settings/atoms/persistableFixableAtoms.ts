import { persistableFixableAtom } from "@framework/utils/atomUtils";

import { availableFieldsQueryAtom, drilledWellboreHeadersQueryAtom } from "./queryAtoms";

export const selectedFieldIdentAtom = persistableFixableAtom<string | null>({
    initialValue: null,
    computeDependenciesState: ({ get }) => {
        const fieldsQuery = get(availableFieldsQueryAtom);

        if (fieldsQuery.isLoading) return "loading";
        if (fieldsQuery.isError) return "error";

        return "loaded";
    },
    isValidFunction: ({ get, value }) => {
        const availableFields = get(availableFieldsQueryAtom).data;

        if (!availableFields) return !value;

        return availableFields.some((field) => field.fieldIdentifier === value);
    },
    fixupFunction: ({ get }) => {
        const availableFields = get(availableFieldsQueryAtom).data;
        return availableFields?.[0]?.fieldIdentifier ?? null;
    },
});

export const selectedWellboreUuidAtom = persistableFixableAtom<string | null>({
    initialValue: null,
    computeDependenciesState: ({ get }) => {
        const headersQuery = get(drilledWellboreHeadersQueryAtom);

        if (headersQuery.isLoading) return "loading";
        if (headersQuery.isError) return "error";

        return "loaded";
    },
    isValidFunction: ({ get, value }) => {
        const availableHeaders = get(drilledWellboreHeadersQueryAtom)?.data;
        if (!availableHeaders?.length) return value === null;
        return availableHeaders.some((wh) => wh.wellboreUuid === value);
    },
    fixupFunction: ({ get }) => {
        const availableHeaders = get(drilledWellboreHeadersQueryAtom)?.data;

        return availableHeaders?.[0]?.wellboreUuid ?? null;
    },
});
