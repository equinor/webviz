import { Ensemble } from "@framework/Ensemble";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { ViewContext } from "@framework/ModuleContext";
import { ViewStatusWriter } from "@framework/StatusWriter";
import { Interface } from "@modules/SimulationTimeSeries/settingsToViewInterface";
import { State } from "@modules/SimulationTimeSeries/state";

import { useAtomValue } from "jotai";

import {
    historicalDataQueryHasErrorAtom,
    queryIsFetchingAtom,
    realizationsQueryHasErrorAtom,
    statisticsQueryHasErrorAtom,
} from "../atoms/derivedAtoms";

export function useMakeViewStatusWriterMessages(
    viewContext: ViewContext<State, Interface>,
    statusWriter: ViewStatusWriter,
    parameterDisplayName: string | null,
    ensemblesWithoutParameter: Ensemble[]
) {
    const ensembleSet = useAtomValue(EnsembleSetAtom);
    const showObservations = viewContext.useSettingsToViewInterfaceValue("showObservations");
    const vectorObservationsQueries = viewContext.useSettingsToViewInterfaceValue("vectorObservationsQueries");
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
