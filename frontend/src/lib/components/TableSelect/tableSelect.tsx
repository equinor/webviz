import React, { Key } from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { isEqual } from "lodash";

import { BaseComponent, BaseComponentProps } from "../BaseComponent";
import { Input } from "../Input";
import { Virtualization } from "../Virtualization";
import { withDefaults } from "../_component-utils/components";

export type TableSelectOption = {
    id: string;
    values: { label: string; adornment?: React.ReactNode }[];
    disabled?: boolean;
};

export type TableSelectProps = {
    id?: string;
    wrapperId?: string;
    headerLabels: string[];
    options: TableSelectOption[];
    value?: string[];
    onChange?: (ids: string[]) => void;
    placeholder?: string;
    filter?: boolean;
    size?: number;
    multiple?: boolean;
    width?: string | number;
    columnSizesInPercent?: number[];
} & BaseComponentProps;

const defaultProps = {
    value: [""],
    filter: false,
    size: 1,
    multiple: false,
};

const noMatchingOptionsText = "No matching options";

export const TableSelect = withDefaults<TableSelectProps>()(defaultProps, (props) => {
    const [prevHeaderLabels, setPrevHeaderLabels] = React.useState<string[]>(props.headerLabels);
    const [filters, setFilters] = React.useState<string[]>(props.headerLabels.map(() => ""));
    const [hasFocus, setHasFocus] = React.useState<boolean>(false);
    const [selected, setSelected] = React.useState<string[]>([]);
    const [keysPressed, setKeysPressed] = React.useState<Key[]>([]);
    const [startIndex, setStartIndex] = React.useState<number>(0);
    const [lastShiftIndex, setLastShiftIndex] = React.useState<number>(-1);
    const [currentIndex, setCurrentIndex] = React.useState<number>(0);

    if (!isEqual(prevHeaderLabels, props.headerLabels)) {
        setPrevHeaderLabels(props.headerLabels);
        setFilters(props.headerLabels.map(() => ""));
    }

    if (props.columnSizesInPercent && props.columnSizesInPercent.reduce((a, b) => a + b, 0) !== 100) {
        throw new Error("Column sizes must add up to 100");
    }

    const columnSizesPerc = props.columnSizesInPercent ?? props.headerLabels.map(() => 100 / props.headerLabels.length);

    const ref = React.useRef<HTMLDivElement>(null);
    const noOptionsText = props.placeholder ?? "No options";
    const filteredOptions = React.useMemo(() => {
        if (!props.filter) {
            return props.options;
        }
        return props.options.filter((option) => {
            return option.values.every((value, index) => {
                return value.label.toLowerCase().includes(filters[index].toLowerCase());
            });
        });
    }, [props.options, filters]);

    const toggleValue = React.useCallback(
        (option: TableSelectOption, index: number) => {
            let newSelected = [...selected];
            if (props.multiple) {
                if (keysPressed.includes("Shift")) {
                    const start = Math.min(lastShiftIndex, index);
                    const end = Math.max(lastShiftIndex, index);
                    newSelected = props.options
                        .slice(start, end + 1)
                        .filter((option) => !option.disabled)
                        .map((option) => option.id);
                } else if (!option.disabled) {
                    if (keysPressed.includes("Control")) {
                        if (!selected.includes(option.id)) {
                            newSelected = [...selected, option.id];
                        } else {
                            newSelected = selected.filter((v) => v !== option.id);
                        }
                    } else {
                        newSelected = [option.id];
                    }
                }
            } else if (!option.disabled) {
                newSelected = [option.id];
            } else {
                newSelected = [];
            }
            setCurrentIndex(index);
            setSelected(newSelected);
            if (props.onChange) {
                if (props.multiple) {
                    props.onChange(newSelected);
                } else if (!option.disabled) {
                    props.onChange([option.id]);
                } else {
                    props.onChange([]);
                }
            }
        },
        [props.multiple, props.options, selected, props.onChange, keysPressed, lastShiftIndex]
    );

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            setKeysPressed((keysPressed) => [...keysPressed, e.key]);

            if (hasFocus) {
                if (e.key === "Shift") {
                    setLastShiftIndex(currentIndex);
                }
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

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index: number) => {
        setFilters((prev) => {
            const newFilters = [...prev];
            prev[index] = e.target.value;
            return newFilters;
        });
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
                    <div
                        className={resolveClassNames("flex", {
                            "mr-3": filteredOptions.length > props.size,
                        })}
                    >
                        {props.headerLabels.map((headerLabel, index) => (
                            <div
                                key={`${headerLabel}-${index}`}
                                className="box-border"
                                style={{ width: `${columnSizesPerc[index]}%` }}
                            >
                                {headerLabel}
                                <br />
                                <Input
                                    id={props.id}
                                    type="text"
                                    value={filters[index]}
                                    onChange={(e) => handleFilterChange(e, index)}
                                    placeholder={`Filter ${headerLabel}...`}
                                    title={`Filter ${headerLabel}...`}
                                />
                            </div>
                        ))}
                    </div>
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
                            {props.options.length === 0 || filters.some((el) => el !== "")
                                ? noMatchingOptionsText
                                : noOptionsText}
                        </div>
                    )}
                    <Virtualization
                        containerRef={ref}
                        items={filteredOptions}
                        itemSize={24}
                        renderItem={(option: TableSelectOption, index: number) => {
                            return (
                                <div
                                    key={option.id}
                                    className={resolveClassNames(
                                        "cursor-pointer",
                                        "flex",
                                        "items-center",
                                        "select-none",
                                        {
                                            "hover:bg-blue-100": !selected.includes(option.id),
                                            "bg-blue-600 text-white box-border hover:bg-blue-700": selected.includes(
                                                option.id
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
                                    {option.values.map((value, index) => {
                                        return (
                                            <div
                                                key={index}
                                                className={resolveClassNames("p-1 flex justify-center", {
                                                    "border-l": index > 0,
                                                })}
                                                style={{ width: `${columnSizesPerc[index]}%` }}
                                            >
                                                {value.adornment}
                                                <span
                                                    className="min-w-0 text-ellipsis overflow-hidden whitespace-nowrap w-full block"
                                                    title={value.label}
                                                >
                                                    {value.label}
                                                </span>
                                            </div>
                                        );
                                    })}
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

TableSelect.displayName = "TableSelect";
