import { atom } from "jotai";

import { Frequency_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export const syncedRegularEnsembleIdentsAtom = atom<RegularEnsembleIdent[] | null>(null);
export const syncedVectorNameAtom = atom<string | null>(null);

export const resamplingFrequencyAtom = atom<Frequency_api | null>(Frequency_api.MONTHLY);
export const showStatisticsAtom = atom<boolean>(true);
export const showRealizationsAtom = atom<boolean>(false);
export const showHistoricalAtom = atom<boolean>(true);
