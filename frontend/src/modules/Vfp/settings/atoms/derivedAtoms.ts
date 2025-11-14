import { atom } from "jotai";

import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { VfpApiDataAccessor } from "@modules/Vfp/utils/vfpApiDataAccessor";

import { type VfpDataAccessorWithStatus } from "../../types";

import { selectedEnsembleIdentAtom } from "./persistableFixableAtoms";
import { vfpTableNamesQueryAtom, vfpTableQueryAtom } from "./queryAtoms";

export const availableVfpTableNamesAtom = atom<string[]>((get) => {
    const vfpTableNamesQueryResult = get(vfpTableNamesQueryAtom);
    return vfpTableNamesQueryResult.data?.map((item) => item) ?? [];
});

export const availableRealizationNumbersAtom = atom<number[]>((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom).value;
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const validRealizationNumbers = selectedEnsembleIdent
        ? [...validEnsembleRealizationsFunction(selectedEnsembleIdent)]
        : [];
    return validRealizationNumbers;
});

export const vfpDataAccessorWithStatusAtom = atom<VfpDataAccessorWithStatus>((get) => {
    const vfpDataQuery = get(vfpTableQueryAtom);

    const vfpTable = vfpDataQuery.data ?? null;

    return {
        vfpApiDataAccessor: vfpTable ? new VfpApiDataAccessor(vfpTable) : null,
        isFetching: vfpDataQuery.isFetching,
        isError: vfpDataQuery.isError,
    };
});
