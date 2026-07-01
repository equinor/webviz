import React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { Dialog } from "@lib/components/Dialog";
import { Form } from "@lib/components/Form";
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
import { SelectEnsemblesConfirmationDialogs } from "./private-components/SelectEnsemblesConfirmationDialogs";

export type SelectEnsemblesDialogProps = {
    workbench: Workbench;
};

function* makeColorGenerator(colors: string[], usedColors: string[]): Generator<string, never, undefined> {
    const usedSet = new Set(usedColors);
    for (const color of colors) {
        if (!usedSet.has(color)) {
            yield color;
        }
    }
    let index = usedColors.length % Math.max(colors.length, 1);
    while (true) {
        yield colors[index % colors.length];
        index++;
    }
}

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
    const { handleApplyEnsembleSelection, handleApplyEnsembleSelectionWithLoadingError, ensembleLoadingErrorInfoMap } =
        useApplyEnsembleSelection({
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

    const handleFormSubmit = React.useCallback(
        function handleFormSubmit(e: React.FormEvent) {
            e.preventDefault();
            handleApplyEnsembleSelection();
        },
        [handleApplyEnsembleSelection],
    );

    const colorGenerator = React.useMemo(() => {
        const usedColors = [...selectedRegularEnsembles, ...selectedDeltaEnsembles].map((ens) => ens.color);
        return makeColorGenerator(colorSet.getColorArray(), usedColors);
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
            <Dialog.Popup
                open={isOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        handleCancel();
                    }
                }}
                width={`${dialogSizePercent.width}%`}
                height={`${dialogSizePercent.height}%`}
                modal
            >
                <div className="flex h-full flex-col">
                    <Dialog.Header closeIconVisible>
                        <Dialog.Title>Ensembles used in this session</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body layoutClassName="grow min-h-0">
                        <Form
                            layoutClassName="relative flex h-full min-h-0 w-full flex-col"
                            onSubmit={handleFormSubmit}
                        >
                            <EnsembleTables
                                colorGenerator={colorGenerator}
                                selectedRegularEnsembles={selectedRegularEnsembles}
                                selectedDeltaEnsembles={selectedDeltaEnsembles}
                                selectableEnsemblesForDelta={selectableEnsemblesForDelta}
                                onAddRegularEnsemble={selectionHandlers.handleExploreRegularEnsemble}
                                onUpdateRegularEnsemble={selectionHandlers.handleUpdateRegularEnsemble}
                                onRemoveRegularEnsemble={selectionHandlers.handleRemoveRegularEnsembles}
                                onMoveRegularEnsemble={selectionHandlers.handleMoveRegularEnsemble}
                                onCreateDeltaEnsemble={selectionHandlers.handleAddDeltaEnsemble}
                                onUpdateDeltaEnsemble={selectionHandlers.handleUpdateDeltaEnsemble}
                                onRemoveDeltaEnsemble={selectionHandlers.handleRemoveDeltaEnsemble}
                                onMoveDeltaEnsemble={selectionHandlers.handleMoveDeltaEnsemble}
                                onRequestOtherComparisonEnsemble={
                                    selectionHandlers.handleOnRequestOtherComparisonEnsemble
                                }
                                onRequestOtherReferenceEnsemble={
                                    selectionHandlers.handleOnRequestOtherReferenceEnsemble
                                }
                            />
                            <Dialog.Actions>
                                <DialogActions
                                    isLoading={isEnsembleSetLoading}
                                    disableDiscard={isEnsembleSetLoading || !hasUnappliedChanges}
                                    disableApply={isEnsembleSetLoading || !hasUnappliedChanges}
                                    onDiscard={handleClose}
                                />
                            </Dialog.Actions>
                        </Form>
                    </Dialog.Body>
                </div>
                <Dialog.Popup
                    open={showEnsembleExplorer}
                    onOpenChange={(open: boolean) => {
                        if (!open) {
                            handleCloseEnsembleExplorer();
                        }
                    }}
                    width={`${dialogSizePercent.width}%`}
                    height={`${dialogSizePercent.height}%`}
                    modal
                    keepMounted
                    stacked
                >
                    <Dialog.Header closeIconVisible>
                        <Dialog.Title>
                            {ensembleExplorerMode === EnsembleExplorerMode.ADD_REGULAR_ENSEMBLE
                                ? "Change ensemble selection"
                                : "Select ensemble"}
                        </Dialog.Title>
                    </Dialog.Header>
                    <EnsembleExplorer
                        queriesDisabled={!showEnsembleExplorer}
                        colorGenerator={colorGenerator}
                        selectedEnsembles={selectedRegularEnsembles}
                        onSelectionChange={selectionHandlers.handleSetRegularEnsembles}
                        onSelect={selectionHandlers.handleSelectEnsemble}
                        multiSelect={ensembleExplorerMode === EnsembleExplorerMode.ADD_REGULAR_ENSEMBLE}
                        onRequestClose={handleCloseEnsembleExplorer}
                    />
                </Dialog.Popup>
                <SelectEnsemblesConfirmationDialogs
                    ensembleLoadingErrorInfoMap={ensembleLoadingErrorInfoMap}
                    showCancelDialogState={[showCancelDialog, setShowCancelDialog]}
                    showLoadingErrorsDialogState={[showEnsemblesLoadingErrorDialog, setShowEnsemblesLoadingErrorDialog]}
                    onConfirmCancel={handleClose}
                    onConfirmContinue={handleApplyEnsembleSelectionWithLoadingError}
                />
            </Dialog.Popup>
        </>
    );
};
