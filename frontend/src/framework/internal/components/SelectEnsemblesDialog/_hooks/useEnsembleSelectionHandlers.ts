import React from "react";

import { createUpdatedDeltaEnsemble } from "../_utils";
import type { EnsembleIdentWithCaseName, InternalDeltaEnsembleSetting, InternalRegularEnsembleSetting } from "../types";

import type { StateTuple } from "./_types";

export enum EnsembleExplorerMode {
    ADD_REGULAR_ENSEMBLE = "addRegularEnsemble",
    SELECT_OTHER_COMPARISON_ENSEMBLE = "selectOtherComparisonEnsemble",
    SELECT_OTHER_REFERENCE_ENSEMBLE = "selectOtherReferenceEnsemble",
}

export type UseEnsembleSelectionHandlersProps = {
    selectedRegularEnsemblesState: StateTuple<InternalRegularEnsembleSetting[]>;
    selectedDeltaEnsemblesState: StateTuple<InternalDeltaEnsembleSetting[]>;
    selectableEnsemblesForDeltaState: StateTuple<EnsembleIdentWithCaseName[]>;
    ensembleExplorerMode: EnsembleExplorerMode | null;
    deltaEnsembleUuidToEdit: string;
    setShowEnsembleExplorer: (show: boolean) => void;
    setEnsembleExplorerMode: (mode: EnsembleExplorerMode | null) => void;
    setDeltaEnsembleUuidToEdit: (uuid: string) => void;
};

export type UseEnsembleSelectionHandlersResult = {
    handleSelectEnsemble: (newItem: InternalRegularEnsembleSetting) => void;
    handleExploreRegularEnsemble: () => void;
    handleUpdateRegularEnsemble: (updatedItem: InternalRegularEnsembleSetting) => void;
    handleRemoveRegularEnsemble: (removedItem: InternalRegularEnsembleSetting) => void;
    handleMoveRegularEnsemble: (movedEnsemble: InternalRegularEnsembleSetting, newIndex: number) => void;
    handleAddDeltaEnsemble: (newItem: InternalDeltaEnsembleSetting) => void;
    handleUpdateDeltaEnsemble: (updatedItem: InternalDeltaEnsembleSetting) => void;
    handleRemoveDeltaEnsemble: (removedItem: InternalDeltaEnsembleSetting) => void;
    handleMoveDeltaEnsemble: (movedEnsemble: InternalDeltaEnsembleSetting, newIndex: number) => void;
    handleOnRequestOtherComparisonEnsemble: (item: InternalDeltaEnsembleSetting) => void;
    handleOnRequestOtherReferenceEnsemble: (item: InternalDeltaEnsembleSetting) => void;
};

/**
 * Hook that manages all ensemble selection handlers
 *
 * Handles add/update/remove/move operations for both regular and delta ensembles
 */
export function useEnsembleSelectionHandlers({
    selectedRegularEnsemblesState,
    selectedDeltaEnsemblesState,
    selectableEnsemblesForDeltaState,
    ensembleExplorerMode,
    deltaEnsembleUuidToEdit,
    setShowEnsembleExplorer,
    setEnsembleExplorerMode,
    setDeltaEnsembleUuidToEdit,
}: UseEnsembleSelectionHandlersProps): UseEnsembleSelectionHandlersResult {
    const [selectedRegularEnsembles, setSelectedRegularEnsembles] = selectedRegularEnsemblesState;
    const [selectedDeltaEnsembles, setSelectedDeltaEnsembles] = selectedDeltaEnsemblesState;
    const [selectableEnsemblesForDelta, setSelectableEnsemblesForDelta] = selectableEnsemblesForDeltaState;

    const handleAddRegularEnsemble = React.useCallback(
        function handleAddRegularEnsemble(newItem: InternalRegularEnsembleSetting) {
            // Check if ensemble is already selected
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
        },
        [
            selectedRegularEnsembles,
            selectableEnsemblesForDelta,
            setSelectedRegularEnsembles,
            setSelectableEnsemblesForDelta,
        ],
    );

    const handleSetComparisonOrReferenceForDeltaEnsemble = React.useCallback(
        function handleSetComparisonOrReferenceForDeltaEnsemble(newItem: InternalRegularEnsembleSetting) {
            // Handle selection for editing delta ensemble - new comparison or reference ensemble selected
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

            const targetEnsemble =
                ensembleExplorerMode === EnsembleExplorerMode.SELECT_OTHER_COMPARISON_ENSEMBLE
                    ? "comparisonEnsemble"
                    : "referenceEnsemble";
            const editedDeltaEnsemble = createUpdatedDeltaEnsemble(deltaEnsembleToEdit, newItem, targetEnsemble);

            setSelectedDeltaEnsembles((prev) => {
                return prev.map((ens) => (ens.uuid === editedDeltaEnsemble.uuid ? editedDeltaEnsemble : ens));
            });
            setShowEnsembleExplorer(false);
            setEnsembleExplorerMode(null);
        },
        [
            selectedDeltaEnsembles,
            deltaEnsembleUuidToEdit,
            selectedRegularEnsembles,
            selectableEnsemblesForDelta,
            setSelectableEnsemblesForDelta,
            ensembleExplorerMode,
            setSelectedDeltaEnsembles,
            setShowEnsembleExplorer,
            setEnsembleExplorerMode,
        ],
    );

    const handleSelectEnsemble = React.useCallback(
        function handleSelectEnsemble(newItem: InternalRegularEnsembleSetting) {
            if (ensembleExplorerMode === EnsembleExplorerMode.ADD_REGULAR_ENSEMBLE) {
                handleAddRegularEnsemble(newItem);
                return;
            }
            handleSetComparisonOrReferenceForDeltaEnsemble(newItem);
        },
        [ensembleExplorerMode, handleAddRegularEnsemble, handleSetComparisonOrReferenceForDeltaEnsemble],
    );

    const handleExploreRegularEnsemble = React.useCallback(
        function handleExploreRegularEnsemble() {
            setEnsembleExplorerMode(EnsembleExplorerMode.ADD_REGULAR_ENSEMBLE);
            setShowEnsembleExplorer(true);
        },
        [setEnsembleExplorerMode, setShowEnsembleExplorer],
    );

    const handleUpdateRegularEnsemble = React.useCallback(
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
        },
        [selectedRegularEnsembles, setSelectedRegularEnsembles],
    );

    const handleRemoveRegularEnsemble = React.useCallback(
        function handleRemoveRegularEnsemble(removedItem: InternalRegularEnsembleSetting) {
            setSelectedRegularEnsembles((prev) =>
                prev.filter((el) => !el.ensembleIdent.equals(removedItem.ensembleIdent)),
            );
        },
        [setSelectedRegularEnsembles],
    );

    const handleMoveRegularEnsemble = React.useCallback(
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
        },
        [selectedRegularEnsembles, setSelectedRegularEnsembles],
    );

    const handleAddDeltaEnsemble = React.useCallback(
        function handleAddDeltaEnsemble(newItem: InternalDeltaEnsembleSetting) {
            setSelectedDeltaEnsembles((prev) => [...prev, newItem]);
        },
        [setSelectedDeltaEnsembles],
    );

    const handleUpdateDeltaEnsemble = React.useCallback(
        function handleUpdateDeltaEnsemble(updatedItem: InternalDeltaEnsembleSetting) {
            setSelectedDeltaEnsembles((prev) => {
                return prev.map((ens) => (ens.uuid === updatedItem.uuid ? updatedItem : ens));
            });
        },
        [setSelectedDeltaEnsembles],
    );

    const handleOnRequestOtherComparisonEnsemble = React.useCallback(
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
        },
        [setSelectedDeltaEnsembles, setEnsembleExplorerMode, setDeltaEnsembleUuidToEdit, setShowEnsembleExplorer],
    );

    const handleOnRequestOtherReferenceEnsemble = React.useCallback(
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
        },
        [setSelectedDeltaEnsembles, setEnsembleExplorerMode, setDeltaEnsembleUuidToEdit, setShowEnsembleExplorer],
    );

    const handleRemoveDeltaEnsemble = React.useCallback(
        function handleRemoveDeltaEnsemble(removedItem: InternalDeltaEnsembleSetting) {
            setSelectedDeltaEnsembles((prev) => prev.filter((i) => i.uuid !== removedItem.uuid));
        },
        [setSelectedDeltaEnsembles],
    );

    const handleMoveDeltaEnsemble = React.useCallback(
        function handleMoveDeltaEnsemble(movedEnsemble: InternalDeltaEnsembleSetting, newIndex: number) {
            const currentIndex = selectedDeltaEnsembles.findIndex((el) => el.uuid === movedEnsemble.uuid);
            if (currentIndex === -1 || currentIndex === newIndex) {
                return;
            }

            const newOrder = [...selectedDeltaEnsembles];
            newOrder.splice(currentIndex, 1);
            newOrder.splice(newIndex, 0, movedEnsemble);

            setSelectedDeltaEnsembles(newOrder);
        },
        [selectedDeltaEnsembles, setSelectedDeltaEnsembles],
    );

    return {
        handleSelectEnsemble,
        handleExploreRegularEnsemble,
        handleUpdateRegularEnsemble,
        handleRemoveRegularEnsemble,
        handleMoveRegularEnsemble,
        handleAddDeltaEnsemble,
        handleUpdateDeltaEnsemble,
        handleRemoveDeltaEnsemble,
        handleMoveDeltaEnsemble,
        handleOnRequestOtherComparisonEnsemble,
        handleOnRequestOtherReferenceEnsemble,
    };
}
