import React from "react";

import { EnsembleParameters, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import {
    DiscreteParameterValueSelection,
    NumberRange,
    ParameterValueSelection,
} from "@framework/types/realizationFilterTypes";
import { isArrayOfNumbers, isArrayOfStrings } from "@framework/utils/arrayUtils";
import {
    isValueSelectionAnArrayOfNumber,
    isValueSelectionAnArrayOfString,
} from "@framework/utils/realizationFilterTypesUtils";
import { Button } from "@lib/components/Button";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { DenseIconButtonColorScheme } from "@lib/components/DenseIconButton/denseIconButton";
import { Label } from "@lib/components/Label";
import { Slider } from "@lib/components/Slider";
import { SmartNodeSelector, SmartNodeSelectorSelection, TreeDataNode } from "@lib/components/SmartNodeSelector";
import { SmartNodeSelectorTag } from "@lib/components/SmartNodeSelector/smartNodeSelector";
import { TagPicker } from "@lib/components/TagPicker";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { AddCircle, Delete, Report } from "@mui/icons-material";

import { createContinuousValueSliderStep } from "../private-utils/sliderUtils";
import {
    createSmartNodeSelectorTagTextFromParameterIdentString,
    createSmartNodeSelectorTagTextListFromParameterIdentStrings,
    createTreeDataNodeListFromParameters,
} from "../private-utils/smartNodeSelectorUtils";

export type ByParameterValueFilterProps = {
    ensembleParameters: EnsembleParameters; // Should be stable object - both content and reference
    parameterIdentStringToValueSelectionReadonlyMap: ReadonlyMap<string, ParameterValueSelection> | null;
    disabled: boolean;
    onFilterChange: (
        newParameterIdentStringToValueSelectionMap: ReadonlyMap<string, ParameterValueSelection> | null
    ) => void;
};

export const ByParameterValueFilter: React.FC<ByParameterValueFilterProps> = (props) => {
    const { ensembleParameters, parameterIdentStringToValueSelectionReadonlyMap, onFilterChange } = props;

    const [smartNodeSelectorSelection, setSmartNodeSelectorSelection] = React.useState<SmartNodeSelectorSelection>({
        selectedIds: [],
        selectedNodes: [],
        selectedTags: [],
    });

    // Compare by reference - ensembleParameters should be stable object
    const smartNodeSelectorTreeDataNodes = React.useMemo<TreeDataNode[]>(() => {
        const includeConstantParameters = false;
        const includeNodeDescription = false; // Node description and name seems to be the same, i.e. duplicate information
        return createTreeDataNodeListFromParameters(
            ensembleParameters.getParameterArr(),
            includeConstantParameters,
            includeNodeDescription
        );
    }, [ensembleParameters]);

    const handleParameterNameSelectionChanged = React.useCallback(
        function handleParameterNameSelectionChanged(selection: SmartNodeSelectorSelection) {
            setSmartNodeSelectorSelection(selection);
        },
        [setSmartNodeSelectorSelection]
    );

    const handleAddSelectedParametersClick = React.useCallback(
        function handleAddSelectedParametersClick() {
            // Find new parameter ident strings that are not in the current map
            // NOTE: This is not a deep copy
            const newMap = new Map(parameterIdentStringToValueSelectionReadonlyMap);

            // Get selected parameter ident strings
            const selectedParameterIdentStrings = smartNodeSelectorSelection.selectedIds;

            // Find parameter ident strings not in the current map
            const newParameterIdentStrings = selectedParameterIdentStrings.filter((elm) => !newMap.has(elm));

            // Add new selected parameter ident strings
            const newDiscreteValueSelection: Readonly<string[] | number[]> = [];
            for (const parameterIdentString of newParameterIdentStrings) {
                const parameter = ensembleParameters.findParameter(ParameterIdent.fromString(parameterIdentString));
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
                //   i.e. parameterIdentStringToValueSelectionReadonlyMap. Thus modifying the value
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
            ensembleParameters,
            parameterIdentStringToValueSelectionReadonlyMap,
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
            // Update existing map
            // NOTE: This is not a deep copy
            const updatedMap = new Map(parameterIdentStringToValueSelectionReadonlyMap);
            if (!updatedMap.has(parameterIdentString)) {
                throw new Error(`Edited Parameter ident string ${parameterIdentString} not found in map`);
            }

            // Update value selection with .set()
            // - Do not use .get() and modify by reference, as .get() will return reference to source,
            //   i.e. parameterIdentStringToValueSelectionReadonlyMap. Thus modifying the value
            //   will modify the source, which is not allowed.
            updatedMap.set(parameterIdentString, valueSelection);

            // Trigger filter change
            onFilterChange(updatedMap as ReadonlyMap<string, ParameterValueSelection>);
        },
        [parameterIdentStringToValueSelectionReadonlyMap, onFilterChange]
    );

    const handleContinuousParameterValueRangeChange = React.useCallback(
        function handleContinuousParameterValueRangeChange(parameterIdentString: string, valueSelection: number[]) {
            if (valueSelection.length !== 2) {
                throw new Error(`Value selection must have 2 values`);
            }

            const parameter = ensembleParameters.findParameter(ParameterIdent.fromString(parameterIdentString));
            if (!parameter) {
                throw new Error(`Parameter ${parameterIdentString} not found`);
            }
            if (parameter.type !== ParameterType.CONTINUOUS) {
                throw new Error(`Parameter ${parameterIdentString} is not of type continuous`);
            }
            if (
                parameterIdentStringToValueSelectionReadonlyMap &&
                !parameterIdentStringToValueSelectionReadonlyMap.has(parameterIdentString)
            ) {
                throw new Error(`Edited Parameter ident string ${parameterIdentString} not found in map`);
            }

            const newRangeSelection: Readonly<NumberRange> = { start: valueSelection[0], end: valueSelection[1] };

            setNewParameterValueSelectionAndTriggerOnChange(parameterIdentString, newRangeSelection);
        },
        [
            ensembleParameters,
            parameterIdentStringToValueSelectionReadonlyMap,
            setNewParameterValueSelectionAndTriggerOnChange,
        ]
    );

    const handleDiscreteParameterValueSelectionChange = React.useCallback(
        function handleDiscreteParameterValueSelectionChange(
            parameterIdentString: string,
            valueSelection: string[] | number[]
        ) {
            const parameter = ensembleParameters.findParameter(ParameterIdent.fromString(parameterIdentString));
            if (!parameter) {
                throw new Error(`Parameter ${parameterIdentString} not found`);
            }
            if (parameter.type !== ParameterType.DISCRETE) {
                throw new Error(`Parameter ${parameterIdentString} is not of type discrete`);
            }
            if (
                parameterIdentStringToValueSelectionReadonlyMap &&
                !parameterIdentStringToValueSelectionReadonlyMap.has(parameterIdentString)
            ) {
                throw new Error(`Edited Parameter ident string ${parameterIdentString} not found in map`);
            }

            const newDiscreteValueSelection: Readonly<string[] | number[]> = valueSelection;

            setNewParameterValueSelectionAndTriggerOnChange(parameterIdentString, newDiscreteValueSelection);
        },
        [
            ensembleParameters,
            parameterIdentStringToValueSelectionReadonlyMap,
            setNewParameterValueSelectionAndTriggerOnChange,
        ]
    );

    const handleRemoveButtonClick = React.useCallback(
        function handleRemoveButtonClick(parameterIdentString: string) {
            if (
                parameterIdentStringToValueSelectionReadonlyMap &&
                !parameterIdentStringToValueSelectionReadonlyMap.has(parameterIdentString)
            ) {
                throw new Error(`Parameter ${parameterIdentString} not found`);
            }

            // Create a new map by selecting keys from the original map, excluding the specified key
            // NOTE: This is not a deep copy
            const newMap = new Map(parameterIdentStringToValueSelectionReadonlyMap);
            newMap.delete(parameterIdentString);

            const nonEmptyMap = newMap.size > 0 ? (newMap as ReadonlyMap<string, ParameterValueSelection>) : null;

            // Trigger filter change
            onFilterChange(nonEmptyMap);
        },
        [parameterIdentStringToValueSelectionReadonlyMap, onFilterChange]
    );

    function createContinuousParameterValueRangeRow(
        parameterIdentString: string,
        valueSelection: Readonly<NumberRange>
    ): React.ReactNode {
        const parameterIdent = ParameterIdent.fromString(parameterIdentString);
        const parameterMinMax = ensembleParameters.getContinuousParameterMinMax(parameterIdent);

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
        const parameter = ensembleParameters.getParameter(parameterIdent);
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
        const displayParameterName = createSmartNodeSelectorTagTextFromParameterIdentString(parameterIdentString);

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

    // Create info text and enable/disable states for icon and button
    const invalidTags = smartNodeSelectorSelection.selectedTags.filter((tag) => !tag.isValid);
    const existingParameterIdentStrings = Array.from(parameterIdentStringToValueSelectionReadonlyMap?.keys() ?? []);

    // Text and disabled state for "Add button"
    const { text: addButtonText, isDisabled: isAddButtonDisabled } = createAddButtonTextAndDisableState(
        existingParameterIdentStrings,
        smartNodeSelectorSelection.selectedIds,
        invalidTags
    );

    // Text and visibility state for report/warning icon
    const { text: reportIconText, isVisible: isReportIconVisible } = createReportIconTextAndVisibleState(
        existingParameterIdentStrings,
        smartNodeSelectorSelection.selectedIds
    );

    return (
        <div className="flex-grow flex-col gap-2">
            <div className="flex flex-col pb-2">
                <div className="flex items-center gap-2 h-8">
                    <div
                        className={resolveClassNames(
                            "text-sm text-gray-500 leading-none overflow-hidden whitespace-nowrap text-ellipsis"
                        )}
                    >
                        {"Select parameters to add"}
                    </div>
                    <div className={resolveClassNames({ hidden: !isReportIconVisible })}>
                        <Report
                            fontSize="medium"
                            titleAccess={reportIconText ?? undefined}
                            className={
                                "rounded-md px-0.25 py-0.25 border border-transparent text-white bg-indigo-600 hover:bg-indigo-700 cursor-help"
                            }
                        />
                    </div>
                </div>
                <div className="flex p-1 gap-1 items-center overflow-x-scroll">
                    <div className="flex-grow">
                        <SmartNodeSelector
                            data={smartNodeSelectorTreeDataNodes ?? []}
                            selectedTags={smartNodeSelectorSelection.selectedTags.map((tag) => tag.text)}
                            onChange={handleParameterNameSelectionChanged}
                            placeholder="Add parameter..."
                            caseInsensitiveMatching={true}
                        />
                    </div>
                    <div className="flex-grow-0" title={addButtonText ?? undefined}>
                        <Button
                            variant="contained"
                            disabled={isAddButtonDisabled}
                            endIcon={<AddCircle />}
                            onClick={handleAddSelectedParametersClick}
                        >
                            Add
                        </Button>
                    </div>
                </div>
            </div>
            {parameterIdentStringToValueSelectionReadonlyMap && (
                <Label text="Selected parameters">
                    <>
                        {Array.from(parameterIdentStringToValueSelectionReadonlyMap).map(
                            ([parameterIdentString, valueSelection]) =>
                                createParameterValueSelectionRow(parameterIdentString, valueSelection)
                        )}
                    </>
                </Label>
            )}
        </div>
    );
};

/**
 * Text and disabled state for add parameter button
 *
 * The button is disabled if:
 *  - There are invalid tags
 *  - There are no selected parameters
 *  - All selected parameters are already added
 */
function createAddButtonTextAndDisableState(
    existingParameterIdentStrings: string[],
    selectedParameterIdentStrings: string[],
    invalidTags: SmartNodeSelectorTag[]
): { text: string | null; isDisabled: boolean } {
    if (invalidTags.length === 1) {
        return { text: "Invalid parameter selected", isDisabled: true };
    }
    if (invalidTags.length > 1) {
        return { text: "Invalid parameters selected", isDisabled: true };
    }
    if (selectedParameterIdentStrings.length === 0) {
        return { text: "No parameter to add", isDisabled: true };
    }

    const newParameterIdentStrings = selectedParameterIdentStrings.filter(
        (selectedId) => !existingParameterIdentStrings.includes(selectedId)
    );
    if (newParameterIdentStrings.length === 0 && selectedParameterIdentStrings.length === 1) {
        return { text: "Parameter already added", isDisabled: true };
    }
    if (newParameterIdentStrings.length === 0 && selectedParameterIdentStrings.length > 1) {
        return { text: "Parameters already added", isDisabled: true };
    }
    if (newParameterIdentStrings.length === selectedParameterIdentStrings.length) {
        const text = newParameterIdentStrings.length === 1 ? "Add parameter" : "Add parameters";
        return { text, isDisabled: false };
    }

    // Some selected parameters are already added
    const newParameterTags = createSmartNodeSelectorTagTextListFromParameterIdentStrings(newParameterIdentStrings);
    if (newParameterTags.length === 1) {
        return { text: "Add parameter:\n" + newParameterTags[0], isDisabled: false };
    }
    return { text: "Add parameters:\n" + newParameterTags.join("\n"), isDisabled: false };
}

/**
 * Text and visible state for report icon
 *
 * The icon is visible if one or more selected parameters are already added
 */
function createReportIconTextAndVisibleState(
    existingParameterIdentStrings: string[],
    selectedParameterIdentStrings: string[]
): { text: string | null; isVisible: boolean } {
    const alreadySelectedParameterIdentStrings = selectedParameterIdentStrings.filter((selectedId) =>
        existingParameterIdentStrings.includes(selectedId)
    );
    const alreadySelectedParameterTagTexts = createSmartNodeSelectorTagTextListFromParameterIdentStrings(
        alreadySelectedParameterIdentStrings
    );
    if (alreadySelectedParameterTagTexts.length === 1 && selectedParameterIdentStrings.length >= 1) {
        return { text: `Parameter already added:\n${alreadySelectedParameterTagTexts[0]}`, isVisible: true };
    }
    if (alreadySelectedParameterTagTexts.length > 1) {
        return { text: `Parameters already added:\n${alreadySelectedParameterTagTexts.join("\n")}`, isVisible: true };
    }
    return { text: null, isVisible: false };
}
