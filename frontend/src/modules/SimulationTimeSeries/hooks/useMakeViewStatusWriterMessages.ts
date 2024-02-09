import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { ViewStatusWriter } from "@framework/StatusWriter";
import { ColorScale } from "@lib/utils/ColorScale";

import { useAtomValue } from "jotai";

import {
    colorByParameterAtom,
    historicalDataQueryHasErrorAtom,
    parameterIdentAtom,
    queryIsFetchingAtom,
    realizationsQueryHasErrorAtom,
    selectedEnsemblesAtom,
    showObservationsAtom,
    statisticsQueryHasErrorAtom,
    vectorObservationsQueriesAtom,
} from "../atoms";
import { EnsemblesContinuousParameterColoring } from "../utils/ensemblesContinuousParameterColoring";

export function useMakeViewStatusWriterMessages(statusWriter: ViewStatusWriter, parameterColorScale: ColorScale) {
    const ensembleSet = useAtomValue(EnsembleSetAtom);
    const showObservations = useAtomValue(showObservationsAtom);
    const parameterIdent = useAtomValue(parameterIdentAtom);
    const selectedEnsembles = useAtomValue(selectedEnsemblesAtom);
    const vectorObservationsQueries = useAtomValue(vectorObservationsQueriesAtom);
    const isQueryFetching = useAtomValue(queryIsFetchingAtom);
    const hasHistoricalVectorQueryError = useAtomValue(historicalDataQueryHasErrorAtom);
    const colorByParameter = useAtomValue(colorByParameterAtom);
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

    // Create parameter color scale helper
    const ensemblesParameterColoring =
        colorByParameter && parameterIdent
            ? new EnsemblesContinuousParameterColoring(selectedEnsembles, parameterIdent, parameterColorScale)
            : null;

    // Set warning for ensembles without selected parameter when coloring is enabled
    if (colorByParameter && ensemblesParameterColoring) {
        const ensemblesWithoutParameter = selectedEnsembles.filter(
            (ensemble) => !ensemblesParameterColoring.hasParameterForEnsemble(ensemble.getIdent())
        );
        for (const ensemble of ensemblesWithoutParameter) {
            statusWriter.addWarning(
                `Ensemble ${ensemble.getDisplayName()} does not have parameter ${ensemblesParameterColoring.getParameterDisplayName()}`
            );
        }
    }
}
