import { EnsembleSet } from "@framework/EnsembleSet";

import { atom } from "jotai";
import { isEqual } from "lodash";

import { EnsembleIdent } from "./EnsembleIdent";
import { RealizationFilterSet } from "./RealizationFilterSet";
import { EnsembleRealizationFilterFunction } from "./WorkbenchSession";
import { atomWithCompare } from "./utils/atomUtils";

/** A module's instance-id. Available in the jotai-store of each module, otherwise null */
// ? Should this one be moved to `AtomStoreMaster.ts`?
export const CurrentModuleInstanceIdAtom = atom<string | null>(null);

export const EnsembleSetAtom = atomWithCompare<EnsembleSet>(new EnsembleSet([]), isEqual);

export const EnsembleRealizationFilterFunctionAtom = atom<EnsembleRealizationFilterFunction | null>((get) => {
    const realizationFilterSet = get(RealizationFilterSetAtom)?.filterSet;

    if (!realizationFilterSet) {
        return null;
    }

    return (ensembleIdent: EnsembleIdent) =>
        realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent).getFilteredRealizations();
});

// RealizationFilterSetAtom needs to be packed into an object such that we can shallow-compare it with its previous value
// as the class instance of RealizationFilterSet will never change in the lifetime of the application.
export const RealizationFilterSetAtom = atom<{
    filterSet: RealizationFilterSet;
} | null>(null);
