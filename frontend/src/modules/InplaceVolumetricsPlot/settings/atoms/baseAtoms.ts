import { FluidZone_api, InplaceVolumetricResultName_api, InplaceVolumetricsIdentifierWithValues_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { PlotType } from "@modules/InplaceVolumetricsPlot/typesAndEnums";
import {
    SelectorColumn,
    SourceAndTableIdentifierUnion,
    SourceIdentifier,
} from "@modules/_shared/InplaceVolumetrics/types";

import { atom } from "jotai";

export const userSelectedEnsembleIdentsAtom = atom<EnsembleIdent[] | null>(null);
export const userSelectedTableNamesAtom = atom<string[] | null>(null);
export const userSelectedFluidZonesAtom = atom<FluidZone_api[] | null>(null);
export const userSelectedIdentifiersValuesAtom = atom<InplaceVolumetricsIdentifierWithValues_api[] | null>(null);
export const userSelectedResultNameAtom = atom<InplaceVolumetricResultName_api | null>(null);
export const userSelectedResultName2Atom = atom<InplaceVolumetricResultName_api | null>(null);
export const userSelectedSelectorColumnAtom = atom<SelectorColumn | null>(null);
export const userSelectedSubplotByAtom = atom<SourceAndTableIdentifierUnion>(SourceIdentifier.ENSEMBLE);
export const userSelectedPlotTypeAtom = atom<PlotType>(PlotType.HISTOGRAM);
export const userSelectedColorByAtom = atom<SourceAndTableIdentifierUnion>(SourceIdentifier.TABLE_NAME);
