import { atom } from "jotai";

import type { InplaceVolumetricResultName_api, InplaceVolumetricStatistic_api } from "@api";
import type { SourceAndTableIdentifierUnion, SourceIdentifier } from "@modules/_shared/InplaceVolumetrics/types";
import { TableType } from "@modules/_shared/InplaceVolumetrics/types";
import type { InplaceVolumetricsFilterSelections } from "@modules/InplaceVolumetricsTable/types";


export const filterAtom = atom<InplaceVolumetricsFilterSelections>({
    ensembleIdents: [],
    tableNames: [],
    fluidZones: [],
    identifiersValues: [],
    areSelectedTablesComparable: false,
});
export const resultNamesAtom = atom<InplaceVolumetricResultName_api[]>([]);
export const accumulationOptionsAtom = atom<
    Omit<SourceAndTableIdentifierUnion, SourceIdentifier.ENSEMBLE | SourceIdentifier.TABLE_NAME>[]
>([]);
export const tableTypeAtom = atom<TableType>(TableType.STATISTICAL);
export const statisticOptionsAtom = atom<InplaceVolumetricStatistic_api[]>([]);
export const areTableDefinitionSelectionsValidAtom = atom<boolean>(false);
