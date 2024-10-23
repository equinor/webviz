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

import { ByParameterValueFilter } from "./private-components/byParameterValueFilter";
import {
    ByRealizationNumberFilter,
    ByRealizationNumberFilterSelection,
} from "./private-components/byRealizationNumberFilter";
import { RealizationNumberDisplay } from "./private-components/realizationNumberDisplay";
import { createBestSuggestedRealizationNumberSelections } from "./private-utils/conversionUtils";

export type EnsembleRealizationFilterSelections = {
    displayRealizationNumbers: readonly number[]; // Currently selected realization numbers (for visualization)
    realizationNumberSelections: readonly RealizationNumberSelection[] | null; // For ByRealizationNumberFilter
    parameterIdentStringToValueSelectionReadonlyMap: ReadonlyMap<string, ParameterValueSelection> | null; // For ByParameterValueFilter
    filterType: RealizationFilterType;
    includeOrExcludeFilter: IncludeExcludeFilter;
};

export type EnsembleRealizationFilterProps = {
    selections: EnsembleRealizationFilterSelections;
    hasUnsavedSelections: boolean;
    ensembleName: string;
    availableEnsembleRealizations: readonly number[];
    ensembleParameters: EnsembleParameters;
    isActive: boolean;
    isAnotherFilterActive: boolean;
    onClick?: () => void;
    onHeaderClick?: () => void;
    onFilterChange?: (newSelections: EnsembleRealizationFilterSelections) => void;
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
    const { onFilterChange } = props;

    // States for handling initial realization number selections and smart node selector tags
    // - When undefined, the initial value will be calculated on next render
    const [initialRealizationNumberSelections, setInitialRealizationNumberSelections] = React.useState<
        readonly RealizationNumberSelection[] | null | undefined
    >(props.selections.realizationNumberSelections);

    // Update initial realization number selection due to conditional rendering
    let actualInitialRealizationNumberSelections = initialRealizationNumberSelections;

    // Reset the initial number selections to the current realization number selections when set to undefined
    if (actualInitialRealizationNumberSelections === undefined) {
        setInitialRealizationNumberSelections(props.selections.realizationNumberSelections);
        actualInitialRealizationNumberSelections = props.selections.realizationNumberSelections;
    }

    function handleRealizationNumberFilterChanged(selection: ByRealizationNumberFilterSelection) {
        if (!props.onFilterChange) {
            return;
        }

        // Create realization number array to display based on current selection
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

    function handleParameterValueFilterChanged(
        newParameterIdentStringToValueSelectionMap: ReadonlyMap<string, ParameterValueSelection> | null
    ) {
        if (!onFilterChange) {
            return;
        }

        // Create realization number array to display based on current selection
        const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
            newParameterIdentStringToValueSelectionMap,
            props.ensembleParameters,
            props.availableEnsembleRealizations
        );

        onFilterChange({
            ...props.selections,
            displayRealizationNumbers: realizationNumberArray,
            parameterIdentStringToValueSelectionReadonlyMap: newParameterIdentStringToValueSelectionMap,
        });
    }

    function handleActiveFilterTypeChange(newFilterType: RealizationFilterType) {
        if (!onFilterChange) {
            return;
        }

        // Create realization number array to display based on current selection
        let realizationNumberArray: readonly number[] = [];
        if (newFilterType === RealizationFilterType.BY_REALIZATION_NUMBER) {
            // Reset initial value to be calculated next render to ensure correct visualization when
            // mounting realization number filter component
            setInitialRealizationNumberSelections(undefined);

            // Update realization numbers based on current selection
            realizationNumberArray = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
                props.selections.realizationNumberSelections,
                props.availableEnsembleRealizations,
                props.selections.includeOrExcludeFilter
            );
        } else if (newFilterType === RealizationFilterType.BY_PARAMETER_VALUES) {
            // Create realization number array to display based on current parameters
            realizationNumberArray = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
                props.selections.parameterIdentStringToValueSelectionReadonlyMap,
                props.ensembleParameters,
                props.availableEnsembleRealizations
            );
        }

        onFilterChange({
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
        // Reset states for initialization on next render
        setInitialRealizationNumberSelections(undefined);

        if (props.onApplyClick) {
            props.onApplyClick();
        }
    }

    function handleDiscardClick() {
        // Reset states for initialization on next render
        setInitialRealizationNumberSelections(undefined);

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
                "outline-orange-400 shadow-orange-400 shadow-lg": props.isActive && props.hasUnsavedSelections,
                "outline-blue-400 shadow-blue-400 shadow-lg": props.isActive && !props.hasUnsavedSelections,
                "opacity-100": props.isActive || !props.isAnotherFilterActive,
                "opacity-60 ": !props.isActive && props.isAnotherFilterActive && props.hasUnsavedSelections,
                "opacity-30": !props.isActive && props.isAnotherFilterActive && !props.hasUnsavedSelections,
                "outline-2 outline-orange-400 shadow-orange-400 shadow-lg":
                    !props.isActive && props.hasUnsavedSelections,
                "outline-2 outline-gray-300 shadow-gray-300 shadow-md": !props.isActive && !props.hasUnsavedSelections,
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
                            hidden: !props.hasUnsavedSelections,
                        })}
                    >
                        <Button
                            variant="contained"
                            disabled={!props.hasUnsavedSelections}
                            size="small"
                            startIcon={<Check fontSize="small" />}
                            onClick={handleApplyClick}
                        />
                        <Button
                            color="danger"
                            variant="contained"
                            disabled={!props.hasUnsavedSelections}
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
                    <div className={resolveClassNames({ hidden: !props.isActive })}>
                        <div className="border border-lightgrey rounded-md shadow-md p-2">
                            <Label text="Active Filter Type" wrapperClassName="border-b pb-2 mb-2">
                                <RadioGroup
                                    // key={`activeFilterType-${props.ensembleName}`}
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
                            <div
                                className={resolveClassNames({
                                    hidden: props.selections.filterType !== RealizationFilterType.BY_REALIZATION_NUMBER,
                                })}
                            >
                                <ByRealizationNumberFilter
                                    initialRealizationNumberSelections={actualInitialRealizationNumberSelections}
                                    realizationNumberSelections={props.selections.realizationNumberSelections}
                                    availableRealizationNumbers={props.availableEnsembleRealizations}
                                    selectedIncludeOrExcludeFilter={props.selections.includeOrExcludeFilter}
                                    disabled={
                                        props.selections.filterType !== RealizationFilterType.BY_REALIZATION_NUMBER
                                    }
                                    onFilterChange={handleRealizationNumberFilterChanged}
                                />
                            </div>
                            <div
                                className={resolveClassNames({
                                    hidden: props.selections.filterType !== RealizationFilterType.BY_PARAMETER_VALUES,
                                })}
                            >
                                <ByParameterValueFilter
                                    disabled={props.selections.filterType !== RealizationFilterType.BY_PARAMETER_VALUES}
                                    ensembleParameters={props.ensembleParameters}
                                    parameterIdentStringToValueSelectionReadonlyMap={
                                        props.selections.parameterIdentStringToValueSelectionReadonlyMap
                                    }
                                    onFilterChange={handleParameterValueFilterChanged}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
