import React from "react";

import type { QueryClient } from "@tanstack/react-query";

import type { EnsembleSet } from "@framework/EnsembleSet";
import {
    loadMetadataFromBackendAndCreateEnsembleSet,
    type EnsembleLoadingErrorInfoMap,
} from "@framework/internal/EnsembleSetLoader";
import type { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";

import {
    makeHashFromDeltaEnsembleDefinition,
    makeUserEnsembleSettingsFromInternal,
    makeValidUserDeltaEnsembleSettingsFromInternal,
} from "../_utils";
import type { InternalDeltaEnsembleSetting, InternalRegularEnsembleSetting } from "../types";

export type UseApplyEnsembleSelectionProps = {
    queryClient: QueryClient;
    workbenchSession: PrivateWorkbenchSession;
    selectedRegularEnsembles: InternalRegularEnsembleSetting[];
    selectedDeltaEnsembles: InternalDeltaEnsembleSetting[];
    isEnsembleSetLoading: boolean;
    setIsEnsembleSetLoading: (loading: boolean) => void;
    onLoadingErrorsDetected: (ensembleSet: EnsembleSet, errorMap: EnsembleLoadingErrorInfoMap) => void;
    onSuccess: () => void;
};

export type UseApplyEnsembleSelectionResult = {
    isEnsembleSetLoading: boolean;
    applyEnsembleSelection: () => void;
    areAnyDeltaEnsemblesInvalid: () => boolean;
    hasDuplicateDeltaEnsembles: () => boolean;
};

/**
 * Hook to handle applying ensemble selection
 * Manages validation, loading state, and error handling
 */
export function useApplyEnsembleSelection({
    queryClient,
    workbenchSession,
    selectedRegularEnsembles,
    selectedDeltaEnsembles,
    isEnsembleSetLoading,
    setIsEnsembleSetLoading,
    onLoadingErrorsDetected,
    onSuccess,
}: UseApplyEnsembleSelectionProps) {
    const areAnyDeltaEnsemblesInvalid = React.useCallback(
        function areAnyDeltaEnsemblesInvalid(): boolean {
            return selectedDeltaEnsembles.some(
                (el) =>
                    !el.comparisonEnsembleIdent ||
                    !el.referenceEnsembleIdent ||
                    !el.comparisonEnsembleCaseName ||
                    !el.referenceEnsembleCaseName,
            );
        },
        [selectedDeltaEnsembles],
    );

    const hasDuplicateDeltaEnsembles = React.useCallback(
        function hasDuplicateDeltaEnsembles(): boolean {
            const uniqueDeltaEnsembles = new Set<string>();
            for (const el of selectedDeltaEnsembles) {
                if (!el.comparisonEnsembleIdent || !el.referenceEnsembleIdent) {
                    continue;
                }
                const key = makeHashFromDeltaEnsembleDefinition(el);
                if (uniqueDeltaEnsembles.has(key)) {
                    return true;
                }
                uniqueDeltaEnsembles.add(key);
            }
            return false;
        },
        [selectedDeltaEnsembles],
    );

    const applyEnsembleSelection = React.useCallback(
        function applyEnsembleSelection() {
            if (selectedDeltaEnsembles.some((elm) => !elm.comparisonEnsembleIdent || !elm.referenceEnsembleIdent)) {
                return;
            }

            const regularEnsembleSettings = makeUserEnsembleSettingsFromInternal(selectedRegularEnsembles);
            const deltaEnsembleSettings = makeValidUserDeltaEnsembleSettingsFromInternal(selectedDeltaEnsembles);

            // Set loading state
            setIsEnsembleSetLoading(true);

            loadMetadataFromBackendAndCreateEnsembleSet(
                queryClient,
                regularEnsembleSettings,
                deltaEnsembleSettings,
            ).then((value: { ensembleSet: EnsembleSet; ensembleLoadingErrorInfoMap: EnsembleLoadingErrorInfoMap }) => {
                // Reset loading state
                setIsEnsembleSetLoading(false);

                // Handle confirm of error messages if any
                if (value.ensembleLoadingErrorInfoMap && Object.keys(value.ensembleLoadingErrorInfoMap).length > 0) {
                    onLoadingErrorsDetected(value.ensembleSet, value.ensembleLoadingErrorInfoMap);
                    return;
                }

                // If no errors, set ensemble set and close dialog
                workbenchSession.setEnsembleSet(value.ensembleSet);
                onSuccess();
            });
        },
        [
            selectedDeltaEnsembles,
            selectedRegularEnsembles,
            setIsEnsembleSetLoading,
            queryClient,
            onLoadingErrorsDetected,
            workbenchSession,
            onSuccess,
        ],
    );

    return {
        isEnsembleSetLoading,
        applyEnsembleSelection,
        areAnyDeltaEnsemblesInvalid,
        hasDuplicateDeltaEnsembles,
    };
}
