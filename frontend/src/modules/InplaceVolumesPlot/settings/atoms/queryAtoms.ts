import type { QueryObserverResult } from "@tanstack/query-core";

import type { InplaceVolumesTableDefinition_api } from "@api";
import { getTableDefinitionsOptions } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";

import { persistedEnsembleIdentsAtom } from "./derivedAtoms";

export type TableDefinitionsQueryResult = {
    data: {
        ensembleIdent: RegularEnsembleIdent;
        tableDefinitions: InplaceVolumesTableDefinition_api[];
    }[];
    isLoading: boolean;
};

export const tableDefinitionsQueryAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(persistedEnsembleIdentsAtom).value;

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
            results: QueryObserverResult<InplaceVolumesTableDefinition_api[], Error>[],
        ): TableDefinitionsQueryResult => {
            const tableDefinitionsPerEnsembleIdent: TableDefinitionsQueryResult["data"] = results.map(
                (result, index) => ({
                    ensembleIdent: selectedEnsembleIdents[index],
                    tableDefinitions: result.data ?? [],
                }),
            );
            const someLoading = results.some((result) => result.isLoading);
            return {
                data: tableDefinitionsPerEnsembleIdent,
                isLoading: someLoading,
            };
        },
    };
});
