import { FluidZone_api, InplaceVolumetricResultName_api, InplaceVolumetricsIdentifierWithValues_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { SubplotBy, SubplotByInfo } from "@modules/InplaceVolumetricsConvergence/view/types";

import { atom } from "jotai";

export const userSelectedEnsembleIdentsAtom = atom<EnsembleIdent[] | null>(null);
export const userSelectedTableNamesAtom = atom<string[] | null>(null);
export const userSelectedFluidZonesAtom = atom<FluidZone_api[] | null>(null);
export const userSelectedIdentifiersValuesAtom = atom<InplaceVolumetricsIdentifierWithValues_api[] | null>(null);
export const userSelectedResultNameAtom = atom<InplaceVolumetricResultName_api | null>(null);
export const userSelectedSubplotByAtom = atom<SubplotByInfo>({ subplotBy: SubplotBy.TABLE_NAME });
export const userSelectedColorByAtom = atom<SubplotByInfo>({ subplotBy: SubplotBy.ENSEMBLE });
