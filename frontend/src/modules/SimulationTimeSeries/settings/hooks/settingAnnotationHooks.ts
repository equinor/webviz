import type { QueryObserverResult } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import type { SettingAnnotation } from "@lib/components/SettingWrapper";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { makeResampleFrequencyWarningString } from "@modules/SimulationTimeSeries/utils/resamplingFrequencyUtils";

import { resampleFrequencyAtom, visualizationModeAtom } from "../atoms/baseAtoms";
import { selectedEnsembleIdentsAtom, selectedParameterIdentStringAtom } from "../atoms/persistableFixableAtoms";
import { vectorListQueriesAtom } from "../atoms/queryAtoms";

/**
 * Hook to get annotations for the selectedEnsembleIdents setting
 */
export function useSelectedEnsembleIdentsAnnotations(): SettingAnnotation[] {
    return useMakePersistableFixableAtomAnnotations(selectedEnsembleIdentsAtom);
}

/**
 * Hook to get annotations for the selectedParameterIdentString setting
 */
export function useSelectedParameterIdentStringAnnotations(): SettingAnnotation[] {
    return useMakePersistableFixableAtomAnnotations(selectedParameterIdentStringAtom);
}

/**
 * Hook to get warning annotation for the resample frequency setting
 *
 * Returns warning if:
 * - Resample frequency is RAW (null) and visualization mode requires resampling
 * - Resample frequency is RAW (null) and delta ensembles are selected
 */
export function useResampleFrequencyWarningAnnotation(): string | undefined {
    const resampleFrequency = useAtomValue(resampleFrequencyAtom);
    const visualizationMode = useAtomValue(visualizationModeAtom);
    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);

    return makeResampleFrequencyWarningString(resampleFrequency, visualizationMode, selectedEnsembleIdents.value);
}

/**
 * Hook to get error annotation for vector list queries
 *
 * Returns an error annotation if all vector list queries have failed
 */
export function useVectorListQueriesErrorAnnotation(): string | undefined {
    const vectorListQueries = useAtomValue(vectorListQueriesAtom);

    return vectorListQueries.length > 0 && vectorListQueries.every((q: QueryObserverResult<unknown>) => q.isError)
        ? "Could not load vectors for selected ensembles"
        : undefined;
}
