import { getDeltaEnsembleVectorList, getVectorList } from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { makeTimestampQueryParam } from "@framework/utils/queryUtils";

import { selectedEnsembleIdentsAtom } from "./derivedAtoms";

type T = <K extends object>(query: K) => K;

export const vectorListQueriesAtom = atomWithQueries((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    const queries = selectedEnsembleIdents.map((ensembleIdent) => {
        // Regular Ensemble
        if (isEnsembleIdentOfType(ensembleIdent, RegularEnsembleIdent)) {
            return () => ({
                queryKey: ["getVectorList", ensembleIdent.getCaseUuid(), ensembleIdent.getEnsembleName()],
                queryFn: async () => {
                    const { data } = await getVectorList({
                        query: {
                            ...makeTimestampQueryParam(ensembleIdent),
                            case_uuid: ensembleIdent.getCaseUuid(),
                            ensemble_name: ensembleIdent.getEnsembleName(),
                            include_derived_vectors: true,
                        },
                        throwOnError: true,
                    });

                    return data;
                },
            });
        }

        // Delta Ensemble
        if (isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent)) {
            const deltaEnsemble = ensembleSet.getEnsemble(ensembleIdent);
            const comparisonEnsembleIdent = deltaEnsemble.getComparisonEnsembleIdent();
            const referenceEnsembleIdent = deltaEnsemble.getReferenceEnsembleIdent();

            return () => ({
                queryKey: [
                    "getDeltaEnsembleVectorList",
                    ensembleIdent.getComparisonEnsembleIdent().getCaseUuid(),
                    ensembleIdent.getComparisonEnsembleIdent().getEnsembleName(),
                    ensembleIdent.getReferenceEnsembleIdent().getCaseUuid(),
                    ensembleIdent.getReferenceEnsembleIdent().getEnsembleName(),
                ],
                queryFn: async () => {
                    const { data } = await getDeltaEnsembleVectorList({
                        query: {
                            comparison_case_uuid: comparisonEnsembleIdent.getCaseUuid(),
                            comparison_ensemble_name: comparisonEnsembleIdent.getEnsembleName(),
                            reference_case_uuid: referenceEnsembleIdent.getCaseUuid(),
                            reference_ensemble_name: referenceEnsembleIdent.getEnsembleName(),
                            include_derived_vectors: true,
                        },
                        throwOnError: true,
                    });

                    return data;
                },
            });
        }

        throw new Error(`Invalid ensemble ident type: ${ensembleIdent}`);
    });

    return {
        queries,
    };
});
