import { apiService } from "@framework/ApiService";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";

import { selectedEnsembleIdentsAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const vectorListQueriesAtom = atomWithQueries((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    const queries = selectedEnsembleIdents.map((ensembleIdent) => {
        // Regular Ensemble
        if (isEnsembleIdentOfType(ensembleIdent, RegularEnsembleIdent)) {
            return () => ({
                queryKey: ["getVectorList", ensembleIdent.toString()],
                queryFn: () =>
                    apiService.timeseries.getVectorList(ensembleIdent.getCaseUuid(), ensembleIdent.getEnsembleName()),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            });
        }

        // Delta Ensemble
        if (isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent)) {
            const deltaEnsemble = ensembleSet.getEnsemble(ensembleIdent);
            const comparisonEnsembleIdent = deltaEnsemble.getComparisonEnsembleIdent();
            const referenceEnsembleIdent = deltaEnsemble.getReferenceEnsembleIdent();

            return () => ({
                queryKey: ["getDeltaEnsembleVectorList", ensembleIdent.toString()],
                queryFn: () =>
                    apiService.timeseries.getDeltaEnsembleVectorList(
                        comparisonEnsembleIdent.getCaseUuid(),
                        comparisonEnsembleIdent.getEnsembleName(),
                        referenceEnsembleIdent.getCaseUuid(),
                        referenceEnsembleIdent.getEnsembleName()
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            });
        }

        throw new Error(`Invalid ensemble ident type: ${ensembleIdent}`);
    });

    return {
        queries,
    };
});
