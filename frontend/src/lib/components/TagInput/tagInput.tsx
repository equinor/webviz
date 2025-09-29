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

    /**
     * Ref to the internal input form element
     */
    inputRef?: React.RefObject<HTMLInputElement>;

    /**
     * Determines how deletions are handled when the input is empty and the user presses backspace.
     * - "soft" will remove the last tag (or selected tags) and add its contents to the input field (default)
     * - "hard" will fully remove the last tag (or selected tags)
     * - "none" will disable backspace tag removal altogether
     */
    backspaceDeleteMode?: "soft" | "hard" | "none";

    /**
     * Determines how tag selection (left/right arrows) is handled in the tag list.
     * - "multiple" allows multiple tags to be selected
     * - "single" allows only a single tag to be selected
     * - "none" will disable tag selection
     */
    tagListSelectionMode?: "none" | "single" | "multiple";

    /**
     * A placeholder to show in the input field. By default, the placeholder only shows if the tags list is empty
     */
    placeholder?: string;

    /**
     * If true, the inputs placeholder value will always be shown
     */
    alwaysShowPlaceholder?: boolean;

    /**
     * Validates a tag being added. If false is returned, the tag will not be added
     * @param tag A string tag
     * @returns `true` if the tag can be added
     */
    validateTag?: (tag: string) => boolean;

    /**
     * Callback for rendering tags in the list
     */
    makeLabel?: (tag: string) => string | undefined;

    /**
     * A function that renders the list of tags. If this is used, `renderTag` is not called
     */
    renderTags?: (tags: string[]) => React.ReactNode;

    /**
     * A function that renders a custom tag component. It receives a `TagProps` object. If unspecified,
     * the default tag component will be used.
     */
    renderTag?: (props: TagProps) => React.ReactNode;

    /** Callback for adding a new tag. */
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

function TagInputComponent(props: TagInputProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const separatorOrDefault = props.separator ?? ",";
    const backspaceDeleteModeOrDefault = props.backspaceDeleteMode ?? "soft";
    const tagListSelectionModeOrDefault = props.tagListSelectionMode ?? "multiple";
    const renderTagOrDefault = props.renderTag ?? ((tagProps) => <DefaultTag {...tagProps} />);

    const innerInputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(props.inputRef, () => innerInputRef.current!, []);
    const [inputValue, setInputValue] = useUncontrolledInput(props.inputProps ?? {});

    const [focusedTagIndex, setFocusedTagIndex] = React.useState<number | null>(null);
    const [selectedTagIndices, setSelectedTagIndices] = React.useState<number[]>([]);

    const [focusMovementDirection, setFocusMovementDirection] = React.useState(Direction.None);

    const inputPlaceholder = React.useMemo(() => {
        if (props.alwaysShowPlaceholder) return props.placeholder;
        if (!props.tags.length) return props.placeholder;
        return undefined;
    }, [props.alwaysShowPlaceholder, props.placeholder, props.tags.length]);

    // Safety-hatch in-case the currently focused tag index gets invalidated between renders.
    if (focusedTagIndex !== null && focusedTagIndex > props.tags.length - 1) {
        setFocusedTagIndex(null);
        innerInputRef.current?.focus();
    }

    // ------------------------------------------------------------------------
    // - Event callbacks ------------------------------------------------------
    // Tag-selection/focus events
    function moveTagFocus(direction: Direction, isSelecting?: boolean) {
        const currentFocusedIndex = focusedTagIndex ?? props.tags.length;
        const nextIndex = currentFocusedIndex + direction;
        isSelecting = isSelecting && tagListSelectionModeOrDefault === "multiple";

        if (isSelecting) innerInputRef.current?.focus();

        if (inRange(nextIndex, 0, props.tags.length)) {
            if (isSelecting && tagListSelectionModeOrDefault !== "none") {
                if (tagListSelectionModeOrDefault === "single") {
                    setSelectedTagIndices([nextIndex]);
                } else if (tagListSelectionModeOrDefault === "multiple") {
                    if (selectedTagIndices.includes(nextIndex) && selectedTagIndices.includes(currentFocusedIndex)) {
                        setSelectedTagIndices((prev) => prev.filter((s) => s !== currentFocusedIndex));
                    } else {
                        setSelectedTagIndices((prev) => [...prev, nextIndex]);
                    }
                }
            } else {
                setSelectedTagIndices([]);
            }

            setFocusMovementDirection(direction);
            setFocusedTagIndex(nextIndex);
        } else if (nextIndex >= props.tags.length) {
            resetSelect();
            innerInputRef.current?.focus();
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
        if (props.validateTag?.(newValue) === false) return;

        const newTags = [...props.tags, newValue];

        props.onAddTag?.(newValue);
        props.onTagsChange?.(newTags);
    }

    function handleAddTags(newValues: string[]) {
        newValues = newValues.filter((t) => props.validateTag?.(t) !== false);
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

    function removeSelectedTags() {
        const newTags = props.tags.filter((t, index) => !selectedTagIndices.includes(index));

        props.onTagsChange?.(newTags);

        setSelectedTagIndices([]);
        setFocusedTagIndex(null);
    }

    function clearTags() {
        resetSelect();
        props.onClearTags?.();
        props.onTagsChange?.([]);
        innerInputRef.current?.focus();
    }

    // Input events
    function handleKeyDown(evt: React.KeyboardEvent<HTMLInputElement>) {
        props.inputProps?.onKeyDown?.(evt);
        if (evt.defaultPrevented) return;

        if (!innerInputRef.current) return;

        const inputEl = innerInputRef.current;

        if (inputValue && [Key.Enter, Key.Tab, separatorOrDefault].includes(evt.key)) {
            handleAddTag(inputValue);

            setInputValue("");

            evt.preventDefault();
        } else if (Key.Backspace === evt.key && backspaceDeleteModeOrDefault !== "none") {
            if (selectedTagIndices.length) {
                // No good way to put multiple tags to a string, so soft
                // delete only works if a single item is selected
                if (backspaceDeleteModeOrDefault === "soft" && selectedTagIndices.length === 1) {
                    setInputValue(props.tags[selectedTagIndices[0]]);
                    resetSelect();
                }

                removeSelectedTags();
                evt.preventDefault();
            } else if (!inputEl.value && focusedTagIndex !== null) {
                // Handle focused tag deletion
                const tagToRemove = props.tags[focusedTagIndex];
                handleRemoveTag(focusedTagIndex);
                evt.preventDefault();

                // If soft delete, add the string
                if (backspaceDeleteModeOrDefault === "soft") {
                    setInputValue(tagToRemove);
                    resetSelect();
                }
            } else if (!inputEl.value && props.tags.length) {
                // Handle last tag deletion when nothing is focused
                const lastTag = props.tags.at(-1)!;
                handleRemoveTag(props.tags.length - 1);
                evt.preventDefault();

                if (backspaceDeleteModeOrDefault === "soft") {
                    setInputValue(lastTag);
                }
            }
        } else if (Key.ArrowLeft === evt.key && tagListSelectionModeOrDefault !== "none") {
            if (inputEl.selectionStart === 0 && inputEl.selectionEnd === 0) {
                moveTagFocus(Direction.Backwards, evt.shiftKey);
                evt.preventDefault();
            }
        } else if (Key.ArrowRight === evt.key && tagListSelectionModeOrDefault !== "none") {
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
        await copySelectedTags(evt);
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
            <div
                ref={ref}
                className="input-comp flex items-center gap-1 border border-gray-300 px-2 py-1.5 rounded focus-within:outline focus-within:outline-blue-500"
                onBlur={onRootBlur}
            >
                <ul
                    className="grow flex gap-1 flex-wrap min-w-0 "
                    tabIndex={-1}
                    onFocus={() => innerInputRef.current?.focus()}
                    onCopy={copySelectedTags}
                    onCut={cutSelectedTags}
                >
                    {props.renderTags
                        ? props.renderTags(props.tags)
                        : props.tags.map((t, index) => (
                              <React.Fragment key={index}>
                                  {renderTagOrDefault({
                                      tag: t,
                                      label: props.makeLabel?.(t),
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
                    <li className="relative grow flex -my-1 overflow-hidden">
                        {/* Invisible spacer-element. Used to  have the input wrap as it's value grows */}
                        {/* ! Classes that affect size should be present in both this and the input */}
                        <span
                            className={`--input-sizer invisible pointer-events-none select-none grow max-w-full py-1 ${props.inputProps?.className}`}
                            aria-hidden
                        >
                            {inputValue}
                            {/* Zero-space is used to avoid the span collapsing to height 0 if text is empty */}
                            <wbr />
                        </span>
                        <input
                            ref={innerInputRef}
                            placeholder={inputPlaceholder}
                            {...omit(props.inputProps, "onValueChange")}
                            className={`absolute inset-0 py-1 outline-none min-w-0 ${props.inputProps?.className}`}
                            value={inputValue}
                            // ! Each listener here should emit the event up
                            onChange={handleInputChange}
                            onPaste={handlePaste}
                            onKeyDown={handleKeyDown}
                            onFocus={handleInputFocus}
                        />
                    </li>
                </ul>
                <IconButton
                    className="align-middle focus:outline-2 outline-blue-300"
                    title="Clear selection"
                    onClick={clearTags}
                >
                    <Close fontSize="inherit" />
                </IconButton>
            </div>
        </>
    );
}

/**
 * A general form component for managing a list of tags. Contains an input field to create new
 * tags, and supports cut, copy and paste of the tags in it's list
 */
export const TagInput = React.forwardRef<HTMLDivElement, TagInputProps>(TagInputComponent);
