import React from "react";

import type { BaseUIEvent } from "@base-ui/react";
import { Close } from "@mui/icons-material";
import { Key } from "ts-key-enum";

import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";
import { Direction, useListFocus } from "@lib/hooks/useListFocus";
import { useOptInControlledValue } from "@lib/hooks/useOptInControlledValue";
import { Button } from "@lib/newComponents/Button";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { RealizationNumberLimits } from "./_utils";
import { realizationSelectionToText, sanitizeRangeInput, textToRealizationSelection } from "./_utils";
import { AutoFitInput } from "./autoFitInput";
import { RealizationRangeTag } from "./RealizationRangeTag";

export type RealizationPickerProps = {
    disabled?: boolean;
    rangeValues?: readonly string[];
    initialRangeValues?: readonly string[];
    debounceTimeMs?: number;
    realizationNumberLimits: RealizationNumberLimits;
    onChange?: (selectedRangeTags: readonly string[]) => void;
};

function RealizationPickerComponent(props: RealizationPickerProps, ref: React.ForwardedRef<HTMLInputElement>) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => inputRef.current!);
    const rootHasFocusRef = React.useRef(false);

    const [selectedIndices, setSelectedIndices] = React.useState<number[]>([]);
    const [currentInputValue, setCurrentInputValue] = React.useState("");

    const [settledRangeValues, setRangeValues] = useOptInControlledValue<readonly string[]>(
        props.initialRangeValues ?? [],
        props.rangeValues,
        props.onChange,
    );

    const [rangeValues, setRangeValuesDebounced] = useDebouncedOnChange(
        settledRangeValues,
        setRangeValues,
        props.debounceTimeMs,
    );

    const listFocus = useListFocus(rangeValues.length, {
        onFocusChange(index) {
            if (index === -1 && rootHasFocusRef.current) inputRef.current?.focus();
        },
    });

    function handleInputChange(newValue: string) {
        const sanitizedValue = sanitizeRangeInput(newValue);
        if (sanitizedValue !== currentInputValue) {
            setCurrentInputValue(sanitizedValue);
        }
    }

    function updateTags(newRangeTags: string[]) {
        setRangeValuesDebounced(newRangeTags);
    }

    function handleInputKeyDown(evt: BaseUIEvent<React.KeyboardEvent<Element>>) {
        if (evt.defaultPrevented) return;
        if (!inputRef.current) return;

        if (currentInputValue && [Key.Enter, Key.Tab, ","].includes(evt.key)) {
            evt.preventDefault();
            addNewRange(currentInputValue);
            setCurrentInputValue("");
        } else if (evt.key === Key.Backspace) {
            if (selectedIndices.length) {
                removeSelectedValues();
            } else if (!currentInputValue && rangeValues.length) {
                evt.preventDefault();

                const newRanges = [...rangeValues];
                const [removedRange] = newRanges.splice(-1, 1);

                setCurrentInputValue(removedRange);
                updateTags(newRanges);
            }
        }
    }

    function addNewRange(newRange: string) {
        updateTags([...rangeValues, newRange]);
    }

    function changeRangeAtIndex(index: number, newValue: string) {
        const newRanges = [...rangeValues];
        newRanges[index] = newValue;
        updateTags(newRanges);
    }

    function removeRangeAtIndex(index: number) {
        const newRanges = [...rangeValues];
        newRanges.splice(index, 1);
        updateTags(newRanges);
        inputRef.current?.focus();
    }

    function resetSelect() {
        listFocus.clearFocus();
        setSelectedIndices([]);
    }

    function removeSelectedValues() {
        const newTags = rangeValues.filter((t, index) => !selectedIndices.includes(index));
        updateTags(newTags);
        resetSelect();
    }

    function onRootBlur(evt: React.FocusEvent) {
        if (!evt.currentTarget.contains(evt.relatedTarget)) {
            rootHasFocusRef.current = false;
            resetSelect();
        }
    }

    function moveFocusAndSelect(direction: Direction, isSelecting?: boolean) {
        const currentFocusedIndex = listFocus.focusedIndex;
        const atLastSelectable = currentFocusedIndex === rangeValues.length - 1;

        // The input value is focusable, but you should not be allowed to move to it's index while selecting
        if (!isSelecting && atLastSelectable && direction === Direction.Forwards) {
            resetSelect();
            return;
        }

        const nextIndex = listFocus.moveFocus(direction);

        if (nextIndex === null) {
            return;
        }

        if (isSelecting) {
            inputRef.current?.focus();
            // ! Input will update the focus index when focused, so we need to revert it back
            listFocus.setFocusedIndex(nextIndex);

            if (selectedIndices.includes(nextIndex) && selectedIndices.includes(currentFocusedIndex)) {
                setSelectedIndices((prev) => prev.filter((s) => s !== currentFocusedIndex));
            } else {
                setSelectedIndices((prev) => [...prev, nextIndex]);
            }
        } else {
            setSelectedIndices([]);
        }
    }

    function handlePaste(event: React.ClipboardEvent) {
        event.preventDefault();
        const pasteText = event.clipboardData.getData("text");
        const parsedSelections = textToRealizationSelection(pasteText, props.realizationNumberLimits);

        if (parsedSelections) {
            const newRangeTags = [...rangeValues, ...parsedSelections];
            updateTags(newRangeTags);
        }
    }

    async function handleCut(evt: React.ClipboardEvent) {
        await handleCopy(evt);
        removeSelectedValues();
    }

    async function handleCopy(evt: React.ClipboardEvent) {
        if (!selectedIndices.length) return;

        evt.stopPropagation();
        evt.preventDefault();
        const selectedTags = selectedIndices.map((i) => rangeValues[i]);

        const stringifiedSelections = realizationSelectionToText(selectedTags);
        if (stringifiedSelections) {
            await navigator.clipboard.writeText(stringifiedSelections);
        }
    }

    return (
        <div
            className="gap-x-2xs form-element px-xs py-xs flex w-full items-center"
            data-disabled={props.disabled ? "" : undefined}
        >
            <ul
                className={resolveClassNames(
                    "gap-x-3xs flex w-full flex-wrap",
                    // Equivalent to SELECTABLE_SIZES_CLASSNAMES["small"],
                    "min-h-selectable-sm text-body-sm",
                )}
                onFocus={() => (rootHasFocusRef.current = true)}
                onBlur={onRootBlur}
                onKeyDown={(evt) => {
                    const direction = {
                        [Key.ArrowLeft]: Direction.Backwards,
                        [Key.ArrowRight]: Direction.Forwards,
                    }[evt.key];

                    if (direction != null) {
                        evt.preventDefault();
                        moveFocusAndSelect(direction, evt.shiftKey);
                    }
                }}
            >
                {/* ! We place the input first, and then move it to the end with CSS. This is to allow the Field component automatically associate with it, as well as making it get focused first when tabbing into the picker. */}
                <li className="py-4xs order-1 grow align-middle">
                    <AutoFitInput
                        ref={inputRef}
                        disabled={props.disabled}
                        value={currentInputValue}
                        wrapperClassName="h-full"
                        type="text"
                        placeholder="Enter a realization number or range..."
                        minCharacterWidth={5}
                        onFocus={() => listFocus.setFocusedIndex(-1)}
                        onValueChange={handleInputChange}
                        onKeyDown={handleInputKeyDown}
                        onCut={handleCut}
                        onCopy={handleCopy}
                        onPaste={handlePaste}
                    />
                </li>

                {rangeValues.map((rangeValue, index) => (
                    <RealizationRangeTag
                        key={`${rangeValue}__${index}`}
                        value={rangeValue}
                        disabled={props.disabled}
                        selected={selectedIndices.includes(index)}
                        focusMovementDirection={listFocus.direction}
                        realizationNumberLimits={props.realizationNumberLimits}
                        focused={index === listFocus.focusedIndex}
                        onFocus={() => listFocus.focusItem(index)}
                        onMoveFocus={(direction) => moveFocusAndSelect(direction)}
                        onRemove={() => removeRangeAtIndex(index)}
                        onChange={(newValue) => changeRangeAtIndex(index, newValue)}
                    />
                ))}
            </ul>

            <Button
                size="small"
                variant="ghost"
                iconOnly
                layoutClassName="h-min"
                disabled={props.disabled}
                onClick={() => setRangeValuesDebounced([])}
            >
                <Close />
            </Button>
        </div>
    );
}

export const RealizationPicker = React.forwardRef(RealizationPickerComponent);
