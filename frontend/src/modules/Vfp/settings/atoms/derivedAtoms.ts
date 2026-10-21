import { atom } from "jotai";

import { VfpType_api, type VfpTableInfo_api } from "@api";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { VfpApiTableDataAccessor } from "@modules/Vfp/utils/vfpApiTableDataAccessor";
import { isProdTable } from "@modules/Vfp/utils/vfpTableClassifier";

import { type TableDataAccessorWithStatusFlags } from "../../types";

import {
    selectedAlqIndicesAtom,
    selectedColorByAtom,
    selectedEnsembleIdentAtom,
    selectedGfrIndicesAtom,
    selectedThpIndicesAtom,
    selectedVfpTypeAtom,
    selectedWfrIndicesAtom,
} from "./persistableFixableAtoms";
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

/**
 * Whether every parameter selection the current table type plots with is valid. Invalid indices are
 * retained rather than fixed up, and the flattened BHP lookup doesn't bounds-check them - e.g. a WFR
 * index past the table's WFR count would read the next THP slice - so the view withholds plotting
 * while this is false.
 */
export const isParameterSelectionValidAtom = atom<boolean>((get) => {
    const vfpTableQuery = get(vfpTableQueryAtom);

    // A disabled query keeps its cached table, which may belong to a selection that is no longer valid
    // (e.g. an excluded realization) - parameters validated against it must not allow plotting
    if (!vfpTableQuery.isEnabled) {
        return false;
    }

    const vfpTable = vfpTableQuery.data;
    const isThpSelectionValid = get(selectedThpIndicesAtom).isValidInContext;

    // Injection tables are only plotted by THP
    if (!vfpTable || !isProdTable(vfpTable)) {
        return isThpSelectionValid;
    }

    return (
        isThpSelectionValid &&
        get(selectedWfrIndicesAtom).isValidInContext &&
        get(selectedGfrIndicesAtom).isValidInContext &&
        get(selectedAlqIndicesAtom).isValidInContext &&
        get(selectedColorByAtom).isValidInContext
    );
});
