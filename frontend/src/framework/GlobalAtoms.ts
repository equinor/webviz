import { EnsembleSet } from "@framework/EnsembleSet";

import { atom } from "jotai";
import { isEqual } from "lodash";

import { EnsembleIdent } from "./EnsembleIdent";
import { RealizationFilterSet } from "./RealizationFilterSet";
import { EnsembleRealizationFilterFunction } from "./WorkbenchSession";
import { atomWithCompare } from "./utils/atomUtils";

export const EnsembleSetAtom = atomWithCompare<EnsembleSet>(new EnsembleSet([]), isEqual);

export const EnsembleRealizationFilterFunctionAtom = atom<EnsembleRealizationFilterFunction | null>((get) => {
    const realizationFilterSet = get(RealizationFilterSetAtom)?.filterSet;

    if (!realizationFilterSet) {
        return null;
    }

    return (ensembleIdent: EnsembleIdent) =>
        realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent).getFilteredRealizations();
});

function areRealizationFilterSetsEqual(a: RealizationFilterSet | null, b: RealizationFilterSet | null): boolean {
    if (a === null && b === null) {
        return true;
    }

    if (a === null || b === null) {
        return false;
    }

    return a.isEqual(b);
}

export const RealizationFilterSetAtom = atomWithCompare<{
    filterSet: RealizationFilterSet;
} | null>(null, (a, b) => areRealizationFilterSetsEqual(a?.filterSet ?? null, b?.filterSet ?? null));
