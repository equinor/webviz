import type { InplaceVolumetricResultName_api } from "@api";
import type { InplaceVolumetricsFilterSelections} from "@modules/InplaceVolumetricsPlot/typesAndEnums";
import { PlotType } from "@modules/InplaceVolumetricsPlot/typesAndEnums";
import type {
    SelectorColumn,
    SourceAndTableIdentifierUnion} from "@modules/_shared/InplaceVolumetrics/types";
import {
    SourceIdentifier,
} from "@modules/_shared/InplaceVolumetrics/types";

import { atom } from "jotai";

export const filterAtom = atom<InplaceVolumetricsFilterSelections>({
    ensembleIdents: [],
    tableNames: [],
    fluidZones: [],
    identifiersValues: [],
    areSelectedTablesComparable: false,
});
export const resultNameAtom = atom<InplaceVolumetricResultName_api | null>(null);
export const resultName2Atom = atom<InplaceVolumetricResultName_api | null>(null);
export const selectorColumnAtom = atom<SelectorColumn | null>(null);
export const subplotByAtom = atom<SourceAndTableIdentifierUnion>(SourceIdentifier.ENSEMBLE);
export const plotTypeAtom = atom<PlotType>(PlotType.HISTOGRAM);
export const colorByAtom = atom<SourceAndTableIdentifierUnion>(SourceIdentifier.TABLE_NAME);
export const areTableDefinitionSelectionsValidAtom = atom(false);
