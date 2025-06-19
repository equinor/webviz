import React from "react";

import { chain, isEqual, range, sortBy } from "lodash";
import { v4 } from "uuid";

import { getNumbersAndRanges, missingNumbers } from "@framework/utils/numberUtils";
import type { BaseComponentProps } from "@lib/components/BaseComponent";
import { BaseComponent } from "@lib/components/BaseComponent";
import { TagInput } from "@lib/components/TagInput/tagInput";

import { RealizationRangeTag } from "./RealizationRangeTag";

type Selection = {
    id: string;
    value: string;
};

function calcUniqueSelections(selections: readonly Selection[], validRealizations?: readonly number[]): number[] {
    const uniqueSelections = new Set<number>();
    selections.forEach((selection) => {
        const range = selection.value.split("-");
        if (range.length === 1) {
            uniqueSelections.add(parseInt(range[0]));
        } else if (range.length === 2) {
            for (let i = parseInt(range[0]); i <= parseInt(range[1]); i++) {
                uniqueSelections.add(i);
            }
        }
    });

    let uniqueSelectionsArray = Array.from(uniqueSelections);

    if (validRealizations) {
        uniqueSelectionsArray = uniqueSelectionsArray.filter((realization) => validRealizations.includes(realization));
    }

    return uniqueSelectionsArray.sort((a, b) => a - b);
}

export type RealizationPickerSelection = {
    selectedRealizations: number[];
    selectedRangeTags: string[];
};

export type RealizationPickerProps = {
    selectedRangeTags?: readonly string[];
    initialRangeTags?: readonly string[];
    validRealizations?: readonly number[];
    debounceTimeMs?: number;
    onChange?: (realizationPickerSelection: RealizationPickerSelection) => void;
} & BaseComponentProps;

function RealizationPickerComponent(props: RealizationPickerProps, ref: React.ForwardedRef<HTMLDivElement>) {
    const debounceTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const [currentInputValue, setCurrentInputValue] = React.useState<string>("");
    const [selections, setSelections] = React.useState<Selection[]>(() => {
        if (!props.initialRangeTags) return [];
        return props.initialRangeTags.map((rangeTag) => ({
            id: v4(),
            value: rangeTag,
        }));
    });

    const [prevSelectedRangeTags, setPrevSelectedRangeTags] = React.useState<string[]>(() => {
        if (!props.selectedRangeTags) return [];
        return [...props.selectedRangeTags];
    });

    const numSelectedRealizations = calcUniqueSelections(selections, props.validRealizations).length;

    if (props.selectedRangeTags !== undefined && !isEqual(props.selectedRangeTags, prevSelectedRangeTags)) {
        setPrevSelectedRangeTags(props.selectedRangeTags ? [...props.selectedRangeTags] : []);

        const existingValues = selections.map(({ value }) => value);

        // We lose track of the selection ids once they're emitted. If we see values that match the current
        // selection, we assume it's a local change, and don't regenerate the selection array
        if (!isEqual(props.selectedRangeTags, existingValues)) {
            const newSelections =
                props.selectedRangeTags?.map((rangeTag) => {
                    return { value: rangeTag, id: v4() };
                }) ?? [];
            setSelections(newSelections);
        }
    }

    function handleSelectionsChange(newSelections: Selection[]) {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = setTimeout(() => {
            if (props.onChange) {
                props.onChange({
                    selectedRealizations: calcUniqueSelections(newSelections, props.validRealizations),
                    selectedRangeTags: newSelections.map((selection) => selection.value),
                });
            }
        }, props.debounceTimeMs || 0);
    }

    function addNewSelections(values: string[]) {
        const newSelections = [...selections, ...values.map((value) => ({ value, id: v4() }))];

        setSelections(newSelections);
        handleSelectionsChange(newSelections);
    }

    function handlePaste(event: React.ClipboardEvent) {
        event.preventDefault();

        const pasteText = event.clipboardData.getData("text");
        // Drop non-accepted characters and remove dangling separators, and make sure it
        // follows the supported pattern, i.e. comma-separated numbers or ranges
        const sanitizedValue = pasteText.replace(/[^0-9,-]/g, "").replace(/^[,-]|[,-]$/g, "");
        if (!/^\d+(-\d+)?(,\d+(-\d+)?)*$/.test(sanitizedValue)) return;

        const validNumbers = props.validRealizations ? missingNumbers(props.validRealizations) : undefined;
        const realizationNumbers = [];
        for (const numberOrRange of sanitizedValue.split(",")) {
            if (/^[0-9]+-[0-9]+$/.test(numberOrRange)) {
                // Add each number in the range to the list, as we will create optimal ranges later
                const [start, end] = numberOrRange.split("-");
                realizationNumbers.push(...range(parseFloat(start), parseFloat(end) + 1));
            } else {
                // By the regex things above, we can safely assume this is a valid number
                realizationNumbers.push(parseFloat(numberOrRange));
            }
        }

        // Sort them to keep the order, and remove possible duplicates
        const sortedUniqueRealizationNumbers = chain(realizationNumbers).sortBy().uniq().value();
        const numbersAndRanges = getNumbersAndRanges(sortedUniqueRealizationNumbers, validNumbers);

        const rangesAsValueStrings = numbersAndRanges.map((numberOrRange) => {
            if (typeof numberOrRange === "number") return numberOrRange.toString();
            else return [numberOrRange.start, numberOrRange.end].join("-");
        });

        addNewSelections(rangesAsValueStrings);
    }

    async function handleCopyTags(selectedTags: Selection[]) {
        const realizationNumbers: number[] = [];

        for (const tag of selectedTags) {
            const [start, end] = tag.value.split("-").map(parseFloat);

            if (!isNaN(start) && !isNaN(end)) {
                realizationNumbers.push(...range(start, end + 1));
            } else {
                if (!isNaN(start)) realizationNumbers.push(start);
                if (!isNaN(end)) realizationNumbers.push(end);
            }
        }

        if (realizationNumbers.length) {
            await navigator.clipboard.writeText(sortBy(realizationNumbers).join(","));
        }
    }

    function handleInputChange(evt: React.ChangeEvent<HTMLInputElement>) {
        const newValue = evt.target.value;
        const sanitizedValue = newValue.replace(/[^0-9-]/g, "").replace(/--/, "-");

        if (sanitizedValue !== currentInputValue) {
            setCurrentInputValue(sanitizedValue);
        }
    }

    function handleTagsChange(newTags: Selection[]) {
        setSelections(newTags);
        handleSelectionsChange(newTags);
    }

    return (
        <BaseComponent ref={ref} disabled={props.disabled}>
            <TagInput
                tags={selections}
                onTagsChange={handleTagsChange}
                onCopyTags={handleCopyTags}
                inputProps={{
                    value: currentInputValue,
                    className: "!py-1.5",
                    onChange: handleInputChange,
                    onPaste: handlePaste,
                }}
                renderTag={(tagProps) => {
                    return (
                        <RealizationRangeTag
                            key={tagProps.tag.id}
                            validRealizations={props.validRealizations}
                            {...tagProps}
                        />
                    );
                }}
            />

            <div className="text-sm text-gray-500 text-right mt-2">
                {numSelectedRealizations} realization{numSelectedRealizations === 1 ? "" : "s"} selected
            </div>
        </BaseComponent>
    );
}

export const RealizationPicker = React.forwardRef(RealizationPickerComponent);
