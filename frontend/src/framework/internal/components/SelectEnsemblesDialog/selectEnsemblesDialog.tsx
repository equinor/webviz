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
    makeRegularEnsembleSettingsFromEnsembleSet,
} from "./_utils";
import { EnsemblePicker } from "./private-components/EnsemblePicker";
import { EnsembleTables } from "./private-components/EnsembleTables";
import type { InternalDeltaEnsembleSetting, InternalRegularEnsembleSetting } from "./types";

export type SelectEnsemblesDialogProps = {
    workbench: Workbench;
};

export const SelectEnsemblesDialog: React.FC<SelectEnsemblesDialogProps> = (props) => {
    const [prevEnsembleSet, setPrevEnsembleSet] = React.useState<EnsembleSet | null>(null);
    const [hash, setHash] = React.useState<string>("");
    const [isOpen, setIsOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.EnsembleDialogOpen);
    const [confirmCancel, setConfirmCancel] = React.useState<boolean>(false);

    const [selectedRegularEnsembles, setSelectedRegularEnsembles] = React.useState<InternalRegularEnsembleSetting[]>(
        [],
    );
    const [selectedDeltaEnsembles, setSelectedDeltaEnsembles] = React.useState<InternalDeltaEnsembleSetting[]>([]);

    const workbenchSession = props.workbench.getWorkbenchSession();

    const ensembleSet = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.ENSEMBLE_SET);
    const isEnsembleSetLoading = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.IS_ENSEMBLE_SET_LOADING,
    );

    const colorSet = useColorSet(props.workbench.getWorkbenchSettings());
    const currentHash = makeHashFromSelectedEnsembles(selectedRegularEnsembles, selectedDeltaEnsembles);

    if (!isEqual(prevEnsembleSet, ensembleSet)) {
        setPrevEnsembleSet(ensembleSet);

        const regularEnsembles = makeRegularEnsembleSettingsFromEnsembleSet(ensembleSet);
        const deltaEnsembles = makeDeltaEnsembleSettingsFromEnsembleSet(ensembleSet);

        setSelectedRegularEnsembles(regularEnsembles);
        setSelectedDeltaEnsembles(deltaEnsembles);
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

    function handleAddRegularEnsemble(newItem: InternalRegularEnsembleSetting) {
        if (selectedRegularEnsembles.some((el) => el.ensembleIdent.equals(newItem.ensembleIdent))) {
            return;
        }

        setSelectedRegularEnsembles((prev) => [...prev, newItem]);
    }

    function handleUpdateRegularEnsemble(updatedItem: InternalRegularEnsembleSetting) {
        setSelectedRegularEnsembles((prev) => {
            return prev.map((el) => (el.ensembleIdent.equals(updatedItem) ? updatedItem : el));
        });
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
                    return { ...deltaEnsemble, comparisonEnsemble: null };
                }
                if (referenceEnsembleIdent && referenceEnsembleIdent.equals(removedEnsemble.ensembleIdent)) {
                    return { ...deltaEnsemble, referenceEnsemble: null };
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
                title="Select ensembles"
                modal
                width={"75%"}
                minWidth={800}
                height={"75"}
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
                <div className="flex gap-4 max-w-full">
                    <EnsemblePicker
                        nextEnsembleColor={nextEnsembleColor}
                        selectedEnsembles={selectedRegularEnsembles}
                        onAddEnsemble={handleAddRegularEnsemble}
                    />
                    <div className="flex flex-col grow max-h-full gap-4 p-4">
                        <EnsembleTables
                            nextEnsembleColor={nextEnsembleColor}
                            regularEnsembles={selectedRegularEnsembles}
                            deltaEnsembles={selectedDeltaEnsembles}
                            onAddDeltaEnsemble={handleAddDeltaEnsemble}
                            onUpdateDeltaEnsemble={handleUpdateDeltaEnsemble}
                            onRemoveDeltaEnsemble={handleRemoveDeltaEnsemble}
                            onUpdateRegularEnsemble={handleUpdateRegularEnsemble}
                            onRemoveRegularEnsemble={handleRemoveRegularEnsemble}
                        />
                    </div>
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
