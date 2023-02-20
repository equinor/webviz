import React, { Key } from "react";

import { v4 } from "uuid";

import { Input } from "../Input";
import { withDefaults } from "../_utils/components";

export type SelectProps<T extends string | number> = {
    options: { value: T; label: string }[];
    value?: T | T[];
    onChange?: (value: T | T[]) => void;
    filter?: boolean;
    size?: number;
    multiple?: boolean;
    label?: string;
};

const defaultProps = {
    value: "",
    filter: false,
    size: 1,
    multiple: false,
};

const elementHeight = 24;

export const Select = withDefaults<SelectProps<string | number>>((props) => {
    const [filter, setFilter] = React.useState<string>("");
    const [selected, setSelected] = React.useState<(string | number)[]>([]);
    const [keysPressed, setKeysPressed] = React.useState<Key[]>([]);
    const [currentScrollPosition, setCurrentScrollPosition] = React.useState<number>(0);

    const id = React.useRef<string>(v4());
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            setKeysPressed((keysPressed) => [...keysPressed, e.key]);
            if (e.key === "ArrowUp") {
                e.preventDefault();
                const currentIndex = props.options.findIndex(
                    (option) => option.value === selected[selected.length - 1]
                );
                const newIndex = Math.max(0, currentIndex - 1);
                toggleValue(props.options[newIndex].value);
                if (newIndex * elementHeight < currentScrollPosition) {
                    if (ref.current) {
                        ref.current.scrollTop = newIndex * elementHeight;
                    }
                }
            }
            if (e.key === "ArrowDown") {
                e.preventDefault();
                const currentIndex = props.options.findIndex(
                    (option) => option.value === selected[selected.length - 1]
                );
                const newIndex = Math.max(0, currentIndex + 1);
                toggleValue(props.options[newIndex].value);
                if (newIndex * elementHeight > currentScrollPosition + ((props.size || 1) - 1) * elementHeight) {
                    if (ref.current) {
                        ref.current.scrollTop = (newIndex - (props.size || 1) + 1) * elementHeight;
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
    }, [selected, currentScrollPosition, props.options, props.size]);

    React.useLayoutEffect(() => {
        if (props.value) {
            if (Array.isArray(props.value)) {
                setSelected(props.value);
            } else {
                setSelected([props.value]);
            }
        }
    }, [props.value]);

    const filteredOptions = React.useMemo(() => {
        if (!props.filter) {
            return props.options;
        }
        return props.options.filter((option) => option.label.toLowerCase().includes(filter.toLowerCase()));
    }, [props.options, filter]);

    const toggleValue = (value: string | number) => {
        if (props.multiple) {
            if (keysPressed.includes("Shift")) {
                const lastSelected = selected[selected.length - 1];
                const lastSelectedIndex = props.options.findIndex((option) => option.value === lastSelected);
                const currentIndex = props.options.findIndex((option) => option.value === value);
                const start = Math.min(lastSelectedIndex, currentIndex);
                const end = Math.max(lastSelectedIndex, currentIndex);
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
        if (props.onChange) {
            props.onChange(props.multiple ? selected : value);
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement, UIEvent>) => {
        const target = e.target as HTMLDivElement;
        setCurrentScrollPosition(target.scrollTop);
    };

    const startIndex = Math.floor(currentScrollPosition / elementHeight);
    const filteredOptionsLength = filteredOptions.length;

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(e.target.value);
        if (ref.current) {
            ref.current.scrollTop = 0;
        }
    };

    return (
        <div className="relative">
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
                style={{ height: (props.size || 1) * elementHeight }}
                onScroll={handleScroll}
                ref={ref}
            >
                <div style={{ height: Math.floor(currentScrollPosition / elementHeight) * elementHeight }} />
                {filteredOptions.map((option, index) => {
                    if (index >= startIndex && index < startIndex + (props.size || 1)) {
                        return (
                            <div
                                key={option.value}
                                className={`cursor p-1 flex items-center${
                                    selected.includes(option.value) ? " bg-blue-700 text-white box-border" : ""
                                } select-none`}
                                onClick={() => toggleValue(option.value)}
                                style={{ height: elementHeight }}
                            >
                                {option.label}
                            </div>
                        );
                    }
                    return null;
                })}
                <div style={{ height: (filteredOptionsLength - (props.size || 1) - startIndex) * elementHeight }} />
            </div>
        </div>
    );
}, defaultProps);
