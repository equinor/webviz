import React from "react";
import ReactDOM from "react-dom";

import { Rect } from "@framework/utils/geometry";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/20/solid";
import { ClickAwayListener } from "@mui/base";

import { v4 } from "uuid";

import { IconButton } from "../IconButton";
import { Input } from "../Input";
import { Virtualization } from "../Virtualization";
import { BaseComponent, BaseComponentProps } from "../_BaseComponent";
import { withDefaults } from "../_utils/components";
import { resolveClassNames } from "../_utils/resolveClassNames";

type Option = {
    value: string;
    label: string;
};

export type DropdownProps = {
    options: Option[];
    value?: string;
    onChange?: (value: string) => void;
    filter?: boolean;
    label?: string;
    width?: string | number;
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
};

export const Dropdown = withDefaults<DropdownProps>()(defaultProps, (props) => {
    const [dropdownVisible, setDropdownVisible] = React.useState<boolean>(false);
    const [dropdownRect, setDropdownRect] = React.useState<DropdownRect>({
        width: 0,
        height: 0,
    });
    const [filter, setFilter] = React.useState<string | null>(null);
    const [selection, setSelection] = React.useState<string | number>(props.value);
    const [selectionIndex, setSelectionIndex] = React.useState<number>(-1);
    const [filteredOptions, setFilteredOptions] = React.useState<Option[]>(props.options);
    const [optionIndexWithFocus, setOptionIndexWithFocus] = React.useState<number>(-1);
    const [startIndex, setStartIndex] = React.useState<number>(0);
    const [keyboardFocus, setKeyboardFocus] = React.useState<boolean>(false);

    const id = React.useRef<string>(v4());
    const inputRef = React.useRef<HTMLInputElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const setOptionIndexWithFocusToCurrentSelection = React.useCallback(() => {
        const index = filteredOptions.findIndex((option) => option.value === selection);
        setSelectionIndex(index);
        setOptionIndexWithFocus(index);
    }, [filteredOptions, selection]);

    React.useLayoutEffect(() => {
        if (dropdownVisible) {
            const inputBoundingClientRect = inputRef.current?.getBoundingClientRect();
            const bodyBoundingClientRect = document.body.getBoundingClientRect();

            const height = Math.min(minHeight, Math.max(filteredOptions.length * optionHeight, optionHeight)) + 2;

            if (inputBoundingClientRect && bodyBoundingClientRect) {
                const newDropdownRect: DropdownRect = {
                    width: inputBoundingClientRect.width,
                    height: height,
                };

                if (inputBoundingClientRect.y + inputBoundingClientRect.height + height > window.innerHeight) {
                    newDropdownRect.top = inputBoundingClientRect.y - minHeight;
                    newDropdownRect.height = Math.min(height, inputBoundingClientRect.y);
                } else {
                    newDropdownRect.top = inputBoundingClientRect.y + inputBoundingClientRect.height;
                    newDropdownRect.height = Math.min(
                        height,
                        window.innerHeight - inputBoundingClientRect.y - inputBoundingClientRect.height
                    );
                }
                if (inputBoundingClientRect.x + inputBoundingClientRect.width > window.innerWidth / 2) {
                    newDropdownRect.right =
                        window.innerWidth - (inputBoundingClientRect.x + inputBoundingClientRect.width);
                } else {
                    newDropdownRect.left = inputBoundingClientRect.x;
                }

                setDropdownRect(newDropdownRect);

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
    }, [dropdownVisible, filteredOptions, selection, setOptionIndexWithFocusToCurrentSelection, setStartIndex]);

    const handleOptionClick = React.useCallback(
        (value: string) => {
            setSelection(value);
            setSelectionIndex(props.options.findIndex((option) => option.value === value));
            setDropdownVisible(false);
            setFilter(null);
            setFilteredOptions(props.options);
            if (props.onChange) {
                props.onChange(value);
            }
            setOptionIndexWithFocus(-1);
        },
        [props.onChange, selection, props.options]
    );

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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
                        if (option) {
                            handleOptionClick(option.value);
                        }
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [
        selection,
        filteredOptions,
        dropdownVisible,
        startIndex,
        handleOptionClick,
        optionIndexWithFocus,
        selectionIndex,
        keyboardFocus,
    ]);

    const handleInputClick = React.useCallback(() => {
        setDropdownVisible(true);
    }, []);

    const handleAwayClick = React.useCallback(() => {
        setDropdownVisible(false);
        setFilter(null);
        setFilteredOptions(props.options);
        setOptionIndexWithFocus(-1);
    }, [props.options, selection]);

    const handleInputChange = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setFilter(event.target.value);
            const newFilteredOptions = props.options.filter((option) => option.label.includes(event.target.value));
            setFilteredOptions(newFilteredOptions);
            setSelectionIndex(newFilteredOptions.findIndex((option) => option.value === selection));
        },
        [props.options, selection]
    );

    const handlePointerOver = React.useCallback((index: number) => {
        setOptionIndexWithFocus(index);
        setKeyboardFocus(false);
    }, []);

    return (
        <ClickAwayListener onClickAway={handleAwayClick}>
            <BaseComponent disabled={props.disabled}>
                <div style={{ width: props.width }}>
                    {props.label && <label htmlFor={`filter-${id.current}`}>{props.label}</label>}
                    <Input
                        ref={inputRef}
                        error={
                            selection !== "" && props.options.find((option) => option.value === selection) === undefined
                        }
                        onClick={() => handleInputClick()}
                        endAdornment={
                            <IconButton size="small" onClick={() => setDropdownVisible(!dropdownVisible)}>
                                {dropdownVisible ? <ChevronUpIcon /> : <ChevronDownIcon />}
                            </IconButton>
                        }
                        onChange={handleInputChange}
                        value={
                            dropdownVisible && filter !== null
                                ? filter
                                : props.options.find((el) => el.value === selection)?.label
                        }
                    />
                    {dropdownVisible &&
                        ReactDOM.createPortal(
                            <div
                                className="absolute bg-white border border-gray-300 rounded-md shadow-md overflow-y-auto z-50 box-border"
                                style={{
                                    left: dropdownRect.left,
                                    top: dropdownRect.top,
                                    right: dropdownRect.right,
                                    height: dropdownRect.height,
                                }}
                                ref={dropdownRef}
                            >
                                {filteredOptions.length === 0 && (
                                    <div className="p-1 flex items-center text-gray-400 select-none">
                                        No matching options
                                    </div>
                                )}
                                <Virtualization
                                    direction="vertical"
                                    items={filteredOptions}
                                    itemSize={optionHeight}
                                    containerRef={dropdownRef}
                                    startIndex={startIndex}
                                    renderItem={(option, index) => (
                                        <div
                                            key={option.value}
                                            className={resolveClassNames(
                                                "flex",
                                                "items-center",
                                                "cursor-pointer",
                                                "select-none",
                                                "pl-1",
                                                "pr-1",
                                                {
                                                    "bg-blue-600 text-white box-border hover:bg-blue-700":
                                                        selection === option.value,
                                                    "bg-blue-100":
                                                        selection !== option.value && optionIndexWithFocus === index,
                                                    "bg-blue-700":
                                                        selection === option.value && optionIndexWithFocus === index,
                                                }
                                            )}
                                            onClick={() => handleOptionClick(option.value)}
                                            style={{ height: optionHeight }}
                                            onPointerMove={() => handlePointerOver(index)}
                                            title={option.label}
                                        >
                                            <span className="whitespace-nowrap text-ellipsis overflow-hidden min-w-0">
                                                {option.label}
                                            </span>
                                        </div>
                                    )}
                                />
                            </div>,
                            document.body
                        )}
                </div>
            </BaseComponent>
        </ClickAwayListener>
    );
});

Dropdown.displayName = "Dropdown";
