import { EnsembleIdent } from "@framework/EnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";

import { atom } from "jotai";

import { availableInplaceResponsesAtom } from "./derivedAtoms";

import { PlotGroupingEnum } from "../../typesAndEnums";

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

export const userSelectedEnsembleIdentsAtom = atomWithCompare<EnsembleIdent[]>([], areEnsembleIdentListsEqual);

export const groupByAtom = atomWithCompare<PlotGroupingEnum>(PlotGroupingEnum.ENSEMBLE, (a, b) => a === b);
export const colorByAtom = atomWithCompare<PlotGroupingEnum>(PlotGroupingEnum.None, (a, b) => a === b);
export const userSelectedInplaceTableNameAtom = atom<string | null>(null);
export const userSelectedInplaceResponseAtom = atom<string | null>(null);
