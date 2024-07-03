import { FluidZone_api, InplaceVolumetricResponseNames_api, InplaceVolumetricsIndex_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

import { atom } from "jotai";

export const userSelectedEnsembleIdentsAtom = atom<EnsembleIdent[] | null>(null);
export const userSelectedTableNamesAtom = atom<string[] | null>(null);
export const userSelectedFluidZonesAtom = atom<FluidZone_api[] | null>(null);
export const userSelectedIndexFilterValuesAtom = atom<InplaceVolumetricsIndex_api[] | null>(null);
export const userSelectedResultNameAtom = atom<InplaceVolumetricResponseNames_api | null>(null);
