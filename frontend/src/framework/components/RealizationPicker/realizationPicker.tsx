import React from "react";

import { isEqual } from "lodash";
import { v4 } from "uuid";

import type { BaseComponentProps } from "@lib/components/BaseComponent";
import { BaseComponent } from "@lib/components/BaseComponent";
import { TagInput } from "@lib/components/TagInput/tagInput";

import { realizationSelectionToText, textToRealizationSelection, type Selection } from "./_utils";
import { RealizationRangeTag } from "./RealizationRangeTag";

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

    function handlePaste(event: React.ClipboardEvent) {
        event.preventDefault();

        const pasteText = event.clipboardData.getData("text");

        const parsedSelections = textToRealizationSelection(pasteText, props.validRealizations);

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
