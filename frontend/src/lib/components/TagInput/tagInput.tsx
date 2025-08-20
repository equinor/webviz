import React from "react";

import { Close } from "@mui/icons-material";
import { inRange } from "lodash";
import { Key } from "ts-key-enum";
import { v4 } from "uuid";

import { IconButton } from "../IconButton";

import { DefaultTag } from "./private-components/DefaultTag";
import type { TagProps, Tag } from "./typesAndEnums";
import { Direction } from "./typesAndEnums";

// Limiting the valid inputs to be string only
type ExtendedInputElementProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue"> & {
    value?: string;
    defaultValue?: string;
    onValueChange?: (newValue: string) => void;
};

export type TagInputProps = {
    /** A list of tags to display in the input */
    tags: Tag[];
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
     * A function that renders a custom tag component. It receives a `TagProps` object. If unspecified,
     * the default tag component will be used.
     */
    renderTag?: (props: TagProps) => React.ReactNode;
    /** Callback for adding a new tag */
    onAddTag?: (newTag: Tag) => void;
    /** Callback for removing a tag */
    onRemoveTag?: (tagToRemove: Tag) => void;
    /** General callback for changes to the tags array.
     *
     * Note: this event is also fired when `onAddTag` and `onRemoveTag` is fired
     */
    onTagsChange?: (newTags: Tag[]) => void;
    /**
     * Callback when the user copies a set of tags. if omitted, the default implementation will copy the tags as a
     * list of tag-values separator, divided by the `separator` value.
     * @param tags
     * @returns
     */
    onCopyTags?: (tags: Tag[]) => void;
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

    const [focusedTagId, setFocusedTagId] = React.useState<string | null>(null);
    const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([]);
    const [focusMovementDirection, setFocusMovementDirection] = React.useState(Direction.None);

    const focusedTag = React.useMemo(() => {
        return props.tags.find((t) => t.id === focusedTagId) ?? null;
    }, [focusedTagId, props.tags]);

    const selectedTags = React.useMemo(() => {
        return props.tags.filter((tag) => selectedTagIds.includes(tag.id));
    }, [props.tags, selectedTagIds]);

    // Safety-hatch in-case the currently focused tag gets removed between renders. For example: the RealizationPicker
    // component regenerates IDs whenever new tags are added externally, so we cant keep focus when it
    if (focusedTagId && !focusedTag) {
        setFocusedTagId(null);
        inputRef.current?.focus();
    }

    // ------------------------------------------------------------------------
    // - Event callbacks ------------------------------------------------------
    // Tag-selection/focus events
    function moveTagFocus(direction: Direction, isSelecting?: boolean) {
        const currentSelectionIndex = focusedTagId
            ? props.tags.findIndex((t) => t.id === focusedTagId)
            : props.tags.length;

        const nextIndex = currentSelectionIndex + direction;

        const prevTag = props.tags[currentSelectionIndex];
        const nextTag = props.tags[nextIndex];

        if (isSelecting) inputRef.current?.focus();

        if (inRange(nextIndex, 0, props.tags.length)) {
            if (isSelecting) {
                if (selectedTagIds.includes(nextTag.id) && selectedTagIds.includes(prevTag.id))
                    setSelectedTagIds(selectedTagIds.filter((s) => s !== prevTag.id));
                else {
                    setSelectedTagIds([...selectedTagIds, nextTag.id]);
                }
            } else {
                setSelectedTagIds([]);
            }

            setFocusMovementDirection(direction);
            setFocusedTagId(nextTag.id);
        } else if (nextIndex >= props.tags.length) {
            resetSelect();
            inputRef.current?.focus();
        }
    }

    function moveFocusToTag(tag: Tag) {
        setFocusedTagId(tag.id);
    }

    function resetSelect() {
        setFocusedTagId(null);
        setSelectedTagIds([]);
        setFocusMovementDirection(Direction.None);
    }

    // Tag management events
    function handleAddTag(newValue: string) {
        if (!newValue) return;

        const newTag = { id: v4(), value: newValue };

        const newTags = [...props.tags, newTag];

        props.onAddTag?.(newTag);
        props.onTagsChange?.(newTags);
    }

    function handleAddTags(newValues: string[]) {
        const newTags = newValues.map((value) => ({ id: v4(), value }));

        props.onTagsChange?.([...props.tags, ...newTags]);
    }

    function handleUpdateTag(newTag: Tag) {
        const newTags = props.tags.map((t) => (t.id === newTag.id ? { ...t, ...newTag } : t));

        props.onTagsChange?.(newTags);
    }

    function handleRemoveTag(tagToRemove: Tag) {
        const newTags = props.tags.filter((t) => t.id !== tagToRemove.id);

        if (tagToRemove.id === focusedTagId) moveTagFocus(Direction.Backwards);

        props.onRemoveTag?.(tagToRemove);
        props.onTagsChange?.(newTags);
    }

    function handleRemoveTagsById(tagIds: string[]) {
        const newTags = props.tags.filter((t) => !tagIds.includes(t.id));

        props.onTagsChange?.(newTags);
        setSelectedTagIds(selectedTagIds.filter((id) => !tagIds.includes(id)));

        if (focusedTagId && tagIds.includes(focusedTagId)) {
            moveTagFocus(Direction.Backwards);
        }
    }

    function clearTags() {
        resetSelect();
        props.onTagsChange?.([]);
        inputRef.current?.focus();
    }

    // Input events
    function handleKeyDown(evt: React.KeyboardEvent<HTMLInputElement>) {
        if (!inputRef.current) return;

        const inputEl = inputRef.current;

        if (inputValue && [Key.Enter, Key.Tab, separatorOrDefault].includes(evt.key)) {
            handleAddTag(inputValue);

            setInputValue("");

            evt.preventDefault();
        } else if (Key.Backspace === evt.key) {
            if (selectedTagIds.length) {
                handleRemoveTagsById(selectedTagIds);
                evt.preventDefault();
            } else if (!inputEl.value && focusedTag) {
                handleRemoveTag(focusedTag);
                evt.preventDefault();
            } else if (!inputEl.value && props.tags.length) {
                const lastTag = props.tags.at(-1)!;

                handleRemoveTag(lastTag);
                setInputValue(lastTag.value);

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

        handleRemoveTagsById(selectedTagIds);
    }

    async function copySelectedTags(evt: React.ClipboardEvent) {
        evt.stopPropagation();
        evt.preventDefault();

        if (props.onCopyTags) {
            props.onCopyTags(selectedTags);
        } else {
            const copyData = selectedTags.map((t) => t.value).join(separatorOrDefault);

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
                className="input-comp flex items-center gap-1 border border-gray-300 px-2 py-1 rounded focus-within:outline-blue-300"
                onBlur={onRootBlur}
            >
                <div
                    className="grow flex gap-1 flex-wrap"
                    tabIndex={-1}
                    onFocus={() => inputRef.current?.focus()}
                    onCopy={copySelectedTags}
                    onCut={cutSelectedTags}
                >
                    {props.tags.map((t) =>
                        renderTagOrDefault({
                            tag: t,
                            separator: separatorOrDefault,
                            focused: t.id === focusedTagId && !selectedTagIds.length,
                            focusMovementDirection: focusMovementDirection,
                            selected: selectedTagIds.includes(t.id),
                            onChange: handleUpdateTag,
                            onMoveFocus: moveTagFocus,
                            onRemove: () => handleRemoveTag(t),
                            onFocus: () => moveFocusToTag(t),
                        }),
                    )}
                    <li className="grow flex min-w-0 -my-1">
                        <input
                            ref={inputRef}
                            {...props.inputProps}
                            className={`pr-2 py-1 grow outline-none ${props.inputProps?.className}`}
                            value={inputValue}
                            onChange={handleInputChange}
                            onPaste={handlePaste}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setFocusedTagId(null)}
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
export const TagInput = React.forwardRef(TagInputComponent);
