import { atom } from "jotai";

import type { InplaceVolumesFluid_api, InplaceVolumesIndex_api, InplaceVolumesIndexWithValues_api } from "@api";
import { InplaceVolumesStatistic_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { TableType } from "@modules/_shared/InplaceVolumes/types";

export const userSelectedEnsembleIdentsAtom = atom<RegularEnsembleIdent[] | null>(null);
export const userSelectedTableNamesAtom = atom<string[] | null>(null);
export const userSelectedFluidsAtom = atom<InplaceVolumesFluid_api[] | null>(null);
export const userSelectedIndicesWithValuesAtom = atom<InplaceVolumesIndexWithValues_api[] | null>(null);
export const userSelectedResultNamesAtom = atom<string[]>([]);

export const userSelectedAccumulationOptionsAtom = atom<InplaceVolumesIndex_api[] | null>(null);
export const selectedTableTypeAtom = atom<TableType>(TableType.STATISTICAL);
export const selectedStatisticOptionsAtom = atom<InplaceVolumesStatistic_api[]>(
    Object.values(InplaceVolumesStatistic_api),
);
export const selectedIndexValueCriteriaAtom = atom<IndexValueCriteria>(IndexValueCriteria.REQUIRE_EQUALITY);
