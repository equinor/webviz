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
import { Label } from "@lib/components/Label";
import { Slider } from "@lib/components/Slider";
import { SmartNodeSelector, SmartNodeSelectorSelection, TreeDataNode } from "@lib/components/SmartNodeSelector";
import { TagPicker } from "@lib/components/TagPicker";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Delete } from "@mui/icons-material";

import {
    createSmartNodeSelectorTagListFromParameterIdentStrings,
    createTreeDataNodeListFromParameters,
} from "../private-utils/smartNodeSelectorUtils";

export type ByParameterValueFilterSelection = {
    parameterIdentStringToValueSelectionMap: ReadonlyMap<string, ParameterValueSelection>;
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
    // Compare by reference (ensure if it is enough to compare by reference)
    const smartNodeSelectorTreeDataNodes = React.useMemo<TreeDataNode[]>(() => {
        const includeConstantParameters = false;
        return createTreeDataNodeListFromParameters(
            props.ensembleParameters.getParameterArr(),
            includeConstantParameters
        );
    }, [props.ensembleParameters]);

    function handleParameterNameSelectionChanged(selection: SmartNodeSelectorSelection) {
        if (selection === null) {
            return;
        }

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
            const parameter = props.ensembleParameters.findParameter(ParameterIdent.fromString(parameterIdentString));
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

        // Trigger filter change
        props.onFilterChange({
            parameterIdentStringToValueSelectionMap: newMap as ReadonlyMap<string, ParameterValueSelection>,
            smartNodeSelectorTags: selection.selectedTags,
        });
    }

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

        // Trigger filter change
        props.onFilterChange({
            parameterIdentStringToValueSelectionMap: newMap as ReadonlyMap<string, ParameterValueSelection>,
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
                            className={resolveClassNames(
                                "flex-grow",
                                "text-sm",
                                "mb-1",
                                "text-gray-500",
                                "leading-0",
                                "items-center",
                                "overflow-hidden",
                                "whitespace-nowrap",
                                "text-ellipsis"
                            )}
                        >
                            {parameterIdentString}
                        </div>
                        <div
                            title="Remove parameter"
                            className="text-indigo-600 hover:bg-indigo-50 rounded-full p-1 cursor-pointer flex-grow-1"
                            onClick={() => handleRemoveButtonClick(parameterIdentString)}
                        >
                            <Delete fontSize="small" />
                        </div>
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

// TODO: Improve function to determine step size based on min and max
function createContinuousValueSliderStep(min: number, max: number): number {
    return (max - min) / 100;

    // // Get step based on logarithmic scale
    // const diff = max - min;
    // const log10 = Math.log10(diff);

    // // Round to nearest integer
}
