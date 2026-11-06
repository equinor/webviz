import { useAtomValue } from "jotai";

import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { ViewStatusWriter } from "@framework/StatusWriter";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import {
    propagateAllApiErrorsToStatusWriter,
    propagateQueryErrorsToStatusWriter,
} from "@modules/_shared/utils/propagateApiErrorToStatusWriter";

import {
    resampleFrequencyAtom,
    showHistoricalAtom,
    showObservationsAtom,
    vectorSpecificationsAtom,
} from "../atoms/baseAtoms";
import { queryIsFetchingAtom } from "../atoms/derivedAtoms";
import {
    vectorObservationsQueriesAtom,
    regularEnsembleHistoricalVectorDataQueriesAtom,
    vectorDataQueriesAtom,
    vectorDataWarningsAtom,
    vectorStatisticsWarningsAtom,
    vectorStatisticsQueriesAtom,
} from "../atoms/queryAtoms";

export function useMakeViewStatusWriterMessages(
    statusWriter: ViewStatusWriter,
    parameterDisplayName: string | null,
    ensemblesWithoutParameter: (RegularEnsemble | DeltaEnsemble)[],
) {
    const ensembleSet = useAtomValue(EnsembleSetAtom);
    const resampleFrequency = useAtomValue(resampleFrequencyAtom);
    const vectorSpecifications = useAtomValue(vectorSpecificationsAtom);
    const showHistorical = useAtomValue(showHistoricalAtom);
    const showObservations = useAtomValue(showObservationsAtom);
    const vectorRealizationsQueries = useAtomValue(vectorDataQueriesAtom);
    const vectorStatisticsQueries = useAtomValue(vectorStatisticsQueriesAtom);
    const vectorHistoricalQueries = useAtomValue(regularEnsembleHistoricalVectorDataQueriesAtom);
    const vectorObservationsQueries = useAtomValue(vectorObservationsQueriesAtom);
    const vectorDataWarnings = [...useAtomValue(vectorDataWarningsAtom), ...useAtomValue(vectorStatisticsWarningsAtom)];
    const isQueryFetching = useAtomValue(queryIsFetchingAtom);

    statusWriter.setLoading(isQueryFetching);

    // Query errors
    propagateQueryErrorsToStatusWriter(vectorRealizationsQueries, statusWriter);
    propagateQueryErrorsToStatusWriter(vectorStatisticsQueries, statusWriter);
    propagateAllApiErrorsToStatusWriter(vectorHistoricalQueries?.errors ?? [], statusWriter);
    propagateAllApiErrorsToStatusWriter(vectorObservationsQueries?.errors ?? [], statusWriter);

    // Warnings reported by the back-end alongside the realization data
    // Realization and statistics queries can report the same warning, so de-duplicate the messages
    const warningMessages = new Set<string>();
    for (const { vectorSpecification, warning } of vectorDataWarnings) {
        const ensembleName =
            ensembleSet.findEnsemble(vectorSpecification.ensembleIdent)?.getDisplayName() ??
            vectorSpecification.ensembleIdent.toString();
        warningMessages.add(`${vectorSpecification.vectorName} for \`${ensembleName}\`: ${warning}`);
    }
    warningMessages.forEach((message) => statusWriter.addWarning(message));

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

    // Set error if delta ensembles are selected simultaneously as RAW resampling frequency (null)
    if (resampleFrequency === null) {
        const uniqueDeltaEnsembleIdents: DeltaEnsembleIdent[] = [];
        for (const vectorSpec of vectorSpecifications) {
            if (!isEnsembleIdentOfType(vectorSpec.ensembleIdent, DeltaEnsembleIdent)) continue;
            if (uniqueDeltaEnsembleIdents.some((ident) => ident.equals(vectorSpec.ensembleIdent))) continue;

            // Add for uniqueness check
            uniqueDeltaEnsembleIdents.push(vectorSpec.ensembleIdent);

            // Add error message to status writer
            const ensembleName =
                ensembleSet.findEnsemble(vectorSpec.ensembleIdent)?.getDisplayName() ??
                vectorSpec.ensembleIdent.toString();
            statusWriter.addError(
                `Delta ensembles cannot be used with RAW resampling frequency: Ensemble \`${ensembleName}\`.`,
            );
        }
    }
}
