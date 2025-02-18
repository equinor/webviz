import React from "react";

import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import { getTextWidthWithFont } from "@lib/utils/textSize";
import { ArrowDropDown, ArrowDropUp, ExpandLess, ExpandMore } from "@mui/icons-material";

import _ from "lodash";

import { BaseComponent, BaseComponentProps } from "../BaseComponent";
import { IconButton } from "../IconButton";
import { Input } from "../Input";
import { Virtualization } from "../Virtualization";

export type DropdownOptionGroup<TValue = string> = {
    label: string;
    options: DropdownOption<TValue>[];
    adornment?: React.ReactNode;
};

export type DropdownOption<TValue = string> = {
    value: TValue;
    label: string;
    adornment?: React.ReactNode;
    hoverText?: string;
    disabled?: boolean;
};

export type DropdownOptionOrGroup<TValue> = DropdownOption<TValue> | DropdownOptionGroup<TValue>;

export type DropdownProps<TValue = string> = {
    id?: string;
    wrapperId?: string;
    options: DropdownOptionOrGroup<TValue>[];
    value?: TValue;
    filter?: boolean;
    width?: string | number;
    showArrows?: boolean;
    debounceTimeMs?: number;
    placeholder?: string;
    popoverMaxWidth?: number;
    onChange?: (value: TValue) => void;
} & BaseComponentProps;

const MIN_HEIGHT = 200;
const OPTION_HEIGHT = 32;
const DEFAULT_POPOVER_MAX_WIDTH = 500;

type DropdownRect = {
    left?: number;
    top?: number;
    right?: number;
    width: number;
    height: number;
    minWidth: number;
};

enum ItemType {
    OPTION = "option",
    GROUP_TITLE = "group_title",
}

type OptionItem<TValue> = {
    type: ItemType.OPTION;
    // Reference to group. Used to get the icon and adding some styling
    parent?: DropdownOptionGroup;
} & DropdownOption<TValue>;

type GroupTitle<TValue> = {
    type: ItemType.GROUP_TITLE;
    parentGroup?: never;
} & DropdownOptionGroup<TValue>;

type OptionOrTitle<TValue> = OptionItem<TValue> | GroupTitle<TValue>;

const noMatchingOptionsText = "No matching options";
const noOptionsText = "No options";

function isDropdownOptionGroup<T>(optionOrGroup: DropdownOptionOrGroup<T>): optionOrGroup is DropdownOptionGroup<T> {
    return Object.hasOwn(optionOrGroup, "options");
}

function isOptionOfValue<T>(opt: OptionOrTitle<T>, targetValue: T): opt is OptionItem<T> {
    if (opt.type === ItemType.GROUP_TITLE) return false;
    return _.isEqual(opt.value, targetValue);
}

function makeOptionListItemsRecursively<TValue>(
    options: DropdownOptionOrGroup<TValue>[],
    filter?: string | null,
    parentGroup?: DropdownOptionGroup<TValue>
): OptionOrTitle<TValue>[] {
    return options.flatMap((option) => {
        if (isDropdownOptionGroup(option)) {
            const groupTitle = {
                ...option,
                type: ItemType.GROUP_TITLE,
                // Transform here instead of with CSS to allow size estimations
                label: option.label.toUpperCase(),
            } as OptionOrTitle<TValue>;

            // Recursively make entries for this group's items
            const optionItems = makeOptionListItemsRecursively(option.options, filter, option);

            if (!optionItems.length) return [];
            return [groupTitle, ...optionItems];
        }

        // Don't include the item if it's filtered away
        if (filter && !option.label.includes(filter)) return [];

        const optionItem = { type: ItemType.OPTION, parent: parentGroup, ...option } as OptionOrTitle<TValue>;

        return [optionItem];
    });
}

function findValidDropdownIndex(itemList: OptionOrTitle<any>[], currentIdx: number, increment: number): number {
    if (!itemList.length) return -1;

    const direction = Math.sign(increment);
    let adjustedIndex = currentIdx + increment;
    adjustedIndex = _.clamp(adjustedIndex, 0, itemList.length - 1);

    // Bump the selection one step further if the target isn't a valid option
    // ! Assumes there can never be two group titles in a row
    if (itemList[adjustedIndex].type !== ItemType.OPTION) {
        if (adjustedIndex === 0) return 1;

        adjustedIndex += direction;
        adjustedIndex = _.clamp(adjustedIndex, 0, itemList.length - 1);
    }

    if (itemList[adjustedIndex].type !== ItemType.OPTION) {
        throw new Error("Expected option item to follow non-option item!");
    }

    return adjustedIndex;
}

function DropdownComponent<TValue = string>(props: DropdownProps<TValue>, ref: React.ForwardedRef<HTMLDivElement>) {
    const { onChange } = props;

    const popoverMaxWidthOrDefault = props.popoverMaxWidth ?? DEFAULT_POPOVER_MAX_WIDTH;

    const valueWithDefault = props.value ?? null;
    const [prevValue, setPrevValue] = React.useState<TValue | null>(props.value ?? null);

    const [filter, setFilter] = React.useState<string | null>(null);
    const [prevFilter, setPrevFilter] = React.useState<string | null>(filter);

    const allOptionsWithSeparators = React.useMemo(
        () => makeOptionListItemsRecursively(props.options),
        [props.options]
    );
    const filteredOptionsWithSeparators = React.useMemo(() => {
        if (!filter) return allOptionsWithSeparators;
        return makeOptionListItemsRecursively(props.options, filter);
    }, [props.options, allOptionsWithSeparators, filter]);

    const [dropdownVisible, setDropdownVisible] = React.useState<boolean>(false);
    const [dropdownRect, setDropdownRect] = React.useState<DropdownRect>({
        width: 0,
        minWidth: 0,
        height: 0,
    });

    const [selection, setSelection] = React.useState<TValue | null>(props.value ?? null);
    const [selectionIndex, setSelectionIndex] = React.useState<number>(-1);
    const [optionIndexWithFocus, setOptionIndexWithFocus] = React.useState<number>(-1);
    const [startIndex, setStartIndex] = React.useState<number>(0);
    const [keyboardFocus, setKeyboardFocus] = React.useState<boolean>(false);

    const inputRef = React.useRef<HTMLInputElement>(null);
    const inputWrapperRef = React.useRef<HTMLDivElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const inputBoundingRect = useElementBoundingRect(inputWrapperRef);

    // Sets the currently focused item as the selected item
    const setOptionIndexWithFocusToCurrentSelection = React.useCallback(
        function handleFilteredOptionsChange() {
            const index = filteredOptionsWithSeparators.findIndex((option) =>
                isOptionOfValue(option, valueWithDefault)
            );

            setSelectionIndex(index);
            setOptionIndexWithFocus(index);
        },
        [filteredOptionsWithSeparators, valueWithDefault]
    );

    const firstItemIsGroupTitle = allOptionsWithSeparators[selectionIndex]?.type === ItemType.GROUP_TITLE;

    // Value changed externally, update indexes to match the new value
    if (!_.isEqual(prevValue, valueWithDefault)) {
        setSelection(valueWithDefault);
        setPrevValue(valueWithDefault);
        setSelectionIndex(allOptionsWithSeparators.findIndex((option) => isOptionOfValue(option, valueWithDefault)));
    }

    // Filter string changed
    if (filter !== prevFilter) {
        setOptionIndexWithFocusToCurrentSelection();
        setPrevFilter(filter);
    }

    const closePopover = React.useCallback(function closePopover() {
        setDropdownVisible(false);
        setFilter(null);
        setOptionIndexWithFocus(-1);
    }, []);

    React.useEffect(function mountEffect() {
        return function handleUnmount() {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    React.useEffect(
        function setupInputWrapperFocusOutListener() {
            function handleWrapperFocusOut(event: FocusEvent) {
                if (
                    !inputWrapperRef.current?.contains(event.relatedTarget as Node) &&
                    !dropdownRef.current?.contains(event.relatedTarget as Node)
                ) {
                    closePopover();
                }
            }

            // Adding listener to the *wrapper*, since focus might move to adornments
            const dropdownWrapper = inputWrapperRef.current;
            dropdownWrapper?.addEventListener("focusout", handleWrapperFocusOut);

            return function removeInputWrapperFocusOutListener() {
                dropdownWrapper?.removeEventListener("focusout", handleWrapperFocusOut);
            };
        },
        [closePopover]
    );

    React.useEffect(
        function updateDropdownRectWidthEffect() {
            let longestOptionWidth = allOptionsWithSeparators.reduce((prev, current) => {
                const { type, label, adornment } = current;

                // ! The separator text gets rendered with text-xs
                const fontSize = type === ItemType.GROUP_TITLE ? 0.75 : 1;

                const labelWidth = getTextWidthWithFont(label, "Equinor", fontSize);
                const adornmentWidth = adornment ? convertRemToPixels((5 + 2) / 4) : 0;
                const totalWidth = labelWidth + adornmentWidth;

                if (totalWidth > prev) {
                    return totalWidth;
                }
                return prev;
            }, 0);

            if (longestOptionWidth === 0) {
                if (allOptionsWithSeparators.length === 0 || filter === "") {
                    longestOptionWidth = getTextWidthWithFont(noOptionsText, "Equinor", 1);
                } else {
                    longestOptionWidth = getTextWidthWithFont(noMatchingOptionsText, "Equinor", 1);
                }
            }

            // Make sure the width doesn't get too large
            longestOptionWidth = Math.min(longestOptionWidth, popoverMaxWidthOrDefault);

            setDropdownRect((prev) => ({ ...prev, width: longestOptionWidth + 32 }));
        },
        [allOptionsWithSeparators, filter, popoverMaxWidthOrDefault]
    );

    React.useEffect(
        function computeDropdownRectEffect() {
            if (dropdownVisible) {
                const bodyClientBoundingRect = document.body.getBoundingClientRect();

                const preferredHeight =
                    Math.min(
                        MIN_HEIGHT,
                        Math.max(filteredOptionsWithSeparators.length * OPTION_HEIGHT, OPTION_HEIGHT)
                    ) + 2;

                if (inputBoundingRect && bodyClientBoundingRect) {
                    const newDropdownRect: DropdownRect = {
                        minWidth: inputBoundingRect.width,
                        width: dropdownRect.width,
                        height: preferredHeight,
                    };

                    if (inputBoundingRect.y + inputBoundingRect.height + preferredHeight > window.innerHeight) {
                        const height = Math.min(inputBoundingRect.y, preferredHeight);
                        newDropdownRect.top = inputBoundingRect.y - height;
                        newDropdownRect.height = height;
                    } else {
                        newDropdownRect.top = inputBoundingRect.y + inputBoundingRect.height;
                        newDropdownRect.height = Math.min(
                            preferredHeight,
                            window.innerHeight - inputBoundingRect.y - inputBoundingRect.height
                        );
                    }
                    if (inputBoundingRect.x + inputBoundingRect.width > window.innerWidth / 2) {
                        newDropdownRect.right = window.innerWidth - (inputBoundingRect.x + inputBoundingRect.width);
                    } else {
                        newDropdownRect.left = inputBoundingRect.x;
                    }

                    setDropdownRect((prev) => ({ ...newDropdownRect, width: prev.width }));

                    const selectedIndex = filteredOptionsWithSeparators.findIndex((opt) =>
                        isOptionOfValue(opt, selection)
                    );
                    const selectedIndexOrDefault = selectedIndex !== -1 ? selectedIndex : 0;
                    const visibleOptions = Math.round(preferredHeight / OPTION_HEIGHT / 2);

                    setStartIndex(Math.max(0, selectedIndexOrDefault - visibleOptions));
                    setOptionIndexWithFocusToCurrentSelection();
                }
            }
        },
        [
            inputBoundingRect,
            dropdownVisible,
            filteredOptionsWithSeparators,
            selection,
            dropdownRect.width,
            popoverMaxWidthOrDefault,
            setOptionIndexWithFocusToCurrentSelection,
        ]
    );

    const handleOnChange = React.useCallback(
        function handleOnChange(value: TValue) {
            if (!onChange) {
                return;
            }

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            if (!props.debounceTimeMs) {
                onChange(value);
                return;
            }

            debounceTimerRef.current = setTimeout(() => {
                onChange(value);
            }, props.debounceTimeMs);
        },
        [onChange, props.debounceTimeMs]
    );

    const handleOptionClick = React.useCallback(
        function handleOptionClick(value: TValue) {
            setSelection(value);
            setSelectionIndex(allOptionsWithSeparators.findIndex((option) => isOptionOfValue(option, value)));
            closePopover();
            handleOnChange(value);
        },
        [allOptionsWithSeparators, handleOnChange, closePopover]
    );

    React.useEffect(
        function addKeyDownEventHandlerEffect() {
            function handleKeyDown(e: KeyboardEvent) {
                // Close the dropdown
                if (dropdownVisible && e.key === "Escape") {
                    closePopover();
                }

                // Select the currently highlighted element
                if (e.key === "Enter" && dropdownRef.current && dropdownVisible) {
                    e.preventDefault();
                    const option = filteredOptionsWithSeparators[keyboardFocus ? optionIndexWithFocus : selectionIndex];
                    if (option && option.type === ItemType.OPTION && !option.disabled) {
                        handleOptionClick(option.value);
                    }
                }

                // Change the selection. If the popover is closed, we immediately select the next option
                let selectionMove = 0;
                if (e.key === "ArrowUp") selectionMove = -1;
                if (e.key === "ArrowDown") selectionMove = 1;
                if (selectionMove) {
                    e.preventDefault();
                    const currentIndex = optionIndexWithFocus === -1 ? selectionIndex : optionIndexWithFocus;
                    const newSelectionIndex = findValidDropdownIndex(
                        allOptionsWithSeparators,
                        currentIndex,
                        selectionMove
                    );

                    if (!dropdownVisible || !dropdownRef.current) {
                        // Popover is closed, select the next index immediately
                        const option = allOptionsWithSeparators[newSelectionIndex] as OptionItem<TValue>;
                        handleOptionClick(option.value);
                    } else {
                        // Popover is open, move focus within options list
                        setOptionIndexWithFocus(newSelectionIndex);
                        setKeyboardFocus(true);

                        // Current start for virtualization index
                        const virtualizationTopIndex = Math.round(dropdownRef.current!.scrollTop / OPTION_HEIGHT);
                        const virtualizationBottomIndex = virtualizationTopIndex + MIN_HEIGHT / OPTION_HEIGHT - 1;

                        const scrollToTop = currentIndex === 1 && newSelectionIndex === 1;
                        const newStartIndex = newSelectionIndex - (scrollToTop ? 1 : 0);

                        if (newStartIndex < virtualizationTopIndex) {
                            setStartIndex(newStartIndex);
                        } else if (newStartIndex >= virtualizationBottomIndex) {
                            setStartIndex(Math.max(0, newStartIndex - MIN_HEIGHT / OPTION_HEIGHT + 1));
                        }
                    }
                }
            }

            const dropdownInput = inputRef.current;
            const dropdownPopover = dropdownRef.current;

            dropdownInput?.addEventListener("keydown", handleKeyDown);

            // Also add listeners to the popover itself, if the user somehow moves their focus to it (happens if they click the group titles)
            // Tabindex needed to allow keydown events on popover
            if (dropdownPopover) dropdownPopover.tabIndex = -1;
            dropdownPopover?.addEventListener("keydown", handleKeyDown);

            return function removeKeyDownEventHandler() {
                dropdownInput?.removeEventListener("keydown", handleKeyDown);
                dropdownPopover?.removeEventListener("keydown", handleKeyDown);
            };
        },
        [
            allOptionsWithSeparators,
            filteredOptionsWithSeparators,
            dropdownVisible,
            selectionIndex,
            optionIndexWithFocus,
            keyboardFocus,
            closePopover,
            handleOptionClick,
        ]
    );

    const handleInputClick = React.useCallback(function handleInputClick() {
        setDropdownVisible(true);
    }, []);

    const handleInputChange = React.useCallback(function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
        setFilter(event.target.value);
    }, []);

    const handlePointerOver = React.useCallback(function handlePointerOver(index: number) {
        setOptionIndexWithFocus(index);
        setKeyboardFocus(false);
    }, []);

    function makeInputValue() {
        if (dropdownVisible && filter !== null) {
            return filter;
        }
        return allOptionsWithSeparators.find((opt) => isOptionOfValue(opt, selection))?.label || "";
    }

    function makeInputAdornment() {
        if (dropdownVisible && filter !== null) {
            return null;
        }

        const selectedOption = allOptionsWithSeparators.find((opt): opt is OptionItem<TValue> =>
            isOptionOfValue(opt, selection)
        );

        // Prioritize own adornment, fallback to parent group, if any
        const adornment = selectedOption?.adornment || selectedOption?.parent?.adornment;

        if (!adornment) return null;
        return <span className="align-sub max-h-5 max-w-5 overflow-hidden">{adornment}</span>;
    }

    function handleSelectPreviousOption() {
        const newIndex = findValidDropdownIndex(allOptionsWithSeparators, selectionIndex, -1);
        const newItem = allOptionsWithSeparators[newIndex] as OptionItem<TValue>;

        const newValue = newItem.value;
        setSelectionIndex(newIndex);
        setSelection(newValue);
        handleOnChange(newValue);
        setOptionIndexWithFocus(-1);
    }

    function handleSelectNextOption() {
        const newIndex = findValidDropdownIndex(allOptionsWithSeparators, selectionIndex, 1);
        const newItem = allOptionsWithSeparators[newIndex] as OptionItem<TValue>;

        const newValue = newItem.value;
        setSelectionIndex(newIndex);
        setSelection(newValue);
        handleOnChange(newValue);
        setOptionIndexWithFocus(-1);
    }

    function renderItem(item: OptionOrTitle<TValue>, index: number) {
        if (item.type === ItemType.GROUP_TITLE) {
            return <GroupTitle key={`${item.label}-${index}`} {...item} />;
        } else {
            return (
                <OptionItem
                    key={`${item.value}`}
                    isSelected={_.isEqual(selection, item.value)}
                    isFocused={optionIndexWithFocus === index}
                    isInGroup={!!item.parent}
                    {...item}
                    onSelect={handleOptionClick}
                    onPointerOver={() => handlePointerOver(index)}
                />
            );
        }
    }

    return (
        <BaseComponent ref={ref} disabled={props.disabled}>
            <div style={{ width: props.width }} id={props.wrapperId} className="flex hover input-comp rounded">
                <div className="flex-grow">
                    <Input
                        id={props.id}
                        ref={inputWrapperRef}
                        inputRef={inputRef}
                        error={
                            !!selection &&
                            !allOptionsWithSeparators.find((option) => isOptionOfValue(option, selection)) &&
                            allOptionsWithSeparators.length > 0
                        }
                        startAdornment={makeInputAdornment()}
                        endAdornment={
                            <IconButton
                                size="small"
                                className="align-sub"
                                onClick={() => setDropdownVisible((prev) => !prev)}
                            >
                                {dropdownVisible ? (
                                    <ExpandLess fontSize="inherit" />
                                ) : (
                                    <ExpandMore fontSize="inherit" />
                                )}
                            </IconButton>
                        }
                        value={makeInputValue()}
                        rounded={props.showArrows ? "left" : "all"}
                        placeholder={props.placeholder}
                        onClick={() => handleInputClick()}
                        onFocus={() => setDropdownVisible(true)}
                        onChange={handleInputChange}
                    />
                </div>
                {props.showArrows && (
                    <div className="flex flex-col h-full text-xs rounded-r">
                        <div
                            className={resolveClassNames(
                                "border border-gray-300 hover:bg-blue-100 rounded-tr cursor-pointer",
                                {
                                    "pointer-events-none": selectionIndex <= (firstItemIsGroupTitle ? 1 : 0),
                                    "text-gray-400": selectionIndex <= (firstItemIsGroupTitle ? 1 : 0),
                                }
                            )}
                            onClick={handleSelectPreviousOption}
                        >
                            <ArrowDropUp fontSize="inherit" />
                        </div>
                        <div
                            className={resolveClassNames(
                                "border border-gray-300 hover:bg-blue-100 rounded-br cursor-pointer",
                                {
                                    "pointer-events-none": selectionIndex >= filteredOptionsWithSeparators.length - 1,
                                    "text-gray-400": selectionIndex >= filteredOptionsWithSeparators.length - 1,
                                }
                            )}
                            onClick={handleSelectNextOption}
                        >
                            <ArrowDropDown fontSize="inherit" />
                        </div>
                    </div>
                )}
                {dropdownVisible &&
                    createPortal(
                        <div
                            className="absolute bg-white border border-gray-300 rounded-md shadow-md overflow-y-auto z-50 box-border"
                            style={{ ...dropdownRect }}
                            ref={dropdownRef}
                        >
                            {filteredOptionsWithSeparators.length === 0 && (
                                <div className="p-1 flex items-center text-gray-400 select-none">
                                    {props.options.length === 0 || filter === ""
                                        ? noOptionsText
                                        : noMatchingOptionsText}
                                </div>
                            )}
                            <ul style={{ height: filteredOptionsWithSeparators.length * OPTION_HEIGHT }}>
                                <Virtualization
                                    direction="vertical"
                                    items={filteredOptionsWithSeparators}
                                    itemSize={OPTION_HEIGHT}
                                    containerRef={dropdownRef}
                                    startIndex={startIndex}
                                    renderItem={renderItem}
                                />
                            </ul>
                        </div>
                    )}
            </div>
        </BaseComponent>
    );
}

export const Dropdown = React.forwardRef(DropdownComponent) as <TValue = string>(
    props: DropdownProps<TValue> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement;

type OptionProps<TValue> = DropdownOption<TValue> & {
    isInGroup: boolean;
    isSelected: boolean;
    isFocused: boolean;
    onSelect: (value: TValue) => void;
    onPointerOver: (value: TValue) => void;
};

function OptionItem<TValue>(props: OptionProps<TValue>): React.ReactNode {
    return (
        <li
            className={resolveClassNames("flex items-center cursor-pointer select-none px-2 gap-1", {
                "bg-blue-600 text-white box-border hover:bg-blue-700": props.isSelected,
                "bg-blue-100": !props.isSelected && props.isFocused,
                "bg-blue-700 text-white": props.isSelected && props.isFocused,
                "pointer-events-none": props.disabled,
                "text-gray-400": props.disabled,
                "pl-4": props.isInGroup,
            })}
            style={{ height: OPTION_HEIGHT }}
            title={props.label}
            onPointerMove={() => props.onPointerOver(props.value)}
            onClick={() => !props.disabled && props.onSelect(props.value)}
        >
            {props.adornment && (
                <div className="max-w-5 max-h-5 overflow-hidden flex-shrink-0 inline-flex">{props.adornment}</div>
            )}
            <div className="truncate">{props.label}</div>
        </li>
    );
}

function GroupTitle(props: DropdownOptionGroup<unknown>): React.ReactNode {
    return (
        <li
            className="px-2 flex items-center gap-1 text-xs text-gray-500 font-semibold select-none"
            style={{ height: OPTION_HEIGHT }}
        >
            {props.adornment && (
                <div className="max-w-4 max-h-4 overflow-hidden flex-shrink-0 inline-flex">{props.adornment}</div>
            )}
            {/* Font size xs slightly miss-aligns the text for some reason */}
            <span className="mt-0.5 truncate">{props.label}</span>
        </li>
    );
}
