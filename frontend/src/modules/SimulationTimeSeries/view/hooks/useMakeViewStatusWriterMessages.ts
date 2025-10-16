import { useAtomValue } from "jotai";

import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { ViewContext } from "@framework/ModuleContext";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { ViewStatusWriter } from "@framework/StatusWriter";
import { usePropagateAllApiErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import type { Interfaces } from "@modules/SimulationTimeSeries/interfaces";

import { showObservationsAtom } from "../atoms/baseAtoms";
import { queryIsFetchingAtom } from "../atoms/derivedAtoms";
import {
    vectorObservationsQueriesAtom,
    regularEnsembleHistoricalVectorDataQueriesAtom,
    vectorDataQueriesAtom,
    vectorStatisticsQueriesAtom,
} from "../atoms/queryAtoms";

export function useMakeViewStatusWriterMessages(
    viewContext: ViewContext<Interfaces>,
    statusWriter: ViewStatusWriter,
    parameterDisplayName: string | null,
    ensemblesWithoutParameter: (RegularEnsemble | DeltaEnsemble)[],
) {
    const ensembleSet = useAtomValue(EnsembleSetAtom);
    const showObservations = useAtomValue(showObservationsAtom);
    const vectorRealizationsQueries = useAtomValue(vectorDataQueriesAtom);
    const vectorStatisticsQueries = useAtomValue(vectorStatisticsQueriesAtom);
    const vectorHistoricalQueries = useAtomValue(regularEnsembleHistoricalVectorDataQueriesAtom);
    const vectorObservationsQueries = useAtomValue(vectorObservationsQueriesAtom);
    const isQueryFetching = useAtomValue(queryIsFetchingAtom);

    statusWriter.setLoading(isQueryFetching);

    usePropagateAllApiErrorsToStatusWriter(vectorRealizationsQueries, statusWriter);
    usePropagateAllApiErrorsToStatusWriter(vectorStatisticsQueries, statusWriter);

    if (vectorHistoricalQueries.errors && vectorHistoricalQueries.errors.length > 0) {
        vectorHistoricalQueries.errors.forEach((error) => {
            statusWriter.addError(error?.message);
        });
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
