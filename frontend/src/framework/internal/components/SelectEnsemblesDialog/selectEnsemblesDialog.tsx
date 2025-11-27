import React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { EnsemblesLoadingErrorInfoDialog } from "../EnsemblesLoadingErrorInfoDialog";

import {
    EnsembleExplorerMode,
    useApplyEnsembleSelection,
    useDialogFlowControl,
    useEnsembleSelectionHandlers,
    useEnsembleStateSync,
    useResponsiveDialogSizePercent,
} from "./_hooks";
import { DialogActions } from "./private-components/DialogActions";
import { EnsembleExplorer } from "./private-components/EnsembleExplorer";
import { EnsembleTables } from "./private-components/EnsembleTables";
import { ExplorerTitle } from "./private-components/ExplorerTitle";

export type SelectEnsemblesDialogProps = {
    workbench: Workbench;
};

export const SelectEnsemblesDialog: React.FC<SelectEnsemblesDialogProps> = (props) => {
    const [showEnsembleExplorer, setShowEnsembleExplorer] = React.useState<boolean>(false);
    const [ensembleExplorerMode, setEnsembleExplorerMode] = React.useState<EnsembleExplorerMode | null>(null);
    const [hasExplorerBeenOpened, setHasExplorerBeenOpened] = React.useState<boolean>(false);
    const [deltaEnsembleUuidToEdit, setDeltaEnsembleUuidToEdit] = React.useState<string>("");

    // Gui states
    const [isOpen, setIsOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.EnsembleDialogOpen);
    const [isEnsembleSetLoading, setIsEnsembleSetLoading] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.IsLoadingEnsembleSet,
    );

    const queryClient = useQueryClient();
    const workbenchSession = props.workbench.getSessionManager().getActiveSession();
    const ensembleSet = usePublishSubscribeTopicValue(workbenchSession, WorkbenchSessionTopic.ENSEMBLE_SET);

    // Set has opened flag when opening the ensemble explorer for the first time after dialog open
    React.useEffect(() => {
        if (isOpen && showEnsembleExplorer && !hasExplorerBeenOpened) {
            setHasExplorerBeenOpened(true);
        }
    }, [isOpen, showEnsembleExplorer, hasExplorerBeenOpened]);

    const dialogSizePercent = useResponsiveDialogSizePercent();
    const colorSet = useColorSet(props.workbench.getSessionManager().getActiveSession().getWorkbenchSettings());

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

    // Custom hook to manage dialog flow/control
    const dialogFlowControl = useDialogFlowControl({
        workbenchSession,
        ensembleSetHash,
        selectedRegularEnsembles,
        selectedDeltaEnsembles,
        resetStatesFromEnsembleSet,
        setIsOpen,
        setShowEnsembleExplorer,
        setHasExplorerBeenOpened,
    });

    // Handlers for ensemble selection actions
    const selectionHandlers = useEnsembleSelectionHandlers({
        selectedRegularEnsemblesState: selectedRegularEnsemblesState,
        selectedDeltaEnsemblesState: selectedDeltaEnsemblesState,
        selectableEnsemblesForDeltaState: selectableEnsemblesForDeltaState,
        deltaEnsembleUuidToEdit,
        ensembleExplorerMode,
        setShowEnsembleExplorer,
        setEnsembleExplorerMode,
        setDeltaEnsembleUuidToEdit,
    });

    // Apply selection hook
    const { applyEnsembleSelection, areAnyDeltaEnsemblesInvalid, hasDuplicateDeltaEnsembles } =
        useApplyEnsembleSelection({
            queryClient,
            workbenchSession,
            selectedRegularEnsembles,
            selectedDeltaEnsembles,
            isEnsembleSetLoading,
            setIsEnsembleSetLoading,
            onLoadingErrorsDetected: dialogFlowControl.callbacks.handleLoadingErrorsDetected,
            onSuccess: dialogFlowControl.callbacks.handleClose,
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

    function handleCloseEnsembleExplorer() {
        setShowEnsembleExplorer(false);
        setEnsembleExplorerMode(null);
    }

    return (
        <>
            <Dialog
                open={isOpen}
                onClose={dialogFlowControl.callbacks.handleCancel}
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
                        disableDiscard={isEnsembleSetLoading || !dialogFlowControl.hasUnappliedChanges}
                        disableApply={
                            isEnsembleSetLoading ||
                            areAnyDeltaEnsemblesInvalid() ||
                            hasDuplicateDeltaEnsembles() ||
                            !dialogFlowControl.hasUnappliedChanges
                        }
                        hasDuplicatedDeltaEnsembles={hasDuplicateDeltaEnsembles()}
                        onDiscard={dialogFlowControl.callbacks.handleClose}
                        onApply={applyEnsembleSelection}
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
            <Dialog
                open={dialogFlowControl.cancelDialogControl.isOpen}
                onClose={() => dialogFlowControl.cancelDialogControl.setIsOpen(false)}
                title="Unsaved changes"
                modal
                actions={
                    <div className="flex gap-4">
                        <Button onClick={() => dialogFlowControl.cancelDialogControl.setIsOpen(false)}>
                            No, don&apos;t cancel
                        </Button>
                        <Button onClick={dialogFlowControl.callbacks.handleClose} color="danger">
                            Yes, cancel
                        </Button>
                    </div>
                }
            >
                You have unsaved changes which will be lost. Are you sure you want to cancel?
            </Dialog>
            <EnsemblesLoadingErrorInfoDialog
                open={dialogFlowControl.loadingErrorsDialogControl.isOpen}
                onClose={() => dialogFlowControl.loadingErrorsDialogControl.setIsOpen(false)}
                description={
                    <div>
                        Some ensembles encountered errors during loading and setup and have been excluded. Do you want
                        to continue without them?
                    </div>
                }
                ensembleLoadingErrorInfoMap={dialogFlowControl.ensembleLoadingErrorInfoMap}
                actions={
                    <div className="flex gap-4">
                        <Button
                            onClick={() => dialogFlowControl.loadingErrorsDialogControl.setIsOpen(false)}
                            color="danger"
                        >
                            No, don&apos;t continue
                        </Button>
                        <Button onClick={dialogFlowControl.callbacks.handleContinueWithLoadingErrors} color="primary">
                            Yes, continue
                        </Button>
                    </div>
                }
            />
        </>
    );
};
