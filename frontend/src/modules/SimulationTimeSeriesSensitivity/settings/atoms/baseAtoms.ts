import { Frequency_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";

import { atom } from "jotai";
import { isEqual } from "lodash";

export const syncedEnsembleIdentsAtom = atom<EnsembleIdent[] | null>(null);
export const syncedVectorNameAtom = atom<string | null>(null);

export const resamplingFrequencyAtom = atom<Frequency_api | null>(Frequency_api.MONTHLY);
export const showStatisticsAtom = atom<boolean>(true);
export const showRealizationsAtom = atom<boolean>(false);
export const showHistoricalAtom = atom<boolean>(true);

export const userSelectedEnsembleIdentAtom = atom<EnsembleIdent | null>(null);
export const userSelectedVectorNameAtom = atom<string | null>(null);
export const userSelectedVectorTagAtom = atom<string | null>(null);
export const userSelectedSensitivityNamesAtom = atomWithCompare<string[] | null>(null, isEqual);
