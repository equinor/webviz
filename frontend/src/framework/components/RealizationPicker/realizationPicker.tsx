import React from "react";

import { inRange, isEqual, range } from "lodash";

import { missingNumbers } from "@framework/utils/numberUtils";
import type { BaseComponentProps } from "@lib/components/BaseComponent";
import { BaseComponent } from "@lib/components/BaseComponent";
import { TagInput } from "@lib/components/TagInput/tagInput";
import { pluralize } from "@lib/utils/strings";

import type { RealizationNumberLimits } from "./_utils";
import { realizationSelectionToText, sanitizeRangeInput, textToRealizationSelection } from "./_utils";
import { RealizationRangeTag } from "./RealizationRangeTag";

function getRangeOfTag(selection: string): [start: number, end: number] {
    const [start, possibleEnd] = selection.split("-");

    return [parseFloat(start), parseFloat(possibleEnd ?? start)];
}

function calcNumberOfUniqueRealizations(selectedRangeTags: readonly string[], limits: RealizationNumberLimits): number {
    const uniqueRealizations = new Set<number>();
    for (const rangeTag of selectedRangeTags) {
        let [start, end] = getRangeOfTag(rangeTag);

        if (!inRange(start, limits.min, limits.max + 1) && !inRange(end, limits.min, limits.max)) continue;

        // Clamp range computations to only worry about valid numbers
        start = Math.max(start, limits.min);
        end = Math.min(end, limits.max);

        for (const realization of range(start, end + 1)) {
            if (!limits.invalid.has(realization)) {
                uniqueRealizations.add(realization);
            }
        }
    }

    return uniqueRealizations.size;
}

export type RealizationPickerProps = {
    selectedRangeTags?: readonly string[];
    initialRangeTags?: readonly string[];
    validRealizations?: readonly number[];
    debounceTimeMs?: number;
    onChange?: (selectedRangeTags: string[]) => void;
} & BaseComponentProps;
function RealizationPickerComponent(props: RealizationPickerProps, ref: React.ForwardedRef<HTMLDivElement>) {
    const debounceTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const [currentInputValue, setCurrentInputValue] = React.useState("");
    const [selectedRangeTags, setSelectedRangeTags] = React.useState<string[]>(
        props.initialRangeTags ? [...props.initialRangeTags] : [],
    );
    const [prevSelectedRangeTags, setPrevSelectedRangeTags] = React.useState<string[]>(
        props.selectedRangeTags ? [...props.selectedRangeTags] : [],
    );

    const realizationNumberLimits = React.useMemo<RealizationNumberLimits>(() => {
        const validRealizations = props.validRealizations ?? [];
        return {
            min: Math.min(...validRealizations),
            max: Math.max(...validRealizations),
            invalid: missingNumbers(validRealizations),
        };
    }, [props.validRealizations]);

    // Synchronize prop and states
    if (props.selectedRangeTags !== undefined && !isEqual(props.selectedRangeTags, prevSelectedRangeTags)) {
        setPrevSelectedRangeTags([...props.selectedRangeTags]);
        setSelectedRangeTags([...props.selectedRangeTags]);
    }

    const numSelectedRealizations = React.useMemo(
        () => calcNumberOfUniqueRealizations(selectedRangeTags, realizationNumberLimits),
        [selectedRangeTags, realizationNumberLimits],
    );

    function emitOnChange(newRangeTags: string[]) {
        if (!props.onChange) return;

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = setTimeout(() => {
            props.onChange!(newRangeTags);
        }, props.debounceTimeMs || 0);
    }

    function handlePaste(event: React.ClipboardEvent) {
        event.preventDefault();
        const pasteText = event.clipboardData.getData("text");
        const parsedSelections = textToRealizationSelection(pasteText, realizationNumberLimits);

        if (parsedSelections) {
            const newRangeTags = [...selectedRangeTags, ...parsedSelections];
            setSelectedRangeTags(newRangeTags);
            emitOnChange(newRangeTags);
        }
    }

    async function handleCopyTags(selectedRangeTags: string[]) {
        const stringifiedSelections = realizationSelectionToText(selectedRangeTags);
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

    function handleTagsChange(newRangeTags: string[]) {
        setSelectedRangeTags(newRangeTags);
        emitOnChange(newRangeTags);
    }

    return (
        <BaseComponent ref={ref} disabled={props.disabled}>
            <TagInput
                tags={selectedRangeTags}
                onTagsChange={handleTagsChange}
                onCopyTags={handleCopyTags}
                inputProps={{
                    value: currentInputValue,
                    className: "!py-1.5",
                    onValueChange: handleInputChange,
                    onPaste: handlePaste,
                }}
                renderTag={(tagProps) => (
                    <RealizationRangeTag realizationNumberLimits={realizationNumberLimits} {...tagProps} />
                )}
            />
            <div className="text-sm text-gray-500 text-right mt-2">
                {pluralize("realization", numSelectedRealizations)} selected
            </div>
        </BaseComponent>
    );
}

export const RealizationPicker = React.forwardRef(RealizationPickerComponent);
