import React from "react";

import { Close } from "@mui/icons-material";
import { inRange, omit } from "lodash";
import { Key } from "ts-key-enum";

import { IconButton } from "../IconButton";

import { DefaultTag } from "./private-components/DefaultTag";
import type { TagProps } from "./typesAndEnums";
import { Direction } from "./typesAndEnums";

// Limiting the valid inputs to be string only
type ExtendedInputElementProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue"> & {
    value?: string;
    defaultValue?: string;
    onValueChange?: (newValue: string) => void;
};

export type TagInputProps = {
    /** A list of tags to display in the input */
    tags: string[];
    /**
     * A string that will be used to separate tags when pasting or typing multiple tags at once. Defaults to `","`
     */
    separator?: string;
    /**
     * Props passed to component's internal input element. Can be used both as a controlled or uncontrolled input
     * `onValueChange` should be used to track general input changes, as opposed to `onChange`
     */
    inputProps?: ExtendedInputElementProps;

    /** */
    fullDeleteOnBackspace?: boolean;

    /**
     * A function that renders a custom tag component. It receives a `TagProps` object. If unspecified,
     * the default tag component will be used.
     */
    renderTag?: (props: TagProps) => React.ReactNode;
    /** Callback for adding a new tag */
    onAddTag?: (newTag: string) => void;
    /** Callback for removing a tag */
    onRemoveTag?: (indexToRemove: number, tag: string) => void;
    /** General callback for changes to the tags array.
     *
     * Note: this event is also fired when `onAddTag` and `onRemoveTag` is fired
     */
    onTagsChange?: (newTags: string[]) => void;
    /**
     * Callback when the user copies a set of tags. if omitted, the default implementation will copy the tags as a
     * list of tag-values separator, divided by the `separator` value.
     */
    onCopyTags?: (tags: string[]) => void;

    /** Callback to clear each item from the list */
    onClearTags?: () => void;
};

// Utility hook to manage an input that, like the native react-input, can be either
// controlled or uncontrolled, based on it's props.
function useUncontrolledInput(props: ExtendedInputElementProps) {
    const [internalValue, setInternalValue] = React.useState(props.value ?? props.defaultValue ?? "");

    const dynamicSetValue = React.useCallback(
        function dynamicSetValue(value: string) {
            if (props.value === undefined) {
                setInternalValue(value);
            } else {
                props.onValueChange?.(value);
            }
        },
        [props],
    );

    return [props.value ?? internalValue, dynamicSetValue] as const;
}

function TagInputComponent(props: TagInputProps, ref: React.ForwardedRef<HTMLUListElement>): React.ReactNode {
    const separatorOrDefault = props.separator ?? ",";
    const renderTagOrDefault = props.renderTag ?? ((tagProps) => <DefaultTag {...tagProps} />);

    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const [inputValue, setInputValue] = useUncontrolledInput(props.inputProps ?? {});

    const [focusedTagIndex, setFocusedTagIndex] = React.useState<number | null>(null);
    const [selectedTagIndices, setSelectedTagIndices] = React.useState<number[]>([]);

    const [focusMovementDirection, setFocusMovementDirection] = React.useState(Direction.None);

    // Safety-hatch in-case the currently focused tag index gets invalidated between renders.
    if (focusedTagIndex && focusedTagIndex > props.tags.length - 1) {
        setFocusedTagIndex(null);
        inputRef.current?.focus();
    }

    // ------------------------------------------------------------------------
    // - Event callbacks ------------------------------------------------------
    // Tag-selection/focus events
    function moveTagFocus(direction: Direction, isSelecting?: boolean) {
        const currentFocusedIndex = focusedTagIndex ?? props.tags.length;
        const nextIndex = currentFocusedIndex + direction;

        // const prevTag = props.tags[currentFocusedIndex];
        // const nextTag = props.tags[nextIndex];

        if (isSelecting) inputRef.current?.focus();

        if (inRange(nextIndex, 0, props.tags.length)) {
            if (isSelecting) {
                if (selectedTagIndices.includes(nextIndex) && selectedTagIndices.includes(currentFocusedIndex)) {
                    setSelectedTagIndices((prev) => prev.filter((s) => s !== currentFocusedIndex));
                } else {
                    setSelectedTagIndices((prev) => [...prev, nextIndex]);
                }
                // if (selectedTagIds.includes(getTagValue(nextTag)) && selectedTagIds.includes(getTagValue(prevTag)))
                //     setSelectedTagIds(selectedTagIds.filter((s) => s !== getTagValue(prevTag)));
                // else {
                //     setSelectedTagIds([...selectedTagIds, getTagValue(nextTag)]);
                // }
            } else {
                setSelectedTagIndices([]);
            }

            setFocusMovementDirection(direction);
            setFocusedTagIndex(nextIndex);
            // setFocusedTagValue(getTagValue(nextTag));
        } else if (nextIndex >= props.tags.length) {
            resetSelect();
            inputRef.current?.focus();
        }
    }

    function moveFocusToIndex(index: number) {
        setFocusedTagIndex(index);
    }

    function resetSelect() {
        setFocusedTagIndex(null);
        setSelectedTagIndices([]);
        setFocusMovementDirection(Direction.None);
    }

    // Tag management events
    function handleAddTag(newValue: string) {
        if (!newValue) return;

        // const newTag = { id: v4(), value: newValue };

        const newTags = [...props.tags, newValue];

        props.onAddTag?.(newValue);
        props.onTagsChange?.(newTags);
    }

    function handleAddTags(newValues: string[]) {
        props.onTagsChange?.([...props.tags, ...newValues]);
    }

    function handleUpdateTag(newValue: string, index: number) {
        const newTags = [...props.tags];
        newTags[index] = newValue;

        props.onTagsChange?.(newTags);
    }

    function handleRemoveTag(indexToRemove: number) {
        const newTags = [...props.tags];
        const [removedTag] = newTags.splice(indexToRemove, 1);

        props.onRemoveTag?.(indexToRemove, removedTag);
        props.onTagsChange?.(newTags);
    }

    async function removeSelectedTags() {
        const newTags = props.tags.filter((t, index) => !selectedTagIndices.includes(index));

        props.onTagsChange?.(newTags);

        setSelectedTagIndices([]);
        setFocusedTagIndex(null);
    }

    function clearTags() {
        resetSelect();
        props.onClearTags?.();
        props.onTagsChange?.([]);
        inputRef.current?.focus();
    }

    // Input events
    function handleKeyDown(evt: React.KeyboardEvent<HTMLInputElement>) {
        props.inputProps?.onKeyDown?.(evt);
        if (evt.defaultPrevented) return;

        if (!inputRef.current) return;

        const inputEl = inputRef.current;

        if (inputValue && [Key.Enter, Key.Tab, separatorOrDefault].includes(evt.key)) {
            handleAddTag(inputValue);

            setInputValue("");

            evt.preventDefault();
        } else if (Key.Backspace === evt.key) {
            if (selectedTagIndices.length) {
                removeSelectedTags();
                evt.preventDefault();
            } else if (!inputEl.value && focusedTagIndex != null) {
                handleRemoveTag(focusedTagIndex);
                evt.preventDefault();
            } else if (!inputEl.value && props.tags.length) {
                const lastTag = props.tags.at(-1)!;

                handleRemoveTag(props.tags.length - 1);
                if (!props.fullDeleteOnBackspace) setInputValue(lastTag);

                evt.preventDefault();
            }
        } else if (Key.ArrowLeft === evt.key) {
            if (inputEl.selectionStart === 0 && inputEl.selectionEnd === 0) {
                moveTagFocus(Direction.Backwards, evt.shiftKey);
                evt.preventDefault();
            }
        } else if (Key.ArrowRight === evt.key) {
            if (inputEl.selectionStart === inputEl.value.length && inputEl.selectionEnd === inputEl.value.length) {
                moveTagFocus(Direction.Forwards, evt.shiftKey);
                evt.preventDefault();
            }
        }
    }

    function handleInputChange(evt: React.ChangeEvent<HTMLInputElement>) {
        resetSelect();

        setInputValue(evt.target.value);
    }

    async function cutSelectedTags(evt: React.ClipboardEvent) {
        copySelectedTags(evt);
        removeSelectedTags();
    }

    async function copySelectedTags(evt: React.ClipboardEvent) {
        evt.stopPropagation();
        evt.preventDefault();

        const selectedTags = selectedTagIndices.map((index) => props.tags[index]);

        if (props.onCopyTags) {
            props.onCopyTags(selectedTags);
        } else {
            const copyData = selectedTags.join(separatorOrDefault);

            if (copyData) {
                await navigator.clipboard.writeText(copyData);
            }
        }
    }

    function handlePaste(evt: React.ClipboardEvent<HTMLInputElement>) {
        props.inputProps?.onPaste?.(evt);
        if (evt.defaultPrevented) return;

        evt.preventDefault();

        const pasteText = evt.clipboardData.getData("text");
        const tagValues = pasteText.trim().split(separatorOrDefault);

        handleAddTags(tagValues);
    }

    function handleInputFocus(evt: React.FocusEvent<HTMLInputElement>) {
        props.inputProps?.onFocus?.(evt);
        if (evt.defaultPrevented) return;

        setFocusedTagIndex(null);
    }

    // Other events
    function onRootBlur(evt: React.FocusEvent) {
        if (!evt.currentTarget.contains(evt.relatedTarget)) {
            resetSelect();
        }
    }

    return (
        <>
            <ul
                ref={ref}
                className="input-comp flex items-center gap-1 border border-gray-300 px-2 py-1 rounded focus-within:outline focus-within:outline-blue-500"
                onBlur={onRootBlur}
            >
                <div
                    className="grow flex gap-1 flex-wrap"
                    tabIndex={-1}
                    onFocus={() => inputRef.current?.focus()}
                    onCopy={copySelectedTags}
                    onCut={cutSelectedTags}
                >
                    {props.tags.map((t, index) => (
                        <React.Fragment key={index}>
                            {renderTagOrDefault({
                                tag: t,
                                separator: separatorOrDefault,
                                focused: index === focusedTagIndex,
                                focusMovementDirection: focusMovementDirection,
                                selected: selectedTagIndices.includes(index),
                                onMoveFocus: moveTagFocus,
                                onChange: (newTag) => handleUpdateTag(newTag, index),
                                onRemove: () => handleRemoveTag(index),
                                onFocus: () => moveFocusToIndex(index),
                            })}
                        </React.Fragment>
                    ))}
                    <li className="grow flex min-w-0 -my-1">
                        <input
                            ref={inputRef}
                            {...omit(props.inputProps, "onValueChange")}
                            className={`pr-2 py-1 grow outline-none min-w-0 w-0 ${props.inputProps?.className}`}
                            value={inputValue}
                            onChange={handleInputChange}
                            onPaste={handlePaste}
                            onKeyDown={handleKeyDown}
                            onFocus={handleInputFocus}
                        />
                    </li>
                </div>
                <IconButton
                    className="align-middle focus:outline-2 outline-blue-300"
                    title="Clear selection"
                    onClick={clearTags}
                >
                    <Close fontSize="inherit" />
                </IconButton>
            </ul>
        </>
    );
}

/**
 * A general form component for managing a list of tags. Contains an input field to create new
 * tags, and supports cut, copy and paste of the tags in it's list
 */
export const TagInput = React.forwardRef(TagInputComponent) as (
    props: TagInputProps & { ref?: React.Ref<HTMLUListElement> },
) => React.ReactElement;
