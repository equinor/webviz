import React from "react";

import { Check, ChevronRight } from "@mui/icons-material";
import { isEqual } from "lodash";

import type { EnsembleSet } from "@framework/EnsembleSet";
import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { LoadingOverlay } from "../LoadingOverlay";

import { useResponsiveDialogSizePercent } from "./_hooks";
import {
    makeDeltaEnsembleSettingsFromEnsembleSet,
    makeHashFromDeltaEnsemble,
    makeHashFromSelectedEnsembles,
    makeSelectableEnsemblesForDeltaFromEnsembleSet,
    makeRegularEnsembleSettingsFromEnsembleSet,
    makeUserEnsembleSettingsFromInternal,
    makeValidUserDeltaEnsembleSettingsFromInternal,
} from "./_utils";
import { EnsembleExplorer } from "./private-components/EnsembleExplorer";
import { EnsembleTables } from "./private-components/EnsembleTables/EnsembleTables";
import type { EnsembleIdentWithCaseName, InternalDeltaEnsembleSetting, InternalRegularEnsembleSetting } from "./types";

enum EnsembleExplorerMode {
    ADD_REGULAR_ENSEMBLE = "addRegularEnsemble",
    SELECT_OTHER_COMPARISON_ENSEMBLE = "selectOtherComparisonEnsemble",
    SELECT_OTHER_REFERENCE_ENSEMBLE = "selectOtherReferenceEnsemble",
}

export type SelectEnsemblesDialogProps = {
    workbench: Workbench;
};

export const SelectEnsemblesDialog: React.FC<SelectEnsemblesDialogProps> = (props) => {
    const [prevEnsembleSet, setPrevEnsembleSet] = React.useState<EnsembleSet | null>(null);
    const [hash, setHash] = React.useState<string>("");
    const [isOpen, setIsOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.EnsembleDialogOpen);
    const [confirmCancel, setConfirmCancel] = React.useState<boolean>(false);

    const [showEnsembleExplorer, setShowEnsembleExplorer] = React.useState<boolean>(false);
    const [ensembleExplorerMode, setEnsembleExplorerMode] = React.useState<EnsembleExplorerMode | null>(null);

    const [deltaEnsembleUuidToEdit, setDeltaEnsembleUuidToEdit] = React.useState<string>("");
    const [selectedRegularEnsembles, setSelectedRegularEnsembles] = React.useState<InternalRegularEnsembleSetting[]>(
        [],
    );
    const [selectedDeltaEnsembles, setSelectedDeltaEnsembles] = React.useState<InternalDeltaEnsembleSetting[]>([]);

    // List of selectable ensembles available for comparison or reference in delta ensembles
    const [selectableEnsemblesForDelta, setSelectableEnsemblesForDelta] = React.useState<EnsembleIdentWithCaseName[]>(
        [],
    );

    const workbenchSession = props.workbench.getWorkbenchSession();

    const ensembleSet = usePublishSubscribeTopicValue(workbenchSession, WorkbenchSessionTopic.ENSEMBLE_SET);
    const isEnsembleSetLoading = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.IS_ENSEMBLE_SET_LOADING,
    );

    const dialogSizePercent = useResponsiveDialogSizePercent();
    const colorSet = useColorSet(props.workbench.getWorkbenchSession().getWorkbenchSettings());
    const currentHash = makeHashFromSelectedEnsembles(selectedRegularEnsembles, selectedDeltaEnsembles);

    const setEnsembleStatesFromEnsembleSet = React.useCallback(() => {
        if (!ensembleSet) {
            return;
        }

        const regularEnsembles = makeRegularEnsembleSettingsFromEnsembleSet(ensembleSet);
        const deltaEnsembles = makeDeltaEnsembleSettingsFromEnsembleSet(ensembleSet);
        const selectableEnsembles = makeSelectableEnsemblesForDeltaFromEnsembleSet(ensembleSet);

        setSelectedRegularEnsembles(regularEnsembles);
        setSelectedDeltaEnsembles(deltaEnsembles);
        setSelectableEnsemblesForDelta(selectableEnsembles);
        setHash(makeHashFromSelectedEnsembles(regularEnsembles, deltaEnsembles));
    }, [ensembleSet]);

    // Initialize states from ensemble set
    if (!isEqual(prevEnsembleSet, ensembleSet)) {
        setPrevEnsembleSet(ensembleSet);
        setEnsembleStatesFromEnsembleSet();
    }

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

    const handleClose = React.useCallback(
        function handleClose() {
            // Reset states when discard/close
            setEnsembleStatesFromEnsembleSet();
            setConfirmCancel(false);
            setIsOpen(false);
            setShowEnsembleExplorer(false);
        },
        [setEnsembleStatesFromEnsembleSet, setConfirmCancel, setIsOpen, setShowEnsembleExplorer],
    );

    function handleCancel() {
        if (currentHash === hash) {
            handleClose();
            return;
        }
        setConfirmCancel(true);
    }

    function handleApplyEnsembleSelection() {
        if (selectedDeltaEnsembles.some((elm) => !elm.comparisonEnsembleIdent || !elm.referenceEnsembleIdent)) {
            return;
        }

        const regularEnsembleSettings = makeUserEnsembleSettingsFromInternal(selectedRegularEnsembles);
        const deltaEnsembleSettings = makeValidUserDeltaEnsembleSettingsFromInternal(selectedDeltaEnsembles);

        workbenchSession.loadAndSetupEnsembleSet(regularEnsembleSettings, deltaEnsembleSettings).then(() => {
            setIsOpen(false);
        });
    }

    function areAnyDeltaEnsemblesInvalid(): boolean {
        return selectedDeltaEnsembles.some((el) => !el.comparisonEnsembleIdent || !el.referenceEnsembleIdent);
    }

    function hasDuplicateDeltaEnsembles(): boolean {
        const uniqueDeltaEnsembles = new Set<string>();
        for (const el of selectedDeltaEnsembles) {
            if (!el.comparisonEnsembleIdent || !el.referenceEnsembleIdent) {
                continue;
            }
            const key = makeHashFromDeltaEnsemble(el);
            if (uniqueDeltaEnsembles.has(key)) {
                return true;
            }
            uniqueDeltaEnsembles.add(key);
        }
        return false;
    }

    function handleCloseEnsembleExplorer() {
        setShowEnsembleExplorer(false);
        setEnsembleExplorerMode(null);
    }

    function handleSelectEnsemble(newItem: InternalRegularEnsembleSetting) {
        if (ensembleExplorerMode === EnsembleExplorerMode.ADD_REGULAR_ENSEMBLE) {
            addSelectedRegularEnsemble(newItem);
            return;
        }

        const deltaEnsembleToEdit = selectedDeltaEnsembles.find((el) => el.uuid === deltaEnsembleUuidToEdit);
        if (!deltaEnsembleToEdit) {
            throw new Error("Could not find delta ensemble to edit from current uuid to edit.");
        }

        // Add to selectable ensembles if not already among selected or selectable ensembles
        if (
            !selectedRegularEnsembles.some((el) => el.ensembleIdent.equals(newItem.ensembleIdent)) &&
            !selectableEnsemblesForDelta.some((el) => el.ensembleIdent.equals(newItem.ensembleIdent))
        ) {
            setSelectableEnsemblesForDelta((prev) => [
                ...prev,
                {
                    ensembleIdent: newItem.ensembleIdent,
                    caseName: newItem.caseName,
                },
            ]);
        }

        const selectComparison = ensembleExplorerMode === EnsembleExplorerMode.SELECT_OTHER_COMPARISON_ENSEMBLE;
        const selectReference = ensembleExplorerMode === EnsembleExplorerMode.SELECT_OTHER_REFERENCE_ENSEMBLE;

        const editedDeltaEnsemble = {
            ...deltaEnsembleToEdit,
            comparisonEnsembleIdent: selectComparison
                ? newItem.ensembleIdent
                : (deltaEnsembleToEdit.comparisonEnsembleIdent ?? null),
            referenceEnsembleIdent: selectReference
                ? newItem.ensembleIdent
                : (deltaEnsembleToEdit.referenceEnsembleIdent ?? null),
        };

        setSelectedDeltaEnsembles((prev) => {
            return prev.map((ens) => (ens.uuid === editedDeltaEnsemble.uuid ? editedDeltaEnsemble : ens));
        });
        setShowEnsembleExplorer(false);
        setEnsembleExplorerMode(null);
    }

    function addSelectedRegularEnsemble(newItem: InternalRegularEnsembleSetting) {
        if (selectedRegularEnsembles.some((el) => el.ensembleIdent.equals(newItem.ensembleIdent))) {
            return;
        }

        // Add to selected regular ensembles
        setSelectedRegularEnsembles((prev) => [...prev, newItem]);

        // Add to list of selectable ensembles if not already present
        if (!selectableEnsemblesForDelta.some((el) => el.ensembleIdent.equals(newItem.ensembleIdent))) {
            setSelectableEnsemblesForDelta((prev) => [
                ...prev,
                {
                    ensembleIdent: newItem.ensembleIdent,
                    caseName: newItem.caseName,
                },
            ]);
        }
    }

    function handleExploreRegularEnsemble() {
        setEnsembleExplorerMode(EnsembleExplorerMode.ADD_REGULAR_ENSEMBLE);
        setShowEnsembleExplorer(true);
    }

    function handleUpdateRegularEnsemble(updatedItem: InternalRegularEnsembleSetting) {
        const updatedRegularEnsembles = selectedRegularEnsembles.map((el) => {
            if (el.ensembleIdent.equals(updatedItem.ensembleIdent)) {
                return {
                    ...el,
                    customName: updatedItem.customName,
                    color: updatedItem.color,
                };
            }
            return el;
        });

        setSelectedRegularEnsembles(updatedRegularEnsembles);
    }

    function handleRemoveRegularEnsemble(removedItem: InternalRegularEnsembleSetting) {
        setSelectedRegularEnsembles((prev) => prev.filter((el) => !el.ensembleIdent.equals(removedItem.ensembleIdent)));
    }

    function handleAddDeltaEnsemble(newItem: InternalDeltaEnsembleSetting) {
        setSelectedDeltaEnsembles((prev) => [...prev, newItem]);
    }

    function handleUpdateDeltaEnsemble(updatedItem: InternalDeltaEnsembleSetting) {
        setSelectedDeltaEnsembles((prev) => {
            return prev.map((ens) => (ens.uuid === updatedItem.uuid ? updatedItem : ens));
        });
    }

    function handleOnRequestOtherComparisonEnsemble(item: InternalDeltaEnsembleSetting) {
        setSelectedDeltaEnsembles((prev) =>
            prev.map((ens) => {
                if (ens.uuid !== item.uuid) {
                    return ens;
                }

                setEnsembleExplorerMode(EnsembleExplorerMode.SELECT_OTHER_COMPARISON_ENSEMBLE);
                setDeltaEnsembleUuidToEdit(item.uuid);
                setShowEnsembleExplorer(true);
                return item;
            }),
        );
    }

    function handleOnRequestOtherReferenceEnsemble(item: InternalDeltaEnsembleSetting) {
        setSelectedDeltaEnsembles((prev) =>
            prev.map((ens) => {
                if (ens.uuid !== item.uuid) {
                    return ens;
                }

                setEnsembleExplorerMode(EnsembleExplorerMode.SELECT_OTHER_REFERENCE_ENSEMBLE);
                setDeltaEnsembleUuidToEdit(item.uuid);
                setShowEnsembleExplorer(true);
                return item;
            }),
        );
    }

    function handleRemoveDeltaEnsemble(removedItem: InternalDeltaEnsembleSetting) {
        setSelectedDeltaEnsembles((prev) => prev.filter((i) => i.uuid !== removedItem.uuid));
    }

    function handleMoveRegularEnsemble(movedEnsemble: InternalRegularEnsembleSetting, newIndex: number) {
        const currentIndex = selectedRegularEnsembles.findIndex((el) =>
            el.ensembleIdent.equals(movedEnsemble.ensembleIdent),
        );
        if (currentIndex === -1 || currentIndex === newIndex) {
            return;
        }

        const newOrder = [...selectedRegularEnsembles];
        newOrder.splice(currentIndex, 1);
        newOrder.splice(newIndex, 0, movedEnsemble);

        setSelectedRegularEnsembles(newOrder);
    }

    function handleMoveDeltaEnsemble(movedEnsemble: InternalDeltaEnsembleSetting, newIndex: number) {
        const currentIndex = selectedDeltaEnsembles.findIndex((el) => el.uuid === movedEnsemble.uuid);
        if (currentIndex === -1 || currentIndex === newIndex) {
            return;
        }

        const newOrder = [...selectedDeltaEnsembles];
        newOrder.splice(currentIndex, 1);
        newOrder.splice(newIndex, 0, movedEnsemble);

        setSelectedDeltaEnsembles(newOrder);
    }

    function makeApplyButtonStartIcon() {
        if (isEnsembleSetLoading) {
            return <CircularProgress size="small" />;
        }
        return <Check fontSize="small" />;
    }

    const dialogTitle: React.ReactNode = React.useMemo(() => {
        if (showEnsembleExplorer) {
            let explorerTitle = "Add Ensemble";
            if (ensembleExplorerMode === EnsembleExplorerMode.SELECT_OTHER_REFERENCE_ENSEMBLE) {
                explorerTitle = "Select Reference Ensemble";
            } else if (ensembleExplorerMode === EnsembleExplorerMode.SELECT_OTHER_COMPARISON_ENSEMBLE) {
                explorerTitle = "Select Comparison Ensemble";
            }

            return (
                <div className="flex items-center space-x-1">
                    <span
                        className="pl-2 text-slate-400 hover:bg-gray-100 hover:text-slate-500 rounded-md cursor-pointer"
                        onClick={handleCloseEnsembleExplorer}
                    >
                        Selected Ensembles
                        <ChevronRight />
                    </span>
                    <span className="text-black"> {explorerTitle}</span>
                </div>
            );
        }

        return <div className="pl-2">Selected Ensembles</div>;
    }, [showEnsembleExplorer, ensembleExplorerMode]);

    const hasAnyChanges = hash !== currentHash;

    return (
        <>
            <Dialog
                open={isOpen}
                onClose={handleCancel}
                title={dialogTitle}
                modal
                showCloseCross
                width={`${dialogSizePercent.width}%`}
                height={`${dialogSizePercent.height}%`}
                maxWidth={"100%"}
                minWidth={800}
                minHeight={600}
                actions={
                    <div className="flex gap-4">
                        <Button onClick={handleClose} color="danger" disabled={isEnsembleSetLoading || !hasAnyChanges}>
                            Discard changes
                        </Button>
                        <div title={hasDuplicateDeltaEnsembles() ? "Duplicate Delta Ensembles (marked blue)" : ""}>
                            <Button
                                onClick={handleApplyEnsembleSelection}
                                disabled={
                                    isEnsembleSetLoading ||
                                    areAnyDeltaEnsemblesInvalid() ||
                                    hasDuplicateDeltaEnsembles() ||
                                    !hasAnyChanges
                                }
                                startIcon={makeApplyButtonStartIcon()}
                            >
                                {isEnsembleSetLoading ? "Loading ensembles..." : "Apply"}
                            </Button>
                        </div>
                    </div>
                }
                drawer={{
                    open: showEnsembleExplorer,
                    onClose: handleCloseEnsembleExplorer,
                    width: "85%",
                    content: (
                        <EnsembleExplorer
                            nextEnsembleColor={nextEnsembleColor}
                            selectedEnsembles={
                                ensembleExplorerMode === EnsembleExplorerMode.ADD_REGULAR_ENSEMBLE
                                    ? selectedRegularEnsembles
                                    : []
                            }
                            onSelectEnsemble={handleSelectEnsemble}
                            selectButtonLabel={
                                ensembleExplorerMode === EnsembleExplorerMode.ADD_REGULAR_ENSEMBLE
                                    ? "Add Ensemble"
                                    : "Select Ensemble"
                            }
                            onRequestClose={handleCloseEnsembleExplorer}
                        />
                    ),
                }}
            >
                <div className="relative flex flex-col w-full h-full">
                    <EnsembleTables
                        nextEnsembleColor={nextEnsembleColor}
                        selectedRegularEnsembles={selectedRegularEnsembles}
                        selectedDeltaEnsembles={selectedDeltaEnsembles}
                        selectableEnsemblesForDelta={selectableEnsemblesForDelta}
                        onAddRegularEnsemble={handleExploreRegularEnsemble}
                        onUpdateRegularEnsemble={handleUpdateRegularEnsemble}
                        onRemoveRegularEnsemble={handleRemoveRegularEnsemble}
                        onMoveRegularEnsemble={handleMoveRegularEnsemble}
                        onCreateDeltaEnsemble={handleAddDeltaEnsemble}
                        onUpdateDeltaEnsemble={handleUpdateDeltaEnsemble}
                        onRemoveDeltaEnsemble={handleRemoveDeltaEnsemble}
                        onMoveDeltaEnsemble={handleMoveDeltaEnsemble}
                        onRequestOtherComparisonEnsemble={handleOnRequestOtherComparisonEnsemble}
                        onRequestOtherReferenceEnsemble={handleOnRequestOtherReferenceEnsemble}
                    />
                </div>
                {isEnsembleSetLoading && <LoadingOverlay text="Loading ensembles..." />}
            </Dialog>
            <Dialog
                open={confirmCancel}
                onClose={() => setConfirmCancel(false)}
                title="Unsaved changes"
                modal
                actions={
                    <div className="flex gap-4">
                        <Button onClick={() => setConfirmCancel(false)}>No, don&apos;t cancel</Button>
                        <Button onClick={handleClose} color="danger">
                            Yes, cancel
                        </Button>
                    </div>
                }
            >
                You have unsaved changes which will be lost. Are you sure you want to cancel?
            </Dialog>
        </>
    );
};
