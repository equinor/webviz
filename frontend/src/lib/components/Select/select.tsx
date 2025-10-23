import React from "react";

import { Deselect, SelectAll } from "@mui/icons-material";
import { isEqual } from "lodash";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { BaseComponentProps } from "../BaseComponent";
import { BaseComponent } from "../BaseComponent";
import { Button } from "../Button";
import { Input } from "../Input";
import { Virtualization } from "../Virtualization";

import { useKeepFocusedListItemInView } from "./useKeepFocusedListItemInView";
import { useOptInControlledValue } from "./useOptInControlledValue";
import { useSelectableItemList } from "./useSelectableItemList";

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
    optionHeight?: number;
    multiple?: boolean;
    width?: string | number;
    debounceTimeMs?: number;
    showQuickSelectButtons?: boolean;
} & BaseComponentProps;

const noMatchingOptionsText = "No matching options";

function SelectComponent<TValue = string>(props: SelectProps<TValue>, ref: React.ForwardedRef<HTMLDivElement>) {
    const { onChange } = props;

    const sizeWithDefault = props.size ?? 1;
    const multipleWithDefault = props.multiple ?? false;
    const filterWithDefault = props.filter ?? false;
    const noOptionsText = props.placeholder ?? "No options";

    const virtualizationRef = React.useRef<HTMLDivElement>(null);

    const [filterString, setFilterString] = React.useState<string>("");
    const [hasFocus, setHasFocus] = React.useState<boolean>(false);
    const [options, setOptions] = React.useState<SelectOption<TValue>[]>(props.options);
    const [filteredOptions, setFilteredOptions] = React.useState<SelectOption<TValue>[]>(props.options);
    const [selectionAnchor, setSelectionAnchor] = React.useState<number | null>(null);

    const [selectedOptionValues, setSelectedOptionValues, changeDebouncer] = useOptInControlledValue(
        [],
        props.value,
        onChange,
        props.debounceTimeMs,
    );

    const [currentFocusIndex, setCurrentFocusIndex] = useSelectableItemList({
        selectedValues: selectedOptionValues,
        listElementRef: virtualizationRef,
        items: filteredOptions,
        pageSize: sizeWithDefault,
        multiple: multipleWithDefault,
        onSelectionChange: setSelectedOptionValues,
    });

    const [scrollStartIndex, setScrollStartIndex] = useKeepFocusedListItemInView(currentFocusIndex, sizeWithDefault);

    if (!isEqual(props.options, options)) {
        const newOptions = [...props.options];
        setOptions(newOptions);
        filterOptions(newOptions, filterString);
    }

    React.useEffect(
        function addKeyboardEventListeners() {
            const refCurrent = virtualizationRef.current;

            function handleFocus() {
                setHasFocus(true);
            }

            function handleBlur() {
                setHasFocus(false);
                changeDebouncer.flush(); // Blur means user is done selecting, so we can apply it immediately;
            }

            refCurrent?.addEventListener("focus", handleFocus);
            refCurrent?.addEventListener("blur", handleBlur);

            return function removeKeyboardEventListeners() {
                refCurrent?.removeEventListener("focus", handleFocus);
                refCurrent?.removeEventListener("blur", handleBlur);
            };
        },
        [filteredOptions, sizeWithDefault, multipleWithDefault, selectionAnchor, changeDebouncer],
    );

    function handleOptionClick(e: React.MouseEvent<HTMLDivElement>, option: SelectOption<TValue>, index: number) {
        if (option.disabled) {
            return;
        }

        setCurrentFocusIndex(index);

        if (!multipleWithDefault) {
            setSelectedOptionValues([option.value]);
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

        setSelectedOptionValues(newSelectedOptions);
    }

    function filterOptions(options: SelectOption<TValue>[], filterString: string) {
        let newCurrentKeyboardFocusIndex = 0;

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
            }
        }

        setCurrentFocusIndex(newCurrentKeyboardFocusIndex);
        setSelectionAnchor(newFilteredOptions.findIndex((option) => option.value === selectedOptionValues[0]));
    }

    function handleFilterChange(event: React.ChangeEvent<HTMLInputElement>) {
        setFilterString(event.target.value);
        filterOptions(options, event.target.value);
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
        <BaseComponent ref={ref} disabled={props.disabled} className="flex flex-col gap-2 text-sm">
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
                    style={{ height: sizeWithDefault * (props.optionHeight ?? 24) + 2 }}
                    ref={virtualizationRef}
                    tabIndex={0}
                >
                    {filteredOptions.length === 0 && (
                        <div className="p-1 flex items-center text-gray-400 select-none">
                            {options.length === 0 || filterString === "" ? noOptionsText : noMatchingOptionsText}
                        </div>
                    )}
                    <Virtualization
                        direction="vertical"
                        startIndex={scrollStartIndex}
                        containerRef={virtualizationRef}
                        items={filteredOptions}
                        itemSize={props.optionHeight ?? 24}
                        onStartIndexChange={setScrollStartIndex}
                        makeKey={(option) => String(option.value)}
                        renderItem={(option, index) => {
                            return (
                                <div
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
                                            "outline -outline-offset-1": index === currentFocusIndex && hasFocus,
                                        },
                                    )}
                                    onClick={(e) => handleOptionClick(e, option, index)}
                                    style={{ height: props.optionHeight ?? 24 }}
                                >
                                    {option.adornment}
                                    <span
                                        title={option.hoverText ?? option.label}
                                        className="min-w-0 text-ellipsis overflow-hidden whitespace-nowrap grow"
                                    >
                                        {option.label}
                                    </span>
                                </div>
                            );
                        }}
                    />
                </div>
            </div>
        </BaseComponent>
    );
}

export const Select = React.forwardRef(SelectComponent) as <TValue = string>(
    props: SelectProps<TValue> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement;
