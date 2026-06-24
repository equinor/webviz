import React from "react";

import { Close, Deselect, SelectAll } from "@mui/icons-material";
import { isEqual } from "lodash";

import { useFieldStateDataAttributes } from "@lib/newComponents/Field";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { LayoutClassProps } from "../_shared/utils/wrapperProps";
import { Button } from "../Button";
import { TextInput } from "../TextInput";
import { Virtualization } from "../Virtualization";

enum KeyModifier {
    SHIFT = "shift",
    CONTROL = "control",
}

export type SelectOption<TValue = string> = {
    /** The underlying data value for this option. */
    value: TValue;
    /** Optional element rendered before the label. */
    adornment?: React.ReactNode;
    /** The display text shown in the list. */
    label: string;
    /** Tooltip shown on hover. Falls back to `label` if not provided. */
    hoverText?: string;
    /** When true, prevents this option from being selected. */
    disabled?: boolean;
};

export type SelectProps<TValue = string> = LayoutClassProps & {
    /** HTML id applied to the filter input when `filter` is true. */
    id?: string;
    /** HTML id applied to the outer wrapper element. */
    wrapperId?: string;
    /** When true, disables the entire select and makes it non-interactive. */
    disabled?: boolean;
    /** The list of options to display. */
    options: SelectOption<TValue>[];
    /** The currently selected values. */
    value?: TValue[];
    /** Called when the selection changes. */
    onValueChange?: (values: TValue[]) => void;
    /** Text shown when the list is empty and no filter is active. */
    placeholder?: string;
    /** When true, shows a filter input above the list. */
    filter?: boolean;
    /** Placeholder text for the filter input. @default "Filter options..." */
    filterPlaceholder?: string;
    /** Number of visible rows. @default 1 */
    size?: number;
    /** Height of each option row in pixels. @default 24 */
    optionHeight?: number;
    /** When true, allows selecting multiple values via Ctrl+click and Shift+click. */
    multiple?: boolean;
    /** CSS width applied to the list container. */
    width?: string | number;
    /** Debounce delay in milliseconds applied to `onValueChange` calls. */
    debounceTimeMs?: number;
    /** When true, shows "Select all" and "Unselect all" buttons above the list. */
    showQuickSelectButtons?: boolean;
};

const noMatchingOptionsText = "No matching options";

function ensureKeyboardSelectionInView(
    prevViewStartIndex: number,
    reportedViewStartIndex: number,
    keyboardFocusIndex: number,
    viewSize: number,
) {
    if (keyboardFocusIndex >= reportedViewStartIndex + viewSize) {
        return Math.max(0, keyboardFocusIndex - viewSize + 1);
    }
    if (keyboardFocusIndex <= reportedViewStartIndex) {
        return keyboardFocusIndex;
    }
    return prevViewStartIndex;
}

function SelectComponent<TValue = string>(props: SelectProps<TValue>, ref: React.ForwardedRef<HTMLDivElement>) {
    const { onValueChange: onChange } = props;
    const fieldStateAttrs = useFieldStateDataAttributes();

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

    const virtualizationRef = React.useRef<HTMLDivElement>(null);
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
        [onChange, props.debounceTimeMs],
    );

    const handleSelectAll = React.useCallback(
        function handleSelectAll() {
            if (!onChange) {
                return;
            }
            onChange(props.options.map((option) => option.value));
        },
        [onChange, props.options],
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
            const refCurrent = virtualizationRef.current;

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
                        ensureKeyboardSelectionInView(
                            prev,
                            reportedVirtualizationStartIndex,
                            newIndex,
                            sizeWithDefault,
                        ),
                    );
                    makeKeyboardSelection(newIndex, modifiers);
                }

                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const newIndex = Math.min(filteredOptions.length - 1, currentFocusIndex + 1);
                    setCurrentFocusIndex(newIndex);
                    setVirtualizationStartIndex((prev) =>
                        ensureKeyboardSelectionInView(
                            prev,
                            reportedVirtualizationStartIndex,
                            newIndex,
                            sizeWithDefault,
                        ),
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
                        ensureKeyboardSelectionInView(
                            prev,
                            reportedVirtualizationStartIndex,
                            newIndex,
                            sizeWithDefault,
                        ),
                    );
                    makeKeyboardSelection(newIndex, modifiers);
                }

                if (e.key === "PageUp") {
                    e.preventDefault();
                    const newIndex = Math.max(0, currentFocusIndex - sizeWithDefault);
                    setCurrentFocusIndex(newIndex);
                    setVirtualizationStartIndex((prev) =>
                        ensureKeyboardSelectionInView(
                            prev,
                            reportedVirtualizationStartIndex,
                            newIndex,
                            sizeWithDefault,
                        ),
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

                if (e.key === "a" && e.ctrlKey) {
                    e.preventDefault();
                    handleSelectAll();
                }
            }

            refCurrent?.addEventListener("focus", handleFocus);
            refCurrent?.addEventListener("blur-sm", handleBlur);
            refCurrent?.addEventListener("keydown", handleKeyDown);

            return function removeKeyboardEventListeners() {
                refCurrent?.removeEventListener("focus", handleFocus);
                refCurrent?.removeEventListener("blur-sm", handleBlur);
                refCurrent?.removeEventListener("keydown", handleKeyDown);
            };
        },
        [
            currentFocusIndex,
            filteredOptions,
            sizeWithDefault,
            multipleWithDefault,
            handleOnChange,
            handleSelectAll,
            selectionAnchor,
            selectedOptionValues,
            reportedVirtualizationStartIndex,
        ],
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
            option.label.toLowerCase().includes(filterString.toLowerCase()),
        );
        setFilteredOptions(newFilteredOptions);

        if (currentlySelectedOption) {
            const firstSelectedOptionIndex = newFilteredOptions.findIndex(
                (option) => option.value === currentlySelectedOption,
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

    function handleFilterChange(value: string) {
        setFilterString(value);
        filterOptions(options, value);
    }

    function handleVirtualizationScroll(index: number) {
        setReportedVirtualizationStartIndex(index);
    }

    function handleUnselectAll() {
        if (!onChange) {
            return;
        }
        onChange([]);
    }

    return (
        <div ref={ref} className={resolveClassNames(props.layoutClassName, "gap-y-xs text-body-sm flex flex-col")}>
            {props.showQuickSelectButtons && props.multiple && (
                <div className="gap-x-3xs flex items-center">
                    <Button
                        onClick={handleSelectAll}
                        variant="ghost"
                        title="Select all"
                        size="small"
                        disabled={props.disabled}
                    >
                        <SelectAll fontSize="inherit" />
                        Select all
                    </Button>
                    <Button
                        onClick={handleUnselectAll}
                        variant="ghost"
                        title="Unselect all"
                        size="small"
                        disabled={props.disabled}
                    >
                        <Deselect fontSize="inherit" /> Unselect all
                    </Button>
                </div>
            )}
            <div
                id={props.wrapperId}
                className={resolveClassNames("relative", { "cursor-not-allowed": !!props.disabled })}
                style={{ width: props.width, minWidth: props.width }}
            >
                {filterWithDefault && (
                    <TextInput
                        id={props.id}
                        type="text"
                        value={filterString}
                        onValueChange={handleFilterChange}
                        placeholder={props.filterPlaceholder ?? "Filter options..."}
                        disabled={props.disabled}
                        endAdornment={
                            filterString && (
                                <Button
                                    variant="ghost"
                                    size="small"
                                    iconOnly
                                    disabled={props.disabled}
                                    onClick={() => handleFilterChange("")}
                                >
                                    <Close style={{ fontSize: 16 }} />
                                </Button>
                            )
                        }
                    />
                )}
                <div
                    className={resolveClassNames("form-element group w-full overflow-y-auto", {
                        "text-disabled! pointer-events-none overflow-hidden!": !!props.disabled,
                    })}
                    {...fieldStateAttrs}
                    data-disabled={props.disabled === true ? true : undefined}
                    style={{ height: sizeWithDefault * (props.optionHeight ?? 24) + 2 }}
                    ref={virtualizationRef}
                    tabIndex={props.disabled ? -1 : 0}
                >
                    {filteredOptions.length === 0 && (
                        <div className="px-xs flex h-full w-full items-center justify-center select-none">
                            {options.length === 0 || filterString === "" ? noOptionsText : noMatchingOptionsText}
                        </div>
                    )}
                    <Virtualization
                        containerRef={virtualizationRef}
                        items={filteredOptions}
                        itemSize={props.optionHeight ?? 24}
                        onScroll={handleVirtualizationScroll}
                        renderItem={(option: SelectOption<TValue>, index: number) => {
                            return (
                                <div
                                    key={String(option.value)}
                                    className={resolveClassNames(
                                        "px-xs py-xs group-data-disabled:text-disabled! gap-x-2xs flex items-center select-none",
                                        {
                                            "hover:bg-accent-hover": !selectedOptionValues.includes(option.value),
                                            "bg-accent-strong text-accent-strong-on-emphasis hover:bg-accent-strong-hover group-data-disabled:bg-disabled! box-border":
                                                selectedOptionValues.includes(option.value),
                                            "cursor-pointer": !option.disabled,
                                            "text-disabled bg-neutral-canvas cursor-not-allowed": option.disabled,
                                            outline:
                                                index === currentFocusIndex &&
                                                hasFocus &&
                                                !option.disabled &&
                                                !props.disabled,
                                        },
                                    )}
                                    onClick={(e) => handleOptionClick(e, option, index)}
                                    style={{ height: props.optionHeight ?? 24 }}
                                >
                                    {option.adornment}
                                    <span
                                        title={option.hoverText ?? option.label}
                                        className="min-w-0 grow overflow-hidden text-ellipsis whitespace-nowrap"
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
        </div>
    );
}

export const Select = React.forwardRef(SelectComponent) as <TValue = string>(
    props: SelectProps<TValue> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement;
