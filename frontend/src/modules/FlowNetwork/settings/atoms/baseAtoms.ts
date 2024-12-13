import { Frequency_api, NodeType_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";
import { areEnsembleIdentsEqual } from "@framework/utils/ensembleIdentUtils";

import { atom } from "jotai";

export const selectedResamplingFrequencyAtom = atom<Frequency_api>(Frequency_api.YEARLY);

export const selectedNodeTypesAtom = atom<Set<NodeType_api>>(
    new Set([NodeType_api.INJ, NodeType_api.PROD, NodeType_api.OTHER])
);

export const userSelectedDateTimeAtom = atom<string | null>(null);

export const userSelectedRealizationNumberAtom = atom<number | null>(null);

export const validRealizationNumbersAtom = atom<number[] | null>(null);

export const userSelectedEnsembleIdentAtom = atomWithCompare<RegularEnsembleIdent | null>(null, areEnsembleIdentsEqual);

export const userSelectedEdgeKeyAtom = atom<string | null>(null);

export const userSelectedNodeKeyAtom = atom<string | null>(null);
