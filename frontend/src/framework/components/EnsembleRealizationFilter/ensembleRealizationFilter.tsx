import React from "react";

import { RealizationFilter } from "@framework/RealizationFilter";
import {
    IncludeExcludeFilter,
    ParameterValueSelection,
    RealizationFilterType,
    RealizationFilterTypeStringMapping,
    RealizationNumberSelection,
} from "@framework/types/realizationFilterTypes";
import { areParameterIdentStringToValueSelectionMapsEqual } from "@framework/utils/realizationFilterTypesUtils";
import { Button } from "@lib/components/Button";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { ArrowDropDown, ArrowDropUp, Check, Clear } from "@mui/icons-material";

import { isEqual } from "lodash";

import { ByParameterValueFilter } from "./private-components/byParameterValueFilter";
import {
    ByRealizationNumberFilter,
    ByRealizationNumberFilterSelection,
} from "./private-components/byRealizationNumberFilter";
import { RealizationNumberSelector } from "./private-components/realizationNumberSelector";
import { createBestSuggestedRealizationNumberSelections } from "./private-utils/conversionUtils";

export type EnsembleRealizationFilterProps = {
    // ensemble: Ensemble; // Should realization filter only provide access to ensemble ident, and the access to details must be through ensemble object?
    realizationFilter: RealizationFilter; // Should be ref stable and not change address in memory
    active: boolean;
    onFilterChange: () => void;
};

/**
 * Component for visualizing and handling of realization filtering for an Ensemble.
 *
 * Realization filter is used to filter ensemble realizations based on selected realization number or parameter values.
 * The selection creates a valid subset of realization numbers for the ensemble throughout the application.
 */
export const EnsembleRealizationFilter: React.FC<EnsembleRealizationFilterProps> = (props) => {
    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

    const [showActiveFilterType, setShowActiveFilterType] = React.useState<boolean>(false);

    const [prevRealizationFilter, setPrevRealizationFilter] = React.useState<RealizationFilter | null>(null);
    const [selectedFilterType, setSelectedFilterType] = React.useState<RealizationFilterType>(
        RealizationFilterType.BY_REALIZATION_NUMBER
    );

    const [selectedRealizationNumbers, setSelectedRealizationNumbers] = React.useState<number[]>([
        ...props.realizationFilter.getFilteredRealizations(),
    ]);

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

    // Update of realization filter object/address
    // NOTE: Should not be necessary to check for address change, as it should be stable?
    if (prevRealizationFilter !== props.realizationFilter) {
        setPrevRealizationFilter(props.realizationFilter);
        setSelectedFilterType(props.realizationFilter.getFilterType());
        setSelectedIncludeOrExcludeFilter(props.realizationFilter.getIncludeOrExcludeFilter());
        setInitialRealizationNumberSelections(props.realizationFilter.getRealizationNumberSelections());
        setRealizationNumberSelections(props.realizationFilter.getRealizationNumberSelections());
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
        return areParameterIdentStringToValueSelectionMapsEqual(
            selectedParameterIdentStringToValueSelectionReadonlyMap,
            parameterIdentStringToValueSelectionReadonlyMap as Map<string, ParameterValueSelection>
        );
    };

    const isFilterEdited =
        !isEqual(realizationNumberSelections, props.realizationFilter.getRealizationNumberSelections()) ||
        !isParameterValueSelectionsEqual() ||
        selectedFilterType !== props.realizationFilter.getFilterType() ||
        selectedIncludeOrExcludeFilter !== props.realizationFilter.getIncludeOrExcludeFilter();

    function handleRealizationNumberFilterChanged(selection: ByRealizationNumberFilterSelection) {
        setRealizationNumberSelections(selection.realizationNumberSelections);
        setSelectedIncludeOrExcludeFilter(selection.includeOrExcludeFilter);

        const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
            selection.realizationNumberSelections,
            props.realizationFilter.getAvailableEnsembleRealizations(),
            selection.includeOrExcludeFilter
        );
        setSelectedRealizationNumbers([...realizationNumberArray]);
    }

    function handleParameterValueFilterChanged(
        parameterIdentStringToValueSelectionMap: ReadonlyMap<string, ParameterValueSelection>
    ) {
        setSelectedParameterIdentStringToValueSelectionReadonlyMap(parameterIdentStringToValueSelectionMap);

        const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
            parameterIdentStringToValueSelectionMap,
            props.realizationFilter.getEnsembleParameters(),
            props.realizationFilter.getAvailableEnsembleRealizations()
        );
        setSelectedRealizationNumbers([...realizationNumberArray]);
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
            setSelectedRealizationNumbers([...realizationNumberArray]);
        } else if (newValue === RealizationFilterType.BY_PARAMETER_VALUES) {
            const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
                selectedParameterIdentStringToValueSelectionReadonlyMap,
                props.realizationFilter.getEnsembleParameters(),
                props.realizationFilter.getAvailableEnsembleRealizations()
            );
            setSelectedRealizationNumbers([...realizationNumberArray]);
        }
    }

    function handleRealizationNumberSelectionsChange(realizations: readonly number[]) {
        setSelectedRealizationNumbers([...realizations]);

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

    function handleShowActiveFilterTypeToggle() {
        const prevShowActiveFilterType = showActiveFilterType;
        setShowActiveFilterType(!prevShowActiveFilterType);

        if (!prevShowActiveFilterType && selectedFilterType === RealizationFilterType.BY_REALIZATION_NUMBER) {
            // Due to conditional rendering, we have to ensure correct initial state when mounting realization number filter component
            setInitialRealizationNumberSelections(realizationNumberSelections);
        }
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
        props.onFilterChange();

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

        if (props.realizationFilter.getFilterType() === RealizationFilterType.BY_REALIZATION_NUMBER) {
            // Update realization numbers based on current selection
            const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
                props.realizationFilter.getRealizationNumberSelections(),
                props.realizationFilter.getAvailableEnsembleRealizations(),
                props.realizationFilter.getIncludeOrExcludeFilter()
            );
            setSelectedRealizationNumbers([...realizationNumberArray]);
        } else if (props.realizationFilter.getFilterType() === RealizationFilterType.BY_PARAMETER_VALUES) {
            const realizationNumberArray = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
                props.realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap(),
                props.realizationFilter.getEnsembleParameters(),
                props.realizationFilter.getAvailableEnsembleRealizations()
            );
            setSelectedRealizationNumbers([...realizationNumberArray]);
        }
    }

    return (
        <div className="mb-4">
            <div
                className={`border ${
                    isFilterEdited ? "border-orange-400" : "border-lightgrey"
                }  shadow-md p-2 rounded-md`}
            >
                <div className="my-2 border-b border-lightgrey pb-2">
                    <div
                        className={`flex justify-center items-center p-2 rounded-md ${
                            isFilterEdited ? "bg-orange-100" : "bg-slate-200"
                        } h-10`}
                    >
                        <div className="font-bold flex-grow text-sm">
                            {"Ensemble: " + props.realizationFilter.getAssignedEnsembleIdent().getEnsembleName()}
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant={isFilterEdited ? "contained" : "outlined"}
                                disabled={!isFilterEdited}
                                size="small"
                                startIcon={<Check fontSize="small" />}
                                onClick={handleApplyClick}
                            />
                            <Button
                                color="danger"
                                variant={isFilterEdited ? "contained" : "outlined"}
                                disabled={!isFilterEdited}
                                size="small"
                                startIcon={<Clear fontSize="small" />}
                                onClick={handleDiscardClick}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="border border-lightgrey p-1 rounded-md">
                        <RealizationNumberSelector
                            selectedRealizations={selectedRealizationNumbers}
                            availableRealizations={props.realizationFilter.getAvailableEnsembleRealizations()}
                            disabledInteraction={selectedFilterType !== RealizationFilterType.BY_REALIZATION_NUMBER}
                            onRealizationNumberSelectionsChange={handleRealizationNumberSelectionsChange}
                        />
                    </div>
                    <div className="flex">
                        <div className="flex-grow" />
                        <Button
                            className="text-sm"
                            variant="text"
                            size="small"
                            endIcon={
                                showActiveFilterType ? (
                                    <ArrowDropUp fontSize="small" />
                                ) : (
                                    <ArrowDropDown fontSize="small" />
                                )
                            }
                            onClick={handleShowActiveFilterTypeToggle}
                        >
                            {showActiveFilterType ? "Hide filter" : "Show filter"}
                        </Button>
                    </div>
                    <div className={`${showActiveFilterType ? "border-b-2 border-lightgrey" : ""}`} />
                    {showActiveFilterType && (
                        <>
                            <Label text="Active Filter Type" wrapperClassName="pb-2">
                                <Dropdown
                                    value={selectedFilterType}
                                    options={Object.values(RealizationFilterType).map((filterType) => {
                                        return {
                                            label: RealizationFilterTypeStringMapping[filterType],
                                            value: filterType,
                                        };
                                    })}
                                    onChange={handleActiveFilterTypeChange}
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
                                        disabled={selectedFilterType !== RealizationFilterType.BY_REALIZATION_NUMBER}
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
                                        disabled={selectedFilterType !== RealizationFilterType.BY_PARAMETER_VALUES}
                                        onFilterChange={handleParameterValueFilterChanged}
                                    />
                                )
                            }
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
