import { moduleInstanceAtom } from "@framework/ModuleInstance";
import { atomWithQueries } from "@framework/utils/atomUtils";

import { selectedEnsembleIdentsAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const vectorListQueriesAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    const moduleInstance = get(moduleInstanceAtom);

    const queries = selectedEnsembleIdents.map((ensembleIdent) => {
        const reqFunc = moduleInstance?.makeApiRequestFunc(
            ["ensembles", ensembleIdent.toString()],
            moduleInstance?.getApiService().timeseries.getVectorList.bind(moduleInstance.getApiService().timeseries)
        );
        return () => ({
            queryKey: ["ensembles", ensembleIdent.toString()],
            queryFn: () => reqFunc!(ensembleIdent.getCaseUuid(), ensembleIdent.getEnsembleName()),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });
    });

    return {
        queries,
    };
});
