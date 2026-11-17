import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { computeQueryDependenciesState, persistableFixableAtom } from "@framework/utils/atomUtils";

import { availableFieldsQueryAtom, drilledWellboreHeadersQueryAtom } from "./queryAtoms";

export const selectedFieldIdentAtom = persistableFixableAtom<string | null>({
    initialValue: null,
    // Without ensembles, the field is checked against the fetched fields - so it waits for them, rather than settling
    // on null before they are loaded. With ensembles, their field identifiers are available right away.
    computeDependenciesState: ({ get }) => {
        if (get(EnsembleSetAtom).getEnsembleArray().length) {
            return "loaded";
        }
        return computeQueryDependenciesState(get(availableFieldsQueryAtom));
    },
    isValidFunction: ({ get, value }) => {
        const allFields = get(availableFieldsQueryAtom)?.data ?? [];
        const ensembleSet = get(EnsembleSetAtom);
        const regularEnsembles = ensembleSet.getRegularEnsembleArray();

        if (value === null) return false;

        if (ensembleSet.getEnsembleArray().length) {
            return regularEnsembles.some((ens) => ens.getFieldIdentifiers().includes(value));
        }

        return allFields.some((field) => field.fieldIdentifier === value);
    },
    fixupFunction: ({ get }) => {
        const ensembleSet = get(EnsembleSetAtom);
        const allFields = get(availableFieldsQueryAtom)?.data ?? [];
        const regularEnsembles = ensembleSet.getRegularEnsembleArray();

        if (ensembleSet.getEnsembleArray().length) {
            return regularEnsembles[0]?.getFieldIdentifiers()[0] ?? null;
        }

        return allFields[0]?.fieldIdentifier ?? null;
    },
});

export const selectedWellboreUuidAtom = persistableFixableAtom<string | null>({
    initialValue: null,
    // A disabled query is "blocked" whatever it has cached, so a stale error doesn't surface for an invalid field
    computeDependenciesState: ({ get }) => computeQueryDependenciesState(get(drilledWellboreHeadersQueryAtom)),
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
