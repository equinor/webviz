import React from "react";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { EnsembleLoadingErrorInfoMap } from "@framework/internal/EnsembleSetLoader";
import type { PrivateWorkbenchSession } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";

import { makeHashFromSelectedEnsembles } from "../_utils";
import type { InternalDeltaEnsembleSetting, InternalRegularEnsembleSetting } from "../types";

export type UseDialogFlowControlProps = {
    workbenchSession: PrivateWorkbenchSession;
    ensembleSetHash: string;
    selectedRegularEnsembles: InternalRegularEnsembleSetting[];
    selectedDeltaEnsembles: InternalDeltaEnsembleSetting[];
    setIsOpen: (open: boolean) => void;
    resetStatesFromEnsembleSet: () => void;
    setShowEnsembleExplorer: (show: boolean) => void;
    setHasExplorerBeenOpened: (opened: boolean) => void;
};

export type UseDialogFlowResult = {
    hasUnappliedChanges: boolean;
    cancelDialogControl: {
        isOpen: boolean;
        setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    };
    loadingErrorsDialogControl: {
        isOpen: boolean;
        setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    };
    ensembleLoadingErrorInfoMap: EnsembleLoadingErrorInfoMap;
    callbacks: {
        handleCancel: () => void;
        handleClose: () => void;
        handleContinueWithLoadingErrors: () => void;
        handleLoadingErrorsDetected: (ensembleSet: EnsembleSet, errorMap: EnsembleLoadingErrorInfoMap) => void;
    };
};

/**
 * Hook to manage/control dialog flow and state
 *
 * Handles close of dialog, and discard/confirm cancellation confirmation, and ensemble loading error flows
 */
export function useDialogFlowControl({
    setIsOpen,
    selectedRegularEnsembles,
    selectedDeltaEnsembles,
    ensembleSetHash,
    resetStatesFromEnsembleSet,
    workbenchSession,
    setShowEnsembleExplorer,
    setHasExplorerBeenOpened,
}: UseDialogFlowControlProps): UseDialogFlowResult {
    const [confirmCancel, setConfirmCancel] = React.useState<boolean>(false);
    const [confirmLoadingErrors, setConfirmLoadingErrors] = React.useState<boolean>(false);
    const [newEnsembleSetToApply, setNewEnsembleSetToApply] = React.useState<EnsembleSet | null>(null);
    const [ensembleLoadingErrorInfoMap, setEnsembleLoadingErrorInfoMap] = React.useState<EnsembleLoadingErrorInfoMap>(
        {},
    );

    const currentHash = makeHashFromSelectedEnsembles(selectedRegularEnsembles, selectedDeltaEnsembles);
    const hasUnappliedChanges = currentHash !== ensembleSetHash;

    const handleClose = React.useCallback(
        function handleClose() {
            // Reset states when discard/close
            resetStatesFromEnsembleSet();
            setConfirmCancel(false);
            setConfirmLoadingErrors(false);
            setIsOpen(false);
            setShowEnsembleExplorer(false);
            setHasExplorerBeenOpened(false);
            setNewEnsembleSetToApply(null);
        },
        [resetStatesFromEnsembleSet, setIsOpen, setShowEnsembleExplorer, setHasExplorerBeenOpened],
    );

    const handleCancel = React.useCallback(
        function handleCancel() {
            // If changes are applied, perform close
            if (currentHash === ensembleSetHash) {
                handleClose();
                return;
            }
            setConfirmCancel(true);
        },
        [currentHash, ensembleSetHash, handleClose],
    );

    const handleContinueWithLoadingErrors = React.useCallback(
        function handleContinueWithLoadingErrors() {
            if (!newEnsembleSetToApply) {
                return;
            }

            workbenchSession.setEnsembleSet(newEnsembleSetToApply);
            handleClose();
        },
        [newEnsembleSetToApply, handleClose, workbenchSession],
    );

    const handleLoadingErrorsDetected = React.useCallback(function handleLoadingErrorsDetected(
        ensembleSet: EnsembleSet,
        errorMap: EnsembleLoadingErrorInfoMap,
    ) {
        setEnsembleLoadingErrorInfoMap(errorMap);
        setConfirmLoadingErrors(true);
        setNewEnsembleSetToApply(ensembleSet);
    }, []);

    return {
        hasUnappliedChanges,
        cancelDialogControl: {
            isOpen: confirmCancel,
            setIsOpen: setConfirmCancel,
        },
        loadingErrorsDialogControl: {
            isOpen: confirmLoadingErrors,
            setIsOpen: setConfirmLoadingErrors,
        },
        ensembleLoadingErrorInfoMap,
        callbacks: {
            handleCancel,
            handleClose,
            handleContinueWithLoadingErrors,
            handleLoadingErrorsDetected,
        },
    };
}
