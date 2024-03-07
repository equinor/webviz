import { PvtData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { UseQueryResult } from "@tanstack/react-query";

import { selectedEnsembleIdentsAtom, selectedRealizationsAtom } from "./derivedAtoms";

import { CombinedPvtDataResult } from "../../typesAndEnums";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

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
                queryKey: ["pvtTableData", el.ensembleIdent.toString(), el.realization],
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
