import React from "react";

import { RealizationFilter } from "@framework/RealizationFilter";
import {
    IncludeExcludeFilter,
    ParameterValueSelection,
    RealizationFilterType,
    RealizationFilterTypeStringMapping,
    RealizationNumberSelection,
} from "@framework/types/realizationFilterTypes";
import { areParameterIdentStringToValueSelectionReadonlyMapsEqual } from "@framework/utils/realizationFilterTypesUtils";
import { Button } from "@lib/components/Button";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Check, Clear } from "@mui/icons-material";

import { isEqual } from "lodash";

import { ByParameterValueFilter, ByParameterValueFilterSelection } from "./private-components/byParameterValueFilter";
import {
    ByRealizationNumberFilter,
    ByRealizationNumberFilterSelection,
} from "./private-components/byRealizationNumberFilter";
import { RealizationNumberDisplay } from "./private-components/realizationNumberDisplay";
import { createBestSuggestedRealizationNumberSelections } from "./private-utils/conversionUtils";
import { createSmartNodeSelectorTagListFromParameterIdentStrings } from "./private-utils/smartNodeSelectorUtils";

export type EnsembleRealizationFilterProps = {
    realizationFilter: RealizationFilter; // Should be ref stable and not change address in memory
    isActive: boolean;
    isAnotherFilterActive: boolean;
    title?: string;
    onClick?: () => void;
    onHeaderClick?: () => void;
    onFilterChange?: () => void;
    onUnsavedFilterChange?: (hasUnsavedChanges: boolean) => void;
};

/**
 * Component for visualizing and handling of realization filtering for an Ensemble.
 *
 * Realization filter is used to filter ensemble realizations based on selected realization number or parameter values.
 * The selection creates a valid subset of realization numbers for the ensemble throughout the application.
 */
export const EnsembleRealizationFilter: React.FC<EnsembleRealizationFilterProps> = (props) => {
    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

    const [prevIsFilterEdited, setPrevIsFilterEdited] = React.useState<boolean>(false);
    const [prevIsActive, setPrevIsActive] = React.useState<boolean>(props.isActive);
    const [prevRealizationFilter, setPrevRealizationFilter] = React.useState<RealizationFilter>(
        props.realizationFilter
    );

    const [selectedFilterType, setSelectedFilterType] = React.useState<RealizationFilterType>(
        props.realizationFilter.getFilterType()
    );
    const [selectedSmartNodeSelectorTags, setSelectedSmartNodeSelectorTags] = React.useState<string[]>(
        createSmartNodeSelectorTagListFromParameterIdentStrings([
            ...(props.realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap()?.keys() ?? []),
        ])
    );

    const [selectedRealizationNumbers, setSelectedRealizationNumbers] = React.useState<readonly number[]>(
        props.realizationFilter.getFilteredRealizations()
    );
    const [initialRealizationNumberSelections, setInitialRealizationNumberSelections] = React.useState<
        readonly RealizationNumberSelection[] | null
    >(props.realizationFilter.getRealizationNumberSelections());
    const [realizationNumberSelections, setRealizationNumberSelections] = React.useState<
        readonly RealizationNumberSelection[] | null
    >(props.realizationFilter.getRealizationNumberSelections());
    const [selectedIncludeOrExcludeFilter, setSelectedIncludeOrExcludeFilter] = React.useState<IncludeExcludeFilter>(
        props.realizationFilter.getIncludeOrExcludeFilter()
    );
    const [
        selectedParameterIdentStringToValueSelectionReadonlyMap,
        setSelectedParameterIdentStringToValueSelectionReadonlyMap,
    ] = React.useState<ReadonlyMap<string, ParameterValueSelection> | null>(
        props.realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap()
    );

    if (prevIsActive !== props.isActive) {
        setPrevIsActive(props.isActive);

        if (!prevIsActive && selectedFilterType === RealizationFilterType.BY_REALIZATION_NUMBER) {
            // Due to conditional rendering, we have to ensure correct initial state when mounting realization number filter component
            setInitialRealizationNumberSelections(realizationNumberSelections);
        }
    }

    // Update of realization filter object/address
    // NOTE: Should not be necessary to check for address change, as it should be stable?
    if (prevRealizationFilter !== props.realizationFilter) {
        setPrevRealizationFilter(props.realizationFilter);
        setSelectedFilterType(props.realizationFilter.getFilterType());
        setSelectedRealizationNumbers(props.realizationFilter.getFilteredRealizations());
        setSelectedIncludeOrExcludeFilter(props.realizationFilter.getIncludeOrExcludeFilter());
        setInitialRealizationNumberSelections(props.realizationFilter.getRealizationNumberSelections());
        setRealizationNumberSelections(props.realizationFilter.getRealizationNumberSelections());
        setSelectedParameterIdentStringToValueSelectionReadonlyMap(
            props.realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap()
        );
        setInitialRealizationNumberSelections(props.realizationFilter.getRealizationNumberSelections());
        setSelectedSmartNodeSelectorTags(
            createSmartNodeSelectorTagListFromParameterIdentStrings([
                ...(props.realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap()?.keys() ?? []),
            ])
        );
    }

    // Dependency array for useMemo checks address of continuousParameterIdentRangeReadonlyMap
    const parameterIdentStringToValueSelectionReadonlyMap =
        props.realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap();

    const isParameterValueSelectionsEqual = (): boolean => {
        // Both selections are null
        if (
            selectedParameterIdentStringToValueSelectionReadonlyMap === null &&
            parameterIdentStringToValueSelectionReadonlyMap === null
        ) {
            return true;
        }
        // Only one of the selections is null
        if (
            selectedParameterIdentStringToValueSelectionReadonlyMap === null ||
            parameterIdentStringToValueSelectionReadonlyMap === null
        ) {
            return false;
        }

        // Compare non-null selections
        return areParameterIdentStringToValueSelectionReadonlyMapsEqual(
            selectedParameterIdentStringToValueSelectionReadonlyMap,
            parameterIdentStringToValueSelectionReadonlyMap
        );
    };

    const hasUnsavedFilterChanges =
        !isEqual(realizationNumberSelections, props.realizationFilter.getRealizationNumberSelections()) ||
        !isParameterValueSelectionsEqual() ||
        selectedFilterType !== props.realizationFilter.getFilterType() ||
        selectedIncludeOrExcludeFilter !== props.realizationFilter.getIncludeOrExcludeFilter();

    if (prevIsFilterEdited !== hasUnsavedFilterChanges) {
        setPrevIsFilterEdited(hasUnsavedFilterChanges);

        if (props.onUnsavedFilterChange) {
            props.onUnsavedFilterChange(hasUnsavedFilterChanges);
        }
    }

    function handleRealizationNumberFilterChanged(selection: ByRealizationNumberFilterSelection) {
        setRealizationNumberSelections(selection.realizationNumberSelections);
        setSelectedIncludeOrExcludeFilter(selection.includeOrExcludeFilter);

        const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
            selection.realizationNumberSelections,
            props.realizationFilter.getAvailableEnsembleRealizations(),
            selection.includeOrExcludeFilter
        );
        setSelectedRealizationNumbers(realizationNumberArray);
    }

    function handleParameterValueFilterChanged(selection: ByParameterValueFilterSelection) {
        setSelectedSmartNodeSelectorTags(selection.smartNodeSelectorTags);
        setSelectedParameterIdentStringToValueSelectionReadonlyMap(selection.parameterIdentStringToValueSelectionMap);

        const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
            selection.parameterIdentStringToValueSelectionMap,
            props.realizationFilter.getEnsembleParameters(),
            props.realizationFilter.getAvailableEnsembleRealizations()
        );
        setSelectedRealizationNumbers(realizationNumberArray);
    }

    function handleActiveFilterTypeChange(newValue: RealizationFilterType) {
        setSelectedFilterType(newValue);

        if (newValue === RealizationFilterType.BY_REALIZATION_NUMBER) {
            // To ensure correct visualization when mounting realization number filter component
            setInitialRealizationNumberSelections(realizationNumberSelections);

            // Update realization numbers based on current selection
            const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
                realizationNumberSelections,
                props.realizationFilter.getAvailableEnsembleRealizations(),
                selectedIncludeOrExcludeFilter
            );
            setSelectedRealizationNumbers(realizationNumberArray);
        } else if (newValue === RealizationFilterType.BY_PARAMETER_VALUES) {
            const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
                selectedParameterIdentStringToValueSelectionReadonlyMap,
                props.realizationFilter.getEnsembleParameters(),
                props.realizationFilter.getAvailableEnsembleRealizations()
            );
            setSelectedRealizationNumbers(realizationNumberArray);
        }
    }

    function handleRealizationNumberSelectionsChange(realizations: readonly number[]) {
        setSelectedRealizationNumbers(realizations);

        let candidateRealizationNumbers = realizations;
        if (selectedIncludeOrExcludeFilter === IncludeExcludeFilter.EXCLUDE_FILTER) {
            candidateRealizationNumbers = props.realizationFilter
                .getAvailableEnsembleRealizations()
                .filter((realization) => !realizations.includes(realization));
        }

        const newRealizationNumberSelections =
            createBestSuggestedRealizationNumberSelections(candidateRealizationNumbers);
        setRealizationNumberSelections(newRealizationNumberSelections);
    }

    function handleApplyClick() {
        // Write states to realization filter
        props.realizationFilter.setFilterType(selectedFilterType);
        props.realizationFilter.setIncludeOrExcludeFilter(selectedIncludeOrExcludeFilter);
        props.realizationFilter.setRealizationNumberSelections(realizationNumberSelections);
        props.realizationFilter.setParameterIdentStringToValueSelectionReadonlyMap(
            selectedParameterIdentStringToValueSelectionReadonlyMap
        );

        // Run filtering
        props.realizationFilter.runFiltering();

        // Notify parent component about the filter change
        if (props.onFilterChange) {
            props.onFilterChange();
        }

        // Force update to re-render edited state visualization
        forceUpdate();
    }

    function handleDiscardClick() {
        setSelectedFilterType(props.realizationFilter.getFilterType());
        setSelectedIncludeOrExcludeFilter(props.realizationFilter.getIncludeOrExcludeFilter());
        setInitialRealizationNumberSelections(props.realizationFilter.getRealizationNumberSelections());
        setRealizationNumberSelections(props.realizationFilter.getRealizationNumberSelections());
        setSelectedParameterIdentStringToValueSelectionReadonlyMap(
            props.realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap()
        );

        setSelectedSmartNodeSelectorTags(
            createSmartNodeSelectorTagListFromParameterIdentStrings([
                ...(props.realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap()?.keys() ?? []),
            ])
        );

        if (props.realizationFilter.getFilterType() === RealizationFilterType.BY_REALIZATION_NUMBER) {
            // Update realization numbers based on current selection
            const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
                props.realizationFilter.getRealizationNumberSelections(),
                props.realizationFilter.getAvailableEnsembleRealizations(),
                props.realizationFilter.getIncludeOrExcludeFilter()
            );
            setSelectedRealizationNumbers(realizationNumberArray);
        } else if (props.realizationFilter.getFilterType() === RealizationFilterType.BY_PARAMETER_VALUES) {
            const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
                props.realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap(),
                props.realizationFilter.getEnsembleParameters(),
                props.realizationFilter.getAvailableEnsembleRealizations()
            );
            setSelectedRealizationNumbers(realizationNumberArray);
        }
    }

    function handleOnClick() {
        if (props.onClick && !props.isActive) {
            props.onClick();
        }
    }

    function handleHeaderOnClick() {
        if (props.onHeaderClick && props.isActive) {
            props.onHeaderClick();
        }
    }

    return (
        <div
            className={resolveClassNames("outline mb-4 rounded-md", {
                "cursor-pointer": !props.isActive,
                "hover:opacity-75 transition-opacity duration-100": !props.isActive && props.isAnotherFilterActive,
                "hover:outline-blue-400 hover:shadow-blue-400 hover:shadow-md":
                    !props.isActive && !props.isAnotherFilterActive,
                "outline-orange-400 shadow-orange-400 shadow-lg": props.isActive && hasUnsavedFilterChanges,
                "outline-blue-400 shadow-blue-400 shadow-lg": props.isActive && !hasUnsavedFilterChanges,
                "opacity-100": props.isActive || !props.isAnotherFilterActive,
                "opacity-60 ": !props.isActive && props.isAnotherFilterActive && hasUnsavedFilterChanges,
                "opacity-30": !props.isActive && props.isAnotherFilterActive && !hasUnsavedFilterChanges,
                "outline-2 outline-orange-400 shadow-orange-400 shadow-lg": !props.isActive && hasUnsavedFilterChanges,
                "outline-2 outline-gray-300 shadow-gray-300 shadow-md": !props.isActive && !hasUnsavedFilterChanges,
            })}
            onClick={handleOnClick}
        >
            <div
                className={resolveClassNames({
                    "pointer-events-none": !props.isActive,
                })}
            >
                <div className={`flex justify-center items-center p-2 rounded-md bg-slate-100 h-12 cursor-pointer`}>
                    <div className="font-bold flex-grow text-sm" onClick={handleHeaderOnClick}>
                        {props.title ??
                            "Ensemble: " + props.realizationFilter.getAssignedEnsembleIdent().getEnsembleName()}
                    </div>
                    <div
                        className={resolveClassNames("flex items-center gap-1", {
                            hidden: !hasUnsavedFilterChanges,
                        })}
                    >
                        <Button
                            variant="contained"
                            disabled={!hasUnsavedFilterChanges}
                            size="small"
                            startIcon={<Check fontSize="small" />}
                            onClick={handleApplyClick}
                        />
                        <Button
                            color="danger"
                            variant="contained"
                            disabled={!hasUnsavedFilterChanges}
                            size="small"
                            startIcon={<Clear fontSize="small" />}
                            onClick={handleDiscardClick}
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-2 p-2">
                    <div className="border border-lightgrey p-2 rounded-md">
                        <RealizationNumberDisplay
                            selectedRealizations={selectedRealizationNumbers}
                            availableRealizations={props.realizationFilter.getAvailableEnsembleRealizations()}
                            showAsCompact={!props.isActive}
                            disableInteraction={
                                selectedFilterType !== RealizationFilterType.BY_REALIZATION_NUMBER || !props.isActive
                            }
                            onRealizationNumberSelectionsChange={handleRealizationNumberSelectionsChange}
                        />
                    </div>
                    <div className="flex"></div>
                    {props.isActive && (
                        <>
                            <div className="border border-lightgrey rounded-md shadow-md p-2">
                                <Label text="Active Filter Type" wrapperClassName="border-b pb-2 mb-2">
                                    <RadioGroup
                                        value={selectedFilterType}
                                        options={Object.values(RealizationFilterType).map((filterType) => {
                                            return {
                                                label: RealizationFilterTypeStringMapping[filterType],
                                                value: filterType,
                                            };
                                        })}
                                        onChange={(_, value) => handleActiveFilterTypeChange(value)}
                                    />
                                </Label>
                                {
                                    // Note: This is a conditional rendering based on the selected filter type, i.e. mount and unmount of component
                                    selectedFilterType === RealizationFilterType.BY_REALIZATION_NUMBER && (
                                        <ByRealizationNumberFilter
                                            initialRealizationNumberSelections={initialRealizationNumberSelections}
                                            realizationNumberSelections={realizationNumberSelections}
                                            availableRealizationNumbers={props.realizationFilter.getAvailableEnsembleRealizations()}
                                            selectedIncludeOrExcludeFilter={selectedIncludeOrExcludeFilter}
                                            disabled={
                                                selectedFilterType !== RealizationFilterType.BY_REALIZATION_NUMBER
                                            }
                                            onFilterChange={handleRealizationNumberFilterChanged}
                                        />
                                    )
                                }
                                {
                                    // Note: This is a conditional rendering based on the selected filter type, i.e. mount and unmount of component
                                    selectedFilterType === RealizationFilterType.BY_PARAMETER_VALUES && (
                                        <ByParameterValueFilter
                                            ensembleParameters={props.realizationFilter.getEnsembleParameters()}
                                            selectedParameterIdentStringToValueSelectionReadonlyMap={
                                                selectedParameterIdentStringToValueSelectionReadonlyMap
                                            }
                                            smartNodeSelectorTags={selectedSmartNodeSelectorTags}
                                            disabled={selectedFilterType !== RealizationFilterType.BY_PARAMETER_VALUES}
                                            onFilterChange={handleParameterValueFilterChanged}
                                        />
                                    )
                                }
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
