import React, { Key } from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { isEqual } from "lodash";

import { BaseComponent, BaseComponentProps } from "../BaseComponent";
import { Input } from "../Input";
import { Virtualization } from "../Virtualization";
import { withDefaults } from "../_component-utils/components";

export type SelectOption = {
    value: string;
    adornment?: React.ReactNode;
    label: string;
    disabled?: boolean;
};

export type SelectProps = {
    id?: string;
    wrapperId?: string;
    options: SelectOption[];
    value?: string[];
    onChange?: (values: string[]) => void;
    placeholder?: string;
    filter?: boolean;
    size?: number;
    multiple?: boolean;
    width?: string | number;
    debounceTimeMs?: number;
} & BaseComponentProps;

const defaultProps = {
    value: [""],
    filter: false,
    size: 1,
    multiple: false,
};

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

export const Select = withDefaults<SelectProps>()(defaultProps, (props) => {
    const { onChange } = props;

    const [filterString, setFilterString] = React.useState<string>("");
    const [hasFocus, setHasFocus] = React.useState<boolean>(false);
    const [options, setOptions] = React.useState<SelectOption[]>(props.options);
    const [filteredOptions, setFilteredOptions] = React.useState<SelectOption[]>(props.options);
    const [selectionAnchor, setSelectionAnchor] = React.useState<number | null>(null);
    const [selectedOptionValues, setSelectedOptionValues] = React.useState<string[]>([]);
    const [prevPropsValue, setPrevPropsValue] = React.useState<string[]>([]);
    const [currentFocusIndex, setCurrentFocusIndex] = React.useState<number>(0);
    const [virtualizationStartIndex, setVirtualizationStartIndex] = React.useState<number>(0);
    const [reportedVirtualizationStartIndex, setReportedVirtualizationStartIndex] = React.useState<number>(0);
    const [keysPressed, setKeysPressed] = React.useState<Key[]>([]);

    const ref = React.useRef<HTMLDivElement>(null);
    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const noOptionsText = props.placeholder ?? "No options";

    if (!isEqual(props.options, options)) {
        const newOptions = [...props.options];
        setOptions(newOptions);
        filterOptions(newOptions, filterString);
    }

    if (props.value && !isEqual(props.value, prevPropsValue)) {
        setSelectedOptionValues([...props.value]);
        setPrevPropsValue([...props.value]);
    }

    const handleOnChange = React.useCallback(
        function handleOnChange(values: string[]) {
            if (!onChange) {
                return;
            }

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = setTimeout(() => {
                onChange(values);
            }, props.debounceTimeMs ?? 0);
        },
        [onChange, props.debounceTimeMs]
    );

    React.useEffect(
        function addKeyboardEventListeners() {
            const refCurrent = ref.current;

            let localKeysPressed: Key[] = keysPressed;

            function makeKeyboardSelection(index: number) {
                if (filteredOptions[index].disabled) {
                    return;
                }

                if (!props.multiple) {
                    const newSelectedOptions = [filteredOptions[index].value];
                    setSelectedOptionValues(newSelectedOptions);
                    setSelectionAnchor(null);
                    handleOnChange(newSelectedOptions);
                }

                if (!(!localKeysPressed.includes("Control") || localKeysPressed.includes("Shift"))) {
                    return;
                }

                let newSelectedOptions: string[] = [];

                if (localKeysPressed.includes("Shift") && selectionAnchor !== null) {
                    const start = Math.min(index, selectionAnchor);
                    const end = Math.max(index, selectionAnchor);
                    newSelectedOptions = filteredOptions.slice(start, end + 1).map((option) => option.value);
                } else {
                    newSelectedOptions = [filteredOptions[index].value];
                }

                if (!localKeysPressed.includes("Shift") && !localKeysPressed.includes("Control")) {
                    setSelectionAnchor(index);
                }

                handleOnChange(newSelectedOptions);

                setSelectedOptionValues(newSelectedOptions);
            }

            function addKeyboardSelection(index: number) {
                if (filteredOptions[index].disabled) {
                    return;
                }

                if (!props.multiple) {
                    const newSelectedOptions = [filteredOptions[index].value];
                    setSelectedOptionValues(newSelectedOptions);
                    setSelectionAnchor(null);
                    handleOnChange(newSelectedOptions);
                }

                setSelectionAnchor(index);

                let newSelectedOptions: string[] = [];
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
                localKeysPressed = [...localKeysPressed, e.key];
                setKeysPressed(localKeysPressed);

                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const newIndex = Math.max(0, currentFocusIndex - 1);
                    setCurrentFocusIndex(newIndex);
                    setVirtualizationStartIndex((prev) =>
                        ensureKeyboardSelectionInView(prev, reportedVirtualizationStartIndex, newIndex, props.size)
                    );
                    makeKeyboardSelection(newIndex);
                }

                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const newIndex = Math.min(filteredOptions.length - 1, currentFocusIndex + 1);
                    setCurrentFocusIndex(newIndex);
                    setVirtualizationStartIndex((prev) =>
                        ensureKeyboardSelectionInView(prev, reportedVirtualizationStartIndex, newIndex, props.size)
                    );
                    makeKeyboardSelection(newIndex);
                }

                if (e.key === " " && keysPressed.includes("Control")) {
                    e.preventDefault();
                    addKeyboardSelection(currentFocusIndex);
                }

                if (e.key === "PageDown") {
                    e.preventDefault();
                    const newIndex = Math.min(filteredOptions.length - 1, currentFocusIndex + props.size);
                    setCurrentFocusIndex(newIndex);
                    setVirtualizationStartIndex((prev) =>
                        ensureKeyboardSelectionInView(prev, reportedVirtualizationStartIndex, newIndex, props.size)
                    );
                    makeKeyboardSelection(newIndex);
                }

                if (e.key === "PageUp") {
                    e.preventDefault();
                    const newIndex = Math.max(0, currentFocusIndex - props.size);
                    setCurrentFocusIndex(newIndex);
                    setVirtualizationStartIndex((prev) =>
                        ensureKeyboardSelectionInView(prev, reportedVirtualizationStartIndex, newIndex, props.size)
                    );
                    makeKeyboardSelection(newIndex);
                }

                if (e.key === "Home") {
                    e.preventDefault();
                    setCurrentFocusIndex(0);
                    setVirtualizationStartIndex(0);
                    makeKeyboardSelection(0);
                }

                if (e.key === "End") {
                    e.preventDefault();
                    const newIndex = filteredOptions.length - 1;
                    setCurrentFocusIndex(newIndex);
                    setVirtualizationStartIndex(Math.max(0, newIndex - props.size + 1));
                    makeKeyboardSelection(newIndex);
                }
            }

            const handleKeyUp = (e: KeyboardEvent) => {
                localKeysPressed = localKeysPressed.filter((key) => key !== e.key);
                setKeysPressed(localKeysPressed);
            };

            if (ref.current) {
                ref.current.addEventListener("focus", handleFocus);
                ref.current.addEventListener("blur", handleBlur);
                ref.current.addEventListener("keydown", handleKeyDown);
                ref.current.addEventListener("keyup", handleKeyUp);
            }

            return function removeKeyboardEventListeners() {
                if (refCurrent) {
                    refCurrent.removeEventListener("focus", handleFocus);
                    refCurrent.removeEventListener("blur", handleBlur);
                    refCurrent.removeEventListener("keydown", handleKeyDown);
                    refCurrent.removeEventListener("keyup", handleKeyUp);
                }
            };
        },
        [
            currentFocusIndex,
            filteredOptions,
            props.size,
            keysPressed,
            props.multiple,
            handleOnChange,
            selectionAnchor,
            selectedOptionValues,
            reportedVirtualizationStartIndex,
        ]
    );

    function handleOptionClick(option: SelectOption, index: number) {
        if (option.disabled) {
            return;
        }

        setCurrentFocusIndex(index);

        if (!props.multiple) {
            setSelectedOptionValues([option.value]);
            handleOnChange([option.value]);
            return;
        }

        let newSelectedOptions: string[] = [];
        if (keysPressed.includes("Shift") && selectionAnchor !== null) {
            const start = Math.min(index, selectionAnchor);
            const end = Math.max(index, selectionAnchor);
            newSelectedOptions = filteredOptions.slice(start, end + 1).map((option) => option.value);
        } else if (keysPressed.includes("Control")) {
            newSelectedOptions = selectedOptionValues.includes(option.value)
                ? selectedOptionValues.filter((value) => value !== option.value)
                : [...selectedOptionValues, option.value];
        } else {
            newSelectedOptions = [option.value];
        }

        if (!keysPressed.includes("Shift")) {
            setSelectionAnchor(index);
        }

        handleOnChange(newSelectedOptions);

        setSelectedOptionValues(newSelectedOptions);
    }

    function filterOptions(options: SelectOption[], filterString: string) {
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
    }

    function handleFilterChange(event: React.ChangeEvent<HTMLInputElement>) {
        setFilterString(event.target.value);
        filterOptions(options, event.target.value);
    }

    function handleVirtualizationScroll(index: number) {
        setReportedVirtualizationStartIndex(index);
    }

    return (
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
                {props.filter && (
                    <Input
                        id={props.id}
                        type="text"
                        value={filterString}
                        onChange={handleFilterChange}
                        placeholder="Filter options..."
                    />
                )}
                <div
                    className="overflow-y-auto border border-gray-300 rounded-md w-full bg-white"
                    style={{ height: props.size * 24 + 2 }}
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
                                    onClick={() => handleOptionClick(option, index)}
                                    style={{ height: 24 }}
                                >
                                    {option.adornment}
                                    <span
                                        title={option.label}
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
    );
});

Select.displayName = "Select";
