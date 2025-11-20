import { atom } from "jotai";

import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { VfpApiTableDataAccessor } from "@modules/Vfp/utils/vfpApiTableDataAccessor";

import { type TableDataAccessorWithStatusFlags } from "../../types";

import { selectedEnsembleIdentAtom } from "./persistableFixableAtoms";
import { vfpTableNamesQueryAtom, vfpTableQueryAtom } from "./queryAtoms";

export const availableVfpTableNamesAtom = atom<string[]>((get) => {
    const vfpTableNamesQuery = get(vfpTableNamesQueryAtom);
    return vfpTableNamesQuery.data?.map((item) => item) ?? [];
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
    const vfpTableNamesQuery = get(vfpTableNamesQueryAtom);

    const vfpTableData = vfpTableDataQuery.data ?? null;

    return {
        tableDataAccessor: vfpTableData ? new VfpApiTableDataAccessor(vfpTableData) : null,
        tableDataStatus: {
            isFetching: vfpTableDataQuery.isFetching,
            isError: vfpTableDataQuery.isError,
        },
        tableNamesStatus: {
            isError: vfpTableNamesQuery.isError,
            isFetching: vfpTableNamesQuery.isFetching,
        },
    };
});
