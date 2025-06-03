import React from "react";

import { Check } from "@mui/icons-material";
import { isEqual } from "lodash";
import { v4 } from "uuid";

import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import type { ColorSet } from "@lib/utils/ColorSet";

import { LoadingOverlay } from "../LoadingOverlay";

import { EnsemblePicker } from "./private-components/EnsemblePicker";
import { EnsembleTables } from "./private-components/EnsembleTables";
import type { DeltaEnsembleItem, InternalDeltaEnsembleItem, RegularEnsembleItem } from "./types";
import { isSameEnsembleItem } from "./utils";

export type SelectEnsemblesDialogProps = {
    loadAndSetupEnsembles: (
        selectedRegularEnsembles: RegularEnsembleItem[],
        createdDeltaEnsembles: DeltaEnsembleItem[],
    ) => Promise<void>;
    onClose: () => void;
    selectedRegularEnsembles: RegularEnsembleItem[];
    createdDeltaEnsembles: DeltaEnsembleItem[];
    colorSet: ColorSet;
};

export const SelectEnsemblesDialog: React.FC<SelectEnsemblesDialogProps> = (props) => {
    const [isLoadingEnsembles, setIsLoadingEnsembles] = React.useState<boolean>(false);
    const [confirmCancel, setConfirmCancel] = React.useState<boolean>(false);

    const [newlySelectedRegularEnsembles, setNewlySelectedRegularEnsembles] = React.useState<RegularEnsembleItem[]>([]);
    const [deltaEnsembles, setDeltaEnsembles] = React.useState<InternalDeltaEnsembleItem[]>([]);

    React.useLayoutEffect(() => {
        setNewlySelectedRegularEnsembles(props.selectedRegularEnsembles);
    }, [props.selectedRegularEnsembles]);

    React.useLayoutEffect(() => {
        setDeltaEnsembles(
            props.createdDeltaEnsembles.map((elm) => ({
                comparisonEnsemble: elm.comparisonEnsemble,
                referenceEnsemble: elm.referenceEnsemble,
                uuid: v4(),
                color: elm.color,
                customName: elm.customName,
            })),
        );
    }, [props.createdDeltaEnsembles]);

    const nextEnsembleColor = React.useMemo(() => {
        const usedColors = [...newlySelectedRegularEnsembles, ...deltaEnsembles].map((ens) => ens.color);

        for (let i = 0; i < props.colorSet.getColorArray().length; i++) {
            const candidateColor = props.colorSet.getColor(i);

            if (!usedColors.includes(candidateColor)) {
                return candidateColor;
            }
        }

        // Default to an existing color (looping)
        return props.colorSet.getColor(usedColors.length % props.colorSet.getColorArray().length);
    }, [deltaEnsembles, newlySelectedRegularEnsembles, props.colorSet]);

    function handleClose() {
        setConfirmCancel(false);
        props.onClose();
    }

    function handleCancel() {
        if (isEqual(props.selectedRegularEnsembles, newlySelectedRegularEnsembles)) {
            handleClose();
            return;
        }
        setConfirmCancel(true);
    }

    function handleApplyEnsembleSelection() {
        if (deltaEnsembles.some((elm) => !elm.comparisonEnsemble || !elm.referenceEnsemble)) {
            return;
        }

        const validDeltaEnsembles: DeltaEnsembleItem[] = [];
        for (const deltaEnsemble of deltaEnsembles) {
            if (!deltaEnsemble.comparisonEnsemble || !deltaEnsemble.referenceEnsemble) {
                continue;
            }

            // Ensure no duplicate delta ensembles
            if (
                validDeltaEnsembles.some(
                    (elm) =>
                        isEqual(elm.comparisonEnsemble, deltaEnsemble.comparisonEnsemble) &&
                        isEqual(elm.referenceEnsemble, deltaEnsemble.referenceEnsemble),
                )
            ) {
                continue;
            }

            validDeltaEnsembles.push({
                comparisonEnsemble: deltaEnsemble.comparisonEnsemble,
                referenceEnsemble: deltaEnsemble.referenceEnsemble,
                color: deltaEnsemble.color,
                customName: deltaEnsemble.customName,
            });
        }

        setIsLoadingEnsembles(true);
        props
            .loadAndSetupEnsembles(newlySelectedRegularEnsembles, validDeltaEnsembles)
            .then(() => {
                handleClose();
            })
            .finally(() => {
                setIsLoadingEnsembles(false);
            });
    }

    function hasAnyDeltaEnsemblesChanged(): boolean {
        if (props.createdDeltaEnsembles.length !== deltaEnsembles.length) {
            return true;
        }

        const isContentEqual = props.createdDeltaEnsembles.every((elm, idx) => {
            const internalDeltaEnsemble = deltaEnsembles[idx];
            return (
                elm.color === internalDeltaEnsemble.color &&
                elm.customName === internalDeltaEnsemble.customName &&
                isEqual(elm.comparisonEnsemble, internalDeltaEnsemble.comparisonEnsemble) &&
                isEqual(elm.referenceEnsemble, internalDeltaEnsemble.referenceEnsemble)
            );
        });
        return !isContentEqual;
    }

    function areAnyDeltaEnsemblesInvalid(): boolean {
        return deltaEnsembles.some((elm) => !elm.comparisonEnsemble || !elm.referenceEnsemble);
    }

    function hasDuplicateDeltaEnsembles(): boolean {
        const uniqueDeltaEnsembles = new Set<string>();
        for (const elm of deltaEnsembles) {
            if (!elm.comparisonEnsemble || !elm.referenceEnsemble) {
                continue;
            }
            const key = `${elm.comparisonEnsemble.caseUuid}~&&~${elm.comparisonEnsemble.ensembleName}~&&~${elm.referenceEnsemble.caseUuid}~&&~${elm.referenceEnsemble.ensembleName}`;
            if (uniqueDeltaEnsembles.has(key)) {
                return true;
            }
            uniqueDeltaEnsembles.add(key);
        }
        return false;
    }

    function hasAnyRegularEnsembleChanged(): boolean {
        return !isEqual(props.selectedRegularEnsembles, newlySelectedRegularEnsembles);
    }

    function handleAddRegularEnsemble(newItem: RegularEnsembleItem) {
        if (newlySelectedRegularEnsembles.some((i) => isSameEnsembleItem(i, newItem))) return;

        setNewlySelectedRegularEnsembles((prev) => [...prev, newItem]);
    }

    function handleUpdateRegularEnsemble(updatedItem: RegularEnsembleItem) {
        setNewlySelectedRegularEnsembles((prev) => {
            return prev.map((item) => (isSameEnsembleItem(item, updatedItem) ? updatedItem : item));
        });
    }

    function handleRemoveRegularEnsemble(removedItem: RegularEnsembleItem) {
        setNewlySelectedRegularEnsembles((prev) => prev.filter((i) => !isSameEnsembleItem(i, removedItem)));

        removeEnsembleFromDeltaEnsembles(removedItem);
    }

    function removeEnsembleFromDeltaEnsembles(removedEnsemble: RegularEnsembleItem) {
        setDeltaEnsembles((prev) => {
            return prev.map((deltaEnsemble) => {
                const { comparisonEnsemble, referenceEnsemble } = deltaEnsemble;
                if (comparisonEnsemble && isSameEnsembleItem(comparisonEnsemble, removedEnsemble)) {
                    return { ...deltaEnsemble, comparisonEnsemble: null };
                }
                if (referenceEnsemble && isSameEnsembleItem(referenceEnsemble, removedEnsemble)) {
                    return { ...deltaEnsemble, referenceEnsemble: null };
                }
                return deltaEnsemble;
            });
        });
    }

    function handleAddDeltaEnsemble(newItem: InternalDeltaEnsembleItem) {
        setDeltaEnsembles((prev) => [...prev, newItem]);
    }

    function handleUpdateDeltaEnsemble(updatedItem: InternalDeltaEnsembleItem) {
        setDeltaEnsembles((prev) => {
            return prev.map((ens) => (ens.uuid === updatedItem.uuid ? updatedItem : ens));
        });
    }

    function handleRemoveDeltaEnsemble(removedItem: InternalDeltaEnsembleItem) {
        setDeltaEnsembles((prev) => prev.filter((i) => i.uuid !== removedItem.uuid));
    }

    function makeApplyButtonStartIcon() {
        if (isLoadingEnsembles) {
            return <CircularProgress size="small" />;
        }
        return <Check fontSize="small" />;
    }

    return (
        <>
            <Dialog
                open={true}
                onClose={handleCancel}
                title="Select ensembles"
                modal
                width={"75%"}
                minWidth={800}
                height={"75"}
                actions={
                    <div className="flex gap-4">
                        <Button
                            onClick={handleClose}
                            color="danger"
                            disabled={
                                isLoadingEnsembles || !(hasAnyRegularEnsembleChanged() || hasAnyDeltaEnsemblesChanged())
                            }
                        >
                            Discard changes
                        </Button>
                        <div title={hasDuplicateDeltaEnsembles() ? "Duplicate Delta Ensembles (blue rows)" : ""}>
                            <Button
                                onClick={handleApplyEnsembleSelection}
                                disabled={
                                    isLoadingEnsembles ||
                                    areAnyDeltaEnsemblesInvalid() ||
                                    hasDuplicateDeltaEnsembles() ||
                                    !(hasAnyRegularEnsembleChanged() || hasAnyDeltaEnsemblesChanged())
                                }
                                startIcon={makeApplyButtonStartIcon()}
                            >
                                {isLoadingEnsembles ? "Loading ensembles..." : "Apply"}
                            </Button>
                        </div>
                    </div>
                }
                showCloseCross
            >
                <div className="flex gap-4 max-w-full">
                    <EnsemblePicker
                        nextEnsembleColor={nextEnsembleColor}
                        selectedEnsembles={newlySelectedRegularEnsembles}
                        onAddEnsemble={handleAddRegularEnsemble}
                    />
                    <div className="flex flex-col grow max-h-full gap-4 p-4">
                        <EnsembleTables
                            nextEnsembleColor={nextEnsembleColor}
                            regularEnsembles={newlySelectedRegularEnsembles}
                            deltaEnsembles={deltaEnsembles}
                            onAddDeltaEnsemble={handleAddDeltaEnsemble}
                            onUpdateDeltaEnsemble={handleUpdateDeltaEnsemble}
                            onRemoveDeltaEnsemble={handleRemoveDeltaEnsemble}
                            onUpdateRegularEnsemble={handleUpdateRegularEnsemble}
                            onRemoveRegularEnsemble={handleRemoveRegularEnsemble}
                        />
                    </div>
                </div>
                {isLoadingEnsembles && <LoadingOverlay />}
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
