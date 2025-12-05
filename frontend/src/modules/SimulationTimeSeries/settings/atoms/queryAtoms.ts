import { getDeltaEnsembleVectorListOptions, getVectorListOptions } from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import { selectedEnsembleIdentsAtom } from "./persistableFixableAtoms";
import { atom } from "jotai";

export const vectorListQueriesAtom = atom((get) => {
    const regularQueries = get(regularEnsembleVectorListQueriesAtom);
    const deltaQueries = get(deltaEnsembleVectorListQueriesAtom);

    return [...regularQueries, ...deltaQueries];
});

const categorizedEnsembleIdentsAtom = atom((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom).value ?? [];
    const regularEnsembleIdents: RegularEnsembleIdent[] = [];
    const deltaEnsembleIdents: DeltaEnsembleIdent[] = [];

    for (const ensembleIdent of selectedEnsembleIdents) {
        if (isEnsembleIdentOfType(ensembleIdent, RegularEnsembleIdent)) {
            regularEnsembleIdents.push(ensembleIdent);
        } else if (isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent)) {
            deltaEnsembleIdents.push(ensembleIdent);
        } else {
            throw new Error(`Invalid ensemble ident type: ${ensembleIdent}`);
        }
    }

    return {
        regularEnsembleIdents,
        deltaEnsembleIdents,
    };
});

const regularEnsembleVectorListQueriesAtom = atomWithQueries((get) => {
    const { regularEnsembleIdents } = get(categorizedEnsembleIdentsAtom);

    const queries = regularEnsembleIdents.map((ensembleIdent) => {
        const options = getVectorListOptions({
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                include_derived_vectors: true,
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
        });
        return () => options;
    });

    return {
        queries,
    };
});

const deltaEnsembleVectorListQueriesAtom = atomWithQueries((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const { deltaEnsembleIdents } = get(categorizedEnsembleIdentsAtom);

    const queries = deltaEnsembleIdents.map((ensembleIdent) => {
        const deltaEnsemble = ensembleSet.getEnsemble(ensembleIdent);
        const comparisonEnsembleIdent = deltaEnsemble.getComparisonEnsembleIdent();
        const referenceEnsembleIdent = deltaEnsemble.getReferenceEnsembleIdent();

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
