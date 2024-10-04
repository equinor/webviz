import { EnsembleSet } from "@framework/EnsembleSet";

import { atom } from "jotai";
import { isEqual } from "lodash";

import { EnsembleIdent } from "./EnsembleIdent";
import { RealizationFilterSet } from "./RealizationFilterSet";
import { EnsembleRealizationFilterFunction } from "./WorkbenchSession";
import { atomWithCompare } from "./utils/atomUtils";

export const EnsembleSetAtom = atomWithCompare<EnsembleSet>(new EnsembleSet([]), isEqual);

/**
 * Get the valid ensemble realizations function that filters out invalid realizations based on the current realization filter set.
 *
 * If realization filter set is not defined, the atom will return null
 */
export const EnsembleRealizationFilterFunctionAtom = atom<EnsembleRealizationFilterFunction | null>((get) => {
    const realizationFilterSet = get(RealizationFilterSetAtom)?.filterSet;

    if (!realizationFilterSet) {
        return null;
    }

    return (ensembleIdent: EnsembleIdent) =>
        realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent).getFilteredRealizations();
});

/**
 * Get the valid ensemble realizations function that filters out invalid realizations based on the current realization filter set.
 *
 * If no realization filter set is defined, the atom will return a function that returns all realizations for the given ensemble ident.
 */
export const ValidEnsembleRealizationsFunctionAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    let validEnsembleRealizationsFunction = get(EnsembleRealizationFilterFunctionAtom);

    if (validEnsembleRealizationsFunction === null) {
        validEnsembleRealizationsFunction = (ensembleIdent: EnsembleIdent) => {
            return ensembleSet.findEnsemble(ensembleIdent)?.getRealizations() ?? [];
        };
    }

    return validEnsembleRealizationsFunction;
});

// RealizationFilterSetAtom needs to be packed into an object such that we can shallow-compare it with its previous value
// as the class instance of RealizationFilterSet will never change in the lifetime of the application.
export const RealizationFilterSetAtom = atom<{
    filterSet: RealizationFilterSet;
} | null>(null);
