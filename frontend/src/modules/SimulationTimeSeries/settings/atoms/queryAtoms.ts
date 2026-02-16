import { atom } from "jotai";

import { getDeltaEnsembleVectorListOptions, getVectorListOptions } from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import type { CategorizedItem } from "@modules/SimulationTimeSeries/typesAndEnums";
import { assembleQueryResultsInOriginalOrder } from "@modules/SimulationTimeSeries/utils/querySortingUtils";

import { selectedEnsembleIdentsAtom } from "./persistableFixableAtoms";

export const vectorListQueriesAtom = atom((get) => {
    const { regularEnsembleIdents, deltaEnsembleIdents } = get(categorizedEnsembleIdentsAtom);
    const regularQueries = get(regularEnsembleVectorListQueriesAtom);
    const deltaQueries = get(deltaEnsembleVectorListQueriesAtom);

    return assembleQueryResultsInOriginalOrder(
        regularQueries,
        deltaQueries,
        regularEnsembleIdents,
        deltaEnsembleIdents,
    );
});

// ----------------------------------------------------

const categorizedEnsembleIdentsAtom = atom((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom).value ?? [];
    const regularEnsembleIdents: CategorizedItem<RegularEnsembleIdent>[] = [];
    const deltaEnsembleIdents: CategorizedItem<DeltaEnsembleIdent>[] = [];

    selectedEnsembleIdents.forEach((ensembleIdent, originalIndex) => {
        if (isEnsembleIdentOfType(ensembleIdent, RegularEnsembleIdent)) {
            regularEnsembleIdents.push({ item: ensembleIdent, originalIndex });
        } else if (isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent)) {
            deltaEnsembleIdents.push({ item: ensembleIdent, originalIndex });
        } else {
            throw new Error(`Invalid ensemble ident type: ${ensembleIdent}`);
        }
    });

    return {
        regularEnsembleIdents,
        deltaEnsembleIdents,
    };
});

const regularEnsembleVectorListQueriesAtom = atomWithQueries((get) => {
    const { regularEnsembleIdents } = get(categorizedEnsembleIdentsAtom);

    const queries = regularEnsembleIdents.map(({ item }) => {
        const options = getVectorListOptions({
            query: {
                case_uuid: item.getCaseUuid(),
                ensemble_name: item.getEnsembleName(),
                include_derived_vectors: true,
                ...makeCacheBustingQueryParam(item),
            },
        });
        return () => options;
    });

    return {
        queries,
    };
});

const deltaEnsembleVectorListQueriesAtom = atomWithQueries((get) => {
    const { deltaEnsembleIdents } = get(categorizedEnsembleIdentsAtom);

    const queries = deltaEnsembleIdents.map(({ item }) => {
        const comparisonEnsembleIdent = item.getComparisonEnsembleIdent();
        const referenceEnsembleIdent = item.getReferenceEnsembleIdent();

        const options = getDeltaEnsembleVectorListOptions({
            query: {
                comparison_case_uuid: comparisonEnsembleIdent.getCaseUuid(),
                comparison_ensemble_name: comparisonEnsembleIdent.getEnsembleName(),
                reference_case_uuid: referenceEnsembleIdent.getCaseUuid(),
                reference_ensemble_name: referenceEnsembleIdent.getEnsembleName(),
                include_derived_vectors: true,
                ...makeCacheBustingQueryParam(comparisonEnsembleIdent, referenceEnsembleIdent),
            },
        });

        return () => options;
    });

    return {
        queries,
    };
});
