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

import type { StateTuple } from "./_types";

export type UseApplyEnsembleSelectionProps = {
    queryClient: QueryClient;
    workbenchSession: PrivateWorkbenchSession;
    selectedRegularEnsembles: InternalRegularEnsembleSetting[];
    selectedDeltaEnsembles: InternalDeltaEnsembleSetting[];
    isEnsembleSetLoadingState: StateTuple<boolean>;
    onLoadingErrorsDetected: () => void;
    onSuccess: () => void;
};

export type UseApplyEnsembleSelectionResult = {
    ensembleLoadingErrorInfoMap: EnsembleLoadingErrorInfoMap;
    handleApplyEnsembleSelection: () => void;
    handleApplyEnsembleSelectionWithLoadingError: () => void;
    hasInvalidDeltaEnsembles: () => boolean;
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
    isEnsembleSetLoadingState,
    onLoadingErrorsDetected,
    onSuccess,
}: UseApplyEnsembleSelectionProps) {
    const [, setIsEnsembleSetLoading] = isEnsembleSetLoadingState;
    const [newEnsembleSetToApply, setNewEnsembleSetToApply] = React.useState<EnsembleSet | null>(null);
    const [ensembleLoadingErrorInfoMap, setEnsembleLoadingErrorInfoMap] = React.useState<EnsembleLoadingErrorInfoMap>(
        {},
    );

    const hasInvalidDeltaEnsembles = React.useCallback(
        function hasInvalidDeltaEnsembles(): boolean {
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

    const handleApplyEnsembleSelectionWithLoadingError = React.useCallback(
        function handleApplyEnsembleSelectionWithLoadingError() {
            if (newEnsembleSetToApply) {
                workbenchSession.setEnsembleSet(newEnsembleSetToApply);
                setNewEnsembleSetToApply(null);
                setEnsembleLoadingErrorInfoMap({});
                onSuccess();
            }
        },
        [newEnsembleSetToApply, workbenchSession, onSuccess],
    );

    const handleApplyEnsembleSelection = React.useCallback(
        function handleApplyEnsembleSelection() {
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

                // Handle confirm of error messages if any - call handleApplyEnsembleSelectionWithLoadingError to set ensemble set with errors
                if (value.ensembleLoadingErrorInfoMap && Object.keys(value.ensembleLoadingErrorInfoMap).length > 0) {
                    setNewEnsembleSetToApply(value.ensembleSet);
                    setEnsembleLoadingErrorInfoMap(value.ensembleLoadingErrorInfoMap);
                    onLoadingErrorsDetected();
                    return;
                }

                // If no errors, set ensemble set and close dialog
                workbenchSession.setEnsembleSet(value.ensembleSet);
                setNewEnsembleSetToApply(null);
                setEnsembleLoadingErrorInfoMap({});
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
        ensembleLoadingErrorInfoMap,
        handleApplyEnsembleSelection,
        handleApplyEnsembleSelectionWithLoadingError,
        hasInvalidDeltaEnsembles,
        hasDuplicateDeltaEnsembles,
    };
}
