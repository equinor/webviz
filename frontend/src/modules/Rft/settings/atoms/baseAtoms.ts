import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";
import { areEnsembleIdentsEqual } from "@framework/utils/ensembleIdentUtils";

import { atom } from "jotai";

export const userSelectedEnsembleIdentAtom = atomWithCompare<RegularEnsembleIdent | null>(null, areEnsembleIdentsEqual);
export const validRealizationNumbersAtom = atom<number[] | null>(null);
export const userSelectedResponseNameAtom = atom<string | null>(null);
export const userSelectedWellNameAtom = atom<string | null>(null);
export const userSelectedRftTimestampsUtcMsAtom = atom<number | null>(null);
