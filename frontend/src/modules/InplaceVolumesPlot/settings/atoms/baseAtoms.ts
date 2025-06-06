import { atom } from "jotai";

import type { InplaceVolumesFluid_api, InplaceVolumesIndexWithValues_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import type { SelectorColumn, TableSourceAndIndexUnion } from "@modules/_shared/InplaceVolumes/types";
import { TableSource } from "@modules/_shared/InplaceVolumes/types";
import { PlotType } from "@modules/InplaceVolumesPlot/typesAndEnums";

export const userSelectedEnsembleIdentsAtom = atom<RegularEnsembleIdent[] | null>(null);
export const userSelectedTableNamesAtom = atom<string[] | null>(null);
export const userSelectedFluidsAtom = atom<InplaceVolumesFluid_api[] | null>(null);
export const userSelectedIndicesWithValuesAtom = atom<InplaceVolumesIndexWithValues_api[] | null>(null);
export const userSelectedResultNameAtom = atom<string | null>(null);
export const userSelectedResultName2Atom = atom<string | null>(null);
export const userSelectedSelectorColumnAtom = atom<SelectorColumn | null>(null);
export const userSelectedSubplotByAtom = atom<TableSourceAndIndexUnion>(TableSource.ENSEMBLE);
export const userSelectedPlotTypeAtom = atom<PlotType>(PlotType.HISTOGRAM);
export const userSelectedColorByAtom = atom<TableSourceAndIndexUnion>(TableSource.TABLE_NAME);

export const selectedIndexValueCriteriaAtom = atom<IndexValueCriteria>(IndexValueCriteria.REQUIRE_EQUALITY);
