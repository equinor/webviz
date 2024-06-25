import { Frequency_api, NodeType_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";

import { atom } from "jotai";

function areEnsembleIdentsEqual(a: EnsembleIdent | null, b: EnsembleIdent | null) {
    if (a === null) {
        return b === null;
    }
    return a.equals(b);
}

export const selectedResamplingFrequencyAtom = atom<Frequency_api>(Frequency_api.YEARLY);

export const selectedNodeTypesAtom = atom<Set<NodeType_api>>(
    new Set([NodeType_api.INJ, NodeType_api.PROD, NodeType_api.OTHER])
);

export const userSelectedDateTimeAtom = atom<string | null>(null);

export const userSelectedRealizationNumberAtom = atom<number | null>(null);

export const validRealizationNumbersAtom = atom<number[] | null>(null);

export const userSelectedEnsembleIdentAtom = atomWithCompare<EnsembleIdent | null>(null, areEnsembleIdentsEqual);

export const userSelectedEdgeKeyAtom = atom<string | null>(null);

export const userSelectedNodeKeyAtom = atom<string | null>(null);
