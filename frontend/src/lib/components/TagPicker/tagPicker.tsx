import React from "react";

import { clamp, isEqual } from "lodash";
import { Key } from "ts-key-enum";

import type { BaseComponentProps } from "../BaseComponent";
import { BaseComponent } from "../BaseComponent";
import type { TagInputProps } from "../TagInput";
import { TagInput } from "../TagInput";

import { useDebouncedStateEmit, useOnScreenChangeHandler } from "./hooks";
import { DefaultTagOption, type TagOptionProps } from "./private-components/defaultTagOption";
import type { ItemFocusMode } from "./private-components/dropdownItemList";
import { DropdownItemList } from "./private-components/dropdownItemList";

const TAG_OPTION_HEIGHT = 32;
const DROPDOWN_MAX_HEIGHT = TAG_OPTION_HEIGHT * 6;

const NO_MATCHING_TAGS_TEXT = "No matching options";
const NO_TAGS_TEXT = "No options";

export type TagOption<TValue extends string = string> = {
    label?: string;
    value: TValue;
};

export type TagPickerProps<TValue extends string = string> = {
    selection: TValue[];
    inputId?: string;
    wrapperId?: string;
    tagOptions: TagOption<TValue>[];
    placeholder?: string;
    showListAsSelectionCount?: boolean;
    debounceTimeMs?: number;
    dropdownMinWidth?: number;
    renderTagOption?: (props: TagOptionProps) => React.ReactNode;
    onChange?: (newSelection: TValue[]) => void;
} & Pick<TagInputProps, "renderTag" | "inputProps"> &
    BaseComponentProps;

export function TagPickerComponent(props: TagPickerProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactElement {
    const renderTagOptionOrDefault = props.renderTagOption ?? ((tagProps) => <DefaultTagOption {...tagProps} />);

    // --- Refs
    const tagInputRef = React.useRef<HTMLDivElement>(null);
    const filterInputRef = React.useRef<HTMLInputElement>(null);
    const dropdownRef = React.useRef<HTMLUListElement | null>(null);

    // --- State variables
    const [inputValue, setInputValue] = React.useState("");
    const [dropdownVisible, setDropdownVisible] = React.useState<boolean>(false);
    const [showInputAsFocused, setShowInputAsFocused] = React.useState(false);
    const [focusedItemIndex, setFocusedItemIndex] = React.useState<number>(-1);
    const [itemFocusMode, setItemFocusMode] = React.useState<ItemFocusMode>("keyboard");

    const [selection, debouncedOnChange, flushDebounce] = useDebouncedStateEmit(
        props.selection,
        props.onChange,
        props.debounceTimeMs,
    );

    // --- Derived values
    const tagInputPlaceholder = React.useMemo(() => {
        if (props.showListAsSelectionCount) return `${selection.length}/${props.tagOptions.length} selected`;
        if (props.placeholder && !selection.length) return props.placeholder;
        return undefined;
    }, [props.showListAsSelectionCount, props.tagOptions.length, props.placeholder, selection.length]);

    const tagLabelLookup = React.useMemo(
        () => Object.fromEntries(props.tagOptions.map((option) => [option.value, option.label])),
        [props.tagOptions],
    );

    const renderSelectedTags = React.useMemo(() => {
        if (props.showListAsSelectionCount) return () => null;
        return undefined;
    }, [props.showListAsSelectionCount]);

    const filteredTags = React.useMemo(() => {
        return props.tagOptions.filter((t) => {
            const tagString = t.label ?? String(t.value);
            return tagString.toLocaleLowerCase().includes(inputValue.toLocaleLowerCase());
        });
    }, [inputValue, props.tagOptions]);
    const [prevFilteredTags, setPrevFilteredTags] = React.useState(filteredTags);

    // Reset the dropdown item focus whenever filtered tags change, as the focused item likely went away.
    if (prevFilteredTags !== filteredTags) {
        const prevFocusedTag = prevFilteredTags[focusedItemIndex];
        // Avoid iterating a potentially long list if no item is focused
        const newFocusedIndex = prevFocusedTag ? filteredTags.findIndex((t) => t.value === prevFocusedTag.value) : -1;

        setPrevFilteredTags(filteredTags);
        setFocusedItemIndex(newFocusedIndex);
    }

    // --- Callbacks
    const handleInputFocus = React.useCallback(function handleInputFocus() {
        setDropdownVisible(true);
        setShowInputAsFocused(true);
    }, []);

    const handleFocusOut = React.useCallback(
        function handleFocusOut(evt: FocusEvent) {
            if (
                !tagInputRef.current?.contains(evt.relatedTarget as Node) &&
                !dropdownRef.current?.contains(evt.relatedTarget as Node)
            ) {
                setShowInputAsFocused(false);
                setDropdownVisible(false);
                flushDebounce();
            }
        },
        [flushDebounce],
    );

    // The dropdown gets remounted on show, so the ref will change every time.
    // We need to use a ref-callback here, to re-attach the listener
    const setDropdownRef = React.useCallback<React.RefCallback<HTMLUListElement>>(
        (el) => {
            dropdownRef.current = el;

            if (!dropdownRef.current) return;

            dropdownRef.current.tabIndex = -1;
            dropdownRef.current.addEventListener("focusout", handleFocusOut);
        },
        [handleFocusOut],
    );

    React.useEffect(
        function addFocusEventListenerEffect() {
            // Input element never changes during this components lifetime
            const tagInputEl = tagInputRef.current!;

            tagInputEl.addEventListener("focusout", handleFocusOut);
            return () => tagInputEl.removeEventListener("focusout", handleFocusOut);
        },
        [handleFocusOut],
    );

    const validateTag = React.useCallback(
        function validateTag(tag: string) {
            if (selection.some((v) => isEqual(v, tag))) return false;

            return props.tagOptions.some((t) => t.value === tag);
        },
        [selection, props.tagOptions],
    );

    const handleTagsChange = React.useCallback(
        function handleTagsChange(newTags: string[]) {
            filterInputRef.current?.focus();

            debouncedOnChange?.(newTags);
        },
        [debouncedOnChange],
    );

    const handleToggleTag = React.useCallback(
        function handleToggleTag(tag: string, listIndex: number) {
            const newSelection = [...selection];
            const tagIndex = selection.indexOf(tag);

            if (tagIndex === -1) {
                newSelection.push(tag);
            } else {
                newSelection.splice(tagIndex, 1);
            }

            setFocusedItemIndex(listIndex);
            setItemFocusMode("keyboard");
            handleTagsChange(newSelection);
        },
        [handleTagsChange, selection],
    );

    const handleInputKeyDown = React.useCallback(
        function handleInputKeyDown(evt: React.KeyboardEvent<HTMLInputElement>) {
            if (evt.key === Key.Escape) {
                evt.preventDefault();
                return setDropdownVisible(false);
            }

            if (evt.key === Key.Enter) {
                evt.preventDefault();

                if (!dropdownVisible) {
                    setDropdownVisible(true);
                } else if (focusedItemIndex !== -1) {
                    handleToggleTag(filteredTags[focusedItemIndex].value, focusedItemIndex);
                } else if (filteredTags.length === 1) {
                    handleToggleTag(filteredTags[0].value, 0);
                } else if (filteredTags.length > 0) {
                    setFocusedItemIndex(0);
                }

                return;
            }

            if (!dropdownVisible) return;
            // Change the selection. If the popover is closed, we immediately select the next option
            let selectionMove = 0;
            if (evt.key === "ArrowUp") selectionMove = -1;
            if (evt.key === "ArrowDown") selectionMove = 1;
            if (selectionMove) {
                evt.preventDefault();

                if (evt.shiftKey) selectionMove *= 10;

                setItemFocusMode("keyboard");
                setFocusedItemIndex((prev) => clamp(prev + selectionMove, 0, filteredTags.length - 1));
            }
        },
        [dropdownVisible, filteredTags, focusedItemIndex, handleToggleTag],
    );

    const makeTagLabel = React.useCallback((tag: string) => tagLabelLookup[tag], [tagLabelLookup]);

    useOnScreenChangeHandler(
        tagInputRef,
        React.useCallback(function handleAnchorOnScreenChange(isOnScreen: boolean) {
            if (!isOnScreen) setDropdownVisible(false);
        }, []),
    );

    const handleListOptionHover = React.useCallback(function handleListOptionHover(index: number) {
        setItemFocusMode("mouse");
        setFocusedItemIndex(index);
    }, []);

    return (
        <BaseComponent ref={ref} disabled={props.disabled}>
            <TagInput
                ref={tagInputRef}
                inputRef={filterInputRef}
                placeholder={tagInputPlaceholder}
                tags={selection}
                showAsFocused={showInputAsFocused}
                alwaysShowPlaceholder={props.showListAsSelectionCount}
                backspaceDeleteMode={props.showListAsSelectionCount ? "none" : "hard"}
                tagListSelectionMode={props.showListAsSelectionCount ? "none" : "multiple"}
                makeLabel={makeTagLabel}
                validateTag={validateTag}
                renderTag={props.renderTag}
                renderTags={renderSelectedTags}
                onTagsChange={handleTagsChange}
                inputProps={{
                    id: props.inputId,
                    value: inputValue,
                    onValueChange: setInputValue,
                    onFocus: handleInputFocus,
                    onKeyDown: handleInputKeyDown,
                    ...props.inputProps,
                }}
            />

            {dropdownVisible && (
                <DropdownItemList<TagOption>
                    ref={setDropdownRef}
                    anchorElRef={tagInputRef}
                    items={filteredTags}
                    optionHeight={TAG_OPTION_HEIGHT}
                    itemFocusIndex={focusedItemIndex}
                    itemFocusMode={itemFocusMode}
                    dropdownMaxHeight={DROPDOWN_MAX_HEIGHT}
                    emptyListText={props.tagOptions.length === 0 ? NO_TAGS_TEXT : NO_MATCHING_TAGS_TEXT}
                    minWidth={props.dropdownMinWidth}
                    renderItem={(option, index) => (
                        <React.Fragment key={index}>
                            {renderTagOptionOrDefault({
                                value: option.value,
                                label: option.label,
                                isSelected: selection.includes(option.value),
                                isFocused: focusedItemIndex === index,
                                height: TAG_OPTION_HEIGHT,
                                onToggle: () => handleToggleTag(option.value, index),
                                onHover: () => handleListOptionHover(index),
                            })}
                        </React.Fragment>
                    )}
                />
            )}
        </BaseComponent>
    );
}

export const TagPicker = React.forwardRef(TagPickerComponent) as <T extends string = string>(
    props: TagPickerProps<T> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement;
