import type { UseQueryResult } from "@tanstack/react-query";

import { type PvtData_api, getPvtTableDataOptions } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import type { CombinedPvtDataResult } from "../../typesAndEnums";

import { selectedEnsembleIdentsAtom, selectedRealizationNumbersAtom } from "./persistableFixableAtoms";

export const pvtDataQueriesAtom = atomWithQueries((get) => {
    const { value: selectedEnsembleIdents, isValidInContext: ensembleIdentsValid } = get(selectedEnsembleIdentsAtom);
    const { value: selectedRealizations, isValidInContext: realizationsValid } = get(selectedRealizationNumbersAtom);

    const ensembleIdentsAndRealizations: { ensembleIdent: RegularEnsembleIdent; realization: number }[] = [];
    for (const ensembleIdent of selectedEnsembleIdents) {
        for (const realization of selectedRealizations) {
            ensembleIdentsAndRealizations.push({ ensembleIdent, realization });
        }
    }

    const queries = ensembleIdentsAndRealizations
        .map((el) => {
            const options = getPvtTableDataOptions({
                query: {
                    case_uuid: el.ensembleIdent.getCaseUuid(),
                    ensemble_name: el.ensembleIdent.getEnsembleName(),
                    realization: el.realization,
                    ...makeCacheBustingQueryParam(el.ensembleIdent),
                },
            });
            return () => ({
                ...options,
                enabled: Boolean(el.ensembleIdent && el.realization !== null) && ensembleIdentsValid && realizationsValid,
            });
        })
        .flat();

    function combine(results: UseQueryResult<PvtData_api[], Error>[]): CombinedPvtDataResult {
        // A disabled query keeps its cached data and error, which must not be exposed for an invalid
        // selection (e.g. a realization excluded by the realization filter)
        if (!ensembleIdentsValid || !realizationsValid) {
            return { tableCollections: [], errors: [], isFetching: false, allQueriesFailed: false };
        }

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
