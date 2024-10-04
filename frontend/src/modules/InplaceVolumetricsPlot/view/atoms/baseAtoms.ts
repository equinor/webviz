import { InplaceVolumetricResultName_api } from "@api";
import { InplaceVolumetricsFilter } from "@framework/types/inplaceVolumetricsFilter";
import { PlotType } from "@modules/InplaceVolumetricsPlot/typesAndEnums";
import {
    SelectorColumn,
    SourceAndTableIdentifierUnion,
    SourceIdentifier,
} from "@modules/_shared/InplaceVolumetrics/types";

import { atom } from "jotai";

export const filterAtom = atom<InplaceVolumetricsFilter>({
    ensembleIdents: [],
    tableNames: [],
    fluidZones: [],
    identifiersValues: [],
});
export const resultNameAtom = atom<InplaceVolumetricResultName_api | null>(null);
export const resultName2Atom = atom<InplaceVolumetricResultName_api | null>(null);
export const selectorColumnAtom = atom<SelectorColumn | null>(null);
export const subplotByAtom = atom<SourceAndTableIdentifierUnion>(SourceIdentifier.ENSEMBLE);
export const plotTypeAtom = atom<PlotType>(PlotType.HISTOGRAM);
export const colorByAtom = atom<SourceAndTableIdentifierUnion>(SourceIdentifier.TABLE_NAME);
export const areSelectedTablesComparableAtom = atom(false);
export const areTableDefinitionSelectionsValidAtom = atom(false);
