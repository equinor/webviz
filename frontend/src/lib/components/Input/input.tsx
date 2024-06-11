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
};

export const Input = React.forwardRef((props: InputProps, ref: React.ForwardedRef<HTMLInputElement>) => {
    const { startAdornment, endAdornment, wrapperStyle, value: propsValue, onChange, debounceTimeMs, ...other } = props;

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
    >(props.inputRef, () => internalRef.current);

    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleAdornmentClick = React.useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (internalRef.current) {
            internalRef.current.focus();
            internalRef.current.getElementsByTagName("input")[0].focus();
        }
        event.stopPropagation();
    }, []);

    const handleInputChange = React.useCallback(
        function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
            if (props.type === "number") {
                let newValue = 0;
                if (!isNaN(parseFloat(event.target.value))) {
                    newValue = parseFloat(event.target.value || "0");
                    if (props.min !== undefined) {
                        newValue = Math.max(props.min, newValue);
                    }

                    if (props.max !== undefined) {
                        newValue = Math.min(props.max, newValue);
                    }
                } else {
                    setValue(event.target.value);
                    return;
                }

                setValue(newValue);

                event.target.value = newValue.toString();
            } else {
                setValue(event.target.value);
            }

            if (!onChange) {
                return;
            }

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = setTimeout(() => {
                onChange(event);
            }, debounceTimeMs ?? 0);
        },
        [props.min, props.max, onChange, props.type, debounceTimeMs]
    );

    return (
        <BaseComponent disabled={props.disabled}>
            <div
                ref={ref}
                className={resolveClassNames(
                    "flex",
                    "justify-center",
                    "gap-2",
                    "bg-white",
                    "border",
                    "border-gray-300",
                    "shadow-sm",
                    "focus:border-indigo-500",
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
                    ref={internalRef}
                    slotProps={{
                        root: {
                            className: "grow",
                        },
                        input: {
                            className: resolveClassNames(
                                "h-full focus:border-indigo-500 block w-full sm:text-sm border-gray-300 outline-none"
                            ),
                        },
                    }}
                />
                {endAdornment && (
                    <div className="flex items-center h-full" onClick={handleAdornmentClick}>
                        {endAdornment}
                    </div>
                )}
            </div>
        </BaseComponent>
    );
});

Input.displayName = "Input";
