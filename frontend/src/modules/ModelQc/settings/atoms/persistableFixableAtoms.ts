import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";

import { availableGridNamesAtom } from "./derivedAtoms";
import { gridModelsInfoQueryAtom } from "./queryAtoms";

export const selectedEnsembleIdentAtom = persistableFixableAtom<RegularEnsembleIdent | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);
        return value !== null && ensembleSet.hasEnsemble(value);
    },
    fixupFunction: ({ get }) => {
        const ensembleSet = get(EnsembleSetAtom);
        return ensembleSet.getRegularEnsembleArray()[0]?.getIdent() ?? null;
    },
});

export const selectedGridNameAtom = persistableFixableAtom<string | null>({
    initialValue: null,
    computeDependenciesState: ({ get }) => {
        const gridModelsInfoQuery = get(gridModelsInfoQueryAtom);
        if (gridModelsInfoQuery.isError) {
            return "error";
        }
        if (gridModelsInfoQuery.isFetching) {
            return "loading";
        }
        return "loaded";
    },
    isValidFunction: ({ get, value }) => {
        const availableGridNames = get(availableGridNamesAtom);
        if (availableGridNames.length === 0) {
            return value === null;
        }
        return value !== null && availableGridNames.includes(value);
    },
    fixupFunction: ({ get }) => {
        const availableGridNames = get(availableGridNamesAtom);
        return availableGridNames[0] ?? null;
    },
});
