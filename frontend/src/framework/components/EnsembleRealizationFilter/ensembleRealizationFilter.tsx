import React from "react";

import {
    IncludeExcludeFilter,
    NumberRange,
    RealizationFilter,
    RealizationFilterType,
    RealizationFilterTypeStringMapping,
    RealizationNumberSelection,
} from "@framework/RealizationFilter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Check, Clear } from "@mui/icons-material";

import { isEqual } from "lodash";

import { ByContinuousParameterValueFilter } from "./private-components/byContinuousParameterValueFilter";
import {
    ByRealizationNumberFilter,
    ByRealizationNumberFilterSelection,
} from "./private-components/byRealizationNumberFilter";
import { areContinuousParameterIdentStringRangeMapsEqual } from "./private-utils/compareUtils";
import { makeRealizationPickerTagsFromRealizationNumberSelections } from "./private-utils/conversionUtils";

export type EnsembleRealizationFilterProps = {
    // ensemble: Ensemble; // Should realization filter only provide access to ensemble ident, and the access to details must be through ensemble object?
    realizationFilter: RealizationFilter; // Should be ref stable and not change address in memory
    active: boolean;
    onFilterChange: () => void;
    // onUnsavedChanges: (hasUnsavedChanges: boolean) => void;
};

/**
 * Component for visualizing and handling of realization filtering for an Ensemble.
 *
 * @param props
 * @returns
 */
export const EnsembleRealizationFilter: React.FC<EnsembleRealizationFilterProps> = (props) => {
    const [prevRealizationFilter, setPrevRealizationFilter] = React.useState<RealizationFilter | null>(null);

    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

    const [initialRealizationNumberSelections, setInitialRealizationNumberSelections] = React.useState<
        readonly RealizationNumberSelection[] | null
    >(null);
    const [realizationNumberSelections, setRealizationNumberSelections] = React.useState<
        readonly RealizationNumberSelection[] | null
    >(null);
    const [selectedIncludeOrExcludeFilter, setSelectedIncludeOrExcludeFilter] = React.useState<IncludeExcludeFilter>(
        IncludeExcludeFilter.INCLUDE_FILTER
    );
    const [selectedFilterType, setSelectedFilterType] = React.useState<RealizationFilterType>(
        RealizationFilterType.BY_REALIZATION_NUMBER
    );
    const [continuousParameterRangeSelections, setContinuousParameterRangeSelections] = React.useState<Map<
        string,
        NumberRange
    > | null>(null);

    // Update of realization filter object/address
    if (prevRealizationFilter !== props.realizationFilter) {
        setPrevRealizationFilter(props.realizationFilter);
        setSelectedFilterType(props.realizationFilter.getFilterType());
        setSelectedIncludeOrExcludeFilter(props.realizationFilter.getIncludeOrExcludeFilter());
        setInitialRealizationNumberSelections(props.realizationFilter.getRealizationNumberSelections());
        setRealizationNumberSelections(props.realizationFilter.getRealizationNumberSelections());
        // setContinuousParameterRangeSelections(props.realizationFilter.getContinuousParameterIdentRangeReadonlyMap());
    }

    // Dependency array for useMemo checks address of continuousParameterIdentRangeReadonlyMap
    const continuousParameterIdentRangeReadonlyMap =
        props.realizationFilter.getContinuousParameterIdentRangeReadonlyMap();
    const isContinuousParameterRangeSelectionsEqual = React.useMemo((): boolean => {
        // Both selections are null
        if (continuousParameterRangeSelections === null && continuousParameterIdentRangeReadonlyMap === null) {
            return true;
        }
        // Only one of the selections is null
        if (continuousParameterRangeSelections === null || continuousParameterIdentRangeReadonlyMap === null) {
            return false;
        }

        // Compare non-null selections
        return areContinuousParameterIdentStringRangeMapsEqual(
            continuousParameterRangeSelections,
            continuousParameterIdentRangeReadonlyMap as Map<string, NumberRange>
        );
    }, [continuousParameterRangeSelections, continuousParameterIdentRangeReadonlyMap]);

    const isFilterEdited =
        !isEqual(realizationNumberSelections, props.realizationFilter.getRealizationNumberSelections()) ||
        !isContinuousParameterRangeSelectionsEqual ||
        selectedFilterType !== props.realizationFilter.getFilterType() ||
        selectedIncludeOrExcludeFilter !== props.realizationFilter.getIncludeOrExcludeFilter();

    function handleRealizationNumberFilterChanged(selection: ByRealizationNumberFilterSelection) {
        setRealizationNumberSelections(selection.realizationNumberSelections);
        setSelectedIncludeOrExcludeFilter(selection.includeOrExcludeFilter);
    }

    function handleContinuousParameterValueFilterEditedChanged(isEdited: boolean) {
        return;
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
        // props.realizationFilter.setContinuousParameterIdentStringRangeMap(continuousParameterRangeSelections);

        // Run filtering
        props.realizationFilter.runFiltering();

        // Force update to re-render edited state visualization
        forceUpdate();
    }

    function handleDiscardClick() {
        setSelectedFilterType(props.realizationFilter.getFilterType());
        setSelectedIncludeOrExcludeFilter(props.realizationFilter.getIncludeOrExcludeFilter());
        setInitialRealizationNumberSelections(props.realizationFilter.getRealizationNumberSelections());
        setRealizationNumberSelections(props.realizationFilter.getRealizationNumberSelections());
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
                            <ByContinuousParameterValueFilter
                                ensembleParameters={props.realizationFilter.getEnsembleParameters()}
                                disabled={selectedFilterType !== RealizationFilterType.BY_PARAMETER_VALUES}
                                onEditedChange={handleContinuousParameterValueFilterEditedChanged}
                            />
                        )
                    }
                </div>
            </div>
        </div>
    );
};
