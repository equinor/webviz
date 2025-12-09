import React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { Dialog } from "@lib/components/Dialog";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import {
    EnsembleExplorerMode,
    useApplyEnsembleSelection,
    useEnsembleSelectionHandlers,
    useEnsembleStateSync,
    useResponsiveDialogSizePercent,
} from "./_hooks";
import { makeHashFromSelectedEnsembles } from "./_utils";
import { DialogActions } from "./private-components/DialogActions";
import { EnsembleExplorer } from "./private-components/EnsembleExplorer";
import { EnsembleTables } from "./private-components/EnsembleTables";
import { ExplorerTitle } from "./private-components/ExplorerTitle";
import { SelectEnsemblesConfirmationDialogs } from "./private-components/SelectEnsemblesConfirmationDialogs";

export type SelectEnsemblesDialogProps = {
    workbench: Workbench;
};

export const SelectEnsemblesDialog: React.FC<SelectEnsemblesDialogProps> = (props) => {
    const [showEnsembleExplorer, setShowEnsembleExplorer] = React.useState<boolean>(false);
    const [hasExplorerBeenOpened, setHasExplorerBeenOpened] = React.useState<boolean>(false);

    const [showCancelDialog, setShowCancelDialog] = React.useState(false);
    const [showEnsemblesLoadingErrorDialog, setShowEnsemblesLoadingErrorDialog] = React.useState(false);

    // States for ensemble explorer mode and delta ensemble editing
    const ensembleExplorerModeState = React.useState<EnsembleExplorerMode | null>(null);
    const deltaEnsembleUuidToEditState = React.useState<string>("");

    // Gui states
    const [isOpen, setIsOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.EnsembleDialogOpen);
    const isEnsembleSetLoadingState = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.IsLoadingEnsembleSet);

    // Destruct for local use
    const [ensembleExplorerMode, setEnsembleExplorerMode] = ensembleExplorerModeState;
    const [isEnsembleSetLoading, setIsEnsembleSetLoading] = isEnsembleSetLoadingState;

    const queryClient = useQueryClient();
    const workbenchSession = props.workbench.getSessionManager().getActiveSession();
    const ensembleSet = usePublishSubscribeTopicValue(workbenchSession, WorkbenchSessionTopic.ENSEMBLE_SET);
    const colorSet = useColorSet(props.workbench.getSessionManager().getActiveSession().getWorkbenchSettings());
    const dialogSizePercent = useResponsiveDialogSizePercent();

    // Set has opened flag when opening the ensemble explorer for the first time after dialog open
    React.useEffect(() => {
        if (isOpen && showEnsembleExplorer && !hasExplorerBeenOpened) {
            setHasExplorerBeenOpened(true);
        }
    }, [isOpen, showEnsembleExplorer, hasExplorerBeenOpened]);

    // Custom hook for state management, will reset states when ensemble set changes
    const {
        ensembleSetHash,
        selectedRegularEnsemblesState,
        selectedDeltaEnsemblesState,
        selectableEnsemblesForDeltaState,
        resetStatesFromEnsembleSet,
    } = useEnsembleStateSync(ensembleSet);

    // Destructure state values for local use
    const [selectedRegularEnsembles] = selectedRegularEnsemblesState;
    const [selectedDeltaEnsembles] = selectedDeltaEnsemblesState;
    const [selectableEnsemblesForDelta] = selectableEnsemblesForDeltaState;

    // Calculate if there are unapplied changes
    const currentHash = makeHashFromSelectedEnsembles(selectedRegularEnsembles, selectedDeltaEnsembles);
    const hasUnappliedChanges = currentHash !== ensembleSetHash;

    // Dialog confirmation actions
    const handleClose = React.useCallback(
        function handleClose() {
            resetStatesFromEnsembleSet();
            setIsOpen(false);
            setShowEnsembleExplorer(false);
            setHasExplorerBeenOpened(false);
            setShowCancelDialog(false);
            setShowEnsemblesLoadingErrorDialog(false);
        },
        [resetStatesFromEnsembleSet, setIsOpen],
    );

    const handleCancel = React.useCallback(
        function handleCancel() {
            if (hasUnappliedChanges) {
                setShowCancelDialog(true);
            } else {
                handleClose();
            }
        },
        [hasUnappliedChanges, handleClose],
    );

    // Handlers for ensemble selection actions
    const selectionHandlers = useEnsembleSelectionHandlers({
        selectedRegularEnsemblesState: selectedRegularEnsemblesState,
        selectedDeltaEnsemblesState: selectedDeltaEnsemblesState,
        selectableEnsemblesForDeltaState: selectableEnsemblesForDeltaState,
        ensembleExplorerModeState: ensembleExplorerModeState,
        deltaEnsembleUuidToEditState: deltaEnsembleUuidToEditState,
        setShowEnsembleExplorer,
    });

    // Apply selection hook
    const {
        handleApplyEnsembleSelection,
        handleApplyEnsembleSelectionWithLoadingError,
        hasInvalidDeltaEnsembles,
        hasDuplicateDeltaEnsembles,
        ensembleLoadingErrorInfoMap,
    } = useApplyEnsembleSelection({
        queryClient,
        workbenchSession,
        selectedRegularEnsembles,
        selectedDeltaEnsembles,
        setIsEnsembleSetLoading,
        onLoadingErrorsDetected: () => {
            setShowEnsemblesLoadingErrorDialog(true);
        },
        onSuccess: handleClose,
    });

    // Determine next ensemble color
    const nextEnsembleColor = React.useMemo(() => {
        const usedColors = [...selectedRegularEnsembles, ...selectedDeltaEnsembles].map((ens) => ens.color);

        for (let i = 0; i < colorSet.getColorArray().length; i++) {
            const candidateColor = colorSet.getColor(i);

            if (!usedColors.includes(candidateColor)) {
                return candidateColor;
            }
        }

        // Default to an existing color (looping)
        return colorSet.getColor(usedColors.length % colorSet.getColorArray().length);
    }, [selectedDeltaEnsembles, selectedRegularEnsembles, colorSet]);

    const handleCloseEnsembleExplorer = React.useCallback(
        function handleCloseEnsembleExplorer() {
            setShowEnsembleExplorer(false);
            setEnsembleExplorerMode(null);
        },
        [setShowEnsembleExplorer, setEnsembleExplorerMode],
    );

    return (
        <>
            <Dialog
                open={isOpen}
                onClose={handleCancel}
                title={
                    <ExplorerTitle
                        showExplorer={showEnsembleExplorer}
                        explorerMode={ensembleExplorerMode}
                        onClose={handleCloseEnsembleExplorer}
                    />
                }
                modal
                showCloseCross
                width={`${dialogSizePercent.width}%`}
                height={`${dialogSizePercent.height}%`}
                maxWidth={"100%"}
                minWidth={800}
                minHeight={600}
                actions={
                    <DialogActions
                        isLoading={isEnsembleSetLoading}
                        disableDiscard={isEnsembleSetLoading || !hasUnappliedChanges}
                        disableApply={
                            isEnsembleSetLoading ||
                            hasInvalidDeltaEnsembles() ||
                            hasDuplicateDeltaEnsembles() ||
                            !hasUnappliedChanges
                        }
                        hasDuplicatedDeltaEnsembles={hasDuplicateDeltaEnsembles()}
                        onDiscard={handleClose}
                        onApply={handleApplyEnsembleSelection}
                    />
                }
                drawer={{
                    open: showEnsembleExplorer,
                    onClose: handleCloseEnsembleExplorer,
                    width: "85%",
                    content: hasExplorerBeenOpened ? (
                        <EnsembleExplorer
                            disableQueries={!showEnsembleExplorer}
                            nextEnsembleColor={nextEnsembleColor}
                            selectedEnsembles={
                                ensembleExplorerMode === EnsembleExplorerMode.ADD_REGULAR_ENSEMBLE
                                    ? selectedRegularEnsembles
                                    : []
                            }
                            onSelectEnsemble={selectionHandlers.handleSelectEnsemble}
                            selectButtonLabel={
                                ensembleExplorerMode === EnsembleExplorerMode.ADD_REGULAR_ENSEMBLE
                                    ? "Add Ensemble"
                                    : "Select Ensemble"
                            }
                            onRequestClose={handleCloseEnsembleExplorer}
                        />
                    ) : undefined,
                }}
            >
                <div className="relative flex flex-col w-full h-full">
                    <EnsembleTables
                        nextEnsembleColor={nextEnsembleColor}
                        selectedRegularEnsembles={selectedRegularEnsembles}
                        selectedDeltaEnsembles={selectedDeltaEnsembles}
                        selectableEnsemblesForDelta={selectableEnsemblesForDelta}
                        onAddRegularEnsemble={selectionHandlers.handleExploreRegularEnsemble}
                        onUpdateRegularEnsemble={selectionHandlers.handleUpdateRegularEnsemble}
                        onRemoveRegularEnsemble={selectionHandlers.handleRemoveRegularEnsemble}
                        onMoveRegularEnsemble={selectionHandlers.handleMoveRegularEnsemble}
                        onCreateDeltaEnsemble={selectionHandlers.handleAddDeltaEnsemble}
                        onUpdateDeltaEnsemble={selectionHandlers.handleUpdateDeltaEnsemble}
                        onRemoveDeltaEnsemble={selectionHandlers.handleRemoveDeltaEnsemble}
                        onMoveDeltaEnsemble={selectionHandlers.handleMoveDeltaEnsemble}
                        onRequestOtherComparisonEnsemble={selectionHandlers.handleOnRequestOtherComparisonEnsemble}
                        onRequestOtherReferenceEnsemble={selectionHandlers.handleOnRequestOtherReferenceEnsemble}
                    />
                </div>
            </Dialog>
            <SelectEnsemblesConfirmationDialogs
                ensembleLoadingErrorInfoMap={ensembleLoadingErrorInfoMap}
                showCancelDialogState={[showCancelDialog, setShowCancelDialog]}
                showLoadingErrorsDialogState={[showEnsemblesLoadingErrorDialog, setShowEnsemblesLoadingErrorDialog]}
                onConfirmCancel={handleClose}
                onConfirmContinue={handleApplyEnsembleSelectionWithLoadingError}
            />
        </>
    );
};
