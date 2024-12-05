import { apiService } from "@framework/ApiService";
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
        const deltaEnsemble = ensembleSet.findEnsemble(ensembleIdent);
        if (!deltaEnsemble) {
            throw new Error(
                `Delta ensemble not found in application EnsembleSet for ensembleIdent: ${ensembleIdent.toString()}`
            );
        }

        const compareEnsembleIdent = deltaEnsemble.getCompareEnsembleIdent();
        const referenceEnsembleIdent = deltaEnsemble.getReferenceEnsembleIdent();

        return () => ({
            queryKey: ["getDeltaEnsembleVectorList", ensembleIdent.toString()],
            queryFn: () =>
                apiService.timeseries.getDeltaEnsembleVectorList(
                    compareEnsembleIdent.getCaseUuid(),
                    compareEnsembleIdent.getEnsembleName(),
                    referenceEnsembleIdent.getCaseUuid(),
                    referenceEnsembleIdent.getEnsembleName()
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });
    });

    return {
        queries,
    };
});
