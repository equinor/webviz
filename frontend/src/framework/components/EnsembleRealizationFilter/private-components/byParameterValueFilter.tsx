import React from "react";

import { EnsembleParameters, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import {
    DiscreteParameterValueSelection,
    NumberRange,
    ParameterValueSelection,
} from "@framework/types/realizationFilterTypes";
import { isArrayOfNumbers, isArrayOfStrings } from "@framework/utils/realizationFilterTypesUtils";
import { Label } from "@lib/components/Label";
import { SelectOption } from "@lib/components/Select";
import { Slider } from "@lib/components/Slider";
import { TagPicker } from "@lib/components/TagPicker";
import { RemoveCircleOutline } from "@mui/icons-material";

import { AddItemButton } from "./AddItemButton";

export type ByParameterValueFilterProps = {
    ensembleParameters: EnsembleParameters; // Should be stable object - both content and reference
    selectedParameterIdentStringToValueSelectionMap: ReadonlyMap<string, ParameterValueSelection>;
    disabled: boolean;
    onFilterChange: (parameterIdentStringToValueSelectionMap: ReadonlyMap<string, ParameterValueSelection>) => void;
};

export const ByParameterValueFilter: React.FC<ByParameterValueFilterProps> = (props) => {
    // const [prevEnsembleParameters, setPrevEnsembleParameters] = React.useState<EnsembleParameters | null>(null);

    // // Compare by reference to avoid unnecessary updates
    // if (!isEqual(props.ensembleParameters, prevEnsembleParameters)) {
    //     setPrevEnsembleParameters(props.ensembleParameters);

    //     // Validate parameterIdent strings
    // }

    const getAllTypes = null;
    const doNeglectConstantParameters = true;
    const selectedParameterIdentStrings = Array.from(props.selectedParameterIdentStringToValueSelectionMap.keys());

    const nonSelectedParameterIdentStringOptions: SelectOption[] = [];
    for (const parameterIdent of props.ensembleParameters.getParameterIdents(getAllTypes)) {
        const isAlreadySelected = selectedParameterIdentStrings.includes(parameterIdent.toString());
        const doSkipConstantParameter =
            doNeglectConstantParameters && props.ensembleParameters.getParameter(parameterIdent).isConstant;
        if (isAlreadySelected || doSkipConstantParameter) {
            continue;
        }

        // Add to options
        nonSelectedParameterIdentStringOptions.push({
            label: parameterIdent.toString(),
            value: parameterIdent.toString(),
        });
    }

    function handleOptionClick(parameterIdentString: string) {
        if (props.selectedParameterIdentStringToValueSelectionMap.has(parameterIdentString)) {
            // If parameter already exists, do nothing
            return;
        }

        const newMap = new Map(props.selectedParameterIdentStringToValueSelectionMap);
        const parameter = props.ensembleParameters.findParameter(ParameterIdent.fromString(parameterIdentString));
        if (parameter) {
            if (parameter.type === ParameterType.CONTINUOUS) {
                const max = Math.max(...parameter.values);
                const min = Math.min(...parameter.values);
                const numberRange = { start: min, end: max };
                newMap.set(parameterIdentString, numberRange);
            } else {
                newMap.set(parameterIdentString, []);
            }
            props.onFilterChange(newMap);
        }
    }

    function setNewParameterValueSelectionAndTriggerOnChange(
        parameterIdentString: string,
        valueSelection: ParameterValueSelection
    ) {
        // Copy map - NOTE: This is not a deep copy
        const updatedMap = new Map(props.selectedParameterIdentStringToValueSelectionMap);
        if (!updatedMap.has(parameterIdentString)) {
            throw new Error(`Edited Parameter ident string ${parameterIdentString} not found in map`);
        }

        // Update value selection with .set()
        // - Do not use .get() and modify by reference, as .get() will return reference to source,
        //   i.e. props.selectedParameterIdentStringToValueSelectionMap. Thus modifying the value
        //   will modify the source, which is not allowed.
        updatedMap.set(parameterIdentString, valueSelection);

        // Trigger filter change - triggers re-render as props.onFilterChange provides new map reference
        props.onFilterChange(updatedMap as ReadonlyMap<string, ParameterValueSelection>);
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
        if (!props.selectedParameterIdentStringToValueSelectionMap.has(parameterIdentString)) {
            throw new Error(`Edited Parameter ident string ${parameterIdentString} not found in map`);
        }

        const newRangeSelection: NumberRange = { start: valueSelection[0], end: valueSelection[1] };

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
        if (!props.selectedParameterIdentStringToValueSelectionMap.has(parameterIdentString)) {
            throw new Error(`Edited Parameter ident string ${parameterIdentString} not found in map`);
        }

        setNewParameterValueSelectionAndTriggerOnChange(parameterIdentString, valueSelection);
    }

    function handleRemoveButtonClick(parameterIdentString: string) {
        if (!props.selectedParameterIdentStringToValueSelectionMap.has(parameterIdentString)) {
            throw new Error(`Parameter ${parameterIdentString} not found`);
        }

        // Create a new map by selecting keys from the original map, excluding the specified key
        const updatedMap = new Map(props.selectedParameterIdentStringToValueSelectionMap);
        updatedMap.delete(parameterIdentString);

        // Trigger filter change - triggers re-render as props.onFilterChange provides new map reference
        props.onFilterChange(updatedMap);
    }

    function createContinuousParameterValueRangeRow(
        parameterIdentString: string,
        valueSelection: NumberRange
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
            return (
                <TagPicker<string>
                    value={valueSelection}
                    tags={parameter.values.map((elm) => {
                        return { label: elm, value: elm };
                    })}
                    onChange={(value) => handleDiscreteParameterValueSelectionChange(parameterIdentString, value)}
                />
            );
        }

        if (isArrayOfNumbers(valueSelection) && isArrayOfNumbers(parameter.values)) {
            return (
                <TagPicker<number>
                    value={valueSelection.map((elm) => elm)}
                    tags={parameter.values.map((elm) => {
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
                <Label text={parameterIdentString}>
                    <div className="flex items-center gap-2">
                        <div
                            className="text-indigo-600 hover:bg-indigo-50 items-center"
                            onClick={() => handleRemoveButtonClick(parameterIdentString)}
                        >
                            <RemoveCircleOutline fontSize="small" />
                        </div>
                        <div className="flex-grow">
                            {Array.isArray(valueSelection)
                                ? createDiscreteParameterValueSelectionRow(parameterIdentString, valueSelection)
                                : createContinuousParameterValueRangeRow(parameterIdentString, valueSelection)}
                        </div>
                    </div>
                </Label>
            </div>
        );
    }

    return (
        <div className="flex-grow flex-col gap-2">
            <AddItemButton
                buttonText="Add Parameter"
                options={nonSelectedParameterIdentStringOptions}
                onOptionClicked={handleOptionClick}
            />
            {Array.from(props.selectedParameterIdentStringToValueSelectionMap).map(
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
