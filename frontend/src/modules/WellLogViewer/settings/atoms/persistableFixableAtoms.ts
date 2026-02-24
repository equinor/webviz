import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { persistableFixableAtom } from "@framework/utils/atomUtils";

import { drilledWellboreHeadersQueryAtom } from "./queryAtoms";

export const selectedFieldIdentAtom = persistableFixableAtom<string | null>({
    initialValue: null,

    isValidFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);
        const regularEnsembles = ensembleSet.getRegularEnsembleArray();
        if (value === null) return false;

        return regularEnsembles.some((ens) => ens.getFieldIdentifiers().at(0) === value);
    },
    fixupFunction: ({ get }) => {
        const ensembleSet = get(EnsembleSetAtom);
        const regularEnsembles = ensembleSet.getRegularEnsembleArray();

        return regularEnsembles[0]?.getFieldIdentifiers().at(0) ?? null;
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
