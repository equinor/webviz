import React from "react";

import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import {
    GuiEvent,
    GuiEventPayloads,
    GuiState,
    RightDrawerContent,
    useGuiState,
    useGuiValue,
} from "@framework/GuiMessageBroker";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { Workbench } from "@framework/Workbench";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Drawer } from "@framework/internal/components/Drawer";
import {
    EnsembleRealizationFilter,
    EnsembleRealizationFilterSelections,
} from "@framework/internal/components/EnsembleRealizationFilter";
import { UnsavedChangesAction } from "@framework/types/unsavedChangesAction";
import { countTrueValues } from "@framework/utils/objectUtils";
import { areParameterIdentStringToValueSelectionMapCandidatesEqual } from "@framework/utils/realizationFilterTypesUtils";
import { FilterAlt } from "@mui/icons-material";

import { isEqual } from "lodash";

export type RealizationFilterSettingsProps = { workbench: Workbench; onClose: () => void };

export const RealizationFilterSettings: React.FC<RealizationFilterSettingsProps> = (props) => {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();
    const drawerContent = useGuiValue(guiMessageBroker, GuiState.RightDrawerContent);
    const rightSettingsPanelWidth = useGuiValue(guiMessageBroker, GuiState.RightSettingsPanelWidthInPercent);
    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());
    const realizationFilterSet = props.workbench.getWorkbenchSession().getRealizationFilterSet();
    const [, setNumberOfUnsavedRealizationFilters] = useGuiState(
        guiMessageBroker,
        GuiState.NumberOfUnsavedRealizationFilters
    );

    const [activeFilterEnsembleIdent, setActiveFilterEnsembleIdent] = React.useState<
        RegularEnsembleIdent | DeltaEnsembleIdent | null
    >(null);

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

    // Set no active filter if the settings panel is closed
    if (rightSettingsPanelWidth < 5 && activeFilterEnsembleIdent !== null) {
        setActiveFilterEnsembleIdent(null);
    }

    // Create new maps if ensembles are added or removed
    const ensembleIdentStrings = ensembleSet.getEnsembleArray().map((ensemble) => ensemble.getIdent().toString());
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

            const ensembleIdent = getEnsembleIdentFromString(ensembleIdentString);
            if (!ensembleIdent) {
                throw new Error(`Invalid ensemble ident: ${ensembleIdentString}`);
            }

            const realizationFilter = realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent);

            updatedHasUnsavedChangesMap[ensembleIdentString] = false;
            updatedSelectionsMap[ensembleIdentString] = {
                displayRealizationNumbers: realizationFilter.getFilteredRealizations(),
                realizationNumberSelections: realizationFilter.getRealizationNumberSelections(),
                parameterIdentStringToValueSelectionReadonlyMap:
                    realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap(),
                filterType: realizationFilter.getFilterType(),
                includeOrExcludeFilter: realizationFilter.getIncludeOrExcludeFilter(),
            };
        }
        setEnsembleIdentStringHasUnsavedChangesMap(updatedHasUnsavedChangesMap);
        setEnsembleIdentStringToRealizationFilterSelectionsMap(updatedSelectionsMap);
        setNumberOfUnsavedRealizationFilters(countTrueValues(updatedHasUnsavedChangesMap));
    }

    const handleApplyAllClick = React.useCallback(
        function handleApplyAllClick() {
            // Apply all the unsaved changes state and reset the unsaved changes state
            const resetHasUnsavedChangesMap: { [ensembleIdentString: string]: boolean } = {};
            for (const ensembleIdentString in ensembleIdentStringToRealizationFilterSelectionsMap) {
                const ensembleIdent = getEnsembleIdentFromString(ensembleIdentString);
                if (!ensembleIdent) {
                    throw new Error(`Invalid ensemble ident: ${ensembleIdentString}`);
                }

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
            setNumberOfUnsavedRealizationFilters(0);

            // Notify subscribers of change.
            props.workbench.getWorkbenchSession().notifyAboutEnsembleRealizationFilterChange();
        },
        [
            ensembleIdentStringToRealizationFilterSelectionsMap,
            realizationFilterSet,
            setNumberOfUnsavedRealizationFilters,
            props.workbench,
        ]
    );

    const handleDiscardAllClick = React.useCallback(
        function handleDiscardAllClick() {
            // Discard all filter changes - i.e. reset the unsaved changes state
            const resetSelectionsMap: { [ensembleIdentString: string]: EnsembleRealizationFilterSelections } = {};
            const resetHasUnsavedChangesMap: { [ensembleIdentString: string]: boolean } = {};
            for (const ensembleIdentString in ensembleIdentStringToRealizationFilterSelectionsMap) {
                const ensembleIdent = getEnsembleIdentFromString(ensembleIdentString);
                if (!ensembleIdent) {
                    throw new Error(`Invalid ensemble ident: ${ensembleIdentString}`);
                }

                const realizationFilter = realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent);

                resetSelectionsMap[ensembleIdentString] = {
                    displayRealizationNumbers: realizationFilter.getFilteredRealizations(),
                    realizationNumberSelections: realizationFilter.getRealizationNumberSelections(),
                    parameterIdentStringToValueSelectionReadonlyMap:
                        realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap(),
                    filterType: realizationFilter.getFilterType(),
                    includeOrExcludeFilter: realizationFilter.getIncludeOrExcludeFilter(),
                };
                resetHasUnsavedChangesMap[ensembleIdentString] = false;
            }

            setEnsembleIdentStringToRealizationFilterSelectionsMap(resetSelectionsMap);
            setEnsembleIdentStringHasUnsavedChangesMap(resetHasUnsavedChangesMap);
            setNumberOfUnsavedRealizationFilters(0);
        },
        [
            ensembleIdentStringToRealizationFilterSelectionsMap,
            realizationFilterSet,
            setNumberOfUnsavedRealizationFilters,
        ]
    );

    React.useEffect(() => {
        function handleUnsavedChangesAction(
            payload: GuiEventPayloads[GuiEvent.UnsavedRealizationFilterSettingsAction]
        ) {
            if (payload.action === UnsavedChangesAction.Save) {
                handleApplyAllClick();
                setActiveFilterEnsembleIdent(null);
            } else if (payload.action === UnsavedChangesAction.Discard) {
                handleDiscardAllClick();
                setActiveFilterEnsembleIdent(null);
            }
        }

        const removeUnsavedChangesActionHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.UnsavedRealizationFilterSettingsAction,
            handleUnsavedChangesAction
        );

        return () => {
            removeUnsavedChangesActionHandler();
        };
    }, [guiMessageBroker, handleApplyAllClick, handleDiscardAllClick]);

    function handleFilterSettingsClose() {
        props.onClose();
    }

    function handleApplyClick(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) {
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
        const newHasUnsavedChangesMap = { ...ensembleIdentStringHasUnsavedChangesMap, [ensembleIdentString]: false };
        setEnsembleIdentStringHasUnsavedChangesMap(newHasUnsavedChangesMap);
        setNumberOfUnsavedRealizationFilters(countTrueValues(newHasUnsavedChangesMap));

        // Notify subscribers of change.
        props.workbench.getWorkbenchSession().notifyAboutEnsembleRealizationFilterChange();
    }

    function handleDiscardClick(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) {
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
            },
        });

        // Reset the unsaved changes state
        const newHasUnsavedChangesMap = { ...ensembleIdentStringHasUnsavedChangesMap, [ensembleIdentString]: false };
        setEnsembleIdentStringHasUnsavedChangesMap(newHasUnsavedChangesMap);
        setNumberOfUnsavedRealizationFilters(countTrueValues(newHasUnsavedChangesMap));
    }

    function handleFilterChange(
        ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent,
        selections: EnsembleRealizationFilterSelections
    ) {
        const ensembleIdentString = ensembleIdent.toString();

        // Register the filter changes in the map
        setEnsembleIdentStringToRealizationFilterSelectionsMap({
            ...ensembleIdentStringToRealizationFilterSelectionsMap,
            [ensembleIdentString]: selections,
        });

        // Check if the filter changes are different from the original filter
        const realizationFilter = realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent);
        const hasUnsavedChanges =
            !isEqual(selections.realizationNumberSelections, realizationFilter.getRealizationNumberSelections()) ||
            !areParameterIdentStringToValueSelectionMapCandidatesEqual(
                selections.parameterIdentStringToValueSelectionReadonlyMap,
                realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap()
            ) ||
            selections.filterType !== realizationFilter.getFilterType() ||
            selections.includeOrExcludeFilter !== realizationFilter.getIncludeOrExcludeFilter();

        // Update the unsaved changes state
        const newHasUnsavedChangesMap = {
            ...ensembleIdentStringHasUnsavedChangesMap,
            [ensembleIdentString]: hasUnsavedChanges,
        };
        setEnsembleIdentStringHasUnsavedChangesMap(newHasUnsavedChangesMap);
        setNumberOfUnsavedRealizationFilters(countTrueValues(newHasUnsavedChangesMap));
    }

    function handleSetActiveEnsembleRealizationFilter(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) {
        setActiveFilterEnsembleIdent(ensembleIdent);
    }

    function handleOnEnsembleRealizationFilterHeaderClick(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) {
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
                        {ensembleSet.getEnsembleArray().map((ensemble) => {
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
                </div>
            </Drawer>
        </div>
    );
};

/**
 * Get ensemble ident from string
 * @param ensembleIdentString
 * @returns RegularEnsembleIdent | DeltaEnsembleIdent | null
 */
export function getEnsembleIdentFromString(
    ensembleIdentString: string
): RegularEnsembleIdent | DeltaEnsembleIdent | null {
    let ensembleIdent = null;
    if (RegularEnsembleIdent.isValidEnsembleIdentString(ensembleIdentString)) {
        ensembleIdent = RegularEnsembleIdent.fromString(ensembleIdentString);
    } else if (DeltaEnsembleIdent.isValidDeltaEnsembleIdentString(ensembleIdentString)) {
        ensembleIdent = DeltaEnsembleIdent.fromString(ensembleIdentString);
    }

    return ensembleIdent;
}
