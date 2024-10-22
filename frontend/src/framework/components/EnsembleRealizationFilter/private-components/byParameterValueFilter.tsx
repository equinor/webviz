import React from "react";

import { EnsembleParameters, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import {
    DiscreteParameterValueSelection,
    NumberRange,
    ParameterValueSelection,
} from "@framework/types/realizationFilterTypes";
import {
    isArrayOfNumbers,
    isArrayOfStrings,
    isValueSelectionAnArrayOfNumber,
    isValueSelectionAnArrayOfString,
} from "@framework/utils/realizationFilterTypesUtils";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { DenseIconButtonColorScheme } from "@lib/components/DenseIconButton/denseIconButton";
import { Label } from "@lib/components/Label";
import { Slider } from "@lib/components/Slider";
import { SmartNodeSelector, SmartNodeSelectorSelection, TreeDataNode } from "@lib/components/SmartNodeSelector";
import { TagPicker } from "@lib/components/TagPicker";
import { Delete } from "@mui/icons-material";

import {
    createSmartNodeSelectorTagListFromParameterIdentStrings,
    createTreeDataNodeListFromParameters,
} from "../private-utils/smartNodeSelectorUtils";

export type ByParameterValueFilterSelection = {
    parameterIdentStringToValueSelectionMap: ReadonlyMap<string, ParameterValueSelection> | null;
    smartNodeSelectorTags: string[];
};

export type ByParameterValueFilterProps = {
    ensembleParameters: EnsembleParameters; // Should be stable object - both content and reference
    selectedParameterIdentStringToValueSelectionReadonlyMap: ReadonlyMap<string, ParameterValueSelection> | null;
    smartNodeSelectorTags: string[];
    disabled: boolean;
    onFilterChange: (selection: ByParameterValueFilterSelection) => void;
};

export const ByParameterValueFilter: React.FC<ByParameterValueFilterProps> = (props) => {
    const { onFilterChange } = props;

    // Compare by reference (ensure if it is enough to compare by reference)
    const smartNodeSelectorTreeDataNodes = React.useMemo<TreeDataNode[]>(() => {
        const includeConstantParameters = false;
        const includeNodeDescription = false; // Node description and name seems to be the same, i.e. duplicate information
        return createTreeDataNodeListFromParameters(
            props.ensembleParameters.getParameterArr(),
            includeConstantParameters,
            includeNodeDescription
        );
    }, [props.ensembleParameters]);

    const handleParameterNameSelectionChanged = React.useCallback(
        function handleParameterNameSelectionChanged(selection: SmartNodeSelectorSelection) {
            if (selection === null) {
                return;
            }

            console.debug(selection.selectedIds);
            console.debug(selection.selectedNodes);

            // Find new parameter ident strings that are not in the current map
            const newMap = new Map(props.selectedParameterIdentStringToValueSelectionReadonlyMap);

            // Get selected parameter ident strings
            const selectedParameterIdentStrings = selection.selectedIds;

            // Delete deselected parameter ident strings
            const deselectedParameterIdentStrings = Array.from(newMap.keys()).filter(
                (paramIdentString) => !selectedParameterIdentStrings.includes(paramIdentString)
            );
            for (const deselectedParameterIdentString of deselectedParameterIdentStrings) {
                newMap.delete(deselectedParameterIdentString);
            }

            // Add new selected parameter ident strings
            const newDiscreteValueSelection: Readonly<string[] | number[]> = [];
            for (const parameterIdentString of selectedParameterIdentStrings) {
                const parameter = props.ensembleParameters.findParameter(
                    ParameterIdent.fromString(parameterIdentString)
                );
                if (!parameter || newMap.has(parameterIdentString)) {
                    continue;
                }

                let newParameterValueSelection: ParameterValueSelection = newDiscreteValueSelection;
                if (parameter.type === ParameterType.CONTINUOUS) {
                    const max = Math.max(...parameter.values);
                    const min = Math.min(...parameter.values);
                    const numberRange: Readonly<NumberRange> = { start: min, end: max };
                    newParameterValueSelection = numberRange;
                }

                // Update value selection with .set()
                // - Do not use .get() and modify by reference, as .get() will return reference to source,
                //   i.e. props.selectedParameterIdentStringToValueSelectionMap. Thus modifying the value
                //   will modify the source, which is not allowed.
                newMap.set(parameterIdentString, newParameterValueSelection);
            }

            const nonEmptyMap = newMap.size > 0 ? (newMap as ReadonlyMap<string, ParameterValueSelection>) : null;

            // Trigger filter change
            onFilterChange({
                parameterIdentStringToValueSelectionMap: nonEmptyMap,
                smartNodeSelectorTags: selection.selectedTags,
            });
        },
        [onFilterChange, props.ensembleParameters, props.selectedParameterIdentStringToValueSelectionReadonlyMap]
    );

    function setNewParameterValueSelectionAndTriggerOnChange(
        parameterIdentString: string,
        valueSelection: ParameterValueSelection
    ) {
        // Copy map - NOTE: This is not a deep copy
        const updatedMap = new Map(props.selectedParameterIdentStringToValueSelectionReadonlyMap);
        if (!updatedMap.has(parameterIdentString)) {
            throw new Error(`Edited Parameter ident string ${parameterIdentString} not found in map`);
        }

        // Update value selection with .set()
        // - Do not use .get() and modify by reference, as .get() will return reference to source,
        //   i.e. props.selectedParameterIdentStringToValueSelectionMap. Thus modifying the value
        //   will modify the source, which is not allowed.
        updatedMap.set(parameterIdentString, valueSelection);

        // Trigger filter change
        props.onFilterChange({
            parameterIdentStringToValueSelectionMap: updatedMap as ReadonlyMap<string, ParameterValueSelection>,
            smartNodeSelectorTags: props.smartNodeSelectorTags,
        });
    }

    function handleContinuousParameterValueRangeChange(parameterIdentString: string, valueSelection: number[]) {
        if (valueSelection.length !== 2) {
            throw new Error(`Value selection must have 2 values`);
        }

        const parameter = props.ensembleParameters.findParameter(ParameterIdent.fromString(parameterIdentString));
        if (!parameter) {
            throw new Error(`Parameter ${parameterIdentString} not found`);
        }
        if (parameter.type !== ParameterType.CONTINUOUS) {
            throw new Error(`Parameter ${parameterIdentString} is not of type continuous`);
        }
        if (
            props.selectedParameterIdentStringToValueSelectionReadonlyMap &&
            !props.selectedParameterIdentStringToValueSelectionReadonlyMap.has(parameterIdentString)
        ) {
            throw new Error(`Edited Parameter ident string ${parameterIdentString} not found in map`);
        }

        const newRangeSelection: Readonly<NumberRange> = { start: valueSelection[0], end: valueSelection[1] };

        setNewParameterValueSelectionAndTriggerOnChange(parameterIdentString, newRangeSelection);
    }

    function handleDiscreteParameterValueSelectionChange(
        parameterIdentString: string,
        valueSelection: string[] | number[]
    ) {
        const parameter = props.ensembleParameters.findParameter(ParameterIdent.fromString(parameterIdentString));
        if (!parameter) {
            throw new Error(`Parameter ${parameterIdentString} not found`);
        }
        if (parameter.type !== ParameterType.DISCRETE) {
            throw new Error(`Parameter ${parameterIdentString} is not of type discrete`);
        }
        if (
            props.selectedParameterIdentStringToValueSelectionReadonlyMap &&
            !props.selectedParameterIdentStringToValueSelectionReadonlyMap.has(parameterIdentString)
        ) {
            throw new Error(`Edited Parameter ident string ${parameterIdentString} not found in map`);
        }

        const newDiscreteValueSelection: Readonly<string[] | number[]> = valueSelection;

        setNewParameterValueSelectionAndTriggerOnChange(parameterIdentString, newDiscreteValueSelection);
    }

    function handleRemoveButtonClick(parameterIdentString: string) {
        if (
            props.selectedParameterIdentStringToValueSelectionReadonlyMap &&
            !props.selectedParameterIdentStringToValueSelectionReadonlyMap.has(parameterIdentString)
        ) {
            throw new Error(`Parameter ${parameterIdentString} not found`);
        }

        // Create a new map by selecting keys from the original map, excluding the specified key
        // NOTE: This is not a deep copy
        const newMap = new Map(props.selectedParameterIdentStringToValueSelectionReadonlyMap);
        newMap.delete(parameterIdentString);

        // Update selector tags
        const newSmartNodeSelectorTags = createSmartNodeSelectorTagListFromParameterIdentStrings([...newMap.keys()]);

        const nonEmptyMap = newMap.size > 0 ? (newMap as ReadonlyMap<string, ParameterValueSelection>) : null;

        // Trigger filter change
        props.onFilterChange({
            parameterIdentStringToValueSelectionMap: nonEmptyMap,
            smartNodeSelectorTags: newSmartNodeSelectorTags,
        });
    }

    function createContinuousParameterValueRangeRow(
        parameterIdentString: string,
        valueSelection: Readonly<NumberRange>
    ): React.ReactNode {
        const parameterIdent = ParameterIdent.fromString(parameterIdentString);
        const parameterMinMax = props.ensembleParameters.getContinuousParameterMinMax(parameterIdent);

        return (
            <Slider
                debounceTimeMs={200} // To prevent immediate re-render
                max={parameterMinMax.max}
                min={parameterMinMax.min}
                step={createContinuousValueSliderStep(parameterMinMax.min, parameterMinMax.max)}
                value={[valueSelection.start, valueSelection.end]}
                valueLabelDisplay="auto"
                orientation="horizontal"
                onChange={(_, newValue) =>
                    handleContinuousParameterValueRangeChange(parameterIdentString, newValue as number[])
                }
            />
        );
    }

    function createDiscreteParameterValueSelectionRow(
        parameterIdentString: string,
        valueSelection: DiscreteParameterValueSelection
    ): React.ReactNode {
        const parameterIdent = ParameterIdent.fromString(parameterIdentString);
        const parameter = props.ensembleParameters.getParameter(parameterIdent);
        if (!parameter) {
            throw new Error(`Parameter ${parameterIdentString} not found`);
        }

        if (isArrayOfStrings(valueSelection) && isArrayOfStrings(parameter.values)) {
            const uniqueValues = Array.from(new Set([...parameter.values]));
            return (
                <TagPicker<string>
                    value={[...valueSelection]}
                    tags={uniqueValues.map((elm) => {
                        return { label: elm, value: elm };
                    })}
                    onChange={(value) => handleDiscreteParameterValueSelectionChange(parameterIdentString, value)}
                />
            );
        }

        if (isArrayOfNumbers(valueSelection) && isArrayOfNumbers(parameter.values)) {
            const uniqueValues = Array.from(new Set([...parameter.values]));
            return (
                <TagPicker<number>
                    value={valueSelection.map((elm) => elm)}
                    tags={uniqueValues.map((elm) => {
                        return { label: elm.toString(), value: elm };
                    })}
                    onChange={(value) => handleDiscreteParameterValueSelectionChange(parameterIdentString, value)}
                />
            );
        }

        throw new Error(
            `Invalid value selection type. Selection is ${valueSelection} and parameter values is ${parameter.values}`
        );
    }

    function createParameterValueSelectionRow(
        parameterIdentString: string,
        valueSelection: ParameterValueSelection
    ): React.ReactNode {
        return (
            <div key={parameterIdentString} className="flex-grow border border-lightgrey rounded-md p-2">
                <div className="flex flex-col gap-2 ">
                    <div className="flex flex-row items-center gap-2">
                        <div
                            title={`Parameter: ${parameterIdentString}`}
                            className="flex-grow text-sm text-gray-500 leading-none overflow-hidden whitespace-nowrap text-ellipsis"
                        >
                            {parameterIdentString}
                        </div>
                        <DenseIconButton
                            title="Remove parameter"
                            colorScheme={DenseIconButtonColorScheme.DANGER}
                            onClick={() => handleRemoveButtonClick(parameterIdentString)}
                        >
                            <Delete fontSize="small" />
                        </DenseIconButton>
                    </div>
                    <div className="flex items-center">
                        <div className="flex-grow">
                            {isValueSelectionAnArrayOfString(valueSelection) ||
                            isValueSelectionAnArrayOfNumber(valueSelection)
                                ? createDiscreteParameterValueSelectionRow(parameterIdentString, valueSelection)
                                : createContinuousParameterValueRangeRow(parameterIdentString, valueSelection)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-grow flex-col gap-2">
            <Label text="Select parameters">
                <SmartNodeSelector
                    data={smartNodeSelectorTreeDataNodes ?? []}
                    selectedTags={props.smartNodeSelectorTags}
                    onChange={handleParameterNameSelectionChanged}
                    placeholder="Add parameter..."
                />
            </Label>
            {props.selectedParameterIdentStringToValueSelectionReadonlyMap &&
                Array.from(props.selectedParameterIdentStringToValueSelectionReadonlyMap).map(
                    ([parameterIdentString, valueSelection]) => {
                        return createParameterValueSelectionRow(parameterIdentString, valueSelection);
                    }
                )}
        </div>
    );
};

/**
 * Create a step size for a continuous value slider based on the min and max values.
 *
 * The step size is computed as a fraction of the range, and then rounded to a magnitude-adjusted value.
 */
function createContinuousValueSliderStep(min: number, max: number): number {
    const range = Math.abs(max - min);

    // Determine the number of steps based on the magnitude of the range
    const magnitude = Math.floor(Math.log10(range));

    let numberOfSteps = 100;
    let digitPrecision = 3;
    if (magnitude < 1) {
        numberOfSteps = 100;
        digitPrecision = 4;
    } else if (magnitude < 2) {
        numberOfSteps = 100;
    } else if (magnitude < 3) {
        numberOfSteps = 1000;
    } else {
        numberOfSteps = 10000;
    }

    // Calculate the step size based on the number of steps
    let stepSize = range / numberOfSteps;

    // Reduce number of significant digits
    stepSize = parseFloat(stepSize.toPrecision(digitPrecision));

    return stepSize;
}
