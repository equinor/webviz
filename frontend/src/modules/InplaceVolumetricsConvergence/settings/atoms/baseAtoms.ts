import { FluidZone_api, InplaceVolumetricResultName_api, InplaceVolumetricsIdentifierWithValues_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

import { atom } from "jotai";

export const userSelectedEnsembleIdentsAtom = atom<EnsembleIdent[] | null>(null);
export const userSelectedTableNamesAtom = atom<string[] | null>(null);
export const userSelectedFluidZonesAtom = atom<FluidZone_api[] | null>(null);
export const userSelectedIdentifiersValuesAtom = atom<InplaceVolumetricsIdentifierWithValues_api[] | null>(null);
export const userSelectedResultNameAtom = atom<InplaceVolumetricResultName_api | null>(null);
export const userSelectedAccumulationOptionsAtom = atom<string[] | null>(null);
export const calcMeanAcrossAllRealizationsAtom = atom<boolean>(true);
