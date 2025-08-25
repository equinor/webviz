import React from "react";

import { inRange, isEqual, range } from "lodash";
import { v4 } from "uuid";

import { missingNumbers } from "@framework/utils/numberUtils";
import type { BaseComponentProps } from "@lib/components/BaseComponent";
import { BaseComponent } from "@lib/components/BaseComponent";
import { TagInput } from "@lib/components/TagInput/tagInput";
import { pluralize } from "@lib/utils/strings";

import type { RealizationNumberLimits, Selection } from "./_utils";
import { realizationSelectionToText, sanitizeRangeInput, textToRealizationSelection } from "./_utils";
import { RealizationRangeTag } from "./RealizationRangeTag";
function getRangeOfSelection(selection: Selection): [start: number, end: number] {
    const [start, possibleEnd] = selection.value.split("-");

    return [parseFloat(start), parseFloat(possibleEnd ?? start)];
}

function calcUniqueSelections(selections: readonly Selection[], limits: RealizationNumberLimits): number[] {
    const uniqueSelections = new Set<number>();

    selections.forEach((selection) => {
        let [start, end] = getRangeOfSelection(selection);

        if (!inRange(start, limits.min, limits.max + 1) && !inRange(end, limits.min, limits.max)) return;

        // Clamp range computations to only worry about valid numbers
        start = Math.max(start, limits.min);
        end = Math.min(end, limits.max);

        for (const n of range(start, end + 1)) {
            if (!limits.invalid.has(n)) {
                uniqueSelections.add(n);
            }
        }
    });

    return Array.from(uniqueSelections).sort((a, b) => a - b);
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

    const [selectedRealizations, setSelectedRealizations] = React.useState<number[]>([]);
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

    const realizationNumberLimits = React.useMemo<RealizationNumberLimits>(() => {
        const validRealizations = props.validRealizations ?? [];
        return {
            min: Math.min(...validRealizations),
            max: Math.max(...validRealizations),
            invalid: missingNumbers(validRealizations),
        };
    }, [props.validRealizations]);

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

        const newUniqueSelections = calcUniqueSelections(newSelections, realizationNumberLimits);

        setSelectedRealizations(newUniqueSelections);

        debounceTimeout.current = setTimeout(() => {
            if (props.onChange) {
                props.onChange({
                    selectedRealizations: newUniqueSelections,
                    selectedRangeTags: newSelections.map((s) => s.value),
                });
            }
        }, props.debounceTimeMs || 0);
    }

    function handlePaste(event: React.ClipboardEvent) {
        event.preventDefault();

        const pasteText = event.clipboardData.getData("text");

        const parsedSelections = textToRealizationSelection(pasteText, realizationNumberLimits);

        if (parsedSelections) {
            const newSelections = [...selections, ...parsedSelections];

            setSelections(newSelections);
            handleSelectionsChange(newSelections);
        }
    }

    async function handleCopyTags(selectedTags: Selection[]) {
        const stringifiedSelections = realizationSelectionToText(selectedTags);

        if (stringifiedSelections) {
            await navigator.clipboard.writeText(stringifiedSelections);
        }
    }

    function handleInputChange(newValue: string) {
        const sanitizedValue = sanitizeRangeInput(newValue);

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
                    onValueChange: handleInputChange,
                    onPaste: handlePaste,
                }}
                renderTag={(tagProps) => {
                    return (
                        <RealizationRangeTag
                            key={tagProps.tag.id}
                            realizationNumberLimits={realizationNumberLimits}
                            {...tagProps}
                        />
                    );
                }}
            />

            <div className="text-sm text-gray-500 text-right mt-2">
                {pluralize("realization", selectedRealizations.length)} selected
            </div>
        </BaseComponent>
    );
}

export const RealizationPicker = React.forwardRef(RealizationPickerComponent);
