import type { QueryObserverResult } from "@tanstack/query-core";

import type { InplaceVolumesTableDefinition_api } from "@api";
import { getInplaceTableDefinitionsOptions } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { PersistableAtomDependenciesState } from "@framework/utils/atomUtils";
import { atomWithQueries, computeQueriesDependenciesState } from "@framework/utils/atomUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import { selectedComparisonEnsembleIdentAtom, selectedReferenceEnsembleIdentAtom } from "./persistableFixableAtoms";

export type TableDefinitionsQueryResult = {
    data: { ensembleIdent: RegularEnsembleIdent; tableDefinitions: InplaceVolumesTableDefinition_api[] }[];
    isLoading: boolean;
    errors: Error[];
    /**
     * For the settings' computeDependenciesState - unlike isLoading, it isn't "loaded" while a query is disabled or
     * has no result yet, so that nothing settles on the empty definitions of that moment.
     */
    dependenciesState: PersistableAtomDependenciesState;
};

export const tableDefinitionsQueryAtom = atomWithQueries((get) => {
    const { value: referenceEnsembleIdent, isValidInContext: referenceEnsembleIdentValid } = get(
        selectedReferenceEnsembleIdentAtom,
    );
    const { value: comparisonEnsembleIdent, isValidInContext: comparisonEnsembleIdentValid } = get(
        selectedComparisonEnsembleIdentAtom,
    );

    // Always exactly these two sources, so fetch each ensemble once even when both sides match.
    const ensembleIdents: RegularEnsembleIdent[] = [];
    const ensembleIdentValidFlags: boolean[] = [];
    if (referenceEnsembleIdent) {
        ensembleIdents.push(referenceEnsembleIdent);
        ensembleIdentValidFlags.push(referenceEnsembleIdentValid);
    }
    if (comparisonEnsembleIdent && !comparisonEnsembleIdent.equals(referenceEnsembleIdent)) {
        ensembleIdents.push(comparisonEnsembleIdent);
        ensembleIdentValidFlags.push(comparisonEnsembleIdentValid);
    }

    const queries = ensembleIdents.map((ensembleIdent, index) => {
        const options = getInplaceTableDefinitionsOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        });
        return () => ({
            ...options,
            enabled: ensembleIdentValidFlags[index],
        });
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
            dependenciesState: computeQueriesDependenciesState(results),
        }),
    };
});
