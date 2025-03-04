import React from "react";

import type { EnsembleParameters } from "@framework/EnsembleParameters";
import { RealizationFilter } from "@framework/RealizationFilter";
import type { ParameterValueSelection, RealizationNumberSelection } from "@framework/types/realizationFilterTypes";
import {
    IncludeExcludeFilter,
    RealizationFilterType,
    RealizationFilterTypeStringMapping,
} from "@framework/types/realizationFilterTypes";
import { Button } from "@lib/components/Button";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Check, Clear } from "@mui/icons-material";

import { ByParameterValueFilter } from "./private-components/byParameterValueFilter";
import type { ByRealizationNumberFilterSelection } from "./private-components/byRealizationNumberFilter";
import { ByRealizationNumberFilter } from "./private-components/byRealizationNumberFilter";
import { RealizationNumberDisplay } from "./private-components/realizationNumberDisplay";
import { createBestSuggestedRealizationNumberSelections } from "./private-utils/conversionUtils";

export type EnsembleRealizationFilterSelections = {
    displayRealizationNumbers: readonly number[]; // For RealizationNumberDisplay
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
    const { onClick, onHeaderClick, onFilterChange, onApplyClick, onDiscardClick } = props;

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
        if (!onFilterChange) {
            return;
        }

        // Create realization number array to display based on current selection
        const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
            selection.realizationNumberSelections,
            props.availableEnsembleRealizations,
            selection.includeOrExcludeFilter,
        );

        onFilterChange({
            ...props.selections,
            displayRealizationNumbers: realizationNumberArray,
            realizationNumberSelections: selection.realizationNumberSelections,
            includeOrExcludeFilter: selection.includeOrExcludeFilter,
        });
    }

    function handleParameterValueFilterChanged(
        newParameterIdentStringToValueSelectionMap: ReadonlyMap<string, ParameterValueSelection> | null,
    ) {
        if (!onFilterChange) {
            return;
        }

        // Create realization number array to display based on current selection
        const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
            newParameterIdentStringToValueSelectionMap,
            props.ensembleParameters,
            props.availableEnsembleRealizations,
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
                props.selections.includeOrExcludeFilter,
            );
        } else if (newFilterType === RealizationFilterType.BY_PARAMETER_VALUES) {
            // Create realization number array to display based on current parameters
            realizationNumberArray = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
                props.selections.parameterIdentStringToValueSelectionReadonlyMap,
                props.ensembleParameters,
                props.availableEnsembleRealizations,
            );
        }

        onFilterChange({
            ...props.selections,
            filterType: newFilterType,
            displayRealizationNumbers: realizationNumberArray,
        });
    }

    function handleRealizationNumberDisplayClick(displayRealizationNumbers: readonly number[]) {
        if (!onFilterChange) {
            return;
        }

        // Create number selection based on the current display realization numbers
        let candidateSelectedRealizationNumbers = displayRealizationNumbers;
        if (props.selections.includeOrExcludeFilter === IncludeExcludeFilter.EXCLUDE_FILTER) {
            // Invert selection for exclude filter
            candidateSelectedRealizationNumbers = props.availableEnsembleRealizations.filter(
                (realization) => !displayRealizationNumbers.includes(realization),
            );
        }

        // Create realization number selections based on the current selection and available realization numbers
        const newRealizationNumberSelections = createBestSuggestedRealizationNumberSelections(
            candidateSelectedRealizationNumbers,
            props.availableEnsembleRealizations,
        );

        onFilterChange({
            ...props.selections,
            displayRealizationNumbers: displayRealizationNumbers,
            realizationNumberSelections: newRealizationNumberSelections,
        });
    }

    function handleBodyOnClickCapture(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        // Capture click event on the body to prevent drilling down to child elements when filter is inactive
        if (props.isActive) {
            return;
        }

        e.stopPropagation();
        if (onClick) {
            onClick();
        }
    }

    function handleApplyClick() {
        // Reset states for initialization on next render
        setInitialRealizationNumberSelections(undefined);

        if (onApplyClick) {
            onApplyClick();
        }
    }

    function handleDiscardClick() {
        // Reset states for initialization on next render
        setInitialRealizationNumberSelections(undefined);

        if (onDiscardClick) {
            onDiscardClick();
        }
    }

    function handleHeaderOnClick() {
        if (props.isActive && onHeaderClick) {
            onHeaderClick();
        }
        if (!props.isActive && onClick) {
            onClick();
        }
    }

    const activeStyleClasses = {
        "ring ring-opacity-100 shadow-lg": true,
        "ring-blue-400 shadow-blue-400": !props.hasUnsavedSelections,
        "ring-orange-400 shadow-orange-400": props.hasUnsavedSelections,
    };
    const inactiveStyleClasses = {
        "cursor-pointer ring-2": true,
        "ring-opacity-100": !props.isAnotherFilterActive,
        "ring-opacity-50 group hover:shadow-md hover:ring-opacity-75 transition-opacity": props.isAnotherFilterActive,
        "ring-gray-300 shadow-gray-300 ": !props.hasUnsavedSelections,
        "ring-orange-400 shadow-orange-400": props.hasUnsavedSelections,
        "hover:shadow-blue-400 hover:shadow-lg shadow-md": !props.isAnotherFilterActive && props.hasUnsavedSelections,
        "hover:ring-blue-400 hover:shadow-blue-400 hover:shadow-md":
            !props.isAnotherFilterActive && !props.hasUnsavedSelections,
    };
    const mainDivStyleClasses = props.isActive ? activeStyleClasses : inactiveStyleClasses;

    return (
        <div
            className={resolveClassNames("rounded-md", mainDivStyleClasses)}
            title={!props.isActive ? "Click to open filter" : undefined}
        >
            <div className="flex justify-center items-center bg-slate-100 h-12 rounded-tl-md rounded-tr-md">
                <div
                    className={resolveClassNames(
                        "flex-grow h-full pl-2 flex items-center cursor-pointer font-bold text-sm overflow-ellipsis overflow-hidden whitespace-nowrap",
                        {
                            "pr-2": !props.hasUnsavedSelections,
                            "opacity-20 group-hover:opacity-75 transition-opacity duration-100":
                                !props.isActive && props.isAnotherFilterActive,
                        },
                    )}
                    title={props.isActive ? `Ensemble: ${props.ensembleName}` : undefined}
                    onClick={handleHeaderOnClick}
                >
                    {props.ensembleName}
                </div>
                <div
                    className={resolveClassNames("flex h-full items-center gap-1 pr-2", {
                        hidden: !props.hasUnsavedSelections,
                    })}
                >
                    <Button
                        title="Apply changes"
                        variant="contained"
                        disabled={!props.hasUnsavedSelections}
                        size="small"
                        startIcon={<Check fontSize="small" />}
                        onClick={handleApplyClick}
                    />
                    <Button
                        title="Discard changes"
                        color="danger"
                        variant="contained"
                        disabled={!props.hasUnsavedSelections}
                        size="small"
                        startIcon={<Clear fontSize="small" />}
                        onClick={handleDiscardClick}
                    />
                </div>
            </div>
            <div
                className={resolveClassNames({
                    "opacity-20 group-hover:opacity-75 transition-opacity duration-100":
                        !props.isActive && props.isAnotherFilterActive,
                })}
                onClickCapture={handleBodyOnClickCapture}
            >
                <div className="flex flex-col gap-2 p-2">
                    <div className="border border-lightgrey p-2 rounded-md">
                        <RealizationNumberDisplay
                            selectedRealizations={props.selections.displayRealizationNumbers}
                            availableRealizations={props.availableEnsembleRealizations}
                            showAsCompact={!props.isActive}
                            disableOnClick={
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
