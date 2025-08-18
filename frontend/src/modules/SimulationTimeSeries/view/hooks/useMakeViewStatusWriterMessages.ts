import { useAtomValue } from "jotai";

import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { ViewContext } from "@framework/ModuleContext";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { ViewStatusWriter } from "@framework/StatusWriter";
import type { Interfaces } from "@modules/SimulationTimeSeries/interfaces";

import { showObservationsAtom } from "../atoms/baseAtoms";
import { queryIsFetchingAtom, realizationsQueryHasErrorAtom, statisticsQueryHasErrorAtom } from "../atoms/derivedAtoms";
import { vectorObservationsQueriesAtom, regularEnsembleHistoricalVectorDataQueriesAtom } from "../atoms/queryAtoms";

export function useMakeViewStatusWriterMessages(
    viewContext: ViewContext<Interfaces>,
    statusWriter: ViewStatusWriter,
    parameterDisplayName: string | null,
    ensemblesWithoutParameter: (RegularEnsemble | DeltaEnsemble)[],
) {
    const ensembleSet = useAtomValue(EnsembleSetAtom);
    const showObservations = useAtomValue(showObservationsAtom);

    const vectorObservationsQueries = useAtomValue(vectorObservationsQueriesAtom);
    const isQueryFetching = useAtomValue(queryIsFetchingAtom);
    const hasHistoricalVectorQueryError = useAtomValue(regularEnsembleHistoricalVectorDataQueriesAtom).isError;
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
                `Ensemble ${ensemble.getDisplayName()} does not have parameter ${parameterDisplayName}.`,
            );
        }
    }
}
