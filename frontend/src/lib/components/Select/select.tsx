import React, { Key } from "react";

import { v4 } from "uuid";

import { Input } from "../Input";
import { Virtualization } from "../Virtualization";
import { BaseComponent, BaseComponentProps } from "../_BaseComponent/baseComponent";
import { withDefaults } from "../_utils/components";
import { resolveClassNames } from "../_utils/resolveClassNames";

export type SelectProps<T = string | number> = {
    options: { value: T; label: string }[];
    value?: T | T[];
    onChange?: (value: T | T[]) => void;
    filter?: boolean;
    size?: number;
    multiple?: boolean;
    label?: string;
    width?: string | number;
} & BaseComponentProps;

const defaultProps = {
    value: "",
    filter: false,
    size: 1,
    multiple: false,
};

export const Select = withDefaults<SelectProps>()(defaultProps, (props) => {
    const [filter, setFilter] = React.useState<string>("");
    const [hasFocus, setHasFocus] = React.useState<boolean>(false);
    const [selected, setSelected] = React.useState<(string | number)[]>([]);
    const [keysPressed, setKeysPressed] = React.useState<Key[]>([]);
    const [startIndex, setStartIndex] = React.useState<number>(0);
    const [lastShiftIndex, setLastShiftIndex] = React.useState<number>(-1);
    const [currentIndex, setCurrentIndex] = React.useState<number>(0);

    const id = React.useRef<string>(v4());
    const ref = React.useRef<HTMLDivElement>(null);

    const filteredOptions = React.useMemo(() => {
        if (!props.filter) {
            return props.options;
        }
        return props.options.filter((option) => option.label.toLowerCase().includes(filter.toLowerCase()));
    }, [props.options, filter]);

    const toggleValue = React.useCallback(
        (value: string | number, index: number) => {
            if (props.multiple) {
                if (keysPressed.includes("Shift")) {
                    const start = Math.min(lastShiftIndex, index);
                    const end = Math.max(lastShiftIndex, index);
                    const newSelected = props.options.slice(start, end + 1).map((option) => option.value);
                    setSelected(newSelected);
                } else if (keysPressed.includes("Control")) {
                    if (!selected.includes(value)) {
                        setSelected([...selected, value]);
                    } else {
                        setSelected(selected.filter((v) => v !== value));
                    }
                } else {
                    setSelected([value]);
                }
            } else {
                setSelected([value]);
            }
            setCurrentIndex(index);
            if (props.onChange) {
                props.onChange(props.multiple ? selected : value);
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
                    toggleValue(filteredOptions[newIndex].value, newIndex);
                    if (newIndex < startIndex) {
                        setStartIndex(newIndex);
                    }
                }
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const newIndex = Math.min(filteredOptions.length - 1, currentIndex + 1);
                    toggleValue(filteredOptions[newIndex].value, newIndex);
                    if (newIndex >= startIndex + props.size - 1) {
                        setStartIndex(Math.max(0, newIndex - props.size + 1));
                    }
                }
                if (e.key === "PageUp") {
                    e.preventDefault();
                    const newIndex = Math.max(0, currentIndex - props.size);
                    toggleValue(filteredOptions[newIndex].value, newIndex);
                    if (newIndex < startIndex) {
                        setStartIndex(newIndex);
                    }
                }
                if (e.key === "PageDown") {
                    e.preventDefault();
                    const newIndex = Math.min(filteredOptions.length - 1, currentIndex + props.size);
                    toggleValue(filteredOptions[newIndex].value, newIndex);
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
            if (Array.isArray(props.value)) {
                setSelected(props.value);
            } else {
                setSelected([props.value]);
            }
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
                className={resolveClassNames("relative", {
                    "no-select": props.disabled,
                    "pointer-events-none": props.disabled,
                    "opacity-30": props.disabled,
                })}
                style={{ width: props.width }}
            >
                {props.label && <label htmlFor={`filter-${id.current}`}>{props.label}</label>}
                {props.filter && (
                    <Input
                        type="text"
                        value={filter}
                        onChange={handleFilterChange}
                        id={`filter-${id.current}`}
                        placeholder="Filter options..."
                    />
                )}
                <div
                    className="overflow-y-scroll border border-gray-300 rounded-md w-full"
                    style={{ height: props.size * 24 }}
                    ref={ref}
                    onFocus={() => setHasFocus(true)}
                    onBlur={() => setHasFocus(false)}
                    tabIndex={0}
                >
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
                                        "p-1",
                                        "flex",
                                        "items-center",
                                        "select-none",
                                        {
                                            "hover:bg-blue-100": !selected.includes(option.value),
                                            "bg-blue-600 text-white box-border hover:bg-blue-700": selected.includes(
                                                option.value
                                            ),
                                        }
                                    )}
                                    onClick={() => toggleValue(option.value, index)}
                                    style={{ height: 24 }}
                                >
                                    {option.label}
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
