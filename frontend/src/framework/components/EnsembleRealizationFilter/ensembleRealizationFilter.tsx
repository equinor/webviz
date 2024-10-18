import React from "react";

import { EnsembleParameters } from "@framework/EnsembleParameters";
import { RealizationFilter } from "@framework/RealizationFilter";
import {
    IncludeExcludeFilter,
    ParameterValueSelection,
    RealizationFilterType,
    RealizationFilterTypeStringMapping,
    RealizationNumberSelection,
} from "@framework/types/realizationFilterTypes";
import { Button } from "@lib/components/Button";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Check, Clear } from "@mui/icons-material";

import { ByParameterValueFilter, ByParameterValueFilterSelection } from "./private-components/byParameterValueFilter";
import {
    ByRealizationNumberFilter,
    ByRealizationNumberFilterSelection,
} from "./private-components/byRealizationNumberFilter";
import { RealizationNumberDisplay } from "./private-components/realizationNumberDisplay";
import { createBestSuggestedRealizationNumberSelections } from "./private-utils/conversionUtils";
import { createSmartNodeSelectorTagListFromParameterIdentStrings } from "./private-utils/smartNodeSelectorUtils";

export type EnsembleRealizationFilterSelections = {
    // hasUnsavedChanges: boolean;
    displayRealizationNumbers: readonly number[]; // Currently selected realization numbers (for visualization)
    realizationNumberSelections: readonly RealizationNumberSelection[] | null; // For ByRealizationNumberFilter
    parameterIdentStringToValueSelectionReadonlyMap: ReadonlyMap<string, ParameterValueSelection> | null; // For ByParameterValueFilter
    filterType: RealizationFilterType;
    includeOrExcludeFilter: IncludeExcludeFilter;
};

export type EnsembleRealizationFilterProps = {
    selections: EnsembleRealizationFilterSelections;
    hasUnsavedChanges: boolean;
    ensembleName: string;
    availableEnsembleRealizations: readonly number[];
    ensembleParameters: EnsembleParameters;
    isActive: boolean;
    isAnotherFilterActive: boolean;
    title?: string;
    onClick?: () => void;
    onHeaderClick?: () => void;
    onFilterChange?: (newSelection: EnsembleRealizationFilterSelections) => void;
    onApplyClick?: () => void;
    onDiscardClick?: () => void;
};

/**
 * Component for visualizing and handling of realization filtering for an Ensemble.
 *
 * Realization filter is used to filter ensemble realizations based on selected realization number or parameter values.
 * The selection creates a valid subset of realization numbers for the ensemble throughout the application.
 */
export const EnsembleRealizationFilter: React.FC<EnsembleRealizationFilterProps> = (props) => {
    const [prevIsActive, setPrevIsActive] = React.useState<boolean>(props.isActive);

    // If the tags are set to undefined, the tags will be reset to parameterIdentStringToValueSelectionReadonlyMap on next render
    const [selectedSmartNodeSelectorTags, setSelectedSmartNodeSelectorTags] = React.useState<string[] | undefined>(
        createSmartNodeSelectorTagListFromParameterIdentStrings([
            ...(props.selections.parameterIdentStringToValueSelectionReadonlyMap?.keys() ?? []),
        ])
    );

    // Reset the tags to parameterIdentStringToValueSelectionReadonlyMap when set to undefined
    let candidateSmartNodeSelectorTags = selectedSmartNodeSelectorTags;
    if (candidateSmartNodeSelectorTags === undefined) {
        const newSmartNodeSelectorTags = createSmartNodeSelectorTagListFromParameterIdentStrings([
            ...(props.selections.parameterIdentStringToValueSelectionReadonlyMap?.keys() ?? []),
        ]);
        setSelectedSmartNodeSelectorTags(newSmartNodeSelectorTags);
        candidateSmartNodeSelectorTags = newSmartNodeSelectorTags;
    }
    const actualSmartNodeSelectorTags: string[] = candidateSmartNodeSelectorTags;

    const [initialRealizationNumberSelections, setInitialRealizationNumberSelections] = React.useState<
        readonly RealizationNumberSelection[] | null
    >(props.selections.realizationNumberSelections);

    if (prevIsActive !== props.isActive) {
        setPrevIsActive(props.isActive);

        if (!prevIsActive && props.selections.filterType === RealizationFilterType.BY_REALIZATION_NUMBER) {
            // Due to conditional rendering, we have to ensure correct initial state when mounting realization number filter component
            setInitialRealizationNumberSelections(props.selections.realizationNumberSelections);
        }
    }

    function handleRealizationNumberFilterChanged(selection: ByRealizationNumberFilterSelection) {
        if (!props.onFilterChange) {
            return;
        }

        const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
            selection.realizationNumberSelections,
            props.availableEnsembleRealizations,
            selection.includeOrExcludeFilter
        );

        props.onFilterChange({
            ...props.selections,
            displayRealizationNumbers: realizationNumberArray,
            realizationNumberSelections: selection.realizationNumberSelections,
            includeOrExcludeFilter: selection.includeOrExcludeFilter,
        });
    }

    function handleParameterValueFilterChanged(selection: ByParameterValueFilterSelection) {
        setSelectedSmartNodeSelectorTags(selection.smartNodeSelectorTags);

        if (!props.onFilterChange) {
            return;
        }

        const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
            selection.parameterIdentStringToValueSelectionMap,
            props.ensembleParameters,
            props.availableEnsembleRealizations
        );

        props.onFilterChange({
            ...props.selections,
            displayRealizationNumbers: realizationNumberArray,
            parameterIdentStringToValueSelectionReadonlyMap: selection.parameterIdentStringToValueSelectionMap,
        });
    }

    function handleActiveFilterTypeChange(newFilterType: RealizationFilterType) {
        if (!props.onFilterChange) {
            return;
        }

        let realizationNumberArray: readonly number[] = [];
        if (newFilterType === RealizationFilterType.BY_REALIZATION_NUMBER) {
            // To ensure correct visualization when mounting realization number filter component
            // setInitialRealizationNumberSelections(realizationNumberSelections);

            // Update realization numbers based on current selection
            realizationNumberArray = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
                props.selections.realizationNumberSelections,
                props.availableEnsembleRealizations,
                props.selections.includeOrExcludeFilter
            );
            setInitialRealizationNumberSelections(props.selections.realizationNumberSelections);
        } else if (newFilterType === RealizationFilterType.BY_PARAMETER_VALUES) {
            realizationNumberArray = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
                props.selections.parameterIdentStringToValueSelectionReadonlyMap,
                props.ensembleParameters,
                props.availableEnsembleRealizations
            );
        }

        props.onFilterChange({
            ...props.selections,
            filterType: newFilterType,
            displayRealizationNumbers: realizationNumberArray,
        });
    }

    function handleRealizationNumberDisplayClick(displayRealizationNumbers: readonly number[]) {
        if (!props.onFilterChange) {
            return;
        }

        // Create number selection based on the current display realization numbers
        let candidateSelectedRealizationNumbers = displayRealizationNumbers;
        if (props.selections.includeOrExcludeFilter === IncludeExcludeFilter.EXCLUDE_FILTER) {
            // Invert selection for exclude filter
            candidateSelectedRealizationNumbers = props.availableEnsembleRealizations.filter(
                (realization) => !displayRealizationNumbers.includes(realization)
            );
        }

        // TODO: If improved realization number selection algorithm is needed, provide as callback function
        // if it needs realizationFilter info
        const newRealizationNumberSelections = createBestSuggestedRealizationNumberSelections(
            candidateSelectedRealizationNumbers
        );

        props.onFilterChange({
            ...props.selections,
            displayRealizationNumbers: displayRealizationNumbers,
            realizationNumberSelections: newRealizationNumberSelections,
        });
    }

    function handleApplyClick() {
        if (props.onApplyClick) {
            props.onApplyClick();
        }
    }

    function handleDiscardClick() {
        // setSelectedFilterType(props.realizationFilter.getFilterType());
        // setSelectedIncludeOrExcludeFilter(props.realizationFilter.getIncludeOrExcludeFilter());
        // setInitialRealizationNumberSelections(props.realizationFilter.getRealizationNumberSelections());
        // setRealizationNumberSelections(props.realizationFilter.getRealizationNumberSelections());
        // setSelectedParameterIdentStringToValueSelectionReadonlyMap(
        //     props.realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap()
        // );

        // setSelectedSmartNodeSelectorTags(
        //     createSmartNodeSelectorTagListFromParameterIdentStrings([
        //         ...(props.realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap()?.keys() ?? []),
        //     ])
        // );

        // if (props.realizationFilter.getFilterType() === RealizationFilterType.BY_REALIZATION_NUMBER) {
        //     // Update realization numbers based on current selection
        //     const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
        //         props.realizationFilter.getRealizationNumberSelections(),
        //         props.realizationFilter.getAvailableEnsembleRealizations(),
        //         props.realizationFilter.getIncludeOrExcludeFilter()
        //     );
        //     setSelectedRealizationNumbers(realizationNumberArray);
        // } else if (props.realizationFilter.getFilterType() === RealizationFilterType.BY_PARAMETER_VALUES) {
        //     const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
        //         props.realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap(),
        //         props.realizationFilter.getEnsembleParameters(),
        //         props.realizationFilter.getAvailableEnsembleRealizations()
        //     );
        //     setSelectedRealizationNumbers(realizationNumberArray);
        // }

        // Reset smart node selector tags to undefined, thus tags will be calculated on next render
        setSelectedSmartNodeSelectorTags(undefined);

        if (props.onDiscardClick) {
            props.onDiscardClick();
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
                "outline-orange-400 shadow-orange-400 shadow-lg": props.isActive && props.hasUnsavedChanges,
                "outline-blue-400 shadow-blue-400 shadow-lg": props.isActive && !props.hasUnsavedChanges,
                "opacity-100": props.isActive || !props.isAnotherFilterActive,
                "opacity-60 ": !props.isActive && props.isAnotherFilterActive && props.hasUnsavedChanges,
                "opacity-30": !props.isActive && props.isAnotherFilterActive && !props.hasUnsavedChanges,
                "outline-2 outline-orange-400 shadow-orange-400 shadow-lg": !props.isActive && props.hasUnsavedChanges,
                "outline-2 outline-gray-300 shadow-gray-300 shadow-md": !props.isActive && !props.hasUnsavedChanges,
            })}
            onClick={handleOnClick}
        >
            <div
                className={resolveClassNames({
                    "pointer-events-none": !props.isActive,
                })}
            >
                <div className={`flex justify-center items-center p-2 rounded-md bg-slate-100 h-12 cursor-pointer`}>
                    <div
                        className="font-bold flex-grow text-sm overflow-ellipsis overflow-hidden whitespace-nowrap"
                        title={`Ensemble: ${props.ensembleName}`}
                        onClick={handleHeaderOnClick}
                    >
                        {props.ensembleName}
                    </div>
                    <div
                        className={resolveClassNames("flex items-center gap-1", {
                            hidden: !props.hasUnsavedChanges,
                        })}
                    >
                        <Button
                            variant="contained"
                            disabled={!props.hasUnsavedChanges}
                            size="small"
                            startIcon={<Check fontSize="small" />}
                            onClick={handleApplyClick}
                        />
                        <Button
                            color="danger"
                            variant="contained"
                            disabled={!props.hasUnsavedChanges}
                            size="small"
                            startIcon={<Clear fontSize="small" />}
                            onClick={handleDiscardClick}
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-2 p-2">
                    <div className="border border-lightgrey p-2 rounded-md">
                        <RealizationNumberDisplay
                            selectedRealizations={props.selections.displayRealizationNumbers}
                            availableRealizations={props.availableEnsembleRealizations}
                            showAsCompact={!props.isActive}
                            disableInteraction={
                                props.selections.filterType !== RealizationFilterType.BY_REALIZATION_NUMBER ||
                                !props.isActive
                            }
                            onRealizationNumberClick={handleRealizationNumberDisplayClick}
                        />
                    </div>
                    <div className="flex"></div>
                    {props.isActive && (
                        <>
                            <div className="border border-lightgrey rounded-md shadow-md p-2">
                                <Label text="Active Filter Type" wrapperClassName="border-b pb-2 mb-2">
                                    <RadioGroup
                                        value={props.selections.filterType}
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
                                    props.selections.filterType === RealizationFilterType.BY_REALIZATION_NUMBER && (
                                        <ByRealizationNumberFilter
                                            initialRealizationNumberSelections={initialRealizationNumberSelections}
                                            realizationNumberSelections={props.selections.realizationNumberSelections}
                                            availableRealizationNumbers={props.availableEnsembleRealizations}
                                            selectedIncludeOrExcludeFilter={props.selections.includeOrExcludeFilter}
                                            disabled={
                                                props.selections.filterType !==
                                                RealizationFilterType.BY_REALIZATION_NUMBER
                                            }
                                            onFilterChange={handleRealizationNumberFilterChanged}
                                        />
                                    )
                                }
                                {
                                    // Note: This is a conditional rendering based on the selected filter type, i.e. mount and unmount of component
                                    props.selections.filterType === RealizationFilterType.BY_PARAMETER_VALUES && (
                                        <ByParameterValueFilter
                                            ensembleParameters={props.ensembleParameters}
                                            selectedParameterIdentStringToValueSelectionReadonlyMap={
                                                props.selections.parameterIdentStringToValueSelectionReadonlyMap
                                            }
                                            smartNodeSelectorTags={actualSmartNodeSelectorTags}
                                            disabled={
                                                props.selections.filterType !==
                                                RealizationFilterType.BY_PARAMETER_VALUES
                                            }
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
