import { InplaceVolumetricResultName_api, InplaceVolumetricStatistic_api } from "@api";
import { InplaceVolumetricsFilter } from "@framework/types/inplaceVolumetricsFilter";
import { SourceAndTableIdentifierUnion, SourceIdentifier, TableType } from "@modules/_shared/InplaceVolumetrics/types";

import { atom } from "jotai";

export const filterAtom = atom<InplaceVolumetricsFilter>({
    ensembleIdents: [],
    tableNames: [],
    fluidZones: [],
    identifiersValues: [],
});
export const areSelectedTablesComparableAtom = atom<boolean>(false);
export const resultNamesAtom = atom<InplaceVolumetricResultName_api[]>([]);
export const accumulationOptionsAtom = atom<
    Omit<SourceAndTableIdentifierUnion, SourceIdentifier.ENSEMBLE | SourceIdentifier.TABLE_NAME>[]
>([]);
export const tableTypeAtom = atom<TableType>(TableType.STATISTICAL);
export const statisticOptionsAtom = atom<InplaceVolumetricStatistic_api[]>([]);
export const areTableDefinitionSelectionsValidAtom = atom<boolean>(false);
