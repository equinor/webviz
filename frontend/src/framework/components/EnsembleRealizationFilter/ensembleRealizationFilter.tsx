import React from "react";

import {
    IncludeExcludeFilter,
    NumberRange,
    RealizationFilter,
    RealizationFilterType,
    RealizationFilterTypeStringMapping,
    RealizationNumberSelection,
} from "@framework/RealizationFilter";
import { Button } from "@lib/components/Button";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Check, Clear } from "@mui/icons-material";

import { isEqual } from "lodash";

import { ByContinuousParameterValueFilter } from "./private-components/byContinuousParameterValueFilter";
import {
    ByRealizationNumberFilter,
    ByRealizationNumberFilterHandles,
} from "./private-components/byRealizationNumberFilter";
import { areContinuousParameterIdentStringRangeMapsEqual } from "./private-utils/compareUtils";

export type EnsembleRealizationFilterProps = {
    // ensemble: Ensemble;
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
    const byRealizationNumberFilterRef = React.useRef<ByRealizationNumberFilterHandles>(null);

    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

    const [selectedRangeTags, setSelectedRangeTags] = React.useState<string[]>([]);
    const [selectedIncludeOrExcludeFiltering, setSelectedIncludeOrExcludeFiltering] =
        React.useState<IncludeExcludeFilter>(IncludeExcludeFilter.INCLUDE_FILTER);
    const [selectedFilterType, setSelectedFilterType] = React.useState<RealizationFilterType>(
        RealizationFilterType.BY_REALIZATION_NUMBER
    );

    const [realizationNumberSelections, setRealizationNumberSelections] = React.useState<
        readonly RealizationNumberSelection[] | null
    >(null);
    const [continuousParameterRangeSelections, setContinuousParameterRangeSelections] = React.useState<Map<
        string,
        NumberRange
    > | null>(null);
    const [isRealizationNumberFilterEdited, setIsRealizationNumberFilterEdited] = React.useState<boolean>(false);
    const [isContinuousParameterValueFilterEdited, setIsContinuousParameterValueFilterEdited] =
        React.useState<boolean>(false);

    // TODO: Check if realizationFilter is updated? I.e. new address in memory
    // const [prevRealizationFilter, setPrevRealizationFilter] = React.useState<RealizationFilter | null>(null);
    // if (prevRealizationFilter !== props.realizationFilter) {
    //     setPrevRealizationFilter(props.realizationFilter);
    //     setSelectedIncludeOrExcludeFiltering(props.realizationFilter.getIncludeExcludeFilter());
    //     setSelectedFilterType(props.realizationFilter.getFilterType());
    //     setRealizationNumberSelections(props.realizationFilter.getRealizationNumberSelections());
    //     setContinuousParameterRangeSelections(props.realizationFilter.getContinuousParameterRangeSelections());
    // }

    const isContinuousParameterRangeSelectionsEqual = React.useMemo((): boolean => {
        // Both selections are null
        if (
            continuousParameterRangeSelections === null &&
            props.realizationFilter.getContinuousParameterIdentRangeReadonlyMap() === null
        ) {
            return true;
        }
        // Only one of the selections is null
        if (
            continuousParameterRangeSelections === null ||
            props.realizationFilter.getContinuousParameterIdentRangeReadonlyMap() === null
        ) {
            return false;
        }

        // Compare non-null selections
        return areContinuousParameterIdentStringRangeMapsEqual(
            continuousParameterRangeSelections,
            props.realizationFilter.getContinuousParameterIdentRangeReadonlyMap() as Map<string, NumberRange>
        );
    }, [continuousParameterRangeSelections, props.realizationFilter.getContinuousParameterIdentRangeReadonlyMap()]);

    const hasUnsavedChanges =
        !isEqual(realizationNumberSelections, props.realizationFilter.getRealizationNumberSelections()) ||
        !isContinuousParameterRangeSelectionsEqual ||
        selectedFilterType !== props.realizationFilter.getFilterType() ||
        selectedIncludeOrExcludeFiltering !== props.realizationFilter.getIncludeOrExcludeFilter();

    function handleRealizationNumberFilterEditedChanged(isEdited: boolean) {
        setIsRealizationNumberFilterEdited(isEdited);
    }
    function handleContinuousParameterValueFilterEditedChanged(isEdited: boolean) {
        setIsContinuousParameterValueFilterEdited(isEdited);
    }

    function handleSaveClick() {
        if (isRealizationNumberFilterEdited && byRealizationNumberFilterRef.current) {
            byRealizationNumberFilterRef.current.saveChanges();
        }
        if (isContinuousParameterValueFilterEdited) {
            // Save changes for continuous parameter value filter
        }
        props.onFilterChange();
        forceUpdate();
    }

    function handleDiscardClick() {
        // Reset realization number filter
        if (isRealizationNumberFilterEdited && byRealizationNumberFilterRef.current) {
            byRealizationNumberFilterRef.current.discardChanges();
        }
        if (isContinuousParameterValueFilterEdited) {
            // Save changes for continuous parameter value filter
        }

        // Reset continuous parameter value filter
        // Reset state
        // setIsRealizationNumberFilterEdited(false);
        // setIsContinuousParameterValueFilterEdited(false);
        forceUpdate();
    }

    const isEdited = isRealizationNumberFilterEdited || isContinuousParameterValueFilterEdited;

    return (
        <div className="mb-4">
            <div className={`border ${isEdited ? "border-orange-400" : "border-lightgrey"}  shadow-md p-2 rounded-md`}>
                <div className="my-2 border-b border-lightgrey pb-2">
                    <div
                        className={`flex justify-center items-center p-2 ${
                            isEdited ? "bg-orange-100" : "bg-slate-200"
                        } h-10`}
                    >
                        <div className="font-bold flex-grow p-0 text-sm">
                            {"Ensemble: " + props.realizationFilter.getAssignedEnsembleIdent().getEnsembleName()}
                        </div>
                        <div className="flex gap-1">
                            <Button
                                variant={isEdited ? "contained" : "outlined"}
                                disabled={!isEdited}
                                size="small"
                                startIcon={<Check fontSize="small" />}
                                onClick={handleSaveClick}
                            />
                            <Button
                                color="danger"
                                variant={isEdited ? "contained" : "outlined"}
                                disabled={!isEdited}
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
                                onChange={setSelectedFilterType}
                            />
                        </Label>
                    </div>
                    {selectedFilterType === RealizationFilterType.BY_REALIZATION_NUMBER && (
                        <ByRealizationNumberFilter
                            ref={byRealizationNumberFilterRef}
                            realizationFilter={props.realizationFilter}
                            disabled={selectedFilterType !== RealizationFilterType.BY_REALIZATION_NUMBER}
                            onEditedChange={handleRealizationNumberFilterEditedChanged}
                        />
                    )}
                    {selectedFilterType === RealizationFilterType.BY_PARAMETER_VALUES && (
                        <ByContinuousParameterValueFilter
                            realizationFilter={props.realizationFilter}
                            disabled={selectedFilterType !== RealizationFilterType.BY_PARAMETER_VALUES}
                            onEditedChange={handleContinuousParameterValueFilterEditedChanged}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
