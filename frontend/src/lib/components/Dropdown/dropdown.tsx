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
import { withDefaults } from "../_component-utils/components";

export type DropdownOption = {
    value: string;
    label: string;
    adornment?: React.ReactNode;
    disabled?: boolean;
    group?: string;
};

export type DropdownProps = {
    id?: string;
    wrapperId?: string;
    options: DropdownOption[];
    value?: string;
    onChange?: (value: string) => void;
    filter?: boolean;
    width?: string | number;
    showArrows?: boolean;
    debounceTimeMs?: number;
    placeholder?: string;
} & BaseComponentProps;

const defaultProps = {
    value: "",
    filter: false,
};

const minHeight = 200;
const optionHeight = 32;

type DropdownRect = {
    left?: number;
    top?: number;
    right?: number;
    width: number;
    height: number;
    minWidth: number;
};

type OptionListItem =
    | {
          type: "option";
          actualIndex: number;
          content: DropdownOption;
      }
    | {
          type: "separator";
          actualIndex: never;
          content: string;
      };

const noMatchingOptionsText = "No matching options";
const noOptionsText = "No options";

export const Dropdown = withDefaults<DropdownProps>()(defaultProps, (props) => {
    const { onChange } = props;

    const [dropdownVisible, setDropdownVisible] = React.useState<boolean>(false);
    const [dropdownRect, setDropdownRect] = React.useState<DropdownRect>({
        width: 0,
        minWidth: 0,
        height: 0,
    });
    const [filter, setFilter] = React.useState<string | null>(null);
    const [selection, setSelection] = React.useState<string | number>(props.value);
    const [prevValue, setPrevValue] = React.useState<string | number>(props.value);
    const [prevFilteredOptions, setPrevFilteredOptions] = React.useState<DropdownOption[]>(props.options);
    const [selectionIndex, setSelectionIndex] = React.useState<number>(-1);
    const [filteredOptions, setFilteredOptions] = React.useState<DropdownOption[]>(props.options);
    const [optionIndexWithFocus, setOptionIndexWithFocus] = React.useState<number>(-1);
    const [startIndex, setStartIndex] = React.useState<number>(0);
    const [keyboardFocus, setKeyboardFocus] = React.useState<boolean>(false);

    const inputRef = React.useRef<HTMLInputElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const inputBoundingRect = useElementBoundingRect(inputRef);

    const setOptionIndexWithFocusToCurrentSelection = React.useCallback(
        function handleFilteredOptionsChange() {
            const index = filteredOptions.findIndex((option) => option.value === selection);
            setSelectionIndex(index);
            setOptionIndexWithFocus(index);
        },
        [filteredOptions, selection]
    );

    if (prevValue !== props.value) {
        setSelection(props.value);
        setSelectionIndex(props.options.findIndex((option) => option.value === props.value));
        setPrevValue(props.value);
    }

    if (!isEqual(prevFilteredOptions, filteredOptions)) {
        setOptionIndexWithFocusToCurrentSelection();
        setPrevFilteredOptions(filteredOptions);
    }

    // TODO: Use this offset to make key navigation work for StartIndex
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let indexOffset = 0;
    // Inject seperator items to render between groups
    const optionsWithSeperators: OptionListItem[] = filteredOptions.flatMap((option, index) => {
        const optionItem = { type: "option", actualIndex: index, content: option } as OptionListItem;
        const seperatorItem = { type: "separator", content: option.group } as OptionListItem;

        if (option.group && option.group !== filteredOptions[index - 1]?.group) {
            if (index <= optionIndexWithFocus) indexOffset++;
            return [seperatorItem, optionItem];
        } else {
            return [optionItem];
        }
    });

    React.useEffect(function handleMount() {
        return function handleUnmount() {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    React.useEffect(
        function handleOptionsChange() {
            function handleMouseDown(event: MouseEvent) {
                if (
                    dropdownRef.current &&
                    !dropdownRef.current.contains(event.target as Node) &&
                    inputRef.current &&
                    !inputRef.current.contains(event.target as Node)
                ) {
                    setDropdownVisible(false);
                    setFilter(null);
                    setFilteredOptions(props.options);
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
        function updateDropdownRectWidth() {
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
            setFilteredOptions(newFilteredOptions);
        },
        [props.options, filter]
    );

    React.useEffect(
        function computeDropdownRect() {
            if (dropdownVisible) {
                const inputClientBoundingRect = inputRef.current?.getBoundingClientRect();
                const bodyClientBoundingRect = document.body.getBoundingClientRect();

                const height = Math.min(minHeight, Math.max(filteredOptions.length * optionHeight, optionHeight)) + 2;

                if (inputClientBoundingRect && bodyClientBoundingRect) {
                    const newDropdownRect: DropdownRect = {
                        minWidth: inputBoundingRect.width,
                        width: dropdownRect.width,
                        height: height,
                    };

                    if (inputClientBoundingRect.y + inputBoundingRect.height + height > window.innerHeight) {
                        newDropdownRect.top = inputClientBoundingRect.y - minHeight;
                        newDropdownRect.height = Math.min(height, inputClientBoundingRect.y);
                    } else {
                        newDropdownRect.top = inputClientBoundingRect.y + inputBoundingRect.height;
                        newDropdownRect.height = Math.min(
                            height,
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
                                (filteredOptions.findIndex((option) => option.value === selection) || 0) -
                                    height / optionHeight / 2
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
            filteredOptions,
            selection,
            dropdownRect.width,
            props.options,
            setOptionIndexWithFocusToCurrentSelection,
        ]
    );

    const handleOnChange = React.useCallback(
        function handleOnChange(value: string) {
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
        function handleOptionClick(value: string) {
            setSelection(value);
            setSelectionIndex(props.options.findIndex((option) => option.value === value));
            setDropdownVisible(false);
            setFilter(null);
            setFilteredOptions(props.options);
            setOptionIndexWithFocus(-1);

            handleOnChange(value);
        },
        [
            props.options,
            setOptionIndexWithFocus,
            setSelectionIndex,
            setDropdownVisible,
            setFilter,
            setFilteredOptions,
            setSelection,
            handleOnChange,
        ]
    );

    React.useEffect(
        function addKeyDownEventHandler() {
            function handleKeyDown(e: KeyboardEvent) {
                if (dropdownRef.current) {
                    const currentStartIndex = Math.round(dropdownRef.current?.scrollTop / optionHeight);
                    if (dropdownVisible) {
                        if (e.key === "ArrowUp") {
                            e.preventDefault();
                            const adjustedOptionIndexWithFocus =
                                optionIndexWithFocus === -1 ? selectionIndex : optionIndexWithFocus;
                            const newIndex = Math.max(0, adjustedOptionIndexWithFocus - 1);
                            setOptionIndexWithFocus(newIndex);
                            if (newIndex < currentStartIndex) {
                                setStartIndex(newIndex);
                            }
                            setKeyboardFocus(true);
                        }
                        if (e.key === "ArrowDown") {
                            e.preventDefault();
                            const adjustedOptionIndexWithFocus =
                                optionIndexWithFocus === -1 ? selectionIndex : optionIndexWithFocus;
                            const newIndex = Math.min(filteredOptions.length - 1, adjustedOptionIndexWithFocus + 1);
                            setOptionIndexWithFocus(newIndex);
                            if (newIndex >= currentStartIndex + minHeight / optionHeight - 1) {
                                setStartIndex(Math.max(0, newIndex - minHeight / optionHeight + 1));
                            }
                            setKeyboardFocus(true);
                        }
                        if (e.key === "Enter") {
                            e.preventDefault();
                            const option = filteredOptions[keyboardFocus ? optionIndexWithFocus : selectionIndex];
                            if (option && !option.disabled) {
                                handleOptionClick(option.value);
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
            filteredOptions,
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
            setFilteredOptions(newFilteredOptions);
            setSelectionIndex(newFilteredOptions.findIndex((option) => option.value === selection));
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
        return props.options.find((el) => el.value === selection)?.label || "";
    }

    function makeInputAdornment() {
        if (dropdownVisible && filter !== null) {
            return null;
        }
        const selectedOption = props.options.find((el) => el.value === selection);
        return selectedOption?.adornment || null;
    }

    function handleSelectPreviousOption() {
        const newIndex = Math.max(0, selectionIndex - 1);
        const newValue = filteredOptions[newIndex].value;
        setSelectionIndex(newIndex);
        setSelection(newValue);
        handleOnChange(newValue);
        setOptionIndexWithFocus(-1);
    }

    function handleSelectNextOption() {
        const newIndex = Math.min(filteredOptions.length - 1, selectionIndex + 1);
        const newValue = filteredOptions[newIndex].value;
        setSelectionIndex(newIndex);
        setSelection(newValue);
        handleOnChange(newValue);
        setOptionIndexWithFocus(-1);
    }

    return (
        <BaseComponent disabled={props.disabled}>
            <div style={{ width: props.width }} id={props.wrapperId} className="flex">
                <div className="flex-grow">
                    <Input
                        ref={inputRef}
                        id={props.id}
                        error={
                            selection !== "" &&
                            props.options.find((option) => option.value === selection) === undefined &&
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
                                    "pointer-events-none": selectionIndex >= filteredOptions.length - 1,
                                    "text-gray-400": selectionIndex >= filteredOptions.length - 1,
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
                            {filteredOptions.length === 0 && (
                                <div className="p-1 flex items-center text-gray-400 select-none">
                                    {props.options.length === 0 || filter === ""
                                        ? noOptionsText
                                        : noMatchingOptionsText}
                                </div>
                            )}
                            <Virtualization
                                direction="vertical"
                                items={optionsWithSeperators}
                                itemSize={optionHeight}
                                containerRef={dropdownRef}
                                startIndex={startIndex}
                                renderItem={(item: OptionListItem) => {
                                    if (item.type === "separator") {
                                        return <SeperatorLine text={item.content} />;
                                    } else {
                                        return (
                                            <OptionItem
                                                isSelected={selection === item.content.value}
                                                isFocused={optionIndexWithFocus === item.actualIndex}
                                                {...item.content}
                                                onSelect={handleOptionClick}
                                                onPointerOver={() => handlePointerOver(item.actualIndex)}
                                            />
                                        );
                                    }
                                }}
                            />
                        </div>
                    )}
            </div>
        </BaseComponent>
    );
});

type ValType = DropdownOption["value"];
type OptionProps = DropdownOption & {
    isSelected: boolean;
    isFocused: boolean;
    onSelect: (value: ValType) => void;
    onPointerOver: (value: ValType) => void;
};
function OptionItem(props: OptionProps): React.ReactNode {
    const { value, isSelected, isFocused, disabled, label, adornment, onSelect, onPointerOver } = props;

    return (
        <div
            className={resolveClassNames("flex", "items-center", "cursor-pointer", "select-none", "pl-1", "pr-1", {
                "bg-blue-600 text-white box-border hover:bg-blue-700": isSelected,
                "bg-blue-100": !isSelected && isFocused,
                "bg-blue-700": isSelected && isFocused,
                "pointer-events-none": disabled,
                "text-gray-400": disabled,
            })}
            style={{ height: optionHeight }}
            title={label}
            onPointerMove={() => onPointerOver(value)}
            onClick={() => !disabled && onSelect(value)}
        >
            <span className="whitespace-nowrap text-ellipsis overflow-hidden min-w-0 flex gap-2">
                {adornment && <span className="max-w-5 max-h-5 overflow-hidden">{adornment}</span>}
                {label}
            </span>
        </div>
    );
}

function SeperatorLine(props: { text: string }): React.ReactNode {
    return (
        <div className=" px-1 flex gap-1 text-xs text-slate-500 italic items-center" style={{ height: optionHeight }}>
            <hr className="bg-slate-700 h-px w-1" />
            <span className="block">{props.text}</span>
            <hr className="bg-slate-700 flex-grow h-px block" />
        </div>
    );
}

Dropdown.displayName = "Dropdown";
