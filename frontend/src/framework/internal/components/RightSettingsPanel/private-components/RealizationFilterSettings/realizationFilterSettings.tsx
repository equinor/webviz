import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { GuiState, RightDrawerContent, useGuiValue } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import {
    EnsembleRealizationFilter,
    EnsembleRealizationFilterSelections,
} from "@framework/components/EnsembleRealizationFilter/ensembleRealizationFilter";
import { Drawer } from "@framework/internal/components/Drawer";
import { ParameterValueSelection } from "@framework/types/realizationFilterTypes";
import { areParameterIdentStringToValueSelectionReadonlyMapsEqual } from "@framework/utils/realizationFilterTypesUtils";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { FilterAlt } from "@mui/icons-material";

import { isEqual } from "lodash";

export type RealizationFilterSettingsProps = { workbench: Workbench; onClose: () => void };

export const RealizationFilterSettings: React.FC<RealizationFilterSettingsProps> = (props) => {
    const drawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.RightDrawerContent);
    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());
    const realizationFilterSet = props.workbench.getWorkbenchSession().getRealizationFilterSet();

    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
    const [activeFilterEnsembleIdent, setActiveFilterEnsembleIdent] = React.useState<EnsembleIdent | null>(null);

    // Maps for keeping track of unsaved changes and filter selections
    const [ensembleIdentStringHasUnsavedChangesMap, setEnsembleIdentStringHasUnsavedChangesMap] = React.useState<{
        [ensembleIdentString: string]: boolean;
    }>({});
    const [
        ensembleIdentStringToRealizationFilterSelectionsMap,
        setEnsembleIdentStringToRealizationFilterSelectionsMap,
    ] = React.useState<{
        [ensembleIdentString: string]: EnsembleRealizationFilterSelections;
    }>({});

    // Create new maps if ensembles are added or removed
    const ensembleIdentStrings = ensembleSet.getEnsembleArr().map((ensemble) => ensemble.getIdent().toString());
    if (!isEqual(ensembleIdentStrings, Object.keys(ensembleIdentStringToRealizationFilterSelectionsMap))) {
        // Create new maps with the new ensemble ident strings
        const updatedHasUnsavedChangesMap: { [ensembleIdentString: string]: boolean } = {
            ...ensembleIdentStringHasUnsavedChangesMap,
        };
        const updatedSelectionsMap: { [ensembleIdentString: string]: EnsembleRealizationFilterSelections } = {
            ...ensembleIdentStringToRealizationFilterSelectionsMap,
        };

        // Delete non-existing ensemble ident strings
        for (const ensembleIdentString of Object.keys(ensembleIdentStringToRealizationFilterSelectionsMap)) {
            if (!ensembleIdentStrings.includes(ensembleIdentString)) {
                delete updatedHasUnsavedChangesMap[ensembleIdentString];
                delete updatedSelectionsMap[ensembleIdentString];
            }
        }

        for (const ensembleIdentString of ensembleIdentStrings) {
            if (ensembleIdentString in updatedSelectionsMap) {
                // Skip if already exists
                continue;
            }

            const ensembleIdent = EnsembleIdent.fromString(ensembleIdentString);
            const realizationFilter = realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent);

            updatedHasUnsavedChangesMap[ensembleIdentString] = false;
            updatedSelectionsMap[ensembleIdentString] = {
                displayRealizationNumbers: realizationFilter.getFilteredRealizations(),
                realizationNumberSelections: realizationFilter.getRealizationNumberSelections(),
                parameterIdentStringToValueSelectionReadonlyMap:
                    realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap(),
                filterType: realizationFilter.getFilterType(),
                includeOrExcludeFilter: realizationFilter.getIncludeOrExcludeFilter(),
                hasInvalidParameterTag: false,
            };
        }
        setEnsembleIdentStringHasUnsavedChangesMap(updatedHasUnsavedChangesMap);
        setEnsembleIdentStringToRealizationFilterSelectionsMap(updatedSelectionsMap);
    }

    function handleFilterSettingsClose() {
        // Check if there are unsaved changes
        const hasUnsavedChanges = Object.values(ensembleIdentStringHasUnsavedChangesMap).some(
            (hasUnsavedChanges) => hasUnsavedChanges
        );
        if (hasUnsavedChanges) {
            setDialogOpen(true);
        } else {
            props.onClose();
            setActiveFilterEnsembleIdent(null);
        }
    }

    function handleApplyClick(ensembleIdent: EnsembleIdent) {
        const ensembleIdentString = ensembleIdent.toString();
        const realizationFilter = realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent);
        const selections = ensembleIdentStringToRealizationFilterSelectionsMap[ensembleIdentString];

        // Apply the filter changes
        realizationFilter.setFilterType(selections.filterType);
        realizationFilter.setIncludeOrExcludeFilter(selections.includeOrExcludeFilter);
        realizationFilter.setRealizationNumberSelections(selections.realizationNumberSelections);
        realizationFilter.setParameterIdentStringToValueSelectionReadonlyMap(
            selections.parameterIdentStringToValueSelectionReadonlyMap
        );

        // Run filtering
        realizationFilter.runFiltering();

        // Reset the unsaved changes state
        setEnsembleIdentStringHasUnsavedChangesMap({
            ...ensembleIdentStringHasUnsavedChangesMap,
            [ensembleIdentString]: false,
        });

        // Notify subscribers of change.
        props.workbench.getWorkbenchSession().notifyAboutEnsembleRealizationFilterChange();
    }

    function handleApplyAllClick() {
        // Apply all the unsaved changes state and reset the unsaved changes state
        const resetHasUnsavedChangesMap: { [ensembleIdentString: string]: boolean } = {};
        for (const ensembleIdentString of Object.keys(ensembleIdentStringToRealizationFilterSelectionsMap)) {
            const ensembleIdent = EnsembleIdent.fromString(ensembleIdentString);
            const realizationFilter = realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent);
            const selections = ensembleIdentStringToRealizationFilterSelectionsMap[ensembleIdent.toString()];

            // Apply the filter changes
            realizationFilter.setFilterType(selections.filterType);
            realizationFilter.setIncludeOrExcludeFilter(selections.includeOrExcludeFilter);
            realizationFilter.setRealizationNumberSelections(selections.realizationNumberSelections);
            realizationFilter.setParameterIdentStringToValueSelectionReadonlyMap(
                selections.parameterIdentStringToValueSelectionReadonlyMap
            );

            // Run filtering
            realizationFilter.runFiltering();

            // Reset the unsaved changes state
            resetHasUnsavedChangesMap[ensembleIdentString] = false;
        }

        setEnsembleIdentStringHasUnsavedChangesMap(resetHasUnsavedChangesMap);
        setDialogOpen(false);
        props.onClose();
    }

    function handleDiscardClick(ensembleIdent: EnsembleIdent) {
        const ensembleIdentString = ensembleIdent.toString();
        const realizationFilter = realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent);
        setEnsembleIdentStringToRealizationFilterSelectionsMap({
            ...ensembleIdentStringToRealizationFilterSelectionsMap,
            [ensembleIdentString]: {
                displayRealizationNumbers: realizationFilter.getFilteredRealizations(),
                realizationNumberSelections: realizationFilter.getRealizationNumberSelections(),
                parameterIdentStringToValueSelectionReadonlyMap:
                    realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap(),
                filterType: realizationFilter.getFilterType(),
                includeOrExcludeFilter: realizationFilter.getIncludeOrExcludeFilter(),
                hasInvalidParameterTag: false,
            },
        });

        // Reset the unsaved changes state
        setEnsembleIdentStringHasUnsavedChangesMap({
            ...ensembleIdentStringHasUnsavedChangesMap,
            [ensembleIdentString]: false,
        });
    }

    function handleDiscardAllClick() {
        // Discard all filter changes - i.e. reset the unsaved changes state
        const resetSelectionsMap: { [ensembleIdentString: string]: EnsembleRealizationFilterSelections } = {};
        const resetHasUnsavedChangesMap: { [ensembleIdentString: string]: boolean } = {};
        for (const ensembleIdentString of Object.keys(ensembleIdentStringToRealizationFilterSelectionsMap)) {
            const ensembleIdent = EnsembleIdent.fromString(ensembleIdentString);
            const realizationFilter = realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent);

            resetSelectionsMap[ensembleIdentString] = {
                displayRealizationNumbers: realizationFilter.getFilteredRealizations(),
                realizationNumberSelections: realizationFilter.getRealizationNumberSelections(),
                parameterIdentStringToValueSelectionReadonlyMap:
                    realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap(),
                filterType: realizationFilter.getFilterType(),
                includeOrExcludeFilter: realizationFilter.getIncludeOrExcludeFilter(),
                hasInvalidParameterTag: false,
            };
            resetHasUnsavedChangesMap[ensembleIdentString] = false;
        }

        // setEnsembleIdentStringToRealizationFilterSelectionsMap(resetSelectionsMap);
        setEnsembleIdentStringHasUnsavedChangesMap(resetHasUnsavedChangesMap);

        setDialogOpen(false);
        props.onClose();
    }

    function areParameterValueSelectionMapsEqual(
        firstMap: ReadonlyMap<string, ParameterValueSelection> | null,
        secondMap: ReadonlyMap<string, ParameterValueSelection> | null
    ): boolean {
        if (firstMap === null && secondMap === null) {
            return true;
        }

        if (firstMap === null || secondMap === null) {
            return false;
        }

        return areParameterIdentStringToValueSelectionReadonlyMapsEqual(firstMap, secondMap);
    }

    function handleFilterChange(ensembleIdent: EnsembleIdent, selections: EnsembleRealizationFilterSelections) {
        const ensembleIdentString = ensembleIdent.toString();

        // Register the filter changes in the map
        // NOTE: Check if this is sufficient enough - perhaps has to force update as reference is the same?
        setEnsembleIdentStringToRealizationFilterSelectionsMap({
            ...ensembleIdentStringToRealizationFilterSelectionsMap,
            [ensembleIdentString]: selections,
        });

        // Check if the filter changes are different from the original filter
        const realizationFilter = realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent);
        const hasUnsavedChanges =
            !isEqual(selections.realizationNumberSelections, realizationFilter.getRealizationNumberSelections()) ||
            !areParameterValueSelectionMapsEqual(
                selections.parameterIdentStringToValueSelectionReadonlyMap,
                realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap()
            ) ||
            selections.filterType !== realizationFilter.getFilterType() ||
            selections.includeOrExcludeFilter !== realizationFilter.getIncludeOrExcludeFilter();

        // Update the unsaved changes state
        setEnsembleIdentStringHasUnsavedChangesMap({
            ...ensembleIdentStringHasUnsavedChangesMap,
            [ensembleIdentString]: hasUnsavedChanges,
        });
    }

    function handleSetActiveEnsembleRealizationFilter(ensembleIdent: EnsembleIdent) {
        setActiveFilterEnsembleIdent(ensembleIdent);
    }

    function handleOnEnsembleRealizationFilterHeaderClick(ensembleIdent: EnsembleIdent) {
        if (activeFilterEnsembleIdent?.equals(ensembleIdent)) {
            setActiveFilterEnsembleIdent(null);
        }
    }

    return (
        <div className={`w-full ${drawerContent === RightDrawerContent.RealizationFilterSettings ? "h-full" : "h-0"}`}>
            <Drawer
                title="Realization Filter"
                icon={<FilterAlt />}
                visible={drawerContent === RightDrawerContent.RealizationFilterSettings}
                onClose={handleFilterSettingsClose}
            >
                <div className="flex flex-col p-2 gap-4 overflow-y-auto">
                    <div className="flex-grow space-y-4">
                        {ensembleSet.getEnsembleArr().map((ensemble) => {
                            const ensembleIdent = ensemble.getIdent();
                            const isActive =
                                activeFilterEnsembleIdent !== null && activeFilterEnsembleIdent.equals(ensembleIdent);
                            const isAnotherActive = !isActive && activeFilterEnsembleIdent !== null;

                            const selections =
                                ensembleIdentStringToRealizationFilterSelectionsMap[ensembleIdent.toString()];

                            if (!selections) {
                                return null;
                            }
                            return (
                                <EnsembleRealizationFilter
                                    key={ensembleIdent.toString()}
                                    ensembleName={ensemble.getCustomName() ?? ensemble.getDisplayName()}
                                    selections={selections}
                                    hasUnsavedSelections={
                                        ensembleIdentStringHasUnsavedChangesMap[ensembleIdent.toString()]
                                    }
                                    availableEnsembleRealizations={ensemble.getRealizations()}
                                    ensembleParameters={ensemble.getParameters()}
                                    isActive={isActive}
                                    isAnotherFilterActive={isAnotherActive}
                                    onClick={() => handleSetActiveEnsembleRealizationFilter(ensembleIdent)}
                                    onHeaderClick={() => handleOnEnsembleRealizationFilterHeaderClick(ensembleIdent)}
                                    onFilterChange={(newSelections) => handleFilterChange(ensembleIdent, newSelections)}
                                    onApplyClick={() => handleApplyClick(ensembleIdent)}
                                    onDiscardClick={() => handleDiscardClick(ensembleIdent)}
                                />
                            );
                        })}
                    </div>
                    {
                        <Dialog
                            open={dialogOpen}
                            onClose={() => setDialogOpen(false)}
                            title="Unsaved changes"
                            modal
                            showCloseCross={true}
                            actions={
                                <div className="flex gap-4">
                                    <Button onClick={handleApplyAllClick} color="primary">
                                        Save
                                    </Button>
                                    <Button onClick={handleDiscardAllClick} color="danger">
                                        Discard
                                    </Button>
                                </div>
                            }
                        >
                            You have unsaved filter changes which are not applied to their respective ensemble yet. Do
                            you want to save the changes?
                        </Dialog>
                    }
                </div>
            </Drawer>
        </div>
    );
};
