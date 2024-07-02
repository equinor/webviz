import { InplaceVolumetricsTableDefinition_api } from "@api";
import { apiService } from "@framework/ApiService";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { InplaceVolumetricsInfoWithEnsembleIdent } from "@modules/_shared/InplaceVolumetrics/types";
import { UseQueryResult } from "@tanstack/react-query";

import { selectedEnsembleIdentsAtom } from "./derivedAtoms";

export type CombinedInplaceVolTableInfoResults = {
    tableInfos: InplaceVolumetricsInfoWithEnsembleIdent[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
};

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const inplaceTableDefinitionsQueriesAtom = atomWithQueries((get) => {
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
        results: UseQueryResult<InplaceVolumetricsTableDefinition_api[], Error>[]
    ): CombinedInplaceVolTableInfoResults {
        const tableInfos = selectedEnsembleIdents.flatMap((ensembleIdent, idx) => {
            const ensembleTableInfos = results[idx]?.data ?? [];
            return ensembleTableInfos.map((tableInfo) => {
                return {
                    ...tableInfo,
                    ensembleIdent: ensembleIdent,
                };
            });
        });
        return {
            tableInfos,
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
