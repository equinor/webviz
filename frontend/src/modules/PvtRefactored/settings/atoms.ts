import { PvtData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleRealizationFilterFunctionAtom, EnsembleSetAtom } from "@framework/GlobalAtoms";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { UseQueryResult } from "@tanstack/react-query";

import { atom } from "jotai";

import { PvtTableCollection } from "../typesAndEnums";
import { PvtDataAccessor } from "../utils/PvtDataAccessor";
import { computeRealizationsIntersection } from "../utils/settingsUtils";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const userSelectedEnsembleIdentsAtom = atom<EnsembleIdent[]>([]);
export const userSelectedRealizationsAtom = atom<number[]>([]);
export const userSelectedPvtNumsAtom = atom<number[]>([]);

export const selectedEnsembleIdentsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);

    let computedEnsembleIdents = userSelectedEnsembleIdents.filter((el) => ensembleSet.hasEnsemble(el));
    if (computedEnsembleIdents.length === 0 && ensembleSet.getEnsembleArr().length > 0) {
        computedEnsembleIdents = [ensembleSet.getEnsembleArr()[0].getIdent()];
    }

    return computedEnsembleIdents;
});

export const selectedRealizationsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedRealizations = get(userSelectedRealizationsAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    let ensembleRealizationFilterFunction = get(EnsembleRealizationFilterFunctionAtom);

    if (ensembleRealizationFilterFunction === null) {
        ensembleRealizationFilterFunction = (ensembleIdent: EnsembleIdent) => {
            return ensembleSet.findEnsemble(ensembleIdent)?.getRealizations() ?? [];
        };
    }

    const realizations = computeRealizationsIntersection(selectedEnsembleIdents, ensembleRealizationFilterFunction);

    let computedRealizations = userSelectedRealizations.filter((el) => realizations.includes(el));
    if (computedRealizations.length === 0 && realizations.length > 0) {
        computedRealizations = [realizations[0]];
    }

    return computedRealizations;
});

export type CombinedPvtDataResult = {
    tableCollections: PvtTableCollection[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
};

export const pvtDataQueriesAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedRealizations = get(selectedRealizationsAtom);

    const ensembleIdentsAndRealizations: { ensembleIdent: EnsembleIdent; realization: number }[] = [];
    for (const ensembleIdent of selectedEnsembleIdents) {
        for (const realization of selectedRealizations) {
            ensembleIdentsAndRealizations.push({ ensembleIdent, realization });
        }
    }

    const queries = ensembleIdentsAndRealizations
        .map((el) => {
            return () => ({
                queryKey: ["tableData", el.ensembleIdent.toString(), el.realization],
                queryFn: () =>
                    apiService.pvt.tableData(
                        el.ensembleIdent.getCaseUuid(),
                        el.ensembleIdent.getEnsembleName(),
                        el.realization
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
                enabled: !!(el.ensembleIdent && el.realization !== null),
            });
        })
        .flat();

    function combine(results: UseQueryResult<PvtData_api[], Error>[]): CombinedPvtDataResult {
        return {
            tableCollections: ensembleIdentsAndRealizations.map((el, idx) => {
                return {
                    ensembleIdent: el.ensembleIdent,
                    realization: el.realization,
                    tables: results[idx]?.data ?? [],
                };
            }),
            isFetching: results.some((result) => result.isFetching),
            someQueriesFailed: results.some((result) => result.isError),
            allQueriesFailed: results.every((result) => result.isError),
        };
    }

    return {
        queries,
        combine,
    };
});

export const pvtDataAccessorAtom = atom((get) => {
    const pvtDataQueries = get(pvtDataQueriesAtom);
    if (pvtDataQueries.tableCollections.length === 0) {
        return new PvtDataAccessor([]);
    }

    const tableCollections = pvtDataQueries.tableCollections;

    return new PvtDataAccessor(tableCollections);
});

export const selectedPvtNumsAtom = atom<number[]>((get) => {
    const userSelectedPvtNums = get(userSelectedPvtNumsAtom);
    const pvtDataAccessor = get(pvtDataAccessorAtom);

    const uniquePvtNums = pvtDataAccessor.getUniquePvtNums();

    let computedPvtNums = userSelectedPvtNums.filter((el) => uniquePvtNums.includes(el));

    if (computedPvtNums.length === 0) {
        if (uniquePvtNums.length > 0) {
            computedPvtNums = [uniquePvtNums[0]];
        } else {
            computedPvtNums = [];
        }
    }

    return computedPvtNums;
});
