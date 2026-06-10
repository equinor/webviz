import React from "react";

import { isEqual } from "lodash";

import { EnsembleColorTile } from "@framework/components/EnsembleColorTile/ensembleColorTile";
import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { RealizationFilter } from "@framework/RealizationFilter";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { ParameterValueSelection, RealizationNumberSelection } from "@framework/types/realizationFilterTypes";
import {
    IncludeExcludeFilter,
    RealizationFilterType,
    RealizationFilterTypeStringMapping,
} from "@framework/types/realizationFilterTypes";
import { HasChangesIndicator } from "@lib/components/HasChangesIndicator/hasChangesIndicator";
import { Check, Clear } from "@mui/icons-material";
import { Button } from "@lib/newComponents/Button";
import { FieldCompositions } from "@lib/newComponents/Field/compositions";
import { Hidden } from "@lib/newComponents/Hidden";
import { RadioCompositions } from "@lib/newComponents/Radio";
import { Separator } from "@lib/newComponents/Separator";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ByParameterValueFilter } from "./private-components/byParameterValueFilter";
import type { ByRealizationNumberFilterSelection } from "./private-components/byRealizationNumberFilter";
import { ByRealizationNumberFilter } from "./private-components/byRealizationNumberFilter";
import { RealizationNumberDisplay } from "./private-components/realizationNumberDisplay";
import { createBestSuggestedRealizationNumberSelections } from "./private-utils/conversionUtils";

export type EnsembleRealizationFilterSelections = {
    realizationNumbers: readonly number[]; // Array of realization numbers to include in the ensemble
    realizationNumberSelections: readonly RealizationNumberSelection[] | null; // For ByRealizationNumberFilter
    parameterIdentStringToValueSelectionReadonlyMap: ReadonlyMap<string, ParameterValueSelection> | null; // For ByParameterValueFilter
    filterType: RealizationFilterType;
    includeOrExcludeFilter: IncludeExcludeFilter;
};

export type EnsembleRealizationFilterProps = {
    filteredRealizationNumbers: readonly number[]; // The current applied/filtered realization numbers (not current selection)
    selections: EnsembleRealizationFilterSelections; // The current selection state, which may be unsaved
    hasUnsavedSelections: boolean;
    ensemble: RegularEnsemble | DeltaEnsemble;
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

    const areRealizationsFiltered = !isEqual(
        props.filteredRealizationNumbers.toSorted(),
        props.ensemble.getRealizations().toSorted(),
    );

    function handleRealizationNumberFilterChanged(selection: ByRealizationNumberFilterSelection) {
        if (!onFilterChange) {
            return;
        }

        // Create realization number array to display based on current selection
        const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
            selection.realizationNumberSelections,
            props.ensemble.getRealizations(),
            selection.includeOrExcludeFilter,
        );

        onFilterChange({
            ...props.selections,
            realizationNumbers: realizationNumberArray,
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
            props.ensemble.getParameters(),
            props.ensemble.getRealizations(),
        );

        onFilterChange({
            ...props.selections,
            realizationNumbers: realizationNumberArray,
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
                props.ensemble.getRealizations(),
                props.selections.includeOrExcludeFilter,
            );
        } else if (newFilterType === RealizationFilterType.BY_PARAMETER_VALUES) {
            // Create realization number array to display based on current parameters
            realizationNumberArray = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
                props.selections.parameterIdentStringToValueSelectionReadonlyMap,
                props.ensemble.getParameters(),
                props.ensemble.getRealizations(),
            );
        }

        onFilterChange({
            ...props.selections,
            filterType: newFilterType,
            realizationNumbers: realizationNumberArray,
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
            candidateSelectedRealizationNumbers = props.ensemble
                .getRealizations()
                .filter((realization) => !displayRealizationNumbers.includes(realization));
        }

        // Create realization number selections based on the current selection and available realization numbers
        const newRealizationNumberSelections = createBestSuggestedRealizationNumberSelections(
            candidateSelectedRealizationNumbers,
            props.ensemble.getRealizations(),
        );

        onFilterChange({
            ...props.selections,
            realizationNumbers: displayRealizationNumbers,
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

    const readableEnsembleName = props.ensemble.getCustomName() ?? props.ensemble.getDisplayName();

    const activeStyleClasses = {
        "ring ring-blue-400": true,
    };
    const inactiveStyleClasses = {
        "cursor-pointer ring hover:ring-2 ring-gray-300/(--ring-opacity) hover:ring-blue-200": true,
        "[--ring-opacity:100%] hover:ring-blue-400/(--ring-opacity)": !props.isAnotherFilterActive,
        "[--ring-opacity:50%] group hover:[--ring-opacity:75%] transition-opacity": props.isAnotherFilterActive,
    };
    const mainDivStyleClasses = props.isActive ? activeStyleClasses : inactiveStyleClasses;
    return (
        <div className={resolveClassNames("rounded-md", mainDivStyleClasses)}>
            <div className="bg-neutral flex items-center justify-center rounded-t-md">
                <div
                    className={resolveClassNames(
                        "group px-2xs py-3xs gap-x-2xs flex h-full min-w-0 grow items-center",
                        {
                            "opacity-50 transition-opacity duration-100 group-hover:opacity-75":
                                !props.isActive && props.isAnotherFilterActive,
                        },
                    )}
                    onClick={handleHeaderOnClick}
                >
                    <EnsembleColorTile
                        wrapperClassName="w-5 h-5"
                        ensemble={props.ensemble}
                        isRealizationFilterEffective={areRealizationsFiltered}
                    />
                    <div
                        className="font-bolder flex h-full min-w-0 grow cursor-pointer items-center pr-2 pl-2 text-sm"
                        title={props.isActive ? `Ensemble: ${readableEnsembleName}` : "Click to open filter"}
                    >
                        <span className="truncate">{readableEnsembleName}</span>
                    </div>
                    <HasChangesIndicator
                        visible={props.hasUnsavedSelections}
                        tooltipText="You have unapplied changes"
                        size="small"
                        iconSize={16}
                    />
                    <Button
                        tone="accent"
                        disabled={!props.hasUnsavedSelections}
                        onClick={handleApplyClick}
                        title={props.hasUnsavedSelections ? "Apply changes" : "No changes to apply"}
                        size="small"
                        variant="ghost"
                        iconOnly
                    >
                        <Check style={{ fontSize: 16 }} />
                    </Button>
                    <Button
                        tone="danger"
                        disabled={!props.hasUnsavedSelections}
                        onClick={handleDiscardClick}
                        title={props.hasUnsavedSelections ? "Discard changes" : "No changes to discard"}
                        size="small"
                        variant="ghost"
                        iconOnly
                    >
                        <Clear style={{ fontSize: 16 }} />
                    </Button>
                </div>
            </div>
            <div
                className={resolveClassNames({
                    "opacity-30 transition-opacity duration-100 group-hover:opacity-75":
                        !props.isActive && props.isAnotherFilterActive,
                })}
                title={!props.isActive ? "Click to open filter" : undefined}
                onClickCapture={handleBodyOnClickCapture}
            >
                <div className="border-neutral-subtle flex flex-col gap-2 rounded-b border p-2">
                    <div className="py-2xs px-2xs">
                        <RealizationNumberDisplay
                            selectedRealizations={props.selections.realizationNumbers}
                            availableRealizations={props.ensemble.getRealizations()}
                            showAsCompact={!props.isActive}
                            disableOnClick={
                                props.selections.filterType !== RealizationFilterType.BY_REALIZATION_NUMBER ||
                                !props.isActive
                            }
                            onRealizationNumberClick={handleRealizationNumberDisplayClick}
                        />
                    </div>
                    <div className={resolveClassNames({ hidden: !props.isActive })}>
                        <div className="border-neutral-subtle px-2xs py-2xs">
                            <Separator orientation="horizontal" />
                            <FieldCompositions.Default label="Active Filter Type">
                                <RadioCompositions.GroupWithLabels
                                    value={props.selections.filterType}
                                    options={Object.values(RealizationFilterType).map((filterType) => {
                                        return {
                                            label: RealizationFilterTypeStringMapping[filterType],
                                            value: filterType,
                                        };
                                    })}
                                    onValueChange={(value) => handleActiveFilterTypeChange(value)}
                                    layout="horizontal"
                                    size="small"
                                />
                            </FieldCompositions.Default>
                            <Separator orientation="horizontal" />
                            <Hidden
                                hidden={props.selections.filterType !== RealizationFilterType.BY_REALIZATION_NUMBER}
                            >
                                <ByRealizationNumberFilter
                                    initialRealizationNumberSelections={actualInitialRealizationNumberSelections}
                                    realizationNumberSelections={props.selections.realizationNumberSelections}
                                    availableRealizationNumbers={props.ensemble.getRealizations()}
                                    selectedIncludeOrExcludeFilter={props.selections.includeOrExcludeFilter}
                                    disabled={
                                        props.selections.filterType !== RealizationFilterType.BY_REALIZATION_NUMBER
                                    }
                                    onFilterChange={handleRealizationNumberFilterChanged}
                                />
                            </Hidden>
                            <Hidden hidden={props.selections.filterType !== RealizationFilterType.BY_PARAMETER_VALUES}>
                                <ByParameterValueFilter
                                    disabled={props.selections.filterType !== RealizationFilterType.BY_PARAMETER_VALUES}
                                    ensembleParameters={props.ensemble.getParameters()}
                                    parameterIdentStringToValueSelectionReadonlyMap={
                                        props.selections.parameterIdentStringToValueSelectionReadonlyMap
                                    }
                                    onFilterChange={handleParameterValueFilterChanged}
                                />
                            </Hidden>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
