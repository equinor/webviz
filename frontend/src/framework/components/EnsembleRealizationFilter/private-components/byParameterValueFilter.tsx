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
import { Button } from "@lib/components/Button";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { DenseIconButtonColorScheme } from "@lib/components/DenseIconButton/denseIconButton";
import { Label } from "@lib/components/Label";
import { Slider } from "@lib/components/Slider";
import { SmartNodeSelector, SmartNodeSelectorSelection, TreeDataNode } from "@lib/components/SmartNodeSelector";
import { TagPicker } from "@lib/components/TagPicker";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { AddCircle, Delete } from "@mui/icons-material";

import { createContinuousValueSliderStep } from "../private-utils/sliderUtils";
import { createTreeDataNodeListFromParameters } from "../private-utils/smartNodeSelectorUtils";

export type ByParameterValueFilterProps = {
    ensembleParameters: EnsembleParameters; // Should be stable object - both content and reference
    parameterIdentStringToValueSelectionReadonlyMap: ReadonlyMap<string, ParameterValueSelection> | null;
    disabled: boolean;
    onFilterChange: (
        newParameterIdentStringToValueSelectionMap: ReadonlyMap<string, ParameterValueSelection> | null
    ) => void;
};

export const ByParameterValueFilter: React.FC<ByParameterValueFilterProps> = (props) => {
    const { onFilterChange } = props;

    const [smartNodeSelectorSelection, setSmartNodeSelectorSelection] = React.useState<SmartNodeSelectorSelection>({
        selectedIds: [],
        selectedNodes: [],
        selectedTags: [],
    });

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

    // Handle enable/disable of add button
    // - If there are invalid tags, or no new selected parameters - disable the add button
    const hasInvalidTags = smartNodeSelectorSelection.selectedTags.some((tag) => !tag.isValid);
    const existingParameterIdentStrings = Array.from(
        props.parameterIdentStringToValueSelectionReadonlyMap?.keys() ?? []
    );
    const hasNewParameters = smartNodeSelectorSelection.selectedIds.some(
        (selectedId) => !existingParameterIdentStrings.includes(selectedId)
    );
    const isAddButtonDisabled = hasInvalidTags || !hasNewParameters;

    // Button text for disabled state info
    let candidateButtonText: string | null = null;
    if (hasInvalidTags) {
        candidateButtonText =
            smartNodeSelectorSelection.selectedTags.length > 1 ? "Select valid parameters" : "Select valid parameter";
    } else if (!hasNewParameters) {
        candidateButtonText =
            smartNodeSelectorSelection.selectedIds.length === 0
                ? "No parameter to add"
                : smartNodeSelectorSelection.selectedIds.length > 1
                ? "Parameters already added"
                : "Parameter already added";
    }
    const disabledButtonHelpText = candidateButtonText;

    const handleParameterNameSelectionChanged = React.useCallback(
        function handleParameterNameSelectionChanged(selection: SmartNodeSelectorSelection) {
            setSmartNodeSelectorSelection(selection);
        },
        [setSmartNodeSelectorSelection]
    );

    const handleAddSelectedParametersClick = React.useCallback(
        function handleAddSelectedParametersClick() {
            // Find new parameter ident strings that are not in the current map
            const newMap = new Map(props.parameterIdentStringToValueSelectionReadonlyMap);

            // Get selected parameter ident strings
            const selectedParameterIdentStrings = smartNodeSelectorSelection.selectedIds;

            // Find parameter ident strings not in the current map
            const newParameterIdentStrings = selectedParameterIdentStrings.filter((elm) => !newMap.has(elm));

            // Add new selected parameter ident strings
            const newDiscreteValueSelection: Readonly<string[] | number[]> = [];
            for (const parameterIdentString of newParameterIdentStrings) {
                const parameter = props.ensembleParameters.findParameter(
                    ParameterIdent.fromString(parameterIdentString)
                );
                if (!parameter) {
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
            onFilterChange(nonEmptyMap);

            // Clear SmartNodeSelector selection
            setSmartNodeSelectorSelection({
                selectedIds: [],
                selectedNodes: [],
                selectedTags: [],
            });
        },
        [
            props.ensembleParameters,
            props.parameterIdentStringToValueSelectionReadonlyMap,
            smartNodeSelectorSelection,
            setSmartNodeSelectorSelection,
            onFilterChange,
        ]
    );

    const setNewParameterValueSelectionAndTriggerOnChange = React.useCallback(
        function setNewParameterValueSelectionAndTriggerOnChange(
            parameterIdentString: string,
            valueSelection: ParameterValueSelection
        ) {
            // Copy map - NOTE: This is not a deep copy
            const updatedMap = new Map(props.parameterIdentStringToValueSelectionReadonlyMap);
            if (!updatedMap.has(parameterIdentString)) {
                throw new Error(`Edited Parameter ident string ${parameterIdentString} not found in map`);
            }

            // Update value selection with .set()
            // - Do not use .get() and modify by reference, as .get() will return reference to source,
            //   i.e. props.selectedParameterIdentStringToValueSelectionMap. Thus modifying the value
            //   will modify the source, which is not allowed.
            updatedMap.set(parameterIdentString, valueSelection);

            // Trigger filter change
            onFilterChange(updatedMap as ReadonlyMap<string, ParameterValueSelection>);
        },
        [props.parameterIdentStringToValueSelectionReadonlyMap, onFilterChange]
    );

    const handleContinuousParameterValueRangeChange = React.useCallback(
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
                props.parameterIdentStringToValueSelectionReadonlyMap &&
                !props.parameterIdentStringToValueSelectionReadonlyMap.has(parameterIdentString)
            ) {
                throw new Error(`Edited Parameter ident string ${parameterIdentString} not found in map`);
            }

            const newRangeSelection: Readonly<NumberRange> = { start: valueSelection[0], end: valueSelection[1] };

            setNewParameterValueSelectionAndTriggerOnChange(parameterIdentString, newRangeSelection);
        },
        [
            props.ensembleParameters,
            props.parameterIdentStringToValueSelectionReadonlyMap,
            setNewParameterValueSelectionAndTriggerOnChange,
        ]
    );

    const handleDiscreteParameterValueSelectionChange = React.useCallback(
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
                props.parameterIdentStringToValueSelectionReadonlyMap &&
                !props.parameterIdentStringToValueSelectionReadonlyMap.has(parameterIdentString)
            ) {
                throw new Error(`Edited Parameter ident string ${parameterIdentString} not found in map`);
            }

            const newDiscreteValueSelection: Readonly<string[] | number[]> = valueSelection;

            setNewParameterValueSelectionAndTriggerOnChange(parameterIdentString, newDiscreteValueSelection);
        },
        [
            props.ensembleParameters,
            props.parameterIdentStringToValueSelectionReadonlyMap,
            setNewParameterValueSelectionAndTriggerOnChange,
        ]
    );

    const handleRemoveButtonClick = React.useCallback(
        function handleRemoveButtonClick(parameterIdentString: string) {
            if (
                props.parameterIdentStringToValueSelectionReadonlyMap &&
                !props.parameterIdentStringToValueSelectionReadonlyMap.has(parameterIdentString)
            ) {
                throw new Error(`Parameter ${parameterIdentString} not found`);
            }

            // Create a new map by selecting keys from the original map, excluding the specified key
            // NOTE: This is not a deep copy
            const newMap = new Map(props.parameterIdentStringToValueSelectionReadonlyMap);
            newMap.delete(parameterIdentString);

            const nonEmptyMap = newMap.size > 0 ? (newMap as ReadonlyMap<string, ParameterValueSelection>) : null;

            // Trigger filter change
            onFilterChange(nonEmptyMap);
        },
        [props.parameterIdentStringToValueSelectionReadonlyMap, onFilterChange]
    );

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
        const parameterIdent = ParameterIdent.fromString(parameterIdentString);
        const displayParameterName = parameterIdent.groupName
            ? `${parameterIdent.groupName}:${parameterIdent.name}`
            : parameterIdent.name;

        return (
            <div key={parameterIdentString} className="flex-grow border border-lightgrey rounded-md p-2">
                <div className="flex flex-col gap-2 ">
                    <div className="flex flex-row items-center gap-2">
                        <div
                            title={`Parameter: ${displayParameterName}`}
                            className="flex-grow text-sm text-gray-500 leading-none overflow-hidden whitespace-nowrap text-ellipsis"
                        >
                            {displayParameterName}
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
            <Label text="Select parameters to add">
                <>
                    <SmartNodeSelector
                        data={smartNodeSelectorTreeDataNodes ?? []}
                        selectedTags={smartNodeSelectorSelection.selectedTags.map((tag) => tag.text)}
                        onChange={handleParameterNameSelectionChanged}
                        placeholder="Select parameter to add..."
                    />
                    <div className="flex pb-2">
                        <div className="flex flex-grow" />
                        <div
                            title={disabledButtonHelpText ?? undefined}
                            className={resolveClassNames({ "cursor-help": isAddButtonDisabled })}
                        >
                            <Button
                                size="medium"
                                disabled={isAddButtonDisabled}
                                endIcon={<AddCircle fontSize="small" />}
                                onClick={handleAddSelectedParametersClick}
                            >
                                Add
                            </Button>
                        </div>
                    </div>
                </>
            </Label>
            {props.parameterIdentStringToValueSelectionReadonlyMap && (
                <Label text="Selected parameters">
                    <>
                        {Array.from(props.parameterIdentStringToValueSelectionReadonlyMap).map(
                            ([parameterIdentString, valueSelection]) =>
                                createParameterValueSelectionRow(parameterIdentString, valueSelection)
                        )}
                    </>
                </Label>
            )}
        </div>
    );
};
