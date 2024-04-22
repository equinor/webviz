import { Frequency_api, Observations_api } from "@api";
import { apiService } from "@framework/ApiService";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { QueryObserverResult } from "@tanstack/query-core";

import { resampleFrequencyAtom, showObservationsAtom, visualizationModeAtom } from "./baseAtoms";
import { selectedEnsembleIdentsAtom, vectorSpecificationsAtom } from "./derivedAtoms";

import { EnsembleVectorObservationDataMap, VisualizationMode } from "../../typesAndEnums";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const vectorListQueriesAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    const queries = selectedEnsembleIdents.map((ensembleIdent) => {
        return () => ({
            queryKey: ["ensembles", ensembleIdent.toString()],
            queryFn: () =>
                apiService.timeseries.getVectorList(ensembleIdent.getCaseUuid(), ensembleIdent.getEnsembleName()),
        });
    });

    return {
        queries,
    };
});
