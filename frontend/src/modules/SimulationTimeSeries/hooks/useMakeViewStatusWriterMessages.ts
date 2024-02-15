import { Ensemble } from "@framework/Ensemble";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { ViewStatusWriter } from "@framework/StatusWriter";

import { useAtomValue } from "jotai";

import { showObservationsAtom } from "../atoms/baseAtoms";
import {
    historicalDataQueryHasErrorAtom,
    queryIsFetchingAtom,
    realizationsQueryHasErrorAtom,
    statisticsQueryHasErrorAtom,
} from "../atoms/derivedViewAtoms";
import { vectorObservationsQueriesAtom } from "../atoms/queryAtoms";

export function useMakeViewStatusWriterMessages(
    statusWriter: ViewStatusWriter,
    parameterDisplayName: string | null,
    ensemblesWithoutParameter: Ensemble[]
) {
    const ensembleSet = useAtomValue(EnsembleSetAtom);
    const showObservations = useAtomValue(showObservationsAtom);
    const vectorObservationsQueries = useAtomValue(vectorObservationsQueriesAtom);
    const isQueryFetching = useAtomValue(queryIsFetchingAtom);
    const hasHistoricalVectorQueryError = useAtomValue(historicalDataQueryHasErrorAtom);
    const hasRealizationsQueryError = useAtomValue(realizationsQueryHasErrorAtom);
    const hasStatisticsQueryError = useAtomValue(statisticsQueryHasErrorAtom);

    statusWriter.setLoading(isQueryFetching);
    if (hasRealizationsQueryError) {
        statusWriter.addError("One or more realization data queries have an error state.");
    }
    if (hasStatisticsQueryError) {
        statusWriter.addError("One or more statistics data queries have an error state.");
    }
    if (hasHistoricalVectorQueryError) {
        statusWriter.addWarning("One or more historical data queries have an error state.");
    }
    if (vectorObservationsQueries.isError) {
        statusWriter.addWarning("One or more vector observation queries have an error state.");
    }

    vectorObservationsQueries.ensembleVectorObservationDataMap.forEach((ensembleObservationData, ensembleIdent) => {
        if (showObservations && !ensembleObservationData.hasSummaryObservations) {
            const ensembleName = ensembleSet.findEnsemble(ensembleIdent)?.getDisplayName() ?? ensembleIdent.toString();
            statusWriter.addWarning(`${ensembleName} has no observations.`);
            return;
        }
    });

    // Set warning for ensembles without selected parameter when coloring is enabled
    if (parameterDisplayName) {
        for (const ensemble of ensemblesWithoutParameter) {
            statusWriter.addWarning(
                `Ensemble ${ensemble.getDisplayName()} does not have parameter ${parameterDisplayName}.`
            );
        }
    }
}
