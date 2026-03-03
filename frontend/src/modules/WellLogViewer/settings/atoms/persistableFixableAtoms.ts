import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { persistableFixableAtom } from "@framework/utils/atomUtils";

import { availableFieldsQueryAtom, drilledWellboreHeadersQueryAtom } from "./queryAtoms";

export const selectedFieldIdentAtom = persistableFixableAtom<string | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const allFields = get(availableFieldsQueryAtom)?.data ?? [];
        const ensembleSet = get(EnsembleSetAtom);
        const regularEnsembles = ensembleSet.getRegularEnsembleArray();

        if (value === null) return false;

        if (ensembleSet.getEnsembleArray().length) {
            return regularEnsembles.some((ens) => ens.getFieldIdentifier() === value);
        }

        return allFields.some((field) => field.fieldIdentifier === value);
    },
    fixupFunction: ({ get }) => {
        const ensembleSet = get(EnsembleSetAtom);
        const allFields = get(availableFieldsQueryAtom)?.data ?? [];

        const regularEnsembles = ensembleSet.getRegularEnsembleArray();

        if (ensembleSet.getEnsembleArray().length) {
            return regularEnsembles[0]?.getFieldIdentifier() ?? null;
        }

        return allFields[0]?.fieldIdentifier ?? null;
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
