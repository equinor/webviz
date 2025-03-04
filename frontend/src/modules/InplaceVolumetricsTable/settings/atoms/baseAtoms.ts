import type {
    FluidZone_api,
    InplaceVolumetricResultName_api,
    InplaceVolumetricsIdentifierWithValues_api} from "@api";
import {
    InplaceVolumetricStatistic_api
} from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { IdentifierValueCriteria } from "@modules/_shared/InplaceVolumetrics/TableDefinitionsAccessor";
import type { SourceAndTableIdentifierUnion, SourceIdentifier} from "@modules/_shared/InplaceVolumetrics/types";
import { TableType } from "@modules/_shared/InplaceVolumetrics/types";

import { atom } from "jotai";

export const userSelectedEnsembleIdentsAtom = atom<RegularEnsembleIdent[] | null>(null);
export const userSelectedTableNamesAtom = atom<string[] | null>(null);
export const userSelectedFluidZonesAtom = atom<FluidZone_api[] | null>(null);
export const userSelectedIdentifiersValuesAtom = atom<InplaceVolumetricsIdentifierWithValues_api[] | null>(null);
export const userSelectedResultNamesAtom = atom<InplaceVolumetricResultName_api[]>([]);

export const userSelectedAccumulationOptionsAtom = atom<
    Omit<SourceAndTableIdentifierUnion, SourceIdentifier.ENSEMBLE | SourceIdentifier.TABLE_NAME>[] | null
>(null);
export const selectedTableTypeAtom = atom<TableType>(TableType.STATISTICAL);
export const selectedStatisticOptionsAtom = atom<InplaceVolumetricStatistic_api[]>(
    Object.values(InplaceVolumetricStatistic_api)
);
export const selectedIdentifierValueCriteriaAtom = atom<IdentifierValueCriteria>(
    IdentifierValueCriteria.REQUIRE_EQUALITY
);
