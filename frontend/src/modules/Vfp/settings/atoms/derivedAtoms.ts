import { atom } from "jotai";

import { VfpType_api, type VfpTableInfo_api } from "@api";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { VfpApiTableDataAccessor } from "@modules/Vfp/utils/vfpApiTableDataAccessor";

import { type TableDataAccessorWithStatusFlags } from "../../types";

import { selectedEnsembleIdentAtom, selectedVfpTypeAtom } from "./persistableFixableAtoms";
import { vfpTablesQueryAtom, vfpTableQueryAtom } from "./queryAtoms";

export const availableVfpTablesAtom = atom<VfpTableInfo_api[]>((get) => {
    const vfpTablesQuery = get(vfpTablesQueryAtom);
    return vfpTablesQuery.data ?? [];
});

export const availableVfpTypesAtom = atom<VfpType_api[]>((get) => {
    const availableVfpTables = get(availableVfpTablesAtom);
    const presentTypes = new Set(availableVfpTables.map((tableInfo) => tableInfo.vfpType));
    return [VfpType_api.PROD, VfpType_api.INJ].filter((vfpType) => presentTypes.has(vfpType));
});

export const availableVfpTableNumbersAtom = atom<number[]>((get) => {
    const availableVfpTables = get(availableVfpTablesAtom);
    const selectedVfpType = get(selectedVfpTypeAtom).value;
    if (!selectedVfpType) {
        return [];
    }
    return availableVfpTables
        .filter((tableInfo) => tableInfo.vfpType === selectedVfpType)
        .map((tableInfo) => tableInfo.tableNumber)
        .sort((a, b) => a - b);
});

export const availableRealizationNumbersAtom = atom<number[]>((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom).value;
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const validRealizationNumbers = selectedEnsembleIdent
        ? [...validEnsembleRealizationsFunction(selectedEnsembleIdent)]
        : [];
    return validRealizationNumbers;
});

export const tableDataAccessorWithStatusFlagsAtom = atom<TableDataAccessorWithStatusFlags>((get) => {
    const vfpTableDataQuery = get(vfpTableQueryAtom);
    const vfpTablesQuery = get(vfpTablesQueryAtom);

    const vfpTableData = vfpTableDataQuery.data ?? null;

    return {
        tableDataAccessor: vfpTableData ? new VfpApiTableDataAccessor(vfpTableData) : null,
        tableDataStatus: {
            isFetching: vfpTableDataQuery.isFetching,
            isError: vfpTableDataQuery.isError,
        },
        tablesStatus: {
            isError: vfpTablesQuery.isError,
            isFetching: vfpTablesQuery.isFetching,
        },
    };
});
