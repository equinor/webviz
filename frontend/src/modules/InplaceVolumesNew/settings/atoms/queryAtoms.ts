import type { QueryObserverResult } from "@tanstack/query-core";

import type { InplaceVolumesTableDefinition_api } from "@api";
import { getInplaceTableDefinitionsOptions } from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import { selectedEnsembleIdentsAtom } from "./persistableFixableAtoms";

export type TableDefinitionsQueryResult = {
    data: {
        ensembleIdent: RegularEnsembleIdent;
        tableDefinitions: InplaceVolumesTableDefinition_api[];
    }[];
    isLoading: boolean;
    errors: Error[];
};

export const tableDefinitionsQueryAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom).value;

    // Expand delta ensembles into their constituent regular ensembles, deduplicated.
    // Table definitions (metadata) must be fetched for both the comparison and reference
    // ensembles so that comparability and available results can be validated across them.
    const regularEnsembleIdents: RegularEnsembleIdent[] = [];
    for (const ensembleIdent of selectedEnsembleIdents) {
        const constituents = isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent)
            ? [ensembleIdent.getComparisonEnsembleIdent(), ensembleIdent.getReferenceEnsembleIdent()]
            : [ensembleIdent];
        for (const constituent of constituents) {
            if (!regularEnsembleIdents.some((existing) => existing.equals(constituent))) {
                regularEnsembleIdents.push(constituent);
            }
        }
    }

    const queries = regularEnsembleIdents.map((ensembleIdent) => {
        const options = getInplaceTableDefinitionsOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        });
        return () => options;
    });

    return {
        queries,
        combine: (
            results: QueryObserverResult<InplaceVolumesTableDefinition_api[], Error>[],
        ): TableDefinitionsQueryResult => {
            const tableDefinitionsPerEnsembleIdent: TableDefinitionsQueryResult["data"] = results.map(
                (result, index) => ({
                    ensembleIdent: regularEnsembleIdents[index],
                    tableDefinitions: result.data ?? [],
                }),
            );
            return {
                data: tableDefinitionsPerEnsembleIdent,
                isLoading: results.some((result) => result.isLoading),
                errors: results.filter((result) => result.isError).map((result) => result.error!),
            };
        },
    };
});
