import React from "react";

import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import { getTextWidthWithFont } from "@lib/utils/textSize";
import { ArrowDropDown, ArrowDropUp, ExpandLess, ExpandMore } from "@mui/icons-material";

import { isEqual } from "lodash";

import { BaseComponent, BaseComponentProps } from "../BaseComponent";
import { IconButton } from "../IconButton";
import { Input } from "../Input";
import { Virtualization } from "../Virtualization";

export type DropdownOption<TValue = string> = {
    value: TValue;
    label: string;
    adornment?: React.ReactNode;
    hoverText?: string;
    disabled?: boolean;
    group?: string;
};

export type DropdownProps<TValue = string> = {
    id?: string;
    wrapperId?: string;
    options: DropdownOption<TValue>[];
    value?: TValue;
    onChange?: (value: TValue) => void;
    filter?: boolean;
    width?: string | number;
    showArrows?: boolean;
    debounceTimeMs?: number;
    placeholder?: string;
} & BaseComponentProps;

const MIN_HEIGHT = 200;
const OPTION_HEIGHT = 32;

type DropdownRect = {
    left?: number;
    top?: number;
    right?: number;
    width: number;
    height: number;
    minWidth: number;
};

type OptionListItem<TValue> =
    | {
          type: "option";
          actualIndex: number;
          content: DropdownOption<TValue>;
      }
    | {
          type: "separator";
          actualIndex: never;
          content: string;
      };

const noMatchingOptionsText = "No matching options";
const noOptionsText = "No options";

function makeOptionListItems<TValue>(options: DropdownOption<TValue>[]): OptionListItem<TValue>[] {
    const optionsWithSeperators: OptionListItem<TValue>[] = options.flatMap((option, index) => {
        const optionItem = { type: "option", actualIndex: index, content: option } as OptionListItem<TValue>;
        const seperatorItem = { type: "separator", content: option.group } as OptionListItem<TValue>;

        if (option.group && option.group !== options[index - 1]?.group) {
            return [seperatorItem, optionItem];
        } else {
            return [optionItem];
        }
    });

    return optionsWithSeperators;
}

export function Dropdown<TValue = string>(props: DropdownProps<TValue>) {
    const { onChange } = props;

    const valueWithDefault = props.value ?? null;

    const [dropdownVisible, setDropdownVisible] = React.useState<boolean>(false);
    const [dropdownRect, setDropdownRect] = React.useState<DropdownRect>({
        width: 0,
        minWidth: 0,
        height: 0,
    });
    const [filter, setFilter] = React.useState<string | null>(null);
    const [selection, setSelection] = React.useState<TValue | null>(props.value ?? null);
    const [prevValue, setPrevValue] = React.useState<TValue | null>(props.value ?? null);
    const [prevFilteredOptionsWithSeparators, setPrevFilteredOptionsWithSeparators] = React.useState<
        OptionListItem<TValue>[]
    >(makeOptionListItems(props.options));
    const [selectionIndex, setSelectionIndex] = React.useState<number>(-1);
    const [filteredOptionsWithSeparators, setFilteredOptionsWithSeparators] = React.useState<OptionListItem<TValue>[]>(
        makeOptionListItems(props.options)
    );
    const [optionIndexWithFocus, setOptionIndexWithFocus] = React.useState<number>(-1);
    const [startIndex, setStartIndex] = React.useState<number>(0);
    const [keyboardFocus, setKeyboardFocus] = React.useState<boolean>(false);

    const inputRef = React.useRef<HTMLInputElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const inputBoundingRect = useElementBoundingRect(inputRef);

    const setOptionIndexWithFocusToCurrentSelection = React.useCallback(
        function handleFilteredOptionsChange() {
            const index = filteredOptionsWithSeparators.findIndex(
                (option) => option.type === "option" && isEqual(option.content.value, selection)
            );
            setSelectionIndex(index);
            setOptionIndexWithFocus(index);
        },
        [filteredOptionsWithSeparators, selection]
    );

    if (!isEqual(prevValue, valueWithDefault)) {
        setSelection(valueWithDefault);
        setSelectionIndex(props.options.findIndex((option) => isEqual(option.value, valueWithDefault)));
        setPrevValue(valueWithDefault);
    }

    if (!isEqual(prevFilteredOptionsWithSeparators, filteredOptionsWithSeparators)) {
        setOptionIndexWithFocusToCurrentSelection();
        setPrevFilteredOptionsWithSeparators(filteredOptionsWithSeparators);
    }

    React.useEffect(function mountEffect() {
        return function handleUnmount() {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    React.useEffect(
        function handleOptionsChangeEffect() {
            function handleMouseDown(event: MouseEvent) {
                if (
                    dropdownRef.current &&
                    !dropdownRef.current.contains(event.target as Node) &&
                    inputRef.current &&
                    !inputRef.current.contains(event.target as Node)
                ) {
                    setDropdownVisible(false);
                    setFilter(null);
                    setFilteredOptionsWithSeparators(makeOptionListItems(props.options));
                    setOptionIndexWithFocus(-1);
                }
            }

            document.addEventListener("mousedown", handleMouseDown);

            return () => {
                document.removeEventListener("mousedown", handleMouseDown);
            };
        },
        [props.options]
    );

    React.useEffect(
        function updateDropdownRectWidthEffect() {
            let longestOptionWidth = props.options.reduce((prev, current) => {
                const labelWidth = getTextWidthWithFont(current.label, "Equinor", 1);
                const adornmentWidth = current.adornment ? convertRemToPixels((5 + 2) / 4) : 0;
                const totalWidth = labelWidth + adornmentWidth;
                if (totalWidth > prev) {
                    return totalWidth;
                }
                return prev;
            }, 0);

            if (longestOptionWidth === 0) {
                if (props.options.length === 0 || filter === "") {
                    longestOptionWidth = getTextWidthWithFont(noOptionsText, "Equinor", 1);
                } else {
                    longestOptionWidth = getTextWidthWithFont(noMatchingOptionsText, "Equinor", 1);
                }
            }
            setDropdownRect((prev) => ({ ...prev, width: longestOptionWidth + 32 }));

            const newFilteredOptions = props.options.filter((option) => option.label.includes(filter || ""));
            setFilteredOptionsWithSeparators(makeOptionListItems(newFilteredOptions));
        },
        [props.options, filter]
    );

    React.useEffect(
        function computeDropdownRectEffect() {
            if (dropdownVisible) {
                const inputClientBoundingRect = inputRef.current?.getBoundingClientRect();
                const bodyClientBoundingRect = document.body.getBoundingClientRect();

                const preferredHeight =
                    Math.min(
                        MIN_HEIGHT,
                        Math.max(filteredOptionsWithSeparators.length * OPTION_HEIGHT, OPTION_HEIGHT)
                    ) + 2;

                if (inputClientBoundingRect && bodyClientBoundingRect) {
                    const newDropdownRect: DropdownRect = {
                        minWidth: inputBoundingRect.width,
                        width: dropdownRect.width,
                        height: preferredHeight,
                    };

                    if (inputClientBoundingRect.y + inputBoundingRect.height + preferredHeight > window.innerHeight) {
                        const height = Math.min(inputClientBoundingRect.y, preferredHeight);
                        newDropdownRect.top = inputClientBoundingRect.y - height;
                        newDropdownRect.height = height;
                    } else {
                        newDropdownRect.top = inputClientBoundingRect.y + inputBoundingRect.height;
                        newDropdownRect.height = Math.min(
                            preferredHeight,
                            window.innerHeight - inputClientBoundingRect.y - inputBoundingRect.height
                        );
                    }
                    if (inputClientBoundingRect.x + inputBoundingRect.width > window.innerWidth / 2) {
                        newDropdownRect.right =
                            window.innerWidth - (inputClientBoundingRect.x + inputBoundingRect.width);
                    } else {
                        newDropdownRect.left = inputClientBoundingRect.x;
                    }

                    setDropdownRect((prev) => ({ ...newDropdownRect, width: prev.width }));

                    setStartIndex(
                        Math.max(
                            0,
                            Math.round(
                                (filteredOptionsWithSeparators.findIndex(
                                    (option) => option.type === "option" && option.content.value === selection
                                ) || 0) -
                                    preferredHeight / OPTION_HEIGHT / 2
                            )
                        )
                    );
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
            props.options,
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
            setSelectionIndex(props.options.findIndex((option) => isEqual(option.value, value)));
            setDropdownVisible(false);
            setFilter(null);
            setFilteredOptionsWithSeparators(makeOptionListItems(props.options));
            setOptionIndexWithFocus(-1);

            handleOnChange(value);
        },
        [
            props.options,
            setOptionIndexWithFocus,
            setSelectionIndex,
            setDropdownVisible,
            setFilter,
            setFilteredOptionsWithSeparators,
            setSelection,
            handleOnChange,
        ]
    );

    React.useEffect(
        function addKeyDownEventHandlerEffect() {
            function handleKeyDown(e: KeyboardEvent) {
                if (e.key === "Escape") {
                    setDropdownVisible(false);
                    setOptionIndexWithFocus(-1);
                    setKeyboardFocus(false);
                    inputRef.current?.blur();
                }
                if (dropdownRef.current) {
                    const currentStartIndex = Math.round(dropdownRef.current?.scrollTop / OPTION_HEIGHT);
                    if (dropdownVisible) {
                        if (e.key === "ArrowUp") {
                            e.preventDefault();
                            let adjustedOptionIndexWithFocus =
                                optionIndexWithFocus === -1 ? selectionIndex : optionIndexWithFocus;
                            adjustedOptionIndexWithFocus--;

                            // Make sure we are focusing on an option and not a separator
                            const item = filteredOptionsWithSeparators[adjustedOptionIndexWithFocus];
                            let scrollToTop = false;
                            if (item && item.type !== "option") {
                                if (adjustedOptionIndexWithFocus === 0) {
                                    adjustedOptionIndexWithFocus = 1;
                                    scrollToTop = true;
                                } else {
                                    adjustedOptionIndexWithFocus--;
                                }
                            }

                            const newIndex = Math.max(0, adjustedOptionIndexWithFocus);
                            setOptionIndexWithFocus(newIndex);
                            const newStartIndex = newIndex - (scrollToTop ? 1 : 0);
                            if (newStartIndex < currentStartIndex) {
                                setStartIndex(newStartIndex);
                            }
                            setKeyboardFocus(true);
                        }
                        if (e.key === "ArrowDown") {
                            e.preventDefault();
                            let adjustedOptionIndexWithFocus =
                                optionIndexWithFocus === -1 ? selectionIndex : optionIndexWithFocus;
                            adjustedOptionIndexWithFocus++;

                            // Make sure we are focusing on an option and not a separator
                            const item = filteredOptionsWithSeparators[adjustedOptionIndexWithFocus];
                            if (item && item.type !== "option") {
                                adjustedOptionIndexWithFocus++;
                            }

                            const newIndex = Math.min(
                                filteredOptionsWithSeparators.length - 1,
                                adjustedOptionIndexWithFocus
                            );

                            setOptionIndexWithFocus(newIndex);
                            if (newIndex >= currentStartIndex + MIN_HEIGHT / OPTION_HEIGHT - 1) {
                                setStartIndex(Math.max(0, newIndex - MIN_HEIGHT / OPTION_HEIGHT + 1));
                            }
                            setKeyboardFocus(true);
                        }
                        if (e.key === "Enter") {
                            e.preventDefault();
                            const option =
                                filteredOptionsWithSeparators[keyboardFocus ? optionIndexWithFocus : selectionIndex];
                            if (option && option.type === "option" && !option.content.disabled) {
                                handleOptionClick(option.content.value);
                            }
                        }
                    }
                }
            }

            window.addEventListener("keydown", handleKeyDown);

            return function removeKeyDownEventHandler() {
                window.removeEventListener("keydown", handleKeyDown);
            };
        },
        [
            selection,
            filteredOptionsWithSeparators,
            dropdownVisible,
            startIndex,
            handleOptionClick,
            optionIndexWithFocus,
            selectionIndex,
            keyboardFocus,
        ]
    );

    const handleInputClick = React.useCallback(function handleInputClick() {
        setDropdownVisible(true);
    }, []);

    const handleInputChange = React.useCallback(
        function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
            setFilter(event.target.value);
            const newFilteredOptions = props.options.filter((option) => option.label.includes(event.target.value));
            setFilteredOptionsWithSeparators(makeOptionListItems(newFilteredOptions));
            setSelectionIndex(newFilteredOptions.findIndex((option) => isEqual(option.value, selection)));
        },
        [props.options, selection]
    );

    const handlePointerOver = React.useCallback(function handlePointerOver(index: number) {
        setOptionIndexWithFocus(index);
        setKeyboardFocus(false);
    }, []);

    function makeInputValue() {
        if (dropdownVisible && filter !== null) {
            return filter;
        }
        return props.options.find((el) => isEqual(el.value, selection))?.label || "";
    }

    function makeInputAdornment() {
        if (dropdownVisible && filter !== null) {
            return null;
        }
        const selectedOption = props.options.find((el) => el.value === selection);
        return selectedOption?.adornment || null;
    }

    function handleSelectPreviousOption() {
        let newIndex = Math.max(0, selectionIndex - 1);
        let item = filteredOptionsWithSeparators[newIndex];
        if (item && item.type === "separator") {
            if (newIndex === 0) {
                newIndex = 1;
            } else {
                newIndex--;
            }
            item = filteredOptionsWithSeparators[newIndex];
        }
        if (!item || item.type !== "option") {
            throw new Error("Every separator should be followed by an option");
        }
        const newValue = item.content.value;
        setSelectionIndex(newIndex);
        setSelection(newValue);
        handleOnChange(newValue);
        setOptionIndexWithFocus(-1);
    }

    function handleSelectNextOption() {
        let newIndex = Math.min(filteredOptionsWithSeparators.length - 1, selectionIndex + 1);
        let item = filteredOptionsWithSeparators[newIndex];
        if (item && item.type === "separator") {
            newIndex++;
            item = filteredOptionsWithSeparators[newIndex];
        }
        if (newIndex >= filteredOptionsWithSeparators.length - 1 || !item || item.type !== "option") {
            throw new Error("Every separator should be followed by an option");
        }
        const newValue = item.content.value;
        setSelectionIndex(newIndex);
        setSelection(newValue);
        handleOnChange(newValue);
        setOptionIndexWithFocus(-1);
    }

    function renderItem(item: OptionListItem<TValue>, index: number) {
        if (item.type === "separator") {
            return <SeparatorItem key={`${item.content}-${index}`} text={item.content} />;
        } else {
            return (
                <OptionItem
                    key={`${item.content.value}`}
                    isSelected={isEqual(selection, item.content.value)}
                    isFocused={optionIndexWithFocus === index}
                    {...item.content}
                    onSelect={handleOptionClick}
                    onPointerOver={() => handlePointerOver(index)}
                />
            );
        }
    }

    return (
        <BaseComponent disabled={props.disabled}>
            <div style={{ width: props.width }} id={props.wrapperId} className="flex hover input-comp rounded">
                <div className="flex-grow">
                    <Input
                        ref={inputRef}
                        id={props.id}
                        error={
                            selection !== "" &&
                            props.options.find((option) => isEqual(option.value, selection)) === undefined &&
                            props.options.length > 0
                        }
                        onClick={() => handleInputClick()}
                        startAdornment={makeInputAdornment()}
                        endAdornment={
                            <IconButton size="small" onClick={() => setDropdownVisible((prev) => !prev)}>
                                {dropdownVisible ? (
                                    <ExpandLess fontSize="inherit" />
                                ) : (
                                    <ExpandMore fontSize="inherit" />
                                )}
                            </IconButton>
                        }
                        onChange={handleInputChange}
                        value={makeInputValue()}
                        rounded={props.showArrows ? "left" : "all"}
                        placeholder={props.placeholder}
                    />
                </div>
                {props.showArrows && (
                    <div className="flex flex-col h-full text-xs rounded-r">
                        <div
                            className={resolveClassNames(
                                "border border-gray-300 hover:bg-blue-100 rounded-tr cursor-pointer",
                                {
                                    "pointer-events-none": selectionIndex <= 0,
                                    "text-gray-400": selectionIndex <= 0,
                                }
                            )}
                            onClick={handleSelectPreviousOption}
                        >
                            <ArrowDropUp fontSize="inherit" />
                        </div>
                        <div
                            className={resolveClassNames(
                                "border border-gray-300 hover:bg-blue-100 rounded-tr cursor-pointer",
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
                            <div style={{ height: filteredOptionsWithSeparators.length * OPTION_HEIGHT }}>
                                <Virtualization
                                    direction="vertical"
                                    items={filteredOptionsWithSeparators}
                                    itemSize={OPTION_HEIGHT}
                                    containerRef={dropdownRef}
                                    startIndex={startIndex}
                                    renderItem={renderItem}
                                />
                            </div>
                        </div>
                    )}
            </div>
        </BaseComponent>
    );
}

type OptionProps<TValue> = DropdownOption<TValue> & {
    isSelected: boolean;
    isFocused: boolean;
    onSelect: (value: TValue) => void;
    onPointerOver: (value: TValue) => void;
};

function OptionItem<TValue>(props: OptionProps<TValue>): React.ReactNode {
    return (
        <div
            className={resolveClassNames("flex items-center cursor-pointer select-none px-1", {
                "bg-blue-600 text-white box-border hover:bg-blue-700": props.isSelected,
                "bg-blue-100": !props.isSelected && props.isFocused,
                "bg-blue-700 text-white": props.isSelected && props.isFocused,
                "pointer-events-none": props.disabled,
                "text-gray-400": props.disabled,
            })}
            style={{ height: OPTION_HEIGHT }}
            title={props.label}
            onPointerMove={() => props.onPointerOver(props.value)}
            onClick={() => !props.disabled && props.onSelect(props.value)}
        >
            <span
                className={resolveClassNames("whitespace-nowrap text-ellipsis overflow-hidden min-w-0 flex gap-2", {
                    "ml-2": props.group !== undefined,
                })}
            >
                {props.adornment && <span className="max-w-5 max-h-5 overflow-hidden">{props.adornment}</span>}
                {props.label}
            </span>
        </div>
    );
}

function SeparatorItem(props: { text: string }): React.ReactNode {
    return (
        <div
            className="px-1 flex gap-1 text-xs text-gray-500 uppercase font-semibold items-center pointer-events-none select-none"
            style={{ height: OPTION_HEIGHT }}
        >
            <span className="whitespace-nowrap text-ellipsis overflow-hidden min-w-0 flex gap-2">{props.text}</span>
        </div>
    );
}

Dropdown.displayName = "Dropdown";
