import type { UseQueryResult } from "@tanstack/react-query";

import { type PvtData_api, getTableDataOptions } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import type { CombinedPvtDataResult } from "../../typesAndEnums";

import { selectedEnsembleIdentsAtom, selectedRealizationNumbersAtom } from "./persistableFixableAtoms";

export const pvtDataQueriesAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom).value;
    const selectedRealizations = get(selectedRealizationNumbersAtom).value;

    const ensembleIdentsAndRealizations: { ensembleIdent: RegularEnsembleIdent; realization: number }[] = [];
    for (const ensembleIdent of selectedEnsembleIdents) {
        for (const realization of selectedRealizations) {
            ensembleIdentsAndRealizations.push({ ensembleIdent, realization });
        }
    }

    const queries = ensembleIdentsAndRealizations
        .map((el) => {
            return () => ({
                ...getTableDataOptions({
                    query: {
                        case_uuid: el.ensembleIdent.getCaseUuid(),
                        ensemble_name: el.ensembleIdent.getEnsembleName(),
                        realization: el.realization,
                        ...makeCacheBustingQueryParam(el.ensembleIdent),
                    },
                }),
                enabled: Boolean(el.ensembleIdent && el.realization !== null),
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
            errors: results.map((result) => result.error).filter((err) => err !== null) as Error[],
            isFetching: results.some((result) => result.isFetching),
            allQueriesFailed: results.every((result) => result.isError),
        };
    }

    return {
        queries,
        combine,
    };
});
