import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Input as InputUnstyled, InputProps as InputUnstyledProps } from "@mui/base";

import { BaseComponent } from "../BaseComponent";

export type InputProps = InputUnstyledProps & {
    wrapperStyle?: React.CSSProperties;
    min?: number;
    max?: number;
    rounded?: "all" | "left" | "right" | "none";
    debounceTimeMs?: number;
    onValueChange?: (value: string) => void;
};

function InputComponent(props: InputProps, ref: React.ForwardedRef<HTMLDivElement>) {
    const {
        startAdornment,
        endAdornment,
        wrapperStyle,
        value: propsValue,
        onValueChange,
        debounceTimeMs,
        inputRef,
        ...other
    } = props;

    const [value, setValue] = React.useState<unknown>(propsValue);
    const [prevValue, setPrevValue] = React.useState<unknown>(propsValue);

    if (propsValue !== prevValue) {
        setValue(propsValue);
        setPrevValue(propsValue);
    }

    const internalRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle<
        HTMLInputElement | HTMLTextAreaElement | null,
        HTMLInputElement | HTMLTextAreaElement | null
    >(inputRef, () => internalRef.current);

    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(function handleMount() {
        return function handleUnmount() {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const handleAdornmentClick = React.useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (internalRef.current) {
            internalRef.current.focus();
        }
        event.stopPropagation();
    }, []);

    function handleKeyUp(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Enter") {
            handleInputEditingDone();
        }
    }

    function handleInputBlur(evt: React.FocusEvent<HTMLInputElement>) {
        handleInputEditingDone();
        props.onBlur?.(evt);
    }

    function handleInputEditingDone() {
        let adjustedValue: unknown = value;
        if (props.type === "number") {
            let newValue = 0;

            if (!isNaN(parseFloat(value as string))) {
                newValue = parseFloat((value as string) || "0");
                if (props.min !== undefined) {
                    newValue = Math.max(props.min, newValue);
                }

                if (props.max !== undefined) {
                    newValue = Math.min(props.max, newValue);
                }
            }

            adjustedValue = newValue.toString();
            setValue(adjustedValue);
        }

        if (!onValueChange) {
            return;
        }

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (!debounceTimeMs) {
            onValueChange(`${adjustedValue}`);
            return;
        }

        debounceTimerRef.current = setTimeout(() => {
            onValueChange(`${adjustedValue}`);
        }, debounceTimeMs);
    }

    function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
        setValue(event.target.value);

        if (props.onChange) {
            if (props.type === "number") {
                let newValue = 0;

                if (!isNaN(parseFloat(event.target.value as string))) {
                    newValue = parseFloat((event.target.value as string) || "0");
                    if (props.min !== undefined) {
                        newValue = Math.max(props.min, newValue);
                    }

                    if (props.max !== undefined) {
                        newValue = Math.min(props.max, newValue);
                    }
                }

                event.target.value = newValue.toString();
            }
            props.onChange(event);
        }
    }

    return (
        <BaseComponent
            disabled={props.disabled}
            ref={ref}
            className={resolveClassNames(
                "flex",
                "justify-center",
                "gap-2",
                "bg-white",
                "border",
                "border-gray-300",
                "shadow-sm",
                "focus-within:border-indigo-500",
                "w-full",
                "h-full",
                "sm:text-sm",
                "px-2",
                "py-1.5",
                "outline-none",
                "cursor-text",
                {
                    "border-red-300": props.error,
                    "border-2": props.error,
                    "rounded-l": props.rounded === "left",
                    "rounded-r": props.rounded === "right",
                    rounded: props.rounded === "all" || !props.rounded,
                }
            )}
            style={wrapperStyle}
        >
            {startAdornment && (
                <div className="flex items-center h-full" onClick={handleAdornmentClick}>
                    {startAdornment}
                </div>
            )}
            <InputUnstyled
                {...other}
                value={value}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyUp={handleKeyUp}
                slotProps={{
                    root: {
                        className: "grow",
                    },
                    input: {
                        className: resolveClassNames("h-full block w-full sm:text-sm outline-none truncate"),
                        ref: internalRef,
                    },
                }}
            />
            {endAdornment && (
                <div className="flex items-center h-full" onClick={handleAdornmentClick}>
                    {endAdornment}
                </div>
            )}
        </BaseComponent>
    );
}

export const Input = React.forwardRef(InputComponent);
