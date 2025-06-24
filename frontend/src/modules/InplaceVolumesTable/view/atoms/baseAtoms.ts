import { atom } from "jotai";

import type { InplaceVolumesStatistic_api } from "@api";
import { TableType } from "@modules/_shared/InplaceVolumes/types";
import type { InplaceVolumesFilterSelections } from "@modules/InplaceVolumesTable/types";

export const filterAtom = atom<InplaceVolumesFilterSelections>({
    ensembleIdents: [],
    tableNames: [],
    indicesWithValues: [],
    areSelectedTablesComparable: false,
});
export const resultNamesAtom = atom<string[]>([]);
export const groupByIndicesAtom = atom<string[]>([]);
export const tableTypeAtom = atom<TableType>(TableType.STATISTICAL);
export const statisticOptionsAtom = atom<InplaceVolumesStatistic_api[]>([]);
export const areTableDefinitionSelectionsValidAtom = atom<boolean>(false);
