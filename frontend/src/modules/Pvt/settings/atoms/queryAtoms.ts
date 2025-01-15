import { PvtData_api } from "@api";
import { getTableDataOptions } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { UseQueryResult } from "@tanstack/react-query";

import { selectedEnsembleIdentsAtom, selectedRealizationsAtom } from "./derivedAtoms";

import { CombinedPvtDataResult } from "../../typesAndEnums";

export const pvtDataQueriesAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedRealizations = get(selectedRealizationsAtom);

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
            someQueriesFailed: results.some((result) => result.isError),
            allQueriesFailed: results.every((result) => result.isError),
        };
    }

    return {
        queries,
        combine,
    };
});
