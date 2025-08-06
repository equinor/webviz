import React from "react";

import { Check } from "@mui/icons-material";
import { isEqual } from "lodash";

import type { EnsembleSet } from "@framework/EnsembleSet";
import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { UserDeltaEnsembleSetting, UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { useColorSet } from "@framework/WorkbenchSettings";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { LoadingOverlay } from "../LoadingOverlay";

import {
    makeDeltaEnsembleSettingsFromEnsembleSet,
    makeHashFromDeltaEnsemble,
    makeHashFromSelectedEnsembles,
    makePreviouslyExploredRegularEnsembleInfosFromEnsembleSet,
    makeRegularEnsembleSettingsFromEnsembleSet,
} from "./_utils";
import { EnsemblePicker } from "./private-components/EnsemblePicker";
import { EnsembleTables } from "./private-components/EnsembleTables";
import type {
    ExploredRegularEnsembleInfo,
    InternalDeltaEnsembleSetting,
    InternalRegularEnsembleSetting,
} from "./types";

enum EnsemblePickerMode {
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

    const [showEnsemblePicker, setShowEnsemblePicker] = React.useState<boolean>(false);
    const [ensemblePickerMode, setEnsemblePickerMode] = React.useState<EnsemblePickerMode | null>(null);

    const [deltaEnsembleUuidToEdit, setDeltaEnsembleUuidToEdit] = React.useState<string>("");
    const [selectedRegularEnsembles, setSelectedRegularEnsembles] = React.useState<InternalRegularEnsembleSetting[]>(
        [],
    );
    const [selectedDeltaEnsembles, setSelectedDeltaEnsembles] = React.useState<InternalDeltaEnsembleSetting[]>([]);

    // List of info for ensembles available for comparison or reference in delta ensembles, but not among the selected regular ensembles.
    const [previouslyExploredEnsembles, setPreviouslyExploredEnsembles] = React.useState<ExploredRegularEnsembleInfo[]>(
        [],
    );

    const workbenchSession = props.workbench.getWorkbenchSession();

    const ensembleSet = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.ENSEMBLE_SET);
    const isEnsembleSetLoading = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.IS_ENSEMBLE_SET_LOADING,
    );

    const colorSet = useColorSet(props.workbench.getWorkbenchSession().getWorkbenchSettings());
    const currentHash = makeHashFromSelectedEnsembles(selectedRegularEnsembles, selectedDeltaEnsembles);

    if (!isEqual(prevEnsembleSet, ensembleSet)) {
        setPrevEnsembleSet(ensembleSet);

        const regularEnsembles = makeRegularEnsembleSettingsFromEnsembleSet(ensembleSet);
        const deltaEnsembles = makeDeltaEnsembleSettingsFromEnsembleSet(ensembleSet);
        const prevExploredRegularEnsembles = makePreviouslyExploredRegularEnsembleInfosFromEnsembleSet(ensembleSet);

        setSelectedRegularEnsembles(regularEnsembles);
        setSelectedDeltaEnsembles(deltaEnsembles);
        setPreviouslyExploredEnsembles(prevExploredRegularEnsembles);
        setHash(makeHashFromSelectedEnsembles(regularEnsembles, deltaEnsembles));
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

    function handleClose() {
        setConfirmCancel(false);
        setIsOpen(false);
    }

    function handleCancel() {
        if (currentHash === hash) {
            handleClose();
            return;
        }
        setConfirmCancel(true);
    }

    function handleApplyEnsembleSelection() {
        // Highlight invalid delta ensembles?
        if (selectedDeltaEnsembles.some((elm) => !elm.comparisonEnsembleIdent || !elm.referenceEnsembleIdent)) {
            return;
        }

        const validDeltaEnsembles: UserDeltaEnsembleSetting[] = [];
        for (const deltaEnsemble of selectedDeltaEnsembles) {
            if (!deltaEnsemble.comparisonEnsembleIdent || !deltaEnsemble.referenceEnsembleIdent) {
                continue;
            }

            // Ensure no duplicate delta ensembles
            if (
                validDeltaEnsembles.some(
                    (elm) =>
                        isEqual(elm.comparisonEnsembleIdent, deltaEnsemble.comparisonEnsembleIdent) &&
                        isEqual(elm.referenceEnsembleIdent, deltaEnsemble.referenceEnsembleIdent),
                )
            ) {
                continue;
            }

            validDeltaEnsembles.push({
                comparisonEnsembleIdent: deltaEnsemble.comparisonEnsembleIdent,
                referenceEnsembleIdent: deltaEnsemble.referenceEnsembleIdent,
                color: deltaEnsemble.color,
                customName: deltaEnsemble.customName,
            });
        }

        workbenchSession.loadAndSetupEnsembleSet(selectedRegularEnsembles, validDeltaEnsembles).then(() => {
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

    function handleCloseEnsemblePicker() {
        setShowEnsemblePicker(false);
        setEnsemblePickerMode(null);
    }

    function handlePickEnsemble(newItem: InternalRegularEnsembleSetting) {
        if (ensemblePickerMode === EnsemblePickerMode.ADD_REGULAR_ENSEMBLE) {
            handleAddSelectedRegularEnsemble(newItem);
            return;
        }

        const deltaEnsembleToEdit = selectedDeltaEnsembles.find((el) => el.uuid === deltaEnsembleUuidToEdit);
        if (!deltaEnsembleToEdit) {
            throw new Error("Could not find delta ensemble to edit from current uuid to edit.");
        }

        // Add to previously explored ensembles if not already among selected ensemble settings
        if (!selectedRegularEnsembles.some((el) => el.ensembleIdent.equals(newItem.ensembleIdent))) {
            const newExploredEnsembleInfo: ExploredRegularEnsembleInfo = {
                ensembleIdent: newItem.ensembleIdent,
                caseName: newItem.caseName,
            };
            setPreviouslyExploredEnsembles((prev) => [...prev, newExploredEnsembleInfo]);
        }

        const pickComparison = ensemblePickerMode === EnsemblePickerMode.SELECT_OTHER_COMPARISON_ENSEMBLE;
        const pickReference = ensemblePickerMode === EnsemblePickerMode.SELECT_OTHER_REFERENCE_ENSEMBLE;

        const editedDeltaEnsemble = {
            ...deltaEnsembleToEdit,
            comparisonEnsembleIdent: pickComparison
                ? newItem.ensembleIdent
                : (deltaEnsembleToEdit.comparisonEnsembleIdent ?? null),
            referenceEnsembleIdent: pickReference
                ? newItem.ensembleIdent
                : (deltaEnsembleToEdit.referenceEnsembleIdent ?? null),
        };

        setSelectedDeltaEnsembles((prev) => {
            return prev.map((ens) => (ens.uuid === editedDeltaEnsemble.uuid ? editedDeltaEnsemble : ens));
        });
        setShowEnsemblePicker(false);
        setEnsemblePickerMode(null);
    }

    // function handlePickRegularEnsemble(newItem: InternalRegularEnsembleSetting) {
    function handleAddSelectedRegularEnsemble(newItem: InternalRegularEnsembleSetting) {
        if (selectedRegularEnsembles.some((el) => el.ensembleIdent.equals(newItem.ensembleIdent))) {
            return;
        }

        // Add to selected regular ensembles, remove from explored ensemble infos if it exists there
        setSelectedRegularEnsembles((prev) => [...prev, newItem]);
        setPreviouslyExploredEnsembles((prev) => prev.filter((el) => !el.ensembleIdent.equals(newItem.ensembleIdent)));
    }

    function handleAddRegularEnsemble() {
        setEnsemblePickerMode(EnsemblePickerMode.ADD_REGULAR_ENSEMBLE);
        setShowEnsemblePicker(true);
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

    function handleRemoveRegularEnsemble(removedItem: UserEnsembleSetting) {
        setSelectedRegularEnsembles((prev) => prev.filter((el) => !el.ensembleIdent.equals(removedItem.ensembleIdent)));

        removeEnsembleFromDeltaEnsembles(removedItem);
    }

    function removeEnsembleFromDeltaEnsembles(removedEnsemble: UserEnsembleSetting) {
        setSelectedDeltaEnsembles((prev) => {
            return prev.map((deltaEnsemble) => {
                const { comparisonEnsembleIdent, referenceEnsembleIdent } = deltaEnsemble;
                if (comparisonEnsembleIdent && comparisonEnsembleIdent.equals(removedEnsemble.ensembleIdent)) {
                    return { ...deltaEnsemble, comparisonEnsembleIdent: null };
                }
                if (referenceEnsembleIdent && referenceEnsembleIdent.equals(removedEnsemble.ensembleIdent)) {
                    return { ...deltaEnsemble, referenceEnsembleIdent: null };
                }
                return deltaEnsemble;
            });
        });
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

                setEnsemblePickerMode(EnsemblePickerMode.SELECT_OTHER_COMPARISON_ENSEMBLE);
                setDeltaEnsembleUuidToEdit(item.uuid);
                setShowEnsemblePicker(true);
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

                setEnsemblePickerMode(EnsemblePickerMode.SELECT_OTHER_REFERENCE_ENSEMBLE);
                setDeltaEnsembleUuidToEdit(item.uuid);
                setShowEnsemblePicker(true);
                return item;
            }),
        );
    }

    function handleRemoveDeltaEnsemble(removedItem: InternalDeltaEnsembleSetting) {
        setSelectedDeltaEnsembles((prev) => prev.filter((i) => i.uuid !== removedItem.uuid));
    }

    function makeApplyButtonStartIcon() {
        if (isEnsembleSetLoading) {
            return <CircularProgress size="small" />;
        }
        return <Check fontSize="small" />;
    }

    const hasAnyChanges = hash !== currentHash;
    return (
        <>
            <Dialog
                open={isOpen}
                onClose={handleCancel}
                title="Selected ensembles"
                modal
                width={"75%"}
                minWidth={800}
                height={"75%"}
                actions={
                    <div className="flex gap-4">
                        <Button onClick={handleClose} color="danger" disabled={isEnsembleSetLoading || !hasAnyChanges}>
                            Discard changes
                        </Button>
                        <div title={hasDuplicateDeltaEnsembles() ? "Duplicate Delta Ensembles (blue rows)" : ""}>
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
                showCloseCross
            >
                <div className="relative flex flex-col w-full h-full">
                    <EnsembleTables
                        nextEnsembleColor={nextEnsembleColor}
                        selectedRegularEnsembles={selectedRegularEnsembles}
                        exploredRegularEnsembleInfos={previouslyExploredEnsembles}
                        selectedDeltaEnsembles={selectedDeltaEnsembles}
                        onCreateDeltaEnsemble={handleAddDeltaEnsemble}
                        onUpdateDeltaEnsemble={handleUpdateDeltaEnsemble}
                        onRemoveDeltaEnsemble={handleRemoveDeltaEnsemble}
                        onAddRegularEnsemble={handleAddRegularEnsemble}
                        onUpdateRegularEnsemble={handleUpdateRegularEnsemble}
                        onRequestOtherComparisonEnsemble={handleOnRequestOtherComparisonEnsemble}
                        onRequestOtherReferenceEnsemble={handleOnRequestOtherReferenceEnsemble}
                        onRemoveRegularEnsemble={handleRemoveRegularEnsemble}
                    />
                </div>
                {isEnsembleSetLoading && <LoadingOverlay text="Loading ensembles..." />}
            </Dialog>
            <Dialog
                open={showEnsemblePicker}
                title="Explore Ensembles"
                showCloseCross
                modal
                onClose={handleCloseEnsemblePicker}
                width={"70%"}
                minWidth={600}
                height={"75%"}
            >
                <EnsemblePicker
                    nextEnsembleColor={nextEnsembleColor}
                    selectedEnsembles={
                        ensemblePickerMode === EnsemblePickerMode.ADD_REGULAR_ENSEMBLE ? selectedRegularEnsembles : []
                    }
                    onPickEnsemble={handlePickEnsemble}
                    pickButtonLabel={
                        ensemblePickerMode === EnsemblePickerMode.ADD_REGULAR_ENSEMBLE
                            ? "Add Ensemble"
                            : "Select Ensemble"
                    }
                />
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
