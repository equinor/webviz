import { useAtomValue } from "jotai";

import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { ViewStatusWriter } from "@framework/StatusWriter";
import {
    usePropagateAllApiErrorsToStatusWriter,
    usePropagateQueryErrorsToStatusWriter,
} from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { showHistoricalAtom, showObservationsAtom, vectorSpecificationsAtom } from "../atoms/baseAtoms";
import { queryIsFetchingAtom } from "../atoms/derivedAtoms";
import {
    vectorObservationsQueriesAtom,
    regularEnsembleHistoricalVectorDataQueriesAtom,
    vectorDataQueriesAtom,
    vectorStatisticsQueriesAtom,
} from "../atoms/queryAtoms";

export function useMakeViewStatusWriterMessages(
    statusWriter: ViewStatusWriter,
    parameterDisplayName: string | null,
    ensemblesWithoutParameter: (RegularEnsemble | DeltaEnsemble)[],
) {
    const vectorSpecifications = useAtomValue(vectorSpecificationsAtom);
    const ensembleSet = useAtomValue(EnsembleSetAtom);
    const showHistorical = useAtomValue(showHistoricalAtom);
    const showObservations = useAtomValue(showObservationsAtom);
    const vectorRealizationsQueries = useAtomValue(vectorDataQueriesAtom);
    const vectorStatisticsQueries = useAtomValue(vectorStatisticsQueriesAtom);
    const vectorHistoricalQueries = useAtomValue(regularEnsembleHistoricalVectorDataQueriesAtom);
    const vectorObservationsQueries = useAtomValue(vectorObservationsQueriesAtom);
    const isQueryFetching = useAtomValue(queryIsFetchingAtom);

    statusWriter.setLoading(isQueryFetching);

    // Query errors
    usePropagateQueryErrorsToStatusWriter(vectorRealizationsQueries, statusWriter);
    usePropagateQueryErrorsToStatusWriter(vectorStatisticsQueries, statusWriter);
    usePropagateAllApiErrorsToStatusWriter(vectorHistoricalQueries?.errors ?? [], statusWriter);
    usePropagateAllApiErrorsToStatusWriter(vectorObservationsQueries?.errors ?? [], statusWriter);

    // Warning for vectors without historical data (not query error, but history vector does not exist)
    if (showHistorical) {
        for (const vectorSpec of vectorSpecifications) {
            if (!vectorSpec.hasHistoricalVector) {
                const ensembleName =
                    ensembleSet.findEnsemble(vectorSpec.ensembleIdent)?.getDisplayName() ??
                    vectorSpec.ensembleIdent.toString();
                statusWriter.addWarning(
                    `Vector ${vectorSpec.vectorName} for \`${ensembleName}\` has no historical data.`,
                );
            }
        }
    }

    // Warning for ensembles without observations
    if (showObservations) {
        for (const [ensembleIdent, observationData] of vectorObservationsQueries.ensembleVectorObservationDataMap) {
            if (!observationData.hasSummaryObservations) {
                const ensembleName =
                    ensembleSet.findEnsemble(ensembleIdent)?.getDisplayName() ?? ensembleIdent.toString();
                statusWriter.addWarning(`\`${ensembleName}\` has no observations.`);
            }
        }
    }

    // Set warning for ensembles without selected parameter when coloring is enabled
    if (parameterDisplayName) {
        for (const ensemble of ensemblesWithoutParameter) {
            statusWriter.addWarning(
                `Ensemble ${ensemble.getDisplayName()} does not have parameter ${parameterDisplayName}.`,
            );
        }
    }
}
