import { apiService } from "@framework/ApiService";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedEnsembleIdentAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const vectorListQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);

    const query = {
        queryKey: ["getVectorList", selectedEnsembleIdent?.getCaseUuid(), selectedEnsembleIdent?.getEnsembleName()],
        queryFn: () =>
            apiService.timeseries.getVectorList(
                selectedEnsembleIdent?.getCaseUuid() ?? "",
                selectedEnsembleIdent?.getEnsembleName() ?? ""
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(selectedEnsembleIdent?.getCaseUuid() && selectedEnsembleIdent?.getEnsembleName()),
    };

    return query;
});
