import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { atomWithQueries } from "@framework/utils/atomUtils";

import { selectedEnsembleIdentsAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const vectorListQueriesAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const regularEnsembleIdents = selectedEnsembleIdents.filter(
        (ensembleIdent) => ensembleIdent instanceof EnsembleIdent
    ) as EnsembleIdent[];

    const queries = regularEnsembleIdents.map((ensembleIdent) => {
        return () => ({
            queryKey: ["ensembles", ensembleIdent.toString()],
            queryFn: () =>
                apiService.timeseries.getVectorList(ensembleIdent.getCaseUuid(), ensembleIdent.getEnsembleName()),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });
    });

    return {
        queries,
    };
});
