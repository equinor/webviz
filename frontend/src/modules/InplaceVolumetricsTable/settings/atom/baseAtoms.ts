import { EnsembleIdent } from "@framework/EnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";

import { atom } from "jotai";

import { AggregateByOption, InplaceVolumetricsTableType } from "../../types";

function areEnsembleIdentListsEqual(a: EnsembleIdent[], b: EnsembleIdent[]) {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (!a[i].equals(b[i])) {
            return false;
        }
    }
    return true;
}

function areAggregateByOptionListsEqual(a: AggregateByOption[], b: AggregateByOption[]) {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

export const userSelectedEnsembleIdentsAtom = atomWithCompare<EnsembleIdent[]>([], areEnsembleIdentListsEqual);
export const userSelectedTableTypeAtom = atom<InplaceVolumetricsTableType>(
    InplaceVolumetricsTableType.MEAN_AGGREGATION
);
export const userSelectedAggregateBySelectionsAtom = atomWithCompare<AggregateByOption[]>(
    Object.values(AggregateByOption),
    areAggregateByOptionListsEqual
);

// TODO: Verify if compare method is correct
export const userSelectedTableSourcesAtom = atomWithCompare<string[]>([], (a, b) => a.join() === b.join());
export const userSelectedResponsesAtom = atomWithCompare<string[]>([], (a, b) => a.join() === b.join());
export const userSelectedZonesAtom = atomWithCompare<string[]>([], (a, b) => a.join() === b.join());
export const userSelectedRegionsAtom = atomWithCompare<string[]>([], (a, b) => a.join() === b.join());
export const userSelectedFaciesAtom = atomWithCompare<string[]>([], (a, b) => a.join() === b.join());
