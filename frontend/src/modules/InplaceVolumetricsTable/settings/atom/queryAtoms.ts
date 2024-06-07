import { apiService } from "@framework/ApiService";
import { atomWithQueries } from "@framework/utils/atomUtils";

import { selectedEnsembleIdentsAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const inplaceTableDefinitionsQueriesAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    const queries = selectedEnsembleIdents.map((ensembleIdent) => {
        return () => ({
            queryKey: ["inplaceTableDefinitions", ensembleIdent.toString()],
            queryFn: () =>
                apiService.inplaceVolumetrics.getTableDefinitions(
                    ensembleIdent.getCaseUuid(),
                    ensembleIdent.getEnsembleName()
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: Boolean(ensembleIdent),
        });
    });

    return { queries };
});
