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
import { Check, Clear } from "@mui/icons-material";

import { isEqual } from "lodash";

import { ByParameterValueFilter } from "./private-components/byParameterValueFilter";
import {
    ByRealizationNumberFilter,
    ByRealizationNumberFilterSelection,
} from "./private-components/byRealizationNumberFilter";

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

    const [prevRealizationFilter, setPrevRealizationFilter] = React.useState<RealizationFilter | null>(null);
    const [selectedFilterType, setSelectedFilterType] = React.useState<RealizationFilterType>(
        RealizationFilterType.BY_REALIZATION_NUMBER
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
    }

    function handleParameterValueFilterChanged(
        parameterIdentStringToValueSelectionMap: ReadonlyMap<string, ParameterValueSelection>
    ) {
        setSelectedParameterIdentStringToValueSelectionReadonlyMap(parameterIdentStringToValueSelectionMap);

        // Force re-render as selection can be a map with same reference, only value changes
        forceUpdate();
    }

    function handleActiveFilterTypeChange(newValue: RealizationFilterType) {
        setSelectedFilterType(newValue);

        // To ensure correct visualization when mounting realization number filter component
        if (newValue === RealizationFilterType.BY_REALIZATION_NUMBER) {
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
                        className={`flex justify-center items-center p-2 ${
                            isFilterEdited ? "bg-orange-100" : "bg-slate-200"
                        } h-10`}
                    >
                        <div className="font-bold flex-grow p-0 text-sm">
                            {"Ensemble: " + props.realizationFilter.getAssignedEnsembleIdent().getEnsembleName()}
                        </div>
                        <div className="flex gap-1">
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
                    <div className="border-b border-lightgrey pb-2">
                        <Label text="Active Filter Type">
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
                    </div>
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
                </div>
            </div>
        </div>
    );
};
