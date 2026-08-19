import type { QueryObserverResult } from "@tanstack/query-core";

import type { InplaceVolumesTableDefinition_api } from "@api";
import { getInplaceTableDefinitionsOptions } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import { selectedComparisonEnsembleIdentAtom, selectedReferenceEnsembleIdentAtom } from "./persistableFixableAtoms";

export type TableDefinitionsQueryResult = {
    data: { ensembleIdent: RegularEnsembleIdent; tableDefinitions: InplaceVolumesTableDefinition_api[] }[];
    isLoading: boolean;
    errors: Error[];
};

export const tableDefinitionsQueryAtom = atomWithQueries((get) => {
    const referenceEnsembleIdent = get(selectedReferenceEnsembleIdentAtom).value;
    const comparisonEnsembleIdent = get(selectedComparisonEnsembleIdentAtom).value;

    const ensembleIdents: RegularEnsembleIdent[] = [];
    for (const ensembleIdent of [referenceEnsembleIdent, comparisonEnsembleIdent]) {
        if (ensembleIdent && !ensembleIdents.some((existing) => existing.equals(ensembleIdent))) {
            ensembleIdents.push(ensembleIdent);
        }
    }

    const queries = ensembleIdents.map((ensembleIdent) => {
        const options = getInplaceTableDefinitionsOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        });
        return () => ({ ...options });
    });

    return {
        queries,
        combine: (
            results: QueryObserverResult<InplaceVolumesTableDefinition_api[], Error>[],
        ): TableDefinitionsQueryResult => ({
            data: results.map((result, index) => ({
                ensembleIdent: ensembleIdents[index],
                tableDefinitions: result.data ?? [],
            })),
            isLoading: results.some((result) => result.isLoading),
            errors: results.map((result) => result.error).filter((error): error is Error => error !== null),
        }),
    };
});
