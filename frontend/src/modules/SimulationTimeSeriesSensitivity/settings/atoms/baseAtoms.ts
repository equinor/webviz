import { Frequency_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";

import { atom } from "jotai";
import { isEqual } from "lodash";

function areEnsembleIdentsEqual(a: EnsembleIdent | null, b: EnsembleIdent | null) {
    if (a === null) {
        return b === null;
    }
    return a.equals(b);
}

export const syncedEnsembleIdentsAtom = atom<EnsembleIdent[] | null>(null);
export const syncedVectorNameAtom = atom<string | null>(null);

export const resamplingFrequencyAtom = atom<Frequency_api | null>(Frequency_api.MONTHLY);
export const showStatisticsAtom = atom<boolean>(true);
export const showRealizationsAtom = atom<boolean>(false);
export const showHistoricalAtom = atom<boolean>(true);

export const userSelectedEnsembleIdentAtom = atomWithCompare<EnsembleIdent | null>(null, areEnsembleIdentsEqual);
export const userSelectedVectorNameAndTagAtom = atomWithCompare<{ name: string | null; tag: string | null }>(
    {
        name: null,
        tag: null,
    },
    isEqual
);

// Note: Default value of null, to detect uninitialized state, and select all sensitivities on first render
export const userSelectedSensitivityNamesAtom = atomWithCompare<string[] | null>(null, isEqual);
