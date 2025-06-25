import { atom } from "jotai";

import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";
import type { InplaceVolumesFilterSelections } from "@modules/InplaceVolumesPlot/typesAndEnums";
import { PlotType } from "@modules/InplaceVolumesPlot/typesAndEnums";

export const filterAtom = atom<InplaceVolumesFilterSelections>({
    ensembleIdents: [],
    tableNames: [],
    indicesWithValues: [],
    areSelectedTablesComparable: false,
});
export const resultNameAtom = atom<string | null>(null);
export const resultName2Atom = atom<string | null>(null);
export const selectorColumnAtom = atom<string | null>(null);
export const subplotByAtom = atom<string>(TableOriginKey.ENSEMBLE);
export const plotTypeAtom = atom<PlotType>(PlotType.HISTOGRAM);
export const colorByAtom = atom<string>(TableOriginKey.TABLE_NAME);
export const areTableDefinitionSelectionsValidAtom = atom(false);
