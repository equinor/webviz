import { useAtomValue } from "jotai";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { SettingAnnotation, SettingOverlay } from "@lib/components/Setting";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { makeResampleFrequencyWarningString } from "@modules/SimulationTimeSeries/utils/resamplingFrequencyUtils";
import { joinStringArrayToHumanReadableString } from "@modules/SimulationTimeSeries/utils/stringUtils";

import { resampleFrequencyAtom, visualizationModeAtom } from "../atoms/baseAtoms";
import { isVectorListQueriesFetchingAtom } from "../atoms/derivedAtoms";
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
 * Vector list queries' load status for the Vectors field: a blocking `overlay` (loading, or error
 * if *all* selected ensembles' queries failed) and/or a non-blocking `warningMessage` naming the
 * failing ensemble(s) if only *some* failed.
 */
export function useVectorListQueriesFieldStatus(ensembleSet: EnsembleSet): {
    overlay?: SettingOverlay;
    warningMessage?: string;
} {
    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom).value ?? [];
    const vectorListQueries = useAtomValue(vectorListQueriesAtom);
    const isVectorListQueriesFetching = useAtomValue(isVectorListQueriesFetchingAtom);

    const isLoading = isVectorListQueriesFetching || vectorListQueries.some((query) => query.isFetching);

    const queriesWithIdent = vectorListQueries
        .map((query, index) => ({ query, ensembleIdent: selectedEnsembleIdents[index] }))
        .filter((item): item is typeof item & { ensembleIdent: NonNullable<(typeof item)["ensembleIdent"]> } =>
            Boolean(item.ensembleIdent),
        );

    const failingEnsembleNames = queriesWithIdent
        .filter((item) => item.query.isError)
        .map(
            ({ ensembleIdent }) =>
                ensembleSet.findEnsemble(ensembleIdent)?.getDisplayName() ?? ensembleIdent.toString(),
        );

    if (failingEnsembleNames.length === 0) {
        return isLoading ? { overlay: { type: "loading", message: "Loading vectors..." } } : {};
    }

    const message = `Could not load vectors for ensemble${failingEnsembleNames.length > 1 ? "s" : ""}: ${joinStringArrayToHumanReadableString(failingEnsembleNames)}`;

    const hasAnySuccessfulQuery = queriesWithIdent.some((item) => !item.query.isError);
    if (hasAnySuccessfulQuery) {
        return {
            warningMessage: message,
            overlay: isLoading ? { type: "loading", message: "Loading vectors..." } : undefined,
        };
    }

    return { overlay: { type: "error", message } };
}

/**
 * Hook to get an annotation for vector tags that match nothing in the VectorSelector's data
 *
 * Does not validate the tags itself: `invalidVectorTags` must already be the tags the VectorSelector reports as
 * invalid (`isValid === false` in its selection). Wildcard tags (e.g. WOPR:*) are thereby judged by what they expand
 * to rather than by literal vector names. The hook only maps them to an annotation, which is skipped when no
 * ensembles are selected.
 */
export function useInvalidVectorsAnnotation(invalidVectorTags: string[]): SettingAnnotation[] {
    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom).value ?? [];

    if (selectedEnsembleIdents.length === 0 || invalidVectorTags.length === 0) {
        return [];
    }

    return [
        {
            type: "error",
            message: `Invalid vector${invalidVectorTags.length > 1 ? "s" : ""}`,
        },
    ];
}
