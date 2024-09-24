import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Deselect, SelectAll } from "@mui/icons-material";

import { isEqual } from "lodash";

import { BaseComponent, BaseComponentProps } from "../BaseComponent";
import { Button } from "../Button";
import { Input } from "../Input";
import { Virtualization } from "../Virtualization";

enum KeyModifier {
    SHIFT = "shift",
    CONTROL = "control",
}

export type SelectOption<TValue = string> = {
    value: TValue;
    adornment?: React.ReactNode;
    label: string;
    hoverText?: string;
    disabled?: boolean;
};

export type SelectProps<TValue = string> = {
    id?: string;
    wrapperId?: string;
    options: SelectOption<TValue>[];
    value?: TValue[];
    onChange?: (values: TValue[]) => void;
    placeholder?: string;
    filter?: boolean;
    size?: number;
    multiple?: boolean;
    width?: string | number;
    debounceTimeMs?: number;
    showQuickSelectButtons?: boolean;
} & BaseComponentProps;

const noMatchingOptionsText = "No matching options";

function ensureKeyboardSelectionInView(
    prevViewStartIndex: number,
    reportedViewStartIndex: number,
    keyboardFocusIndex: number,
    viewSize: number
) {
    if (keyboardFocusIndex >= reportedViewStartIndex + viewSize) {
        return Math.max(0, keyboardFocusIndex - viewSize + 1);
    }
    if (keyboardFocusIndex <= reportedViewStartIndex) {
        return keyboardFocusIndex;
    }
    return prevViewStartIndex;
}

export function Select<TValue = string>(props: SelectProps<TValue>) {
    const { onChange } = props;

    const sizeWithDefault = props.size ?? 1;
    const multipleWithDefault = props.multiple ?? false;
    const filterWithDefault = props.filter ?? false;

    const [filterString, setFilterString] = React.useState<string>("");
    const [hasFocus, setHasFocus] = React.useState<boolean>(false);
    const [options, setOptions] = React.useState<SelectOption<TValue>[]>(props.options);
    const [filteredOptions, setFilteredOptions] = React.useState<SelectOption<TValue>[]>(props.options);
    const [selectionAnchor, setSelectionAnchor] = React.useState<number | null>(null);
    const [selectedOptionValues, setSelectedOptionValues] = React.useState<TValue[]>([]);
    const [prevPropsValue, setPrevPropsValue] = React.useState<TValue[] | undefined>(undefined);
    const [currentFocusIndex, setCurrentFocusIndex] = React.useState<number>(0);
    const [virtualizationStartIndex, setVirtualizationStartIndex] = React.useState<number>(0);
    const [reportedVirtualizationStartIndex, setReportedVirtualizationStartIndex] = React.useState<number>(0);

    const ref = React.useRef<HTMLDivElement>(null);
    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const noOptionsText = props.placeholder ?? "No options";

    if (!isEqual(props.options, options)) {
        const newOptions = [...props.options];
        setOptions(newOptions);
        filterOptions(newOptions, filterString);
    }

    if (!isEqual(props.value, prevPropsValue)) {
        const firstValueIndex = filteredOptions.findIndex((option) => option.value === props.value?.[0]);
        setSelectionAnchor(firstValueIndex !== -1 ? firstValueIndex : null);
        setPrevPropsValue(props.value ? [...props.value] : undefined);
        setSelectedOptionValues(props.value ? [...props.value] : []);
    }

    const handleOnChange = React.useCallback(
        function handleOnChange(values: TValue[]) {
            if (!onChange) {
                return;
            }

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            if (!props.debounceTimeMs) {
                onChange(values);
                return;
            }

            debounceTimerRef.current = setTimeout(() => {
                onChange(values);
            }, props.debounceTimeMs);
        },
        [onChange, props.debounceTimeMs]
    );

    React.useEffect(function handleMount() {
        return function handleUnmount() {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    React.useEffect(
        function addKeyboardEventListeners() {
            const refCurrent = ref.current;

            function makeKeyboardSelection(index: number, modifiers: KeyModifier[]) {
                if (filteredOptions[index].disabled) {
                    return;
                }

                if (!multipleWithDefault) {
                    const newSelectedOptions = [filteredOptions[index].value];
                    setSelectedOptionValues(newSelectedOptions);
                    setSelectionAnchor(null);
                    handleOnChange(newSelectedOptions);
                }

                let newSelectedOptions: TValue[] = [filteredOptions[index].value];

                if (modifiers.includes(KeyModifier.CONTROL) && !modifiers.includes(KeyModifier.SHIFT)) {
                    return;
                }

                if (modifiers.includes(KeyModifier.SHIFT) && selectionAnchor !== null) {
                    const start = Math.min(index, selectionAnchor);
                    const end = Math.max(index, selectionAnchor);
                    newSelectedOptions = filteredOptions.slice(start, end + 1).map((option) => option.value);
                }

                if (!modifiers.includes(KeyModifier.CONTROL) && !modifiers.includes(KeyModifier.SHIFT)) {
                    setSelectionAnchor(index);
                }

                handleOnChange(newSelectedOptions);

                setSelectedOptionValues(newSelectedOptions);
            }

            function addKeyboardSelection(index: number) {
                if (filteredOptions[index].disabled) {
                    return;
                }

                if (!multipleWithDefault) {
                    const newSelectedOptions = [filteredOptions[index].value];
                    setSelectedOptionValues(newSelectedOptions);
                    setSelectionAnchor(null);
                    handleOnChange(newSelectedOptions);
                }

                setSelectionAnchor(index);

                let newSelectedOptions: TValue[] = [];
                if (selectedOptionValues.includes(filteredOptions[index].value)) {
                    newSelectedOptions = selectedOptionValues.filter((value) => value !== filteredOptions[index].value);
                } else {
                    newSelectedOptions = [...selectedOptionValues, filteredOptions[index].value];
                }
                setSelectedOptionValues(newSelectedOptions);
                handleOnChange(newSelectedOptions);
            }

            function handleFocus() {
                setHasFocus(true);
            }

            function handleBlur() {
                setHasFocus(false);
            }

            function handleKeyDown(e: KeyboardEvent) {
                const modifiers: KeyModifier[] = [];
                if (e.shiftKey) {
                    modifiers.push(KeyModifier.SHIFT);
                }
                if (e.ctrlKey) {
                    modifiers.push(KeyModifier.CONTROL);
                }
                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const newIndex = Math.max(0, currentFocusIndex - 1);
                    setCurrentFocusIndex(newIndex);
                    setVirtualizationStartIndex((prev) =>
                        ensureKeyboardSelectionInView(prev, reportedVirtualizationStartIndex, newIndex, sizeWithDefault)
                    );
                    makeKeyboardSelection(newIndex, modifiers);
                }

                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const newIndex = Math.min(filteredOptions.length - 1, currentFocusIndex + 1);
                    setCurrentFocusIndex(newIndex);
                    setVirtualizationStartIndex((prev) =>
                        ensureKeyboardSelectionInView(prev, reportedVirtualizationStartIndex, newIndex, sizeWithDefault)
                    );
                    makeKeyboardSelection(newIndex, modifiers);
                }

                if (e.key === " " && e.ctrlKey) {
                    e.preventDefault();
                    addKeyboardSelection(currentFocusIndex);
                }

                if (e.key === "PageDown") {
                    e.preventDefault();
                    const newIndex = Math.min(filteredOptions.length - 1, currentFocusIndex + sizeWithDefault);
                    setCurrentFocusIndex(newIndex);
                    setVirtualizationStartIndex((prev) =>
                        ensureKeyboardSelectionInView(prev, reportedVirtualizationStartIndex, newIndex, sizeWithDefault)
                    );
                    makeKeyboardSelection(newIndex, modifiers);
                }

                if (e.key === "PageUp") {
                    e.preventDefault();
                    const newIndex = Math.max(0, currentFocusIndex - sizeWithDefault);
                    setCurrentFocusIndex(newIndex);
                    setVirtualizationStartIndex((prev) =>
                        ensureKeyboardSelectionInView(prev, reportedVirtualizationStartIndex, newIndex, sizeWithDefault)
                    );
                    makeKeyboardSelection(newIndex, modifiers);
                }

                if (e.key === "Home") {
                    e.preventDefault();
                    setCurrentFocusIndex(0);
                    setVirtualizationStartIndex(0);
                    makeKeyboardSelection(0, modifiers);
                }

                if (e.key === "End") {
                    e.preventDefault();
                    const newIndex = filteredOptions.length - 1;
                    setCurrentFocusIndex(newIndex);
                    setVirtualizationStartIndex(Math.max(0, newIndex - sizeWithDefault + 1));
                    makeKeyboardSelection(newIndex, modifiers);
                }
            }

            if (ref.current) {
                ref.current.addEventListener("focus", handleFocus);
                ref.current.addEventListener("blur", handleBlur);
                ref.current.addEventListener("keydown", handleKeyDown);
            }

            return function removeKeyboardEventListeners() {
                if (refCurrent) {
                    refCurrent.removeEventListener("focus", handleFocus);
                    refCurrent.removeEventListener("blur", handleBlur);
                    refCurrent.removeEventListener("keydown", handleKeyDown);
                }
            };
        },
        [
            currentFocusIndex,
            filteredOptions,
            sizeWithDefault,
            multipleWithDefault,
            handleOnChange,
            selectionAnchor,
            selectedOptionValues,
            reportedVirtualizationStartIndex,
        ]
    );

    function handleOptionClick(e: React.MouseEvent<HTMLDivElement>, option: SelectOption<TValue>, index: number) {
        if (option.disabled) {
            return;
        }

        setCurrentFocusIndex(index);

        if (!multipleWithDefault) {
            setSelectedOptionValues([option.value]);
            handleOnChange([option.value]);
            return;
        }

        let newSelectedOptions: TValue[] = [];
        if (e.shiftKey && selectionAnchor !== null) {
            const start = Math.min(index, selectionAnchor);
            const end = Math.max(index, selectionAnchor);
            newSelectedOptions = filteredOptions.slice(start, end + 1).map((option) => option.value);
        } else if (e.ctrlKey) {
            newSelectedOptions = selectedOptionValues.includes(option.value)
                ? selectedOptionValues.filter((value) => value !== option.value)
                : [...selectedOptionValues, option.value];
        } else {
            newSelectedOptions = [option.value];
        }

        if (!e.shiftKey) {
            setSelectionAnchor(index);
        }

        handleOnChange(newSelectedOptions);

        setSelectedOptionValues(newSelectedOptions);
    }

    function filterOptions(options: SelectOption<TValue>[], filterString: string) {
        let newCurrentKeyboardFocusIndex = 0;
        let newVirtualizationStartIndex = 0;

        let currentlySelectedOption = filteredOptions[currentFocusIndex]?.value;
        if (selectedOptionValues.length > 0) {
            currentlySelectedOption = selectedOptionValues[0];
        }

        const newFilteredOptions = options.filter((option) =>
            option.label.toLowerCase().includes(filterString.toLowerCase())
        );
        setFilteredOptions(newFilteredOptions);

        if (currentlySelectedOption) {
            const firstSelectedOptionIndex = newFilteredOptions.findIndex(
                (option) => option.value === currentlySelectedOption
            );
            if (firstSelectedOptionIndex !== -1) {
                newCurrentKeyboardFocusIndex = firstSelectedOptionIndex;
                newVirtualizationStartIndex = firstSelectedOptionIndex;
            }
        }

        setCurrentFocusIndex(newCurrentKeyboardFocusIndex);
        setVirtualizationStartIndex(newVirtualizationStartIndex);
        setSelectionAnchor(newFilteredOptions.findIndex((option) => option.value === selectedOptionValues[0]));
    }

    function handleFilterChange(event: React.ChangeEvent<HTMLInputElement>) {
        setFilterString(event.target.value);
        filterOptions(options, event.target.value);
    }

    function handleVirtualizationScroll(index: number) {
        setReportedVirtualizationStartIndex(index);
    }

    function handleSelectAll() {
        if (!onChange) {
            return;
        }
        onChange(props.options.map((option) => option.value));
    }

    function handleUnselectAll() {
        if (!onChange) {
            return;
        }
        onChange([]);
    }

    return (
        <div className="flex flex-col gap-2 text-sm">
            {props.showQuickSelectButtons && (
                <div className="flex gap-2 items-center">
                    <Button
                        onClick={handleSelectAll}
                        startIcon={<SelectAll fontSize="inherit" />}
                        variant="text"
                        title="Select all"
                        size="small"
                        disabled={props.disabled}
                    >
                        Select all
                    </Button>
                    <Button
                        onClick={handleUnselectAll}
                        startIcon={<Deselect fontSize="inherit" />}
                        variant="text"
                        title="Unselect all"
                        size="small"
                        disabled={props.disabled}
                    >
                        Unselect all
                    </Button>
                </div>
            )}
            <BaseComponent disabled={props.disabled}>
                <div
                    id={props.wrapperId}
                    className={resolveClassNames("relative", {
                        "no-select": props.disabled,
                        "pointer-events-none": props.disabled,
                        "opacity-30": props.disabled,
                    })}
                    style={{ width: props.width, minWidth: props.width }}
                >
                    {filterWithDefault && (
                        <Input
                            id={props.id}
                            type="text"
                            value={filterString}
                            onChange={handleFilterChange}
                            placeholder="Filter options..."
                        />
                    )}
                    <div
                        className="overflow-y-auto border border-gray-300 rounded-md w-full bg-white input-comp"
                        style={{ height: sizeWithDefault * 24 + 2 }}
                        ref={ref}
                        tabIndex={0}
                    >
                        {filteredOptions.length === 0 && (
                            <div className="p-1 flex items-center text-gray-400 select-none">
                                {options.length === 0 || filterString === "" ? noOptionsText : noMatchingOptionsText}
                            </div>
                        )}
                        <Virtualization
                            containerRef={ref}
                            items={filteredOptions}
                            itemSize={24}
                            onScroll={handleVirtualizationScroll}
                            renderItem={(option, index) => {
                                return (
                                    <div
                                        key={option.value}
                                        className={resolveClassNames(
                                            "cursor-pointer",
                                            "pl-2",
                                            "pr-2",
                                            "flex",
                                            "gap-2",
                                            "items-center",
                                            "select-none",
                                            {
                                                "hover:bg-blue-100": !selectedOptionValues.includes(option.value),
                                                "bg-blue-600 text-white box-border hover:bg-blue-700":
                                                    selectedOptionValues.includes(option.value),
                                                "pointer-events-none": option.disabled,
                                                "text-gray-400": option.disabled,
                                                outline: index === currentFocusIndex && hasFocus,
                                            }
                                        )}
                                        onClick={(e) => handleOptionClick(e, option, index)}
                                        style={{ height: 24 }}
                                    >
                                        {option.adornment}
                                        <span
                                            title={option.hoverText ?? option.label}
                                            className="min-w-0 text-ellipsis overflow-hidden whitespace-nowrap flex-grow"
                                        >
                                            {option.label}
                                        </span>
                                    </div>
                                );
                            }}
                            direction="vertical"
                            startIndex={virtualizationStartIndex}
                        />
                    </div>
                </div>
            </BaseComponent>
        </div>
    );
}

Select.displayName = "Select";
