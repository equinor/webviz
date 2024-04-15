import {
    InplaceVolumetricData_api,
    InplaceVolumetricResponseNames_api,
    InplaceVolumetricTableDefinition_api,
    PvtData_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleRealizationFilterFunctionAtom, EnsembleSetAtom } from "@framework/GlobalAtoms";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { UseQueryResult } from "@tanstack/react-query";

import { selectedEnsembleIdentsAtom, selectedInplaceResponseAtom, selectedInplaceTableNameAtom } from "./derivedAtoms";

import { CombinedInplaceDataResults, CombinedInplaceVolTableInfoResults } from "../../typesAndEnums";

const STALE_TIME = 0;
const CACHE_TIME = 0;

export const inplaceTableInfosQueryAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    const queries = selectedEnsembleIdents
        .map((ensembleIdent) => {
            return () => ({
                queryKey: ["inplaceTableDefinitions", ensembleIdent.toString()],
                queryFn: () =>
                    apiService.inplaceVolumetrics.getTableDefinitions(
                        ensembleIdent.getCaseUuid(),
                        ensembleIdent.getEnsembleName()
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
                enabled: Boolean(ensembleIdent),
            });
        })
        .flat();

    function combine(
        results: UseQueryResult<InplaceVolumetricTableDefinition_api[], Error>[]
    ): CombinedInplaceVolTableInfoResults {
        return {
            tableInfoCollections: selectedEnsembleIdents.map((ensembleIdent, idx) => {
                return {
                    ensembleIdent: ensembleIdent,
                    tableInfos: results[idx]?.data ?? [],
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
export const inplaceTableDataSetQueryAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const selectedInplaceTableName = get(selectedInplaceTableNameAtom);
    const selectedInplaceResponse = get(selectedInplaceResponseAtom);

    const ensembleSet = get(EnsembleSetAtom);
    const ensembleRealizationFilterFunction = get(EnsembleRealizationFilterFunctionAtom);

    const categorical_filter = {};
    const queries = selectedEnsembleIdents
        .map((ensembleIdent) => {
            const realizations = ensembleRealizationFilterFunction
                ? ensembleRealizationFilterFunction(ensembleIdent).map((realization) => realization)
                : ensembleSet.findEnsemble(ensembleIdent)?.getRealizations() ?? [];

            return () => ({
                queryKey: [
                    "inplaceTableData",
                    ensembleIdent.toString(),
                    selectedInplaceTableName,
                    selectedInplaceResponse,
                    JSON.stringify(realizations),
                    categorical_filter,
                ],
                queryFn: () =>
                    apiService.inplaceVolumetrics.getResultDataPerRealization(
                        ensembleIdent.getCaseUuid(),
                        ensembleIdent.getEnsembleName(),
                        selectedInplaceTableName ?? "",
                        InplaceVolumetricResponseNames_api.STOIIP_OIL,
                        realizations.map((realization) => realization),
                        { categorical_filter: [] }
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
                enabled: Boolean(ensembleIdent && selectedInplaceTableName && selectedInplaceResponse),
            });
        })
        .flat();

    function combine(results: UseQueryResult<InplaceVolumetricData_api, Error>[]): CombinedInplaceDataResults {
        return {
            dataCollections: selectedEnsembleIdents.map((ensembleIdent, idx) => {
                return {
                    ensembleIdent: ensembleIdent,
                    tableData: results[idx]?.data ?? null,
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
