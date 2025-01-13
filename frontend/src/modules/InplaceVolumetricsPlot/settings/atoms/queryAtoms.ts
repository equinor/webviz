import { InplaceVolumetricsTableDefinition_api, getTableDefinitionsOptions } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { QueryObserverResult } from "@tanstack/query-core";

import { selectedEnsembleIdentsAtom } from "./derivedAtoms";

export type TableDefinitionsQueryResult = {
    data: {
        ensembleIdent: RegularEnsembleIdent;
        tableDefinitions: InplaceVolumetricsTableDefinition_api[];
    }[];
    isLoading: boolean;
};

export const tableDefinitionsQueryAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    const queries = selectedEnsembleIdents.map((ensembleIdent) => {
        return () => ({
            ...getTableDefinitionsOptions({
                query: {
                    case_uuid: ensembleIdent.getCaseUuid(),
                    ensemble_name: ensembleIdent.getEnsembleName(),
                },
            }),
        });
    });

    return {
        queries,
        combine: (
            results: QueryObserverResult<InplaceVolumetricsTableDefinition_api[], Error>[]
        ): TableDefinitionsQueryResult => {
            const tableDefinitionsPerEnsembleIdent: TableDefinitionsQueryResult["data"] = results.map(
                (result, index) => ({
                    ensembleIdent: selectedEnsembleIdents[index],
                    tableDefinitions: result.data ?? [],
                })
            );
            const someLoading = results.some((result) => result.isLoading);
            return {
                data: tableDefinitionsPerEnsembleIdent,
                isLoading: someLoading,
            };
        },
    };
});
