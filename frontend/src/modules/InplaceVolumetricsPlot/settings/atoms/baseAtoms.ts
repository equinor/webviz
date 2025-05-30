import { atom } from "jotai";

import type { FluidZone_api, InplaceVolumetricResultName_api, InplaceVolumetricsIdentifierWithValues_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { IdentifierValueCriteria } from "@modules/_shared/InplaceVolumetrics/TableDefinitionsAccessor";
import type { SelectorColumn, SourceAndTableIdentifierUnion } from "@modules/_shared/InplaceVolumetrics/types";
import { SourceIdentifier } from "@modules/_shared/InplaceVolumetrics/types";
import { PlotType } from "@modules/InplaceVolumetricsPlot/typesAndEnums";


export const userSelectedEnsembleIdentsAtom = atom<RegularEnsembleIdent[] | null>(null);
export const userSelectedTableNamesAtom = atom<string[] | null>(null);
export const userSelectedFluidZonesAtom = atom<FluidZone_api[] | null>(null);
export const userSelectedIdentifiersValuesAtom = atom<InplaceVolumetricsIdentifierWithValues_api[] | null>(null);
export const userSelectedResultNameAtom = atom<InplaceVolumetricResultName_api | null>(null);
export const userSelectedResultName2Atom = atom<InplaceVolumetricResultName_api | null>(null);
export const userSelectedSelectorColumnAtom = atom<SelectorColumn | null>(null);
export const userSelectedSubplotByAtom = atom<SourceAndTableIdentifierUnion>(SourceIdentifier.ENSEMBLE);
export const userSelectedPlotTypeAtom = atom<PlotType>(PlotType.HISTOGRAM);
export const userSelectedColorByAtom = atom<SourceAndTableIdentifierUnion>(SourceIdentifier.TABLE_NAME);

export const selectedIdentifierValueCriteriaAtom = atom<IdentifierValueCriteria>(
    IdentifierValueCriteria.REQUIRE_EQUALITY,
);
