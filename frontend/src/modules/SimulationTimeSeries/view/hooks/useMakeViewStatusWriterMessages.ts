import { Ensemble } from "@framework/Ensemble";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { ViewContext } from "@framework/ModuleContext";
import { ViewStatusWriter } from "@framework/StatusWriter";
import { SettingsAtoms } from "@modules/SimulationTimeSeries/settings/atoms/atomDefinitions";
import { Interface } from "@modules/SimulationTimeSeries/settingsToViewInterface";
import { State } from "@modules/SimulationTimeSeries/state";

import { useAtomValue } from "jotai";

import { ViewAtoms } from "../atoms/atomDefinitions";

export function useMakeViewStatusWriterMessages(
    viewContext: ViewContext<State, Interface, SettingsAtoms, ViewAtoms>,
    statusWriter: ViewStatusWriter,
    parameterDisplayName: string | null,
    ensemblesWithoutParameter: Ensemble[]
) {
    const ensembleSet = useAtomValue(EnsembleSetAtom);
    const showObservations = viewContext.useSettingsToViewInterfaceValue("showObservations");
    const vectorObservationsQueries = viewContext.useViewAtomValue("vectorObservationsQueries");
    const isQueryFetching = viewContext.useViewAtomValue("queryIsFetching");
    const hasHistoricalVectorQueryError = viewContext.useViewAtomValue("historicalDataQueryHasError");
    const hasRealizationsQueryError = viewContext.useViewAtomValue("realizationsQueryHasError");
    const hasStatisticsQueryError = viewContext.useViewAtomValue("statisticsQueryHasError");

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
