import React, { Key } from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { isEqual } from "lodash";

import { BaseComponent, BaseComponentProps } from "../BaseComponent";
import { Input } from "../Input";
import { Virtualization } from "../Virtualization";
import { withDefaults } from "../_component-utils/components";

export type SelectOption = {
    value: string;
    icon?: React.ReactNode;
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
} & BaseComponentProps;

const defaultProps = {
    value: [""],
    filter: false,
    size: 1,
    multiple: false,
};

const noMatchingOptionsText = "No matching options";

export const Select = withDefaults<SelectProps>()(defaultProps, (props) => {
    const { onChange } = props;

    const [filter, setFilter] = React.useState<string>("");
    const [hasFocus, setHasFocus] = React.useState<boolean>(false);
    const [selected, setSelected] = React.useState<string[]>([]);
    const [keysPressed, setKeysPressed] = React.useState<Key[]>([]);
    const [startIndex, setStartIndex] = React.useState<number>(0);
    const [lastShiftIndex, setLastShiftIndex] = React.useState<number>(-1);
    const [currentIndex, setCurrentIndex] = React.useState<number>(0);
    const [options, setOptions] = React.useState<SelectOption[]>(props.options);
    const [prevFilteredOptions, setPrevFilteredOptions] = React.useState<SelectOption[]>([]);

    const ref = React.useRef<HTMLDivElement>(null);
    const noOptionsText = props.placeholder ?? "No options";

    if (!isEqual(props.options, options)) {
        setOptions(props.options);
    }

    const filteredOptions = React.useMemo(() => {
        if (!props.filter) {
            return options;
        }
        return options.filter((option) => option.label.toLowerCase().includes(filter.toLowerCase()));
    }, [options, filter, props.filter]);

    if (!isEqual(filteredOptions, prevFilteredOptions)) {
        let newCurrentIndex = 0;
        let newStartIndex = 0;
        let oldCurrentValue = prevFilteredOptions[currentIndex]?.value;
        if (props.value?.length >= 1) {
            oldCurrentValue = props.value[0];
        }
        setPrevFilteredOptions(filteredOptions);
        if (oldCurrentValue) {
            const newIndex = filteredOptions.findIndex((option) => option.value === oldCurrentValue);
            if (newIndex !== -1) {
                newCurrentIndex = newIndex;
                newStartIndex = newIndex;
            }
        }
        setCurrentIndex(newCurrentIndex);
        setStartIndex(newStartIndex);
    }

    const toggleValue = React.useCallback(
        function toggleValue(option: SelectOption, index: number) {
            let newSelected = [...selected];
            if (props.multiple) {
                if (keysPressed.includes("Shift")) {
                    const start = Math.min(lastShiftIndex, index);
                    const end = Math.max(lastShiftIndex, index);
                    newSelected = options
                        .slice(start, end + 1)
                        .filter((option) => !option.disabled)
                        .map((option) => option.value);
                } else if (!option.disabled) {
                    if (keysPressed.includes("Control")) {
                        if (!selected.includes(option.value)) {
                            newSelected = [...selected, option.value];
                        } else {
                            newSelected = selected.filter((v) => v !== option.value);
                        }
                    } else {
                        newSelected = [option.value];
                    }
                }
            } else if (!option.disabled) {
                newSelected = [option.value];
            } else {
                newSelected = [];
            }
            setCurrentIndex(index);
            setSelected(newSelected);
            if (onChange) {
                if (props.multiple) {
                    onChange(newSelected);
                } else if (!option.disabled) {
                    onChange([option.value]);
                } else {
                    onChange([]);
                }
            }
        },
        [props.multiple, options, selected, onChange, keysPressed, lastShiftIndex, setCurrentIndex, setSelected]
    );

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            setKeysPressed((keysPressed) => [...keysPressed, e.key]);

            if (e.key === "Shift") {
                setLastShiftIndex(currentIndex);
            }

            if (hasFocus) {
                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const newIndex = Math.max(0, currentIndex - 1);
                    toggleValue(filteredOptions[newIndex], newIndex);
                    if (newIndex < startIndex) {
                        setStartIndex(newIndex);
                    }
                }
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const newIndex = Math.min(filteredOptions.length - 1, currentIndex + 1);
                    toggleValue(filteredOptions[newIndex], newIndex);
                    if (newIndex >= startIndex + props.size - 1) {
                        setStartIndex(Math.max(0, newIndex - props.size + 1));
                    }
                }
                if (e.key === "PageUp") {
                    e.preventDefault();
                    const newIndex = Math.max(0, currentIndex - props.size);
                    toggleValue(filteredOptions[newIndex], newIndex);
                    if (newIndex < startIndex) {
                        setStartIndex(newIndex);
                    }
                }
                if (e.key === "PageDown") {
                    e.preventDefault();
                    const newIndex = Math.min(filteredOptions.length - 1, currentIndex + props.size);
                    toggleValue(filteredOptions[newIndex], newIndex);
                    if (newIndex >= startIndex + props.size - 1) {
                        setStartIndex(Math.max(0, newIndex - props.size + 1));
                    }
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            setKeysPressed((keysPressed) => keysPressed.filter((key) => key !== e.key));
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [currentIndex, selected, filteredOptions, props.size, hasFocus, startIndex, toggleValue]);

    React.useLayoutEffect(() => {
        if (props.value) {
            setSelected(props.value);
        }
    }, [props.value]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(e.target.value);
        if (ref.current) {
            ref.current.scrollTop = 0;
        }
    };

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
                        value={filter}
                        onChange={handleFilterChange}
                        placeholder="Filter options..."
                    />
                )}
                <div
                    className="overflow-y-auto border border-gray-300 rounded-md w-full bg-white"
                    style={{ height: props.size * 24 + 2 }}
                    ref={ref}
                    onFocus={() => setHasFocus(true)}
                    onBlur={() => setHasFocus(false)}
                    tabIndex={0}
                >
                    {filteredOptions.length === 0 && (
                        <div className="p-1 flex items-center text-gray-400 select-none">
                            {options.length === 0 || filter === "" ? noOptionsText : noMatchingOptionsText}
                        </div>
                    )}
                    <Virtualization
                        containerRef={ref}
                        items={filteredOptions}
                        itemSize={24}
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
                                            "hover:bg-blue-100": !selected.includes(option.value),
                                            "bg-blue-600 text-white box-border hover:bg-blue-700": selected.includes(
                                                option.value
                                            ),
                                            "pointer-events-none": option.disabled,
                                            "text-gray-400": option.disabled,
                                            "bg-blue-300": option.disabled && index === currentIndex,
                                        }
                                    )}
                                    onClick={() => {
                                        if (option.disabled) {
                                            return;
                                        }
                                        toggleValue(option, index);
                                    }}
                                    style={{ height: 24 }}
                                >
                                    {option.icon}
                                    <span
                                        title={option.label}
                                        className="min-w-0 text-ellipsis overflow-hidden whitespace-nowrap"
                                    >
                                        {option.label}
                                    </span>
                                </div>
                            );
                        }}
                        direction="vertical"
                        startIndex={startIndex}
                    />
                </div>
            </div>
        </BaseComponent>
    );
});

Select.displayName = "Select";
